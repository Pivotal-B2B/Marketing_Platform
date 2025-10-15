import { eq, isNull } from 'drizzle-orm';
import { db } from '../db';
import { leads, calls } from '../../shared/schema';

const TELNYX_API_KEY = process.env.TELNYX_API_KEY;
const TELNYX_API_BASE = 'https://api.telnyx.com/v2';

/**
 * Fetch call recording details from Telnyx API
 */
export async function fetchTelnyxRecording(callControlId: string): Promise<string | null> {
  if (!TELNYX_API_KEY) {
    console.error('[Telnyx] No API key configured');
    return null;
  }

  try {
    // First, get the call details to find recordings
    const callResponse = await fetch(
      `${TELNYX_API_BASE}/calls/${callControlId}`,
      {
        headers: {
          'Authorization': `Bearer ${TELNYX_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!callResponse.ok) {
      console.error('[Telnyx] Failed to fetch call details:', callResponse.statusText);
      return null;
    }

    const callData = await callResponse.json();
    
    // Get recordings for this call
    const recordingsResponse = await fetch(
      `${TELNYX_API_BASE}/recordings?filter[call_control_id]=${callControlId}`,
      {
        headers: {
          'Authorization': `Bearer ${TELNYX_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!recordingsResponse.ok) {
      console.error('[Telnyx] Failed to fetch recordings:', recordingsResponse.statusText);
      return null;
    }

    const recordingsData = await recordingsResponse.json();
    
    // Get the first recording and request signed download URL
    if (recordingsData.data && recordingsData.data.length > 0) {
      const recording = recordingsData.data[0];
      
      // Request a signed download URL from Telnyx
      const downloadResponse = await fetch(
        `${TELNYX_API_BASE}/recordings/${recording.id}/actions/download`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${TELNYX_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!downloadResponse.ok) {
        console.error('[Telnyx] Failed to get signed download URL:', downloadResponse.statusText);
        return null;
      }

      const downloadData = await downloadResponse.json();
      
      // Return the signed URL that QA users can access
      if (downloadData.data && downloadData.data.url) {
        console.log('[Telnyx] Signed download URL retrieved successfully');
        return downloadData.data.url;
      }
    }

    console.log('[Telnyx] No recordings found for call:', callControlId);
    return null;
  } catch (error) {
    console.error('[Telnyx] Error fetching recording:', error);
    return null;
  }
}

/**
 * Update lead with Telnyx recording URL
 */
export async function updateLeadRecording(leadId: string, telnyxCallId: string): Promise<void> {
  try {
    console.log('[Telnyx] Fetching recording for lead:', leadId, 'call:', telnyxCallId);
    
    const recordingUrl = await fetchTelnyxRecording(telnyxCallId);
    
    if (recordingUrl) {
      await db
        .update(leads)
        .set({ recordingUrl })
        .where(eq(leads.id, leadId));
      
      console.log('[Telnyx] ✅ Updated lead with recording URL:', leadId);
    }
  } catch (error) {
    console.error('[Telnyx] Failed to update lead recording:', error);
  }
}

/**
 * Update manual call with Telnyx recording URL
 */
export async function updateCallRecording(callId: string, telnyxCallId: string): Promise<void> {
  try {
    console.log('[Telnyx] Fetching recording for call:', callId, 'telnyx:', telnyxCallId);
    
    const recordingUrl = await fetchTelnyxRecording(telnyxCallId);
    
    if (recordingUrl) {
      await db
        .update(calls)
        .set({ recordingUrl })
        .where(eq(calls.id, callId));
      
      console.log('[Telnyx] ✅ Updated call with recording URL:', callId);
    }
  } catch (error) {
    console.error('[Telnyx] Failed to update call recording:', error);
  }
}

/**
 * Sync all leads missing recording URLs from Telnyx
 */
export async function syncMissingRecordings(): Promise<void> {
  try {
    // Find leads with call attempts but no recording URL
    const leadsWithoutRecordings = await db
      .select()
      .from(leads)
      .where(isNull(leads.recordingUrl));
    
    console.log(`[Telnyx] Found ${leadsWithoutRecordings.length} leads without recordings`);
    
    for (const lead of leadsWithoutRecordings) {
      if (lead.callAttemptId) {
        // TODO: Get Telnyx call ID from call attempt
        // This would require joining with call_attempts table and getting telnyxCallId
        console.log('[Telnyx] Skipping lead (need call attempt implementation):', lead.id);
      }
    }
  } catch (error) {
    console.error('[Telnyx] Failed to sync recordings:', error);
  }
}
