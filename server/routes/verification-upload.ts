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
  contactCity?: string;
  contactState?: string;
  contactCountry?: string;
  contactPostal?: string;
  companyName?: string;
  account_name?: string;
  companyDomain?: string;
  domain?: string;
  hqCity?: string;
  hqState?: string;
  hqCountry?: string;
  cavId?: string;
  cavUserId?: string;
  sourceType?: string;
}

router.post("/api/verification-campaigns/:campaignId/upload", async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const { csvData } = req.body;

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

    const parseResult = Papa.parse<CSVRow>(csvData, {
      header: true,
      skipEmptyLines: true,
      delimiter: "",  // Auto-detect delimiter
      delimitersToGuess: [',', '\t', '|', ';', Papa.RECORD_SEP, Papa.UNIT_SEP],
      transformHeader: (header) => {
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
          'hqcity': 'hqCity',
          'hqstate': 'hqState',
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
          if (domainValue) {
            const [a] = await tx
              .select({ id: accounts.id })
              .from(accounts)
              .where(eq(accounts.domain, domainValue))
              .limit(1);
            
            accountId = a?.id ?? (await tx.insert(accounts).values({
              name: (accountNameCsv ?? domainValue.replace(/^www\./, '').split('.')[0])!,
              domain: domainValue,
              hqCity: row.hqCity ?? null,
              hqState: row.hqState ?? null,
              hqCountry: row.hqCountry ?? null,
            }).returning({ id: accounts.id }))[0].id;
          } else if (accountNameCsv) {
            const [a] = await tx
              .select({ id: accounts.id })
              .from(accounts)
              .where(sql`LOWER(${accounts.name}) = LOWER(${accountNameCsv})`)
              .limit(1);
            
            accountId = a?.id ?? (await tx.insert(accounts).values({
              name: accountNameCsv,
              domain: null,
              hqCity: row.hqCity ?? null,
              hqState: row.hqState ?? null,
              hqCountry: row.hqCountry ?? null,
            }).returning({ id: accounts.id }))[0].id;
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
            contactCity: row.contactCity || null,
            contactState: row.contactState || null,
            contactCountry: row.contactCountry || null,
            contactPostal: row.contactPostal || null,
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
