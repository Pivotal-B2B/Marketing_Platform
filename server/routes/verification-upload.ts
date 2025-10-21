import { Router, Request, Response } from "express";
import { db } from "../db";
import { verificationContacts, verificationCampaigns, accounts } from "@shared/schema";
import { eq, and, or, sql } from "drizzle-orm";
import Papa from "papaparse";
import { evaluateEligibility, checkSuppression, computeNormalizedKeys, normalize } from "../lib/verification-utils";

const router = Router();

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

router.post("/api/verification-campaigns/:campaignId/upload", async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const { csvData, fieldMappings, updateMode } = req.body;

    if (!csvData) {
      return res.status(400).json({ error: "csvData is required" });
    }

    const [campaign] = await db
      .select()
      .from(verificationCampaigns)
      .where(eq(verificationCampaigns.id, campaignId));

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    // Parse CSV WITHOUT transforming headers first - keep original headers
    const parseResult = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
      delimiter: "",  // Auto-detect delimiter
      delimitersToGuess: [',', '\t', '|', ';', Papa.RECORD_SEP, Papa.UNIT_SEP],
    });

    if (parseResult.errors.length > 0) {
      return res.status(400).json({
        error: "CSV parsing failed",
        details: parseResult.errors,
      });
    }

    // Build field mapping lookup
    const userMappingLookup: Record<string, string> = {};
    if (fieldMappings && Array.isArray(fieldMappings)) {
      fieldMappings.forEach((mapping: any) => {
        if (mapping.csvColumn && mapping.targetField && mapping.targetField !== 'skip') {
          userMappingLookup[mapping.csvColumn] = mapping.targetField;
        }
      });
    }

    // Auto-mapping fallback
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
      'account': 'account_name',
      'companydomain': 'domain',
      'domain': 'domain',
      'websiteurl': 'domain',
      'hqaddress1': 'hqAddress1',
      'hqaddress2': 'hqAddress2',
      'hqaddress3': 'hqAddress3',
      'companyaddress1': 'hqAddress1',
      'companyaddress2': 'hqAddress2',
      'companyaddress3': 'hqAddress3',
      'hqstreet1': 'hqAddress1',
      'hqstreet2': 'hqAddress2',
      'hqstreet3': 'hqAddress3',
      'hqcity': 'hqCity',
      'hqstate': 'hqState',
      'hqpostalcode': 'hqPostal',
      'hqpostal': 'hqPostal',
      'hqzip': 'hqPostal',
      'companypostalcode': 'hqPostal',
      'companypostal': 'hqPostal',
      'hqcountry': 'hqCountry',
      'companycountry': 'hqCountry',
      'cavid': 'cavId',
      'cavuserid': 'cavUserId',
      'sourcetype': 'sourceType',
      'source': 'sourceType',
    };

    // Map each row's data to expected fields
    const mappedRows = parseResult.data.map((rawRow: any) => {
      const mappedRow: any = {};
      
      Object.keys(rawRow).forEach(csvHeader => {
        // First check user's custom mapping
        let targetField = userMappingLookup[csvHeader];
        
        // Fall back to auto-mapping
        if (!targetField) {
          const normalized = csvHeader.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
          targetField = autoMappings[normalized];
        }
        
        // If we found a target field, copy the value
        if (targetField && rawRow[csvHeader]) {
          mappedRow[targetField] = rawRow[csvHeader];
        }
      });
      
      return mappedRow;
    }) as CSVRow[];

    const rows = mappedRows;
    const results = {
      total: rows.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[],
      updatedContacts: [] as Array<{
        id: string;
        fullName: string;
        email: string | null;
        accountName: string | null;
        fieldsUpdated: string[];
      }>,
    };

    // Wrap all inserts in a transaction
    await db.transaction(async (tx) => {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        
        try {
          if (!row.fullName && !row.firstName && !row.lastName) {
            results.skipped++;
            results.errors.push(`Row ${i + 1}: Missing name information`);
            continue;
          }

          // Resolve/create account (domain > name)
          const accountNameCsv = row.account_name || row.companyName || null;
          const domainValue = (row.domain || row.companyDomain || null)?.toLowerCase() || null;

          let accountId: string | null = null;
          let accountData: any = null;
          
          if (domainValue) {
            const [a] = await tx
              .select()
              .from(accounts)
              .where(eq(accounts.domain, domainValue))
              .limit(1);
            
            if (a) {
              accountId = a.id;
              accountData = a;
            } else {
              const newAccount = await tx.insert(accounts).values({
                name: (accountNameCsv ?? domainValue.replace(/^www\./, '').split('.')[0])!,
                domain: domainValue,
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
            }
          } else if (accountNameCsv) {
            // Use smart company name normalization for matching
            const normalizedCsvName = normalize.companyKey(accountNameCsv);
            
            // Optimize: First filter by similar names using trigram similarity or LIKE
            // Then do exact normalized match in application code
            // Extract core words from normalized name for initial filter
            const coreWords = normalizedCsvName.split(' ').filter(w => w.length > 2);
            const likePattern = coreWords.length > 0 
              ? `%${coreWords[0]}%` 
              : `%${accountNameCsv}%`;
            
            // Get candidate accounts (pre-filter to reduce dataset)
            const candidateAccounts = await tx
              .select()
              .from(accounts)
              .where(sql`LOWER(${accounts.name}) LIKE LOWER(${likePattern})`)
              .limit(100); // Safety limit
            
            // Find exact match using smart normalization
            const matchedAccount = candidateAccounts.find(acc => 
              normalize.companyKey(acc.name) === normalizedCsvName
            );
            
            if (matchedAccount) {
              accountId = matchedAccount.id;
              accountData = matchedAccount;
            } else {
              const newAccount = await tx.insert(accounts).values({
                name: accountNameCsv,
                domain: null,
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
            }
          }

          const fullName = row.fullName || `${row.firstName || ''} ${row.lastName || ''}`.trim();
          const sourceType: 'Client_Provided' | 'New_Sourced' = (row.sourceType?.toLowerCase() === 'client_provided' || row.sourceType?.toLowerCase() === 'client provided')
            ? 'Client_Provided'
            : 'New_Sourced';

          // Compute normalized keys including emailLower
          const normalizedKeys = computeNormalizedKeys({
            email: row.email || null,
            firstName: row.firstName || null,
            lastName: row.lastName || null,
            contactCountry: row.contactCountry || null,
            accountName: accountNameCsv,
          });

          // Pre-compute eligibility and suppression BEFORE insert
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

          // Auto-populate contact address from company HQ if countries match
          let contactAddress1 = row.contactAddress1 || null;
          let contactAddress2 = row.contactAddress2 || null;
          let contactAddress3 = row.contactAddress3 || null;
          let contactCity = row.contactCity || null;
          let contactState = row.contactState || null;
          let contactPostal = row.contactPostal || null;
          
          if (accountData && row.contactCountry && accountData.hqCountry) {
            const contactCountryNorm = row.contactCountry.trim().toLowerCase();
            const hqCountryNorm = accountData.hqCountry.trim().toLowerCase();
            
            if (contactCountryNorm === hqCountryNorm) {
              // Auto-populate contact address fields if empty
              contactAddress1 = contactAddress1 || accountData.hqStreet1;
              contactAddress2 = contactAddress2 || accountData.hqStreet2;
              contactAddress3 = contactAddress3 || accountData.hqStreet3;
              contactCity = contactCity || accountData.hqCity;
              contactState = contactState || accountData.hqState;
              contactPostal = contactPostal || accountData.hqPostalCode;
            }
          }

          // Check for existing contact if update mode is enabled
          let existingContact = null;
          if (updateMode) {
            // Try email match first (strongest signal)
            if (row.email && normalizedKeys.emailLower) {
              const emailMatches = await tx
                .select()
                .from(verificationContacts)
                .where(and(
                  eq(verificationContacts.campaignId, campaignId),
                  eq(verificationContacts.deleted, false),
                  eq(verificationContacts.emailLower, normalizedKeys.emailLower)
                ))
                .limit(2);  // Check for duplicates
              
              if (emailMatches.length === 1) {
                existingContact = emailMatches[0];
              }
              // If multiple matches, skip to avoid ambiguity
            }
            
            // If no email match, try name + country + account match (require all three)
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
                .limit(2);  // Check for duplicates
              
              if (nameMatches.length === 1) {
                existingContact = nameMatches[0];
              }
              // If multiple matches or missing criteria, don't match (create new instead)
            }
          }

          if (existingContact) {
            // Update existing contact based on STRICT CAV ID logic
            const csvHasCavId = !!(row.cavId || row.cavUserId);
            const dbHasCavId = !!(existingContact.cavId || existingContact.cavUserId);
            
            const updateData: any = {};
            
            // RULE 1: If CSV has CAV IDs → ONLY update CAV ID fields (regardless of DB)
            if (csvHasCavId) {
              if (row.cavId) updateData.cavId = row.cavId;
              if (row.cavUserId) updateData.cavUserId = row.cavUserId;
              
            // RULE 2: Else if DB has CAV IDs → update ALL non-CAV fields
            } else if (dbHasCavId) {
              // Only overwrite if CSV provides non-empty values
              if (row.firstName) updateData.firstName = row.firstName;
              if (row.lastName) updateData.lastName = row.lastName;
              if (row.title) updateData.title = row.title;
              if (row.email) updateData.email = row.email;
              if (row.phone) updateData.phone = row.phone;
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
              
            // RULE 3: Else (neither has CAV IDs) → update all fields
            } else {
              if (row.firstName) updateData.firstName = row.firstName;
              if (row.lastName) updateData.lastName = row.lastName;
              if (row.title) updateData.title = row.title;
              if (row.email) updateData.email = row.email;
              if (row.phone) updateData.phone = row.phone;
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
            
            // Always re-evaluate eligibility and suppression on update
            updateData.eligibilityStatus = eligibility.status;
            updateData.eligibilityReason = eligibility.reason;
            updateData.suppressed = isSuppressed;
            Object.assign(updateData, normalizedKeys);
            
            // Only update if there are changes
            if (Object.keys(updateData).length > 0) {
              await tx
                .update(verificationContacts)
                .set(updateData)
                .where(eq(verificationContacts.id, existingContact.id));
              
              results.updated++;
              
              // Track which contact was updated and which fields changed
              results.updatedContacts.push({
                id: existingContact.id,
                fullName: existingContact.fullName,
                email: existingContact.email,
                accountName: accountData?.name || null,
                fieldsUpdated: Object.keys(updateData).filter(k => !['emailLower', 'fullNameLower'].includes(k)),
              });
            } else {
              results.skipped++;
            }
          } else {
            // Insert new contact
            await tx.insert(verificationContacts).values({
              campaignId,
              accountId,
              sourceType,
              fullName,
              firstName: row.firstName || null,
              lastName: row.lastName || null,
              title: row.title || null,
              email: row.email || null,
              phone: row.phone || null,
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

            results.created++;
          }
        } catch (error: any) {
          results.skipped++;
          results.errors.push(`Row ${i + 1}: ${error.message ?? String(error)}`);
        }
      }
    });

    res.json(results);
  } catch (error) {
    console.error("Error uploading verification contacts:", error);
    res.status(500).json({ error: "Failed to upload contacts" });
  }
});

export default router;
