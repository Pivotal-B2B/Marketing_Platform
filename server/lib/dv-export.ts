import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { format } from 'fast-csv';
import { db } from '../db';
import { dvRecords, type DvRecord } from '@shared/schema';
import { eq, and, inArray } from 'drizzle-orm';

export type ExportType = 'all_verification_data' | 'verified_only' | 'deliverable_only' | 'custom_filter';

export interface ExportOptions {
  projectId: string;
  type: ExportType;
  filter?: any;
  fields?: string[];
}

export interface ExportResult {
  filePath: string;
  rowCount: number;
}

/**
 * Generate export file path
 */
function generateExportPath(projectId: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `export_${timestamp}.csv`;
  return join(process.env.FILE_STORAGE_DIR || './storage', 'exports', projectId, filename);
}

/**
 * Query records based on export type
 */
async function queryRecords(options: ExportOptions): Promise<DvRecord[]> {
  const { projectId, type, filter } = options;
  
  let conditions: any[] = [eq(dvRecords.projectId, projectId)];
  
  switch (type) {
    case 'verified_only':
      conditions.push(eq(dvRecords.status, 'verified'));
      break;
      
    case 'deliverable_only':
      conditions.push(
        inArray(dvRecords.status, ['verified', 'delivered'])
      );
      break;
      
    case 'custom_filter':
      if (filter) {
        // Apply custom filter logic here
        // This would integrate with your filter builder
      }
      break;
      
    case 'all_verification_data':
    default:
      // No additional conditions
      break;
  }
  
  return db.select()
    .from(dvRecords)
    .where(and(...conditions))
    .execute();
}

/**
 * Transform record to CSV row
 */
function transformRecordToCsvRow(record: DvRecord, fields?: string[]): any {
  const row: any = {};
  
  const allFields = fields || [
    'id', 'accountName', 'accountDomain', 'contactFullName', 'email',
    'phoneRaw', 'phoneE164', 'jobTitle', 'country', 'state', 'city',
    'zip', 'website', 'status', 'dedupeHash', 'exclusionReason',
    'invalidReason', 'createdAt', 'updatedAt'
  ];
  
  for (const field of allFields) {
    row[field] = (record as any)[field] || '';
  }
  
  return row;
}

/**
 * Export records to CSV
 */
export async function exportRecords(options: ExportOptions): Promise<ExportResult> {
  const filePath = generateExportPath(options.projectId);
  
  // Ensure directory exists
  await mkdir(dirname(filePath), { recursive: true });
  
  // Query records
  const records = await queryRecords(options);
  
  // Create write stream
  const writeStream = createWriteStream(filePath);
  const csvStream = format({ headers: true });
  
  csvStream.pipe(writeStream);
  
  // Write records
  for (const record of records) {
    const row = transformRecordToCsvRow(record, options.fields);
    csvStream.write(row);
  }
  
  csvStream.end();
  
  // Wait for stream to finish
  await new Promise((resolve, reject) => {
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });
  
  return {
    filePath,
    rowCount: records.length,
  };
}

/**
 * Stream export for large datasets
 */
export async function streamExport(
  options: ExportOptions,
  onProgress?: (count: number) => void
): Promise<ExportResult> {
  const filePath = generateExportPath(options.projectId);
  
  await mkdir(dirname(filePath), { recursive: true });
  
  const writeStream = createWriteStream(filePath);
  const csvStream = format({ headers: true });
  
  csvStream.pipe(writeStream);
  
  let rowCount = 0;
  const records = await queryRecords(options);
  
  for (const record of records) {
    const row = transformRecordToCsvRow(record, options.fields);
    csvStream.write(row);
    rowCount++;
    
    if (onProgress && rowCount % 100 === 0) {
      onProgress(rowCount);
    }
  }
  
  csvStream.end();
  
  await new Promise((resolve, reject) => {
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });
  
  return {
    filePath,
    rowCount,
  };
}
