/**
 * Contacts CSV Import Worker
 * 
 * Streams CSV files from S3 and performs batched inserts into the main contacts table.
 * Designed for high-volume imports without loading entire files into memory.
 */

import { Job } from 'bullmq';
import { parse } from 'fast-csv';
import { Readable } from 'stream';
import { db } from '../db';
import { contacts, accounts } from '../../shared/schema';
import { streamFromS3 } from '../lib/s3';
import { eq, and, sql } from 'drizzle-orm';
import { normalizeName } from '../normalization';

/**
 * Contacts CSV Import Job Data
 */
export interface ContactsCSVImportJobData {
  s3Key: string;                    // S3 key to the CSV file
  userId: string;                   // User who initiated the import
  isUnifiedFormat: boolean;         // Whether CSV includes account data
  fieldMappings: Array<{            // Field mapping from CSV to DB
    csvColumn: string;
    targetField: string;
    targetEntity: 'contact' | 'account';
  }>;
  headers: string[];                // Original CSV headers
  batchSize?: number;               // Number of rows to insert per batch (default: 1000)
}

/**
 * Contacts CSV Import Job Result
 */
export interface ContactsCSVImportJobResult {
  success: boolean;
  totalRows: number;
  successRows: number;
  createdRows: number;
  updatedRows: number;
  failedRows: number;
  errors: Array<{ row: number; message: string }>;
  duration: number;
}

/**
 * Contacts CSV Import Worker Processor
 * Streams CSV from S3 and performs batched Postgres inserts
 */
