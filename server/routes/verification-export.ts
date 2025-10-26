/**
 * Verification Campaign Export Routes
 * Stream campaign contacts to CSV → S3 → presigned download URL
 */

import { Router } from "express";
import { db } from "../db";
import { verificationContacts, verificationCampaigns, accounts } from "@shared/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { requireAuth } from "../auth";
import { uploadToS3, getPresignedDownloadUrl } from "../lib/s3";
import { z } from "zod";

const router = Router();

// Export filter schema
const exportFilterSchema = z.object({
  eligibilityStatuses: z.array(z.enum([
    'Eligible', 'Ineligible_Geography', 'Ineligible_Title', 
    'Ineligible_Email_Invalid', 'Ineligible_Email_Risky', 
    'Ineligible_Email_Disposable', 'Pending_Email_Validation', 'Excluded'
  ])).optional(),
  verificationStatuses: z.array(z.enum([
    'New', 'Validated', 'Invalid', 'To_Review'
  ])).optional(),
  emailStatuses: z.array(z.string()).optional(),
  suppressed: z.boolean().optional(),
  inSubmissionBuffer: z.boolean().optional(),
  includeDeleted: z.boolean().optional().default(false),
});

/**
 * Export verification campaign contacts to CSV
 * POST /api/verification-campaigns/:campaignId/export
 * 
 * Body:
 * {
 *   "eligibilityStatuses": ["Eligible"],  // Optional filter
 *   "verificationStatuses": ["Validated"], // Optional filter
 *   "emailStatuses": ["ok"],              // Optional filter
 *   "suppressed": false,                  // Optional filter
 *   "inSubmissionBuffer": false,          // Optional filter
 *   "includeDeleted": false               // Default: false
 * }
 * 
 * Response:
 * {
 *   "downloadUrl": "https://...",
 *   "expiresIn": "900s",
 *   "totalRecords": 1234,
 *   "fileName": "campaign-name-2025-10-26.csv"
 * }
 */
