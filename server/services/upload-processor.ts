import { db } from '../db';
import { verificationUploadJobs, verificationContacts, verificationCampaigns, accounts } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import Papa from 'papaparse';
import { evaluateEligibility, checkSuppression, computeNormalizedKeys, normalize } from '../lib/verification-utils';
import { getMatchTypeAndConfidence, normalizeDomain, extractRootDomain } from '@shared/domain-utils';

interface CSVRow {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  linkedinUrl?: string;
  contactAddress1?: string;
  contactAddress2?: string;
  contactAddress3?: string;
  contactCity?: string;
  contactState?: string;
  contactCountry?: string;
  contactPostal?: string;
  companyName?: string;
  account_name?: string;
  companyDomain?: string;
  domain?: string;
  hqPhone?: string;
  hqAddress1?: string;
  hqAddress2?: string;
  hqAddress3?: string;
  hqCity?: string;
  hqState?: string;
  hqPostal?: string;
  hqCountry?: string;
  cavId?: string;
  cavUserId?: string;
  sourceType?: string;
}

const BATCH_SIZE = 50;

const autoMappings: Record<string, string> = {
  'fullname': 'fullName',
  'name': 'fullName',
  'firstname': 'firstName',
  'lastname': 'lastName',
  'jobtitle': 'title',
  'title': 'title',
  'emailaddress': 'email',
  'email': 'email',
  'phonenumber': 'phone',
  'phone': 'phone',
  'mobilenumber': 'mobile',
  'mobile': 'mobile',
  'linkedin': 'linkedinUrl',
  'linkedinurl': 'linkedinUrl',
  'contactaddress1': 'contactAddress1',
  'contactaddress2': 'contactAddress2',
  'contactaddress3': 'contactAddress3',
  'address1': 'contactAddress1',
  'address2': 'contactAddress2',
  'address3': 'contactAddress3',
  'street1': 'contactAddress1',
  'street2': 'contactAddress2',
  'street3': 'contactAddress3',
  'contactcity': 'contactCity',
  'city': 'contactCity',
  'contactstate': 'contactState',
  'state': 'contactState',
  'contactcountry': 'contactCountry',
  'country': 'contactCountry',
  'contactpostalcode': 'contactPostal',
  'contactpostal': 'contactPostal',
  'postalcode': 'contactPostal',
  'postal': 'contactPostal',
  'zip': 'contactPostal',
  'zipcode': 'contactPostal',
  'companyname': 'account_name',
  'company': 'account_name',
  'accountname': 'account_name',
  'account_name': 'account_name',
  'organization': 'account_name',
  'employer': 'account_name',
  'companydomain': 'domain',
  'domain': 'domain',
  'website': 'domain',
  'companywebsite': 'domain',
  'hqaddress1': 'hqAddress1',
  'hqaddress2': 'hqAddress2',
  'hqaddress3': 'hqAddress3',
  'hqstreet1': 'hqAddress1',
  'hqstreet2': 'hqAddress2',
  'hqstreet3': 'hqAddress3',
  'hqcity': 'hqCity',
  'headquarterscity': 'hqCity',
  'hqstate': 'hqState',
  'headquartersstate': 'hqState',
  'hqpostalcode': 'hqPostal',
  'hqpostal': 'hqPostal',
  'hqzipcode': 'hqPostal',
  'hqcountry': 'hqCountry',
  'headquarterscountry': 'hqCountry',
  'hqphone': 'hqPhone',
  'companyphone': 'hqPhone',
  'mainphone': 'hqPhone',
  'companyphonenumber': 'hqPhone',
  'cavid': 'cavId',
  'cav_id': 'cavId',
  'cavuserid': 'cavUserId',
  'cav_user_id': 'cavUserId',
  'sourcetype': 'sourceType',
  'source_type': 'sourceType',
  'source': 'sourceType',
};

