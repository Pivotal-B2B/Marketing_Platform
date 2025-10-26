/**
 * Continuous AI Enrichment System
 * Identifies incomplete Eligible+Validated contacts and queues them for AI enrichment
 */

import { db } from '../db';
import { verificationContacts } from '@shared/schema';
import { sql, and, eq, or } from 'drizzle-orm';
import { selectBestVerificationContactData } from './verification-best-data';
import { analyzeContactCompleteness } from './contact-completeness';

export interface EnrichmentStats {
  scanned: number;
  queued: number;
  alreadyComplete: number;
  errors: number;
}

/**
 * Identify contacts needing enrichment (Eligible + Validated but incomplete data)
 * Returns list of contact IDs ready for AI enrichment
 */
export async function identifyContactsForEnrichment(campaignId: string): Promise<{
  needsPhoneEnrichment: string[];
  needsAddressEnrichment: string[];
  needsBothEnrichment: string[];
  stats: EnrichmentStats;
}> {
  console.log(`[CONTINUOUS ENRICHMENT] Scanning campaign ${campaignId} for incomplete contacts`);
  
  const stats: EnrichmentStats = {
    scanned: 0,
    queued: 0,
    alreadyComplete: 0,
    errors: 0,
  };
  
  const needsPhoneEnrichment: string[] = [];
  const needsAddressEnrichment: string[] = [];
  const needsBothEnrichment: string[] = [];
  
  try {
    // Fetch all Eligible + Validated contacts
    const contacts = await db.execute(sql`
      SELECT 
        c.id,
        c.phone,
        c.mobile,
        c.contact_address1,
        c.contact_address2,
        c.contact_address3,
        c.contact_city,
        c.contact_state,
        c.contact_country,
        c.contact_postal,
        c.hq_phone,
        c.hq_address_1,
        c.hq_address_2,
        c.hq_address_3,
        c.hq_city,
        c.hq_state,
        c.hq_country,
        c.hq_postal,
        c.ai_enriched_phone,
        c.ai_enriched_address1,
        c.ai_enriched_address2,
        c.ai_enriched_address3,
        c.ai_enriched_city,
        c.ai_enriched_state,
        c.ai_enriched_country,
        c.ai_enriched_postal,
        c.custom_fields
      FROM verification_contacts c
      WHERE c.campaign_id = ${campaignId}
        AND c.deleted = FALSE
        AND c.suppressed = FALSE
        AND c.eligibility_status = 'Eligible'
        AND c.verification_status = 'Validated'
        AND c.email_status IN ('valid', 'safe_to_send')
    `);
    
    stats.scanned = contacts.rows.length;
    console.log(`[CONTINUOUS ENRICHMENT] Scanned ${stats.scanned} Eligible+Validated contacts`);
    
    // Analyze each contact for completeness
    for (const contact of contacts.rows as any[]) {
      try {
        const smartData = selectBestVerificationContactData({
          phone: contact.phone,
          mobile: contact.mobile,
          contactAddress1: contact.contact_address1,
          contactAddress2: contact.contact_address2,
          contactAddress3: contact.contact_address3,
          contactCity: contact.contact_city,
          contactState: contact.contact_state,
          contactCountry: contact.contact_country,
          contactPostal: contact.contact_postal,
          hqPhone: contact.hq_phone,
          hqAddress1: contact.hq_address_1,
          hqAddress2: contact.hq_address_2,
          hqAddress3: contact.hq_address_3,
          hqCity: contact.hq_city,
          hqState: contact.hq_state,
          hqCountry: contact.hq_country,
          hqPostal: contact.hq_postal,
          aiEnrichedPhone: contact.ai_enriched_phone,
          aiEnrichedAddress1: contact.ai_enriched_address1,
          aiEnrichedAddress2: contact.ai_enriched_address2,
          aiEnrichedAddress3: contact.ai_enriched_address3,
          aiEnrichedCity: contact.ai_enriched_city,
          aiEnrichedState: contact.ai_enriched_state,
          aiEnrichedCountry: contact.ai_enriched_country,
          aiEnrichedPostal: contact.ai_enriched_postal,
          customFields: contact.custom_fields,
        });
        
        const completeness = analyzeContactCompleteness(smartData);
        
        if (completeness.isClientReady) {
          stats.alreadyComplete++;
        } else {
          const needsPhone = !completeness.hasCompletePhone;
          const needsAddress = !completeness.hasCompleteAddress;
          
          if (needsPhone && needsAddress) {
            needsBothEnrichment.push(contact.id);
          } else if (needsPhone) {
            needsPhoneEnrichment.push(contact.id);
          } else if (needsAddress) {
            needsAddressEnrichment.push(contact.id);
          }
          
          stats.queued++;
        }
      } catch (error) {
        console.error(`[CONTINUOUS ENRICHMENT] Error analyzing contact ${contact.id}:`, error);
        stats.errors++;
      }
    }
    
    console.log(`[CONTINUOUS ENRICHMENT] Summary:
      - Complete: ${stats.alreadyComplete}
      - Needs phone only: ${needsPhoneEnrichment.length}
      - Needs address only: ${needsAddressEnrichment.length}
      - Needs both: ${needsBothEnrichment.length}
      - Errors: ${stats.errors}
    `);
    
    return {
      needsPhoneEnrichment,
      needsAddressEnrichment,
      needsBothEnrichment,
      stats,
    };
  } catch (error) {
    console.error('[CONTINUOUS ENRICHMENT] Error:', error);
    throw error;
  }
}

/**
 * Queue contacts for AI enrichment
 * Updates enrichment status flags on contacts
 */
export async function queueForEnrichment(
  contactIds: string[],
  enrichmentType: 'phone' | 'address' | 'both'
): Promise<number> {
  if (contactIds.length === 0) return 0;
  
  console.log(`[CONTINUOUS ENRICHMENT] Queuing ${contactIds.length} contacts for ${enrichmentType} enrichment`);
  
  // Mark contacts as pending enrichment
  const updateFields: any = {
    updatedAt: new Date(),
  };
  
  if (enrichmentType === 'phone' || enrichmentType === 'both') {
    updateFields.phoneEnrichmentStatus = 'pending';
  }
  if (enrichmentType === 'address' || enrichmentType === 'both') {
    updateFields.addressEnrichmentStatus = 'pending';
  }
  
  const result = await db.execute(sql`
    UPDATE verification_contacts
    SET 
      phone_enrichment_status = CASE 
        WHEN ${enrichmentType === 'phone' || enrichmentType === 'both'} 
        THEN 'pending'::phone_enrichment_status 
        ELSE phone_enrichment_status 
      END,
      address_enrichment_status = CASE 
        WHEN ${enrichmentType === 'address' || enrichmentType === 'both'} 
        THEN 'pending'::address_enrichment_status 
        ELSE address_enrichment_status 
      END,
      updated_at = NOW()
    WHERE id = ANY(${contactIds})
  `);
  
  console.log(`[CONTINUOUS ENRICHMENT] Updated enrichment status for ${result.rowCount} contacts`);
  return result.rowCount || 0;
}