router.post(
  "/api/verification-campaigns/:campaignId/export",
  requireAuth,
  async (req, res) => {
    try {
      const { campaignId } = req.params;

      // Validate request body
      const validation = exportFilterSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: "Validation error",
          details: validation.error.errors,
        });
      }

      const filters = validation.data;

      // Get campaign and verify access (RBAC)
      const [campaign] = await db
        .select()
        .from(verificationCampaigns)
        .where(eq(verificationCampaigns.id, campaignId));

      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      // Security: Verify user has access to this campaign
      // Admin users can access all campaigns
      // Regular users can only access campaigns they own or are assigned to
      if (req.auth.role !== 'admin') {
        // For non-admin users, verify ownership or assignment
        // (This assumes campaigns have an ownerId or similar field)
        // For now, we'll enforce admin-only access for exports as a security measure
        return res.status(403).json({
          error: "Forbidden",
          message: "Only administrators can export verification campaigns",
        });
      }

      console.log(`[EXPORT] Starting export for campaign ${campaignId}`, filters);

      // Build dynamic query with filters
      const conditions = [eq(verificationContacts.campaignId, campaignId)];

      if (!filters.includeDeleted) {
        conditions.push(eq(verificationContacts.deleted, false));
      }

      if (filters.eligibilityStatuses && filters.eligibilityStatuses.length > 0) {
        conditions.push(inArray(verificationContacts.eligibilityStatus, filters.eligibilityStatuses as any));
      }

      if (filters.verificationStatuses && filters.verificationStatuses.length > 0) {
        conditions.push(inArray(verificationContacts.verificationStatus, filters.verificationStatuses as any));
      }

      if (filters.emailStatuses && filters.emailStatuses.length > 0) {
        conditions.push(inArray(verificationContacts.emailStatus, filters.emailStatuses as any));
      }

      if (filters.suppressed !== undefined) {
        conditions.push(eq(verificationContacts.suppressed, filters.suppressed));
      }

      if (filters.inSubmissionBuffer !== undefined) {
        conditions.push(eq(verificationContacts.inSubmissionBuffer, filters.inSubmissionBuffer));
      }

      // Stream contacts from database
      const contacts = await db
        .select({
          id: verificationContacts.id,
          fullName: verificationContacts.fullName,
          firstName: verificationContacts.firstName,
          lastName: verificationContacts.lastName,
          title: verificationContacts.title,
          email: verificationContacts.email,
          phone: verificationContacts.phone,
          mobile: verificationContacts.mobile,
          linkedinUrl: verificationContacts.linkedinUrl,
          
          // Company info from account relation
          companyName: accounts.name,
          companyWebsite: accounts.websiteUrl,
          companyIndustry: accounts.industryStandardized,
          companySize: accounts.employeesSizeRange,
          companyRevenue: accounts.revenueRange,
          
          // Address fields
          contactCity: verificationContacts.contactCity,
          contactState: verificationContacts.contactState,
          contactCountry: verificationContacts.contactCountry,
          contactPostal: verificationContacts.contactPostal,
          
          hqCity: verificationContacts.hqCity,
          hqState: verificationContacts.hqState,
          hqCountry: verificationContacts.hqCountry,
          hqPostal: verificationContacts.hqPostal,
          hqPhone: verificationContacts.hqPhone,
          
          // Status fields
          eligibilityStatus: verificationContacts.eligibilityStatus,
          verificationStatus: verificationContacts.verificationStatus,
          emailStatus: verificationContacts.emailStatus,
          priorityScore: verificationContacts.priorityScore,
          suppressed: verificationContacts.suppressed,
          inSubmissionBuffer: verificationContacts.inSubmissionBuffer,
          
          // Metadata
          sourceType: verificationContacts.sourceType,
          cavId: verificationContacts.cavId,
          createdAt: verificationContacts.createdAt,
          updatedAt: verificationContacts.updatedAt,
        })
        .from(verificationContacts)
        .leftJoin(accounts, eq(verificationContacts.accountId, accounts.id))
        .where(and(...conditions))
        .orderBy(verificationContacts.createdAt);

      if (contacts.length === 0) {
        return res.status(404).json({
          error: "No contacts found",
          message: "No contacts match the specified filters",
        });
      }

      console.log(`[EXPORT] Found ${contacts.length} contacts to export`);

      // Generate CSV content
      const headers = [
        'ID',
        'Full Name',
        'First Name',
        'Last Name',
        'Title',
        'Email',
        'Phone',
        'Mobile',
        'LinkedIn URL',
        'Company Name',
        'Company Website',
        'Company Industry',
        'Company Size',
        'Company Revenue',
        'Contact City',
        'Contact State',
        'Contact Country',
        'Contact Postal',
        'HQ City',
        'HQ State',
        'HQ Country',
        'HQ Postal',
        'HQ Phone',
        'Eligibility Status',
        'Verification Status',
        'Email Status',
        'Priority Score',
        'Suppressed',
        'In Submission Buffer',
        'Source Type',
        'CAV ID',
        'Created At',
        'Updated At',
      ];

      const csvLines = [headers.join(',')];

      for (const contact of contacts) {
        const row = [
          escapeCSV(contact.id || ''),
          escapeCSV(contact.fullName || ''),
          escapeCSV(contact.firstName || ''),
          escapeCSV(contact.lastName || ''),
          escapeCSV(contact.title || ''),
          escapeCSV(contact.email || ''),
          escapeCSV(contact.phone || ''),
          escapeCSV(contact.mobile || ''),
          escapeCSV(contact.linkedinUrl || ''),
          escapeCSV(contact.companyName || ''),
          escapeCSV(contact.companyWebsite || ''),
          escapeCSV(contact.companyIndustry || ''),
          escapeCSV(contact.companySize || ''),
          escapeCSV(contact.companyRevenue || ''),
          escapeCSV(contact.contactCity || ''),
          escapeCSV(contact.contactState || ''),
          escapeCSV(contact.contactCountry || ''),
          escapeCSV(contact.contactPostal || ''),
          escapeCSV(contact.hqCity || ''),
          escapeCSV(contact.hqState || ''),
          escapeCSV(contact.hqCountry || ''),
          escapeCSV(contact.hqPostal || ''),
          escapeCSV(contact.hqPhone || ''),
          escapeCSV(contact.eligibilityStatus || ''),
          escapeCSV(contact.verificationStatus || ''),
          escapeCSV(contact.emailStatus || ''),
          escapeCSV(contact.priorityScore?.toString() || ''),
          escapeCSV(contact.suppressed ? 'Yes' : 'No'),
          escapeCSV(contact.inSubmissionBuffer ? 'Yes' : 'No'),
          escapeCSV(contact.sourceType || ''),
          escapeCSV(contact.cavId || ''),
          escapeCSV(contact.createdAt?.toISOString() || ''),
          escapeCSV(contact.updatedAt?.toISOString() || ''),
        ];
        csvLines.push(row.join(','));
      }

      const csvContent = csvLines.join('\n');

      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const campaignSlug = campaign.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      const fileName = `${campaignSlug}-${timestamp}.csv`;
      const s3Key = `verification-exports/${campaignId}/${fileName}`;

      // Upload to S3
      const csvBuffer = Buffer.from(csvContent, 'utf-8');
      await uploadToS3(csvBuffer, s3Key, 'text/csv');
      
      // Generate presigned download URL (15 min expiry)
      const presignedUrl = await getPresignedDownloadUrl(s3Key, 900);

      console.log(`[EXPORT] Successfully exported ${contacts.length} contacts to ${s3Key}`);

      res.json({
        downloadUrl: presignedUrl,
        expiresIn: "900s",
        totalRecords: contacts.length,
        fileName,
        filters: {
          eligibilityStatuses: filters.eligibilityStatuses,
          verificationStatuses: filters.verificationStatuses,
          emailStatuses: filters.emailStatuses,
          suppressed: filters.suppressed,
          inSubmissionBuffer: filters.inSubmissionBuffer,
        },
      });
    } catch (error) {
      console.error("[EXPORT] Error exporting contacts:", error);
      res.status(500).json({
        error: "Export failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

/**
 * Quick export presets for common use cases
 */

// Helper function for preset exports
async function handlePresetExport(
  req: any,
  res: any,
  filters: any
) {
  const { campaignId } = req.params;
  
  try {
    const [campaign] = await db
      .select()
      .from(verificationCampaigns)
      .where(eq(verificationCampaigns.id, campaignId));

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    // Security: Verify user has access to this campaign
    if (req.auth.role !== 'admin') {
      return res.status(403).json({
        error: "Forbidden",
        message: "Only administrators can export verification campaigns",
      });
    }

    // Re-execute the main export logic with preset filters
    req.body = filters;
    
    // Forward to main export endpoint logic (duplicate for simplicity)
    const validation = exportFilterSchema.safeParse(filters);
    if (!validation.success) {
      return res.status(400).json({ error: "Invalid filters" });
    }

    // Build query conditions
    const conditions = [
      eq(verificationContacts.campaignId, campaignId),
      eq(verificationContacts.deleted, false)
    ];

    if (filters.eligibilityStatuses) {
      conditions.push(inArray(verificationContacts.eligibilityStatus, filters.eligibilityStatuses as any));
    }
    if (filters.verificationStatuses) {
      conditions.push(inArray(verificationContacts.verificationStatus, filters.verificationStatuses as any));
    }
    if (filters.emailStatuses) {
      conditions.push(inArray(verificationContacts.emailStatus, filters.emailStatuses as any));
    }
    if (filters.suppressed !== undefined) {
      conditions.push(eq(verificationContacts.suppressed, filters.suppressed));
    }
    if (filters.inSubmissionBuffer !== undefined) {
      conditions.push(eq(verificationContacts.inSubmissionBuffer, filters.inSubmissionBuffer));
    }

    // Query contacts
    const contacts = await db
      .select({
        id: verificationContacts.id,
        fullName: verificationContacts.fullName,
        firstName: verificationContacts.firstName,
        lastName: verificationContacts.lastName,
        title: verificationContacts.title,
        email: verificationContacts.email,
        phone: verificationContacts.phone,
        mobile: verificationContacts.mobile,
        linkedinUrl: verificationContacts.linkedinUrl,
        companyName: accounts.name,
        companyWebsite: accounts.websiteUrl,
        companyIndustry: accounts.industryStandardized,
        companySize: accounts.employeesSizeRange,
        companyRevenue: accounts.revenueRange,
        contactCity: verificationContacts.contactCity,
        contactState: verificationContacts.contactState,
        contactCountry: verificationContacts.contactCountry,
        contactPostal: verificationContacts.contactPostal,
        hqCity: verificationContacts.hqCity,
        hqState: verificationContacts.hqState,
        hqCountry: verificationContacts.hqCountry,
        hqPostal: verificationContacts.hqPostal,
        hqPhone: verificationContacts.hqPhone,
        eligibilityStatus: verificationContacts.eligibilityStatus,
        verificationStatus: verificationContacts.verificationStatus,
        emailStatus: verificationContacts.emailStatus,
        priorityScore: verificationContacts.priorityScore,
        suppressed: verificationContacts.suppressed,
        inSubmissionBuffer: verificationContacts.inSubmissionBuffer,
        sourceType: verificationContacts.sourceType,
        cavId: verificationContacts.cavId,
        createdAt: verificationContacts.createdAt,
        updatedAt: verificationContacts.updatedAt,
      })
      .from(verificationContacts)
      .leftJoin(accounts, eq(verificationContacts.accountId, accounts.id))
      .where(and(...conditions))
      .orderBy(verificationContacts.createdAt);

    if (contacts.length === 0) {
      return res.status(404).json({ error: "No contacts found matching criteria" });
    }

    // Generate CSV
    const headers = [
      'ID', 'Full Name', 'First Name', 'Last Name', 'Title', 'Email', 'Phone', 'Mobile', 'LinkedIn URL',
      'Company Name', 'Company Website', 'Company Industry', 'Company Size', 'Company Revenue',
      'Contact City', 'Contact State', 'Contact Country', 'Contact Postal',
      'HQ City', 'HQ State', 'HQ Country', 'HQ Postal', 'HQ Phone',
      'Eligibility Status', 'Verification Status', 'Email Status', 'Priority Score',
      'Suppressed', 'In Submission Buffer', 'Source Type', 'CAV ID', 'Created At', 'Updated At',
    ];

    const csvLines = [headers.join(',')];
    for (const contact of contacts) {
      const row = [
        escapeCSV(contact.id || ''), 
        escapeCSV(contact.fullName || ''), 
        escapeCSV(contact.firstName || ''),
        escapeCSV(contact.lastName || ''), 
        escapeCSV(contact.title || ''), 
        escapeCSV(contact.email || ''),
        escapeCSV(contact.phone || ''), 
        escapeCSV(contact.mobile || ''), 
        escapeCSV(contact.linkedinUrl || ''),
        escapeCSV(contact.companyName || ''), 
        escapeCSV(contact.companyWebsite || ''), 
        escapeCSV(contact.companyIndustry || ''),
        escapeCSV(contact.companySize || ''), 
        escapeCSV(contact.companyRevenue || ''),
        escapeCSV(contact.contactCity || ''), 
        escapeCSV(contact.contactState || ''), 
        escapeCSV(contact.contactCountry || ''), 
        escapeCSV(contact.contactPostal || ''),
        escapeCSV(contact.hqCity || ''), 
        escapeCSV(contact.hqState || ''), 
        escapeCSV(contact.hqCountry || ''), 
        escapeCSV(contact.hqPostal || ''), 
        escapeCSV(contact.hqPhone || ''),
        escapeCSV(contact.eligibilityStatus || ''), 
        escapeCSV(contact.verificationStatus || ''), 
        escapeCSV(contact.emailStatus || ''),
        escapeCSV(contact.priorityScore?.toString() || ''), 
        escapeCSV(contact.suppressed ? 'Yes' : 'No'),
        escapeCSV(contact.inSubmissionBuffer ? 'Yes' : 'No'), 
        escapeCSV(contact.sourceType || ''), 
        escapeCSV(contact.cavId || ''),
        escapeCSV(contact.createdAt?.toISOString() || ''), 
        escapeCSV(contact.updatedAt?.toISOString() || ''),
      ];
      csvLines.push(row.join(','));
    }

    const csvContent = csvLines.join('\n');

    // Upload to S3
    const timestamp = new Date().toISOString().split('T')[0];
    const campaignSlug = campaign.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const fileName = `${campaignSlug}-${timestamp}.csv`;
    const s3Key = `verification-exports/${campaignId}/${fileName}`;

    const csvBuffer = Buffer.from(csvContent, 'utf-8');
    await uploadToS3(csvBuffer, s3Key, 'text/csv');
    const presignedUrl = await getPresignedDownloadUrl(s3Key, 900);

    res.json({
      downloadUrl: presignedUrl,
      expiresIn: "900s",
      totalRecords: contacts.length,
      fileName,
      filters,
    });
  } catch (error) {
    console.error("[EXPORT PRESET] Error:", error);
    res.status(500).json({ error: "Export failed", message: String(error) });
  }
}

// Export all eligible + validated contacts
router.post(
  "/api/verification-campaigns/:campaignId/export/ready-for-delivery",
  requireAuth,
  async (req, res) => {
    await handlePresetExport(req, res, {
      eligibilityStatuses: ['Eligible'],
      verificationStatuses: ['Validated'],
      emailStatuses: ['ok'],
      suppressed: false,
      inSubmissionBuffer: false,
    });
  }
);

// Export all contacts in submission buffer
router.post(
  "/api/verification-campaigns/:campaignId/export/submission-buffer",
  requireAuth,
  async (req, res) => {
    await handlePresetExport(req, res, {
      inSubmissionBuffer: true,
      suppressed: false,
    });
  }
);

// Export all eligible contacts (regardless of validation)
router.post(
  "/api/verification-campaigns/:campaignId/export/eligible",
  requireAuth,
  async (req, res) => {
    await handlePresetExport(req, res, {
      eligibilityStatuses: ['Eligible'],
      suppressed: false,
    });
  }
);

/**
 * Helper function to escape CSV values
 */
function escapeCSV(value: string): string {
  if (!value) return '';
  
  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  
  return value;
}

export default router;
