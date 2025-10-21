import { Router, Request, Response } from "express";
import { db } from "../db";
import { verificationContacts, verificationCampaigns, accounts } from "@shared/schema";
import { eq, and, or, sql } from "drizzle-orm";
import Papa from "papaparse";
import { evaluateEligibility, checkSuppression, computeNormalizedKeys } from "../lib/verification-utils";

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
    const { csvData, fieldMappings } = req.body;

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

    // Build mapping lookup from user's custom mappings
    const userMappingLookup: Record<string, string> = {};
    if (fieldMappings && Array.isArray(fieldMappings)) {
      fieldMappings.forEach((mapping: any) => {
        if (mapping.csvColumn && mapping.targetField && mapping.targetField !== 'skip') {
          userMappingLookup[mapping.csvColumn] = mapping.targetField;
        }
      });
    }

    const parseResult = Papa.parse<CSVRow>(csvData, {
      header: true,
      skipEmptyLines: true,
      delimiter: "",  // Auto-detect delimiter
      delimitersToGuess: [',', '\t', '|', ';', Papa.RECORD_SEP, Papa.UNIT_SEP],
      transformHeader: (header) => {
        // First, check if user provided a custom mapping for this exact header
        if (userMappingLookup[header]) {
          return userMappingLookup[header];
        }

        // Fall back to auto-mapping
        const normalized = header.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        
        const mappings: Record<string, string> = {
          'fullname': 'fullName',
          'name': 'fullName',
          'firstname': 'firstName',
          'lastname': 'lastName',
          'jobtitle': 'title',
          'emailaddress': 'email',
          'phonenumber': 'phone',
          'mobilenumber': 'mobile',
          'mobile': 'mobile',
          'linkedin': 'linkedinUrl',
          'contactaddress1': 'contactAddress1',
          'contactaddress2': 'contactAddress2',
          'contactaddress3': 'contactAddress3',
          'address1': 'contactAddress1',
          'address2': 'contactAddress2',
          'address3': 'contactAddress3',
          'street1': 'contactAddress1',
          'street2': 'contactAddress2',
          'street3': 'contactAddress3',
          'city': 'contactCity',
          'state': 'contactState',
          'country': 'contactCountry',
          'postalcode': 'contactPostal',
          'postal': 'contactPostal',
          'zip': 'contactPostal',
          'companyname': 'account_name',
          'company': 'account_name',
          'accountname': 'account_name',
          'companydomain': 'domain',
          'domain': 'domain',
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
          'cavid': 'cavId',
          'cavuserid': 'cavUserId',
          'sourcetype': 'sourceType',
          'source': 'sourceType',
        };

        return mappings[normalized] || header;
      },
    });

    if (parseResult.errors.length > 0) {
      return res.status(400).json({
        error: "CSV parsing failed",
        details: parseResult.errors,
      });
    }

    const rows = parseResult.data;
    const results = {
      total: rows.length,
      created: 0,
      skipped: 0,
      errors: [] as string[],
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
            const [a] = await tx
              .select()
              .from(accounts)
              .where(sql`LOWER(${accounts.name}) = LOWER(${accountNameCsv})`)
              .limit(1);
            
            if (a) {
              accountId = a.id;
              accountData = a;
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
            campaign
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

          // Insert in one go with derived fields
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
            cavId: row.cavId || null,
            cavUserId: row.cavUserId || null,
            eligibilityStatus: eligibility.status,
            eligibilityReason: eligibility.reason,
            suppressed: isSuppressed,
            ...normalizedKeys,
          });

          results.created++;
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
