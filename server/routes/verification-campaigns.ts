import { Router } from "express";
import { db } from "../db";
import { verificationCampaigns, insertVerificationCampaignSchema, verificationLeadSubmissions, verificationContacts, accounts } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { formatPhoneWithCountryCode } from "../lib/phone-formatter";

const router = Router();

router.get("/api/verification-campaigns", async (req, res) => {
  try {
    const campaigns = await db.select().from(verificationCampaigns);
    res.json(campaigns);
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    res.status(500).json({ error: "Failed to fetch campaigns" });
  }
});

router.get("/api/verification-campaigns/:id", async (req, res) => {
  try {
    const [campaign] = await db
      .select()
      .from(verificationCampaigns)
      .where(eq(verificationCampaigns.id, req.params.id));
    
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }
    
    res.json(campaign);
  } catch (error) {
    console.error("Error fetching campaign:", error);
    res.status(500).json({ error: "Failed to fetch campaign" });
  }
});

router.post("/api/verification-campaigns", async (req, res) => {
  try {
    const validatedData = insertVerificationCampaignSchema.parse(req.body);
    
    const [campaign] = await db
      .insert(verificationCampaigns)
      .values([validatedData])
      .returning();
    
    res.status(201).json(campaign);
  } catch (error) {
    console.error("Error creating campaign:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create campaign" });
  }
});

router.put("/api/verification-campaigns/:id", async (req, res) => {
  try {
    const updateSchema = insertVerificationCampaignSchema.partial();
    const validatedData = updateSchema.parse(req.body);
    
    const [campaign] = await db
      .update(verificationCampaigns)
      .set({ ...validatedData, updatedAt: new Date() })
      .where(eq(verificationCampaigns.id, req.params.id))
      .returning();
    
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }
    
    res.json(campaign);
  } catch (error) {
    console.error("Error updating campaign:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    res.status(500).json({ error: "Failed to update campaign" });
  }
});

router.delete("/api/verification-campaigns/:id", async (req, res) => {
  try {
    await db
      .delete(verificationCampaigns)
      .where(eq(verificationCampaigns.id, req.params.id));
    
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting campaign:", error);
    res.status(500).json({ error: "Failed to delete campaign" });
  }
});