export async function processContactsCSVImport(
  job: Job<ContactsCSVImportJobData>
): Promise<ContactsCSVImportJobResult> {
  const startTime = Date.now();
  const { s3Key, userId, isUnifiedFormat, fieldMappings, headers, batchSize = 1000 } = job.data;

  console.log(`[ContactsCSVImportWorker] Starting import job ${job.id}`);
  console.log(`[ContactsCSVImportWorker] S3 Key: ${s3Key}`);
  console.log(`[ContactsCSVImportWorker] User: ${userId}`);
  console.log(`[ContactsCSVImportWorker] Unified Format: ${isUnifiedFormat}`);
  console.log(`[ContactsCSVImportWorker] Batch size: ${batchSize}`);

  // Stats tracking
  let totalRows = 0;
  let successRows = 0;
  let createdRows = 0;
  let updatedRows = 0;
  let failedRows = 0;
  const errors: Array<{ row: number; message: string }> = [];

  // Batch buffer for inserts
  let batch: any[] = [];

  // Account lookup cache
  const accountCache = new Map<string, string>(); // normalized name -> account ID

  /**
   * Process a single batch of records
   */
  async function processBatch(records: any[]): Promise<void> {
    if (records.length === 0) return;

    const batchResults = {
      created: 0,
      updated: 0,
      failed: 0,
    };

    for (const record of records) {
      try {
        let accountId: string | null = null;

        // Handle account data if unified format
        if (isUnifiedFormat && record.account) {
          const normalizedAccountName = normalizeName(record.account.name || '');
          
          if (normalizedAccountName) {
            // Check cache first
            if (accountCache.has(normalizedAccountName)) {
              accountId = accountCache.get(normalizedAccountName)!;
            } else {
              // Look up or create account
              const [existingAccount] = await db
                .select()
                .from(accounts)
                .where(eq(accounts.nameNormalized, normalizedAccountName))
                .limit(1);

              if (existingAccount) {
                accountId = existingAccount.id;
                accountCache.set(normalizedAccountName, accountId);
              } else {
                // Create new account
                const [newAccount] = await db
                  .insert(accounts)
                  .values({
                    name: record.account.name,
                    nameNormalized: normalizedAccountName,
                    website: record.account.website || null,
                    industry: record.account.industry || null,
                    ...record.account,
                  })
                  .returning();
                
                accountId = newAccount.id;
                accountCache.set(normalizedAccountName, accountId);
              }
            }
          }
        }

        // Prepare contact data
        const contactData = {
          ...record.contact,
          accountId,
        };

        // Upsert contact (update if email exists, otherwise insert)
        if (contactData.email) {
          const [existingContact] = await db
            .select()
            .from(contacts)
            .where(eq(contacts.email, contactData.email))
            .limit(1);

          if (existingContact) {
            // Update existing contact
            await db
              .update(contacts)
              .set({
                ...contactData,
                updatedAt: new Date(),
              })
              .where(eq(contacts.id, existingContact.id));
            
            batchResults.updated++;
            updatedRows++;
          } else {
            // Insert new contact
            await db.insert(contacts).values(contactData);
            batchResults.created++;
            createdRows++;
          }

          successRows++;
        } else {
          errors.push({
            row: record.rowIndex,
            message: 'Email is required',
          });
          batchResults.failed++;
          failedRows++;
        }
      } catch (error) {
        console.error(`[ContactsCSVImportWorker] Error processing row ${record.rowIndex}:`, error);
        errors.push({
          row: record.rowIndex,
          message: error instanceof Error ? error.message : String(error),
        });
        batchResults.failed++;
        failedRows++;
      }
    }

    console.log(`[ContactsCSVImportWorker] Batch completed: ${batchResults.created} created, ${batchResults.updated} updated, ${batchResults.failed} failed`);
  }

  return new Promise((resolve, reject) => {
    let rowIndex = 0;
    const csvStream = streamFromS3(s3Key);

    if (!csvStream) {
      reject(new Error(`Failed to stream file from S3: ${s3Key}`));
      return;
    }

    // Create field mapping lookup
    const csvColumnIndexMap = new Map<string, number>();
    headers.forEach((header, idx) => {
      csvColumnIndexMap.set(header, idx);
    });

    const mappedHeaders = fieldMappings.map(m => {
      if (!m.targetField || !m.targetEntity) return "";
      return m.targetEntity === "account" ? `account_${m.targetField}` : m.targetField;
    });

    csvStream
      .pipe(parse({ headers: true, skipEmptyLines: true }))
      .on('data', async (row: any) => {
        rowIndex++;
        totalRows++;

        try {
          // Map CSV row to target format
          const mappedRow: any = {};
          const mappedAccountRow: any = {};

          fieldMappings.forEach(mapping => {
            const value = row[mapping.csvColumn] || '';
            
            if (mapping.targetEntity === 'contact') {
              mappedRow[mapping.targetField] = value;
            } else if (mapping.targetEntity === 'account') {
              mappedAccountRow[mapping.targetField] = value;
            }
          });

          // Add to batch
          batch.push({
            contact: mappedRow,
            account: isUnifiedFormat ? mappedAccountRow : null,
            rowIndex: rowIndex + 1, // +1 for header row
          });

          // Process batch when it reaches batch size
          if (batch.length >= batchSize) {
            const currentBatch = [...batch];
            batch = [];
            await processBatch(currentBatch);

            // Update progress
            await job.updateProgress({
              processed: totalRows,
              created: createdRows,
              updated: updatedRows,
              failed: failedRows,
              status: 'processing',
              percent: Math.floor((successRows / totalRows) * 100),
            });
          }
        } catch (error) {
          console.error(`[ContactsCSVImportWorker] Error parsing row ${rowIndex}:`, error);
          errors.push({
            row: rowIndex + 1,
            message: error instanceof Error ? error.message : String(error),
          });
          failedRows++;
        }
      })
      .on('end', async () => {
        try {
          // Process remaining batch
          if (batch.length > 0) {
            await processBatch(batch);
          }

          const duration = Date.now() - startTime;

          console.log(`[ContactsCSVImportWorker] Import completed in ${duration}ms`);
          console.log(`[ContactsCSVImportWorker] Total: ${totalRows}, Success: ${successRows}, Created: ${createdRows}, Updated: ${updatedRows}, Failed: ${failedRows}`);

          resolve({
            success: true,
            totalRows,
            successRows,
            createdRows,
            updatedRows,
            failedRows,
            errors,
            duration,
          });
        } catch (error) {
          console.error('[ContactsCSVImportWorker] Error in final batch:', error);
          reject(error);
        }
      })
      .on('error', (error) => {
        console.error('[ContactsCSVImportWorker] Stream error:', error);
        reject(error);
      });
  });
}
