/**
 * Background Job: API-Free Email Validation
 * Processes contacts with 'Pending_Email_Validation' status
 * Rate-limited, domain-aware validation queue
 */

import cron from 'node-cron';
import { db } from '../db';
import { verificationContacts, verificationCampaigns } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { validateAndStoreEmail } from '../lib/email-validation-engine';
import { finalizeEligibilityAfterEmailValidation } from '../lib/verification-utils';

const BATCH_SIZE = Number(process.env.EMAIL_VALIDATION_BATCH_SIZE || 50);
const PROCESS_INTERVAL = '*/2 * * * *'; // Every 2 minutes
const SKIP_SMTP_DEFAULT = process.env.SKIP_SMTP_VALIDATION === 'true';

let isProcessing = false;

/**
 * Process a batch of contacts pending email validation
 */
async function processPendingEmailValidations() {
  if (isProcessing) {
    console.log('[EmailValidationJob] Already processing, skipping this run');
    return;
  }
  
  isProcessing = true;
  
  try {
    // Find contacts pending email validation
    const pendingContacts = await db
      .select({
        id: verificationContacts.id,
        email: verificationContacts.email,
        campaignId: verificationContacts.campaignId,
        eligibilityStatus: verificationContacts.eligibilityStatus,
        campaign: {
          id: verificationCampaigns.id,
          emailValidationProvider: verificationCampaigns.emailValidationProvider,
        }
      })
      .from(verificationContacts)
      .leftJoin(verificationCampaigns, eq(verificationContacts.campaignId, verificationCampaigns.id))
      .where(
        and(
          eq(verificationContacts.eligibilityStatus, 'Pending_Email_Validation'),
          eq(verificationContacts.deleted, false),
          sql`${verificationContacts.email} IS NOT NULL`
        )
      )
      .limit(BATCH_SIZE);
    
    if (pendingContacts.length === 0) {
      console.log('[EmailValidationJob] No pending contacts found');
      return;
    }
    
    console.log(`[EmailValidationJob] Processing ${pendingContacts.length} contacts`);
    
    let validated = 0;
    let failed = 0;
    
    // Group by domain for rate limiting
    const byDomain = new Map<string, typeof pendingContacts>();
    for (const contact of pendingContacts) {
      if (!contact.email) continue;
      const domain = contact.email.split('@')[1]?.toLowerCase();
      if (!domain) continue;
      if (!byDomain.has(domain)) {
        byDomain.set(domain, []);
      }
      byDomain.get(domain)!.push(contact);
    }
    
    // Process each domain sequentially (rate limiting)
    for (const [domain, domainContacts] of Array.from(byDomain.entries())) {
      console.log(`[EmailValidationJob] Processing ${domainContacts.length} contacts for domain: ${domain}`);
      
      for (const contact of domainContacts) {
        if (!contact.email || !contact.campaign) continue;
        
        try {
          // Always use built-in validation
          const validation = await validateAndStoreEmail(
            contact.id,
            contact.email,
            'api_free',
            { skipSmtp: SKIP_SMTP_DEFAULT }
          );
          
          // Finalize eligibility based on validation result
          const finalEligibility = finalizeEligibilityAfterEmailValidation(
            validation.status,
            contact.eligibilityStatus || 'Pending_Email_Validation'
          );
          
          // Update contact eligibility status
          await db
            .update(verificationContacts)
            .set({
              eligibilityStatus: finalEligibility.eligibilityStatus,
              eligibilityReason: finalEligibility.reason,
              updatedAt: new Date(),
            })
            .where(eq(verificationContacts.id, contact.id));
          
          validated++;
          console.log(`[EmailValidationJob] Validated ${contact.email}: ${validation.status} → ${finalEligibility.eligibilityStatus}`);
          
        } catch (error) {
          failed++;
          console.error(`[EmailValidationJob] Error validating ${contact.email}:`, error);
          
          // Mark as eligible with unknown status (don't block workflow)
          await db
            .update(verificationContacts)
            .set({
              eligibilityStatus: 'Eligible',
              eligibilityReason: 'email_validation_failed',
              updatedAt: new Date(),
            })
            .where(eq(verificationContacts.id, contact.id));
        }
      }
      
      // Rate limiting: small delay between domains
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`[EmailValidationJob] Batch complete: ${validated} validated, ${failed} failed`);
    
  } catch (error) {
    console.error('[EmailValidationJob] Job error:', error);
  } finally {
    isProcessing = false;
  }
}

/**
 * Start the email validation background job
 */
export function startEmailValidationJob() {
  console.log(`[EmailValidationJob] Starting (interval: ${PROCESS_INTERVAL}, batch: ${BATCH_SIZE})`);
  
  // Run on startup (after 5 seconds)
  setTimeout(() => {
    processPendingEmailValidations().catch(console.error);
  }, 5000);
  
  // Schedule recurring job
  cron.schedule(PROCESS_INTERVAL, () => {
    processPendingEmailValidations().catch(console.error);
  });
}