router.get("/api/verification-campaigns/:campaignId/stats", async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    // Get all counts in a single query for efficiency
    const stats = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE deleted = FALSE) as total_contacts,
        COUNT(*) FILTER (WHERE deleted = FALSE AND suppressed = TRUE) as suppressed_count,
        COUNT(*) FILTER (WHERE deleted = FALSE AND suppressed = FALSE) as active_count,
        COUNT(*) FILTER (WHERE deleted = FALSE AND suppressed = FALSE AND eligibility_status = 'Eligible') as eligible_count,
        COUNT(*) FILTER (WHERE deleted = FALSE AND suppressed = FALSE AND eligibility_status = 'Eligible' AND verification_status = 'Validated') as validated_count,
        COUNT(*) FILTER (WHERE deleted = FALSE AND suppressed = FALSE AND eligibility_status = 'Eligible' AND verification_status = 'Validated' AND email_status IN ('valid', 'safe_to_send')) as ok_email_count,
        COUNT(*) FILTER (WHERE deleted = FALSE AND suppressed = FALSE AND eligibility_status = 'Eligible' AND verification_status = 'Invalid') as invalid_email_count,
        COUNT(*) FILTER (WHERE in_submission_buffer = TRUE) as in_buffer_count
      FROM verification_contacts
      WHERE campaign_id = ${campaignId}
    `);
    
    // Get submitted count separately
    const [submittedResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(verificationLeadSubmissions)
      .where(eq(verificationLeadSubmissions.campaignId, campaignId));
    
    const row = stats.rows[0] as any;
    
    res.json({
      totalContacts: Number(row.total_contacts || 0),
      suppressedCount: Number(row.suppressed_count || 0),
      activeCount: Number(row.active_count || 0),
      eligibleCount: Number(row.eligible_count || 0),
      validatedCount: Number(row.validated_count || 0),
      okEmailCount: Number(row.ok_email_count || 0),
      invalidEmailCount: Number(row.invalid_email_count || 0),
      submittedCount: Number(submittedResult?.count || 0),
      inBufferCount: Number(row.in_buffer_count || 0),
    });
  } catch (error) {
    console.error("Error fetching campaign stats:", error);
    res.status(500).json({ error: "Failed to fetch campaign stats" });
  }
});

router.get("/api/verification-campaigns/:campaignId/account-caps", async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    // Get campaign to retrieve lead cap setting
    const [campaign] = await db
      .select()
      .from(verificationCampaigns)
      .where(eq(verificationCampaigns.id, campaignId));
    
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }
    
    const leadCap = campaign.leadCapPerAccount;
    
    // If no cap is configured, return empty array (uncapped campaign)
    if (!leadCap || leadCap <= 0) {
      return res.json([]);
    }
    
    // Get contact counts per account for this campaign
    const accountCapStats = await db.execute(sql`
      SELECT
        a.id as account_id,
        a.name as account_name,
        a.domain,
        COUNT(c.id) as contact_count
      FROM verification_contacts c
      INNER JOIN accounts a ON c.account_id = a.id
      WHERE c.campaign_id = ${campaignId}
        AND c.deleted = FALSE
      GROUP BY a.id, a.name, a.domain
      ORDER BY contact_count DESC
    `);
    
    const results = (accountCapStats.rows as any[]).map((row) => {
      const contactCount = Number(row.contact_count);
      const remaining = Math.max(0, leadCap - contactCount);
      const percentUsed = Math.round((contactCount / leadCap) * 100);
      
      return {
        accountId: row.account_id,
        accountName: row.account_name,
        domain: row.domain,
        contactCount,
        leadCap,
        remaining,
        percentUsed,
        isAtCap: contactCount >= leadCap,
      };
    });
    
    res.json(results);
  } catch (error) {
    console.error("Error fetching account cap stats:", error);
    res.status(500).json({ error: "Failed to fetch account cap stats" });
  }
});

router.get("/api/verification-campaigns/:campaignId/contacts", async (req, res) => {
  try {
    const { campaignId } = req.params;
    const filter = req.query.filter as string;
    
    if (!filter) {
      return res.status(400).json({ error: "filter query parameter is required" });
    }
    
    let filterCondition = sql`1=1`;
    
    switch (filter) {
      case 'all':
        filterCondition = sql`c.deleted = FALSE`;
        break;
      case 'eligible':
        filterCondition = sql`c.deleted = FALSE AND c.suppressed = FALSE AND c.eligibility_status = 'Eligible'`;
        break;
      case 'suppressed':
        filterCondition = sql`c.deleted = FALSE AND c.suppressed = TRUE`;
        break;
      case 'validated':
        filterCondition = sql`c.deleted = FALSE AND c.suppressed = FALSE AND c.verification_status = 'Validated'`;
        break;
      case 'ok_email':
        filterCondition = sql`c.deleted = FALSE AND c.suppressed = FALSE AND c.email_status IN ('valid', 'safe_to_send')`;
        break;
      case 'invalid_email':
        filterCondition = sql`c.deleted = FALSE AND c.suppressed = FALSE AND c.verification_status = 'Invalid'`;
        break;
      case 'submitted':
        // Get submitted lead contact IDs
        const submittedLeads = await db
          .select({ contactId: verificationLeadSubmissions.contactId })
          .from(verificationLeadSubmissions)
          .where(eq(verificationLeadSubmissions.campaignId, campaignId));
        
        const submittedIds = submittedLeads.map(l => l.contactId).filter(Boolean);
        
        if (submittedIds.length === 0) {
          return res.json([]);
        }
        
        filterCondition = sql`c.id IN (${sql.join(submittedIds.map(id => sql`${id}`), sql`, `)})`;
        break;
      default:
        return res.status(400).json({ error: "Invalid filter" });
    }
    
    const contacts = await db.execute(sql`
      SELECT 
        c.id,
        c.full_name as "fullName",
        c.email,
        c.title,
        c.verification_status as "verificationStatus",
        c.email_status as "emailStatus",
        c.suppressed,
        c.eligibility_status as "eligibilityStatus",
        c.eligibility_reason as "eligibilityReason",
        a.name as "accountName"
      FROM verification_contacts c
      LEFT JOIN accounts a ON a.id = c.account_id
      WHERE c.campaign_id = ${campaignId}
        AND ${filterCondition}
      ORDER BY c.updated_at DESC
      LIMIT 500
    `);
    
    res.json(contacts.rows);
  } catch (error) {
    console.error("Error fetching filtered contacts:", error);
    res.status(500).json({ error: "Failed to fetch filtered contacts" });
  }
});

router.get("/api/verification-campaigns/:campaignId/accounts/:accountName/cap", async (req, res) => {
  try {
    const { campaignId, accountName } = req.params;
    
    // Resolve accountId by case-insensitive name
    const [acct] = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(sql`LOWER(${accounts.name}) = LOWER(${accountName})`)
      .limit(1);

    if (!acct) {
      return res.json({ accountName, submitted: 0 });
    }

    const [result] = await db
      .select({ submitted: sql<number>`count(*)` })
      .from(verificationLeadSubmissions)
      .where(and(
        eq(verificationLeadSubmissions.campaignId, campaignId),
        eq(verificationLeadSubmissions.accountId, acct.id)
      ));
    
    res.json({
      accountName,
      submitted: Number(result?.submitted || 0)
    });
  } catch (error) {
    console.error("Error fetching account cap:", error);
    res.status(500).json({ error: "Failed to fetch account cap" });
  }
});

router.get("/api/verification-campaigns/:campaignId/export", async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { 
      filter,
      fullName, 
      email, 
      title, 
      phone, 
      accountName,
      city,
      state,
      country,
      eligibilityStatus, 
      verificationStatus, 
      emailStatus, 
      qaStatus,
      suppressed,
      customFields 
    } = req.query;

    // Build filter conditions
    const conditions: any[] = [sql`c.campaign_id = ${campaignId}`];
    
    // Preset filter (all, eligible, suppressed, submitted, etc.)
    if (filter) {
      switch (filter) {
        case 'all':
          conditions.push(sql`c.deleted = FALSE`);
          break;
        case 'eligible':
          conditions.push(sql`c.deleted = FALSE AND c.suppressed = FALSE AND c.eligibility_status = 'Eligible'`);
          break;
        case 'suppressed':
          conditions.push(sql`c.deleted = FALSE AND c.suppressed = TRUE`);
          break;
        case 'validated':
          conditions.push(sql`c.deleted = FALSE AND c.suppressed = FALSE AND c.verification_status = 'Validated'`);
          break;
        case 'ok_email':
          conditions.push(sql`c.deleted = FALSE AND c.suppressed = FALSE AND c.email_status IN ('valid', 'safe_to_send')`);
          break;
        case 'invalid_email':
          conditions.push(sql`c.deleted = FALSE AND c.suppressed = FALSE AND c.verification_status = 'Invalid'`);
          break;
        case 'submitted':
          const submittedLeads = await db
            .select({ contactId: verificationLeadSubmissions.contactId })
            .from(verificationLeadSubmissions)
            .where(eq(verificationLeadSubmissions.campaignId, campaignId));
          
          const submittedIds = submittedLeads.map(l => l.contactId).filter(Boolean);
          
          if (submittedIds.length === 0) {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="verification-contacts-${campaignId}-${new Date().toISOString()}.csv"`);
            return res.send('No contacts found');
          }
          
          conditions.push(sql`c.id IN (${sql.join(submittedIds.map(id => sql`${id}`), sql`, `)})`);
          break;
      }
    } else {
      conditions.push(sql`c.deleted = FALSE`);
    }

    // Advanced filters
    if (fullName) {
      conditions.push(sql`c.full_name ILIKE ${`%${fullName}%`}`);
    }
    if (email) {
      conditions.push(sql`c.email ILIKE ${`%${email}%`}`);
    }
    if (title) {
      conditions.push(sql`c.title ILIKE ${`%${title}%`}`);
    }
    if (phone) {
      conditions.push(sql`(c.phone ILIKE ${`%${phone}%`} OR c.mobile ILIKE ${`%${phone}%`})`);
    }
    if (accountName) {
      conditions.push(sql`a.name ILIKE ${`%${accountName}%`}`);
    }
    if (city) {
      conditions.push(sql`c.contact_city ILIKE ${`%${city}%`}`);
    }
    if (state) {
      conditions.push(sql`c.contact_state ILIKE ${`%${state}%`}`);
    }
    if (country) {
      conditions.push(sql`c.contact_country ILIKE ${`%${country}%`}`);
    }
    if (eligibilityStatus) {
      conditions.push(sql`c.eligibility_status = ${eligibilityStatus}`);
    }
    if (verificationStatus) {
      conditions.push(sql`c.verification_status = ${verificationStatus}`);
    }
    if (emailStatus) {
      conditions.push(sql`c.email_status = ${emailStatus}`);
    }
    if (qaStatus) {
      conditions.push(sql`c.qa_status = ${qaStatus}`);
    }
    if (suppressed !== undefined && suppressed !== 'all') {
      conditions.push(sql`c.suppressed = ${suppressed === 'true'}`);
    }

    // Custom fields filtering
    if (customFields && typeof customFields === 'string') {
      try {
        const customFieldsObj = JSON.parse(customFields);
        for (const [key, value] of Object.entries(customFieldsObj)) {
          if (value && typeof value === 'string') {
            const [entityType, fieldKey] = key.split('.');
            if (entityType === 'contact') {
              conditions.push(sql`c.custom_fields->>${fieldKey} ILIKE ${`%${value}%`}`);
            } else if (entityType === 'account') {
              conditions.push(sql`a.custom_fields->>${fieldKey} ILIKE ${`%${value}%`}`);
            }
          }
        }
      } catch (e) {
        console.error('Error parsing custom fields:', e);
      }
    }

    // Build WHERE clause
    const whereClause = conditions.length > 0 
      ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
      : sql``;

    // Fetch all contacts matching the filters
    const result = await db.execute(sql`
      SELECT 
        c.id,
        c.full_name,
        c.first_name,
        c.last_name,
        c.title,
        c.email,
        c.email_lower,
        c.phone,
        c.mobile,
        c.linkedin_url,
        c.cav_id,
        c.cav_user_id,
        c.former_position,
        c.time_in_current_position,
        c.time_in_current_position_months,
        c.time_in_current_company,
        c.time_in_current_company_months,
        c.contact_address1,
        c.contact_address2,
        c.contact_address3,
        c.contact_city,
        c.contact_state,
        c.contact_country,
        c.contact_postal,
        c.hq_address_1,
        c.hq_address_2,
        c.hq_address_3,
        c.hq_city,
        c.hq_state,
        c.hq_country,
        c.hq_postal,
        c.hq_phone,
        c.eligibility_status,
        c.eligibility_reason,
        c.verification_status,
        c.qa_status,
        c.email_status,
        c.suppressed,
        c.source_type,
        c.priority_score,
        c.in_submission_buffer,
        c.assignee_id,
        c.address_enrichment_status,
        c.phone_enrichment_status,
        c.custom_fields,
        c.created_at,
        c.updated_at,
        a.name as account_name,
        a.domain as account_domain,
        a.industry_standardized as account_industry,
        a.employees_size_range as account_size,
        a.revenue_range as account_revenue,
        a.main_phone as account_phone,
        a.hq_street_1 as account_hq_street1,
        a.hq_street_2 as account_hq_street2,
        a.hq_city as account_city,
        a.hq_state as account_state,
        a.hq_country as account_country,
        a.hq_postal_code as account_postal,
        a.custom_fields as account_custom_fields
      FROM verification_contacts c
      LEFT JOIN accounts a ON a.id = c.account_id
      ${whereClause}
      ORDER BY c.updated_at DESC
    `);

    const contacts = result.rows as any[];

    // Collect all unique custom field keys from contacts and accounts
    const contactCustomFieldKeys = new Set<string>();
    const accountCustomFieldKeys = new Set<string>();
    
    contacts.forEach(contact => {
      if (contact.custom_fields && typeof contact.custom_fields === 'object') {
        Object.keys(contact.custom_fields).forEach(key => contactCustomFieldKeys.add(key));
      }
      if (contact.account_custom_fields && typeof contact.account_custom_fields === 'object') {
        Object.keys(contact.account_custom_fields).forEach(key => accountCustomFieldKeys.add(key));
      }
    });

    // Generate CSV
    const csvRows: string[] = [];
    
    // Header row
    const headers = [
      'ID',
      'Full Name',
      'First Name',
      'Last Name',
      'Title',
      'Email',
      'Email Lower',
      'Phone',
      'Mobile',
      'LinkedIn URL',
      'CAV ID',
      'CAV User ID',
      'Former Position',
      'Time in Current Position',
      'Time in Current Position (Months)',
      'Time in Current Company',
      'Time in Current Company (Months)',
      'Contact Address 1',
      'Contact Address 2',
      'Contact Address 3',
      'Contact City',
      'Contact State',
      'Contact Country',
      'Contact Postal Code',
      'HQ Address 1',
      'HQ Address 2',
      'HQ Address 3',
      'HQ City',
      'HQ State',
      'HQ Country',
      'HQ Postal Code',
      'HQ Phone',
      'Eligibility Status',
      'Eligibility Reason',
      'Verification Status',
      'QA Status',
      'Email Status',
      'Suppressed',
      'Source Type',
      'Priority Score',
      'In Submission Buffer',
      'Assignee ID',
      'Address Enrichment Status',
      'Phone Enrichment Status',
      'Created At',
      'Updated At',
      'Account Name',
      'Account Domain',
      'Account Industry',
      'Account Size',
      'Account Revenue',
      'Account Phone',
      'Account HQ Street 1',
      'Account HQ Street 2',
      'Account City',
      'Account State',
      'Account Country',
      'Account Postal Code',
    ];
    
    // Add contact custom field headers
    const sortedContactCustomFieldKeys = Array.from(contactCustomFieldKeys).sort();
    sortedContactCustomFieldKeys.forEach(key => {
      headers.push(`Contact Custom: ${key}`);
    });
    
    // Add account custom field headers
    const sortedAccountCustomFieldKeys = Array.from(accountCustomFieldKeys).sort();
    sortedAccountCustomFieldKeys.forEach(key => {
      headers.push(`Account Custom: ${key}`);
    });
    
    csvRows.push(headers.join(','));

    // Data rows
    for (const contact of contacts) {
      const escapeCSV = (val: any) => {
        if (val === null || val === undefined) return '';
        const str = String(val);
        return `"${str.replace(/"/g, '""')}"`;
      };

      const row = [
        contact.id,
        escapeCSV(contact.full_name),
        escapeCSV(contact.first_name),
        escapeCSV(contact.last_name),
        escapeCSV(contact.title),
        contact.email || '',
        contact.email_lower || '',
        formatPhoneWithCountryCode(contact.phone, contact.contact_country),
        formatPhoneWithCountryCode(contact.mobile, contact.contact_country),
        contact.linkedin_url || '',
        contact.cav_id || '',
        contact.cav_user_id || '',
        escapeCSV(contact.former_position),
        contact.time_in_current_position || '',
        contact.time_in_current_position_months || '',
        contact.time_in_current_company || '',
        contact.time_in_current_company_months || '',
        escapeCSV(contact.contact_address1),
        escapeCSV(contact.contact_address2),
        escapeCSV(contact.contact_address3),
        escapeCSV(contact.contact_city),
        escapeCSV(contact.contact_state),
        escapeCSV(contact.contact_country),
        contact.contact_postal || '',
        escapeCSV(contact.hq_address_1),
        escapeCSV(contact.hq_address_2),
        escapeCSV(contact.hq_address_3),
        escapeCSV(contact.hq_city),
        escapeCSV(contact.hq_state),
        escapeCSV(contact.hq_country),
        contact.hq_postal || '',
        formatPhoneWithCountryCode(contact.hq_phone, contact.hq_country),
        contact.eligibility_status || '',
        escapeCSV(contact.eligibility_reason),
        contact.verification_status || '',
        contact.qa_status || '',
        contact.email_status || '',
        contact.suppressed ? 'Yes' : 'No',
        contact.source_type || '',
        contact.priority_score || '',
        contact.in_submission_buffer ? 'Yes' : 'No',
        contact.assignee_id || '',
        contact.address_enrichment_status || '',
        contact.phone_enrichment_status || '',
        contact.created_at || '',
        contact.updated_at || '',
        escapeCSV(contact.account_name),
        contact.account_domain || '',
        escapeCSV(contact.account_industry),
        contact.account_size || '',
        contact.account_revenue || '',
        formatPhoneWithCountryCode(contact.account_phone, contact.account_country),
        escapeCSV(contact.account_hq_street1),
        escapeCSV(contact.account_hq_street2),
        escapeCSV(contact.account_city),
        escapeCSV(contact.account_state),
        escapeCSV(contact.account_country),
        contact.account_postal || '',
      ];
      
      // Add contact custom fields
      sortedContactCustomFieldKeys.forEach(key => {
        const customFieldValue = contact.custom_fields?.[key] || '';
        // Format phone numbers for any phone-related custom field
        const isPhoneField = /phone|tel|mobile|fax/i.test(key);
        if (isPhoneField && customFieldValue) {
          row.push(formatPhoneWithCountryCode(customFieldValue, contact.contact_country));
        } else {
          row.push(escapeCSV(customFieldValue));
        }
      });
      
      // Add account custom fields
      sortedAccountCustomFieldKeys.forEach(key => {
        const customFieldValue = contact.account_custom_fields?.[key] || '';
        row.push(escapeCSV(customFieldValue));
      });
      
      csvRows.push(row.join(','));
    }

    const csv = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="verification-contacts-${campaignId}-${new Date().toISOString()}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error("Error exporting contacts:", error);
    res.status(500).json({ error: "Failed to export contacts" });
  }
});

export default router;