export async function processUpload(jobId: string) {
  try {
    const [uploadJob] = await db
      .select()
      .from(verificationUploadJobs)
      .where(eq(verificationUploadJobs.id, jobId));

    if (!uploadJob) {
      throw new Error('Upload job not found');
    }

    await db
      .update(verificationUploadJobs)
      .set({ status: 'processing', startedAt: new Date() })
      .where(eq(verificationUploadJobs.id, jobId));

    const { campaignId, csvData, fieldMappings, updateMode } = uploadJob;

    const [campaign] = await db
      .select()
      .from(verificationCampaigns)
      .where(eq(verificationCampaigns.id, campaignId));

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const parseResult = Papa.parse(csvData || '', {
      header: true,
      skipEmptyLines: true,
      delimiter: '',
      delimitersToGuess: [',', '\t', '|', ';', Papa.RECORD_SEP, Papa.UNIT_SEP],
    });

    if (parseResult.errors.length > 0) {
      throw new Error(`CSV parsing failed: ${JSON.stringify(parseResult.errors)}`);
    }

    const userMappingLookup: Record<string, string> = {};
    if (fieldMappings && Array.isArray(fieldMappings)) {
      (fieldMappings as any[]).forEach((mapping: any) => {
        if (mapping.csvColumn && mapping.targetField && mapping.targetField !== 'skip') {
          userMappingLookup[mapping.csvColumn] = mapping.targetField;
        }
      });
    }

    const csvHeaders = parseResult.meta.fields || [];
    const mappedRows = (parseResult.data as any[]).map(csvRow => {
      const mappedRow: Record<string, any> = {};
      for (const header of csvHeaders) {
        const headerLower = header.toLowerCase().replace(/[^a-z0-9_]/g, '');
        const targetField = userMappingLookup[header] || autoMappings[headerLower];
        if (targetField && csvRow[header] !== undefined && csvRow[header] !== null && csvRow[header] !== '') {
          mappedRow[targetField] = csvRow[header];
        }
      }
      return mappedRow;
    }) as CSVRow[];

    const totalRows = mappedRows.length;
    await db
      .update(verificationUploadJobs)
      .set({ totalRows })
      .where(eq(verificationUploadJobs.id, jobId));

    let processedRows = 0;
    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ row: number; message: string }> = [];

    const accountCache = new Map<string, any>();

    for (let batchStart = 0; batchStart < mappedRows.length; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, mappedRows.length);
      const batch = mappedRows.slice(batchStart, batchEnd);

      await db.transaction(async (tx) => {
        for (let i = 0; i < batch.length; i++) {
          const globalIndex = batchStart + i;
          const row = batch[i];

          try {
            if (!row.fullName && !row.firstName && !row.lastName) {
              errorCount++;
              errors.push({ row: globalIndex + 1, message: 'Missing name information' });
              continue;
            }

            const accountNameCsv = row.account_name || row.companyName || null;
            const domainValue = (row.domain || row.companyDomain || null)?.toLowerCase() || null;
            const emailDomain = row.email ? normalize.extractDomain(row.email) : null;

            let accountId: string | null = null;
            let accountData: any = null;

            const inputDomain = domainValue || emailDomain || '';
            const normalizedInput = inputDomain ? normalizeDomain(inputDomain) : '';
            const rootDomain = normalizedInput ? extractRootDomain(normalizedInput) : '';

            const cacheKey = rootDomain || accountNameCsv || '';
            if (cacheKey && accountCache.has(cacheKey)) {
              const cached = accountCache.get(cacheKey);
              accountId = cached.id;
              accountData = cached;
            } else {
              if (rootDomain) {
                const exactMatch = await tx
                  .select()
                  .from(accounts)
                  .where(sql`
                    ${accounts.domain} IS NOT NULL 
                    AND LOWER(TRIM(${accounts.domain})) = ${rootDomain.toLowerCase()}
                  `)
                  .limit(1);

                if (exactMatch.length > 0) {
                  accountId = exactMatch[0].id;
                  accountData = exactMatch[0];
                  accountCache.set(cacheKey, accountData);
                }
              }

              if (!accountId && (inputDomain || accountNameCsv)) {
                let candidateAccounts: typeof accounts.$inferSelect[] = [];

                if (accountNameCsv) {
                  const coreWords = normalize.companyKey(accountNameCsv).split(' ').filter(w => w.length > 2);
                  const likePattern = coreWords.length > 0 ? `%${coreWords[0]}%` : `%${accountNameCsv}%`;

                  candidateAccounts = await tx
                    .select()
                    .from(accounts)
                    .where(sql`LOWER(${accounts.name}) LIKE LOWER(${likePattern})`)
                    .limit(200);
                }

                if (candidateAccounts.length === 0 && normalizedInput) {
                  const domainRoot = normalizedInput.split('.')[0];
                  candidateAccounts = await tx
                    .select()
                    .from(accounts)
                    .where(sql`${accounts.domain} IS NOT NULL AND ${accounts.domain} LIKE ${`%${domainRoot}%`}`)
                    .limit(200);
                }

                if (candidateAccounts.length === 0) {
                  candidateAccounts = await tx
                    .select()
                    .from(accounts)
                    .limit(500);
                }

                let bestMatch: { account: typeof accounts.$inferSelect; confidence: number } | null = null;

                for (const account of candidateAccounts) {
                  const matchResult = getMatchTypeAndConfidence(
                    normalizedInput,
                    accountNameCsv || undefined,
                    account.domain || '',
                    account.name
                  );

                  if ((matchResult.matchType === 'exact' || matchResult.matchType === 'fuzzy') &&
                    matchResult.confidence >= 0.75 &&
                    (!bestMatch || matchResult.confidence > bestMatch.confidence)) {
                    bestMatch = {
                      account,
                      confidence: matchResult.confidence,
                    };
                  }
                }

                if (bestMatch) {
                  accountId = bestMatch.account.id;
                  accountData = bestMatch.account;
                  accountCache.set(cacheKey, accountData);
                }
              }

              if (!accountId) {
                const newAccount = await tx.insert(accounts).values({
                  name: accountNameCsv ?? (rootDomain ? rootDomain.split('.')[0] : 'Unknown Company'),
                  domain: rootDomain,
                  mainPhone: row.hqPhone ?? null,
                  hqStreet1: row.hqAddress1 ?? null,
                  hqStreet2: row.hqAddress2 ?? null,
                  hqStreet3: row.hqAddress3 ?? null,
                  hqCity: row.hqCity ?? null,
                  hqState: row.hqState ?? null,
                  hqPostalCode: row.hqPostal ?? null,
                  hqCountry: row.hqCountry ?? null,
                }).returning();
                accountId = newAccount[0].id;
                accountData = newAccount[0];
                accountCache.set(cacheKey, accountData);
              }
            }

            const fullName = row.fullName || `${row.firstName || ''} ${row.lastName || ''}`.trim();
            const sourceType: 'Client_Provided' | 'New_Sourced' = (row.sourceType?.toLowerCase() === 'client_provided' || row.sourceType?.toLowerCase() === 'client provided')
              ? 'Client_Provided'
              : 'New_Sourced';

            const normalizedKeys = computeNormalizedKeys({
              email: row.email || null,
              firstName: row.firstName || null,
              lastName: row.lastName || null,
              contactCountry: row.contactCountry || null,
              accountName: accountNameCsv,
            });

            const eligibility = evaluateEligibility(
              row.title || null,
              row.contactCountry || null,
              campaign,
              row.email || null
            );

            const isSuppressed = await checkSuppression(campaignId, {
              email: row.email || null,
              cavId: row.cavId || null,
              cavUserId: row.cavUserId || null,
              fullName,
              account_name: accountNameCsv,
            });

            let contactAddress1 = row.contactAddress1 || null;
            let contactAddress2 = row.contactAddress2 || null;
            let contactAddress3 = row.contactAddress3 || null;
            let contactCity = row.contactCity || null;
            let contactState = row.contactState || null;
            let contactPostal = row.contactPostal || null;
            let contactPhone = row.phone || null;

            if (accountData && row.contactCountry && accountData.hqCountry) {
              const contactCountryNorm = row.contactCountry.trim().toLowerCase();
              const hqCountryNorm = accountData.hqCountry.trim().toLowerCase();

              if (contactCountryNorm === hqCountryNorm) {
                const hqHasCompleteData =
                  accountData.hqStreet1 &&
                  accountData.hqCity &&
                  accountData.hqPostalCode &&
                  accountData.mainPhone;

                if (hqHasCompleteData) {
                  contactAddress1 = contactAddress1 || accountData.hqStreet1;
                  contactAddress2 = contactAddress2 || accountData.hqStreet2;
                  contactAddress3 = contactAddress3 || accountData.hqStreet3;
                  contactCity = contactCity || accountData.hqCity;
                  contactState = contactState || accountData.hqState;
                  contactPostal = contactPostal || accountData.hqPostalCode;
                  contactPhone = contactPhone || accountData.mainPhone;
                }
              }
            }

            let existingContact = null;
            if (updateMode) {
              if (row.email && normalizedKeys.emailLower) {
                const emailMatches = await tx
                  .select()
                  .from(verificationContacts)
                  .where(and(
                    eq(verificationContacts.campaignId, campaignId),
                    eq(verificationContacts.deleted, false),
                    eq(verificationContacts.emailLower, normalizedKeys.emailLower)
                  ))
                  .limit(2);

                if (emailMatches.length === 1) {
                  existingContact = emailMatches[0];
                }
              }

              if (!existingContact && row.contactCountry && accountData) {
                const nameMatches = await tx
                  .select()
                  .from(verificationContacts)
                  .where(and(
                    eq(verificationContacts.campaignId, campaignId),
                    eq(verificationContacts.deleted, false),
                    sql`LOWER(TRIM(${verificationContacts.fullName})) = LOWER(TRIM(${fullName}))`,
                    sql`LOWER(TRIM(${verificationContacts.contactCountry})) = LOWER(TRIM(${row.contactCountry}))`,
                    eq(verificationContacts.accountId, accountData.id)
                  ))
                  .limit(2);

                if (nameMatches.length === 1) {
                  existingContact = nameMatches[0];
                }
              }
            }

            if (existingContact) {
              const csvHasCavId = !!(row.cavId || row.cavUserId);
              const dbHasCavId = !!(existingContact.cavId || existingContact.cavUserId);

              const updateData: any = {};

              if (csvHasCavId) {
                if (row.cavId) updateData.cavId = row.cavId;
                if (row.cavUserId) updateData.cavUserId = row.cavUserId;
              } else if (dbHasCavId) {
                if (row.firstName) updateData.firstName = row.firstName;
                if (row.lastName) updateData.lastName = row.lastName;
                if (row.title) updateData.title = row.title;
                if (row.email) updateData.email = row.email;
                if (contactPhone) updateData.phone = contactPhone;
                if (row.mobile) updateData.mobile = row.mobile;
                if (row.linkedinUrl) updateData.linkedinUrl = row.linkedinUrl;
                if (contactAddress1) updateData.contactAddress1 = contactAddress1;
                if (contactAddress2) updateData.contactAddress2 = contactAddress2;
                if (contactAddress3) updateData.contactAddress3 = contactAddress3;
                if (contactCity) updateData.contactCity = contactCity;
                if (contactState) updateData.contactState = contactState;
                if (row.contactCountry) updateData.contactCountry = row.contactCountry;
                if (contactPostal) updateData.contactPostal = contactPostal;
                if (row.hqAddress1) updateData.hqAddress1 = row.hqAddress1;
                if (row.hqAddress2) updateData.hqAddress2 = row.hqAddress2;
                if (row.hqAddress3) updateData.hqAddress3 = row.hqAddress3;
                if (row.hqCity) updateData.hqCity = row.hqCity;
                if (row.hqState) updateData.hqState = row.hqState;
                if (row.hqCountry) updateData.hqCountry = row.hqCountry;
                if (row.hqPostal) updateData.hqPostal = row.hqPostal;
              } else {
                if (row.firstName) updateData.firstName = row.firstName;
                if (row.lastName) updateData.lastName = row.lastName;
                if (row.title) updateData.title = row.title;
                if (row.email) updateData.email = row.email;
                if (contactPhone) updateData.phone = contactPhone;
                if (row.mobile) updateData.mobile = row.mobile;
                if (row.linkedinUrl) updateData.linkedinUrl = row.linkedinUrl;
                if (contactAddress1) updateData.contactAddress1 = contactAddress1;
                if (contactAddress2) updateData.contactAddress2 = contactAddress2;
                if (contactAddress3) updateData.contactAddress3 = contactAddress3;
                if (contactCity) updateData.contactCity = contactCity;
                if (contactState) updateData.contactState = contactState;
                if (row.contactCountry) updateData.contactCountry = row.contactCountry;
                if (contactPostal) updateData.contactPostal = contactPostal;
                if (row.hqAddress1) updateData.hqAddress1 = row.hqAddress1;
                if (row.hqAddress2) updateData.hqAddress2 = row.hqAddress2;
                if (row.hqAddress3) updateData.hqAddress3 = row.hqAddress3;
                if (row.hqCity) updateData.hqCity = row.hqCity;
                if (row.hqState) updateData.hqState = row.hqState;
                if (row.hqCountry) updateData.hqCountry = row.hqCountry;
                if (row.hqPostal) updateData.hqPostal = row.hqPostal;
              }

              updateData.eligibilityStatus = eligibility.status;
              updateData.eligibilityReason = eligibility.reason;
              updateData.suppressed = isSuppressed;
              Object.assign(updateData, normalizedKeys);

              if (Object.keys(updateData).length > 0) {
                await tx
                  .update(verificationContacts)
                  .set(updateData)
                  .where(eq(verificationContacts.id, existingContact.id));
              }
            } else {
              await tx.insert(verificationContacts).values({
                campaignId,
                accountId,
                sourceType,
                fullName,
                firstName: row.firstName || null,
                lastName: row.lastName || null,
                title: row.title || null,
                email: row.email || null,
                phone: contactPhone,
                mobile: row.mobile || null,
                linkedinUrl: row.linkedinUrl || null,
                contactAddress1,
                contactAddress2,
                contactAddress3,
                contactCity,
                contactState,
                contactCountry: row.contactCountry || null,
                contactPostal,
                hqAddress1: row.hqAddress1 || null,
                hqAddress2: row.hqAddress2 || null,
                hqAddress3: row.hqAddress3 || null,
                hqCity: row.hqCity || null,
                hqState: row.hqState || null,
                hqCountry: row.hqCountry || null,
                hqPostal: row.hqPostal || null,
                cavId: row.cavId || null,
                cavUserId: row.cavUserId || null,
                eligibilityStatus: eligibility.status,
                eligibilityReason: eligibility.reason,
                suppressed: isSuppressed,
                ...normalizedKeys,
              });
            }

            successCount++;
          } catch (error: any) {
            errorCount++;
            errors.push({ row: globalIndex + 1, message: error.message || 'Unknown error' });
          }
        }
      });

      processedRows += batch.length;

      await db
        .update(verificationUploadJobs)
        .set({
          processedRows,
          successCount,
          errorCount,
          errors,
          updatedAt: new Date(),
        })
        .where(eq(verificationUploadJobs.id, jobId));
    }

    await db
      .update(verificationUploadJobs)
      .set({
        status: 'completed',
        finishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(verificationUploadJobs.id, jobId));

    console.log(`[Upload Processor] Job ${jobId} completed: ${successCount} success, ${errorCount} errors`);
  } catch (error: any) {
    console.error(`[Upload Processor] Job ${jobId} failed:`, error);

    await db
      .update(verificationUploadJobs)
      .set({
        status: 'failed',
        finishedAt: new Date(),
        errors: [{ row: 0, message: error.message || 'Upload job failed' }],
        updatedAt: new Date(),
      })
      .where(eq(verificationUploadJobs.id, jobId))
      .catch(err => console.error('[Upload Processor] Failed to update job status:', err));
  }
}
