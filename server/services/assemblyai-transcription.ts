import { db } from "../db";
import { leads } from "@shared/schema";
import { eq } from "drizzle-orm";

const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;
const ASSEMBLYAI_API_BASE = 'https://api.assemblyai.com/v2';

interface TranscriptionResult {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'error';
  text?: string;
  error?: string;
}

/**
 * Submit audio URL to AssemblyAI for transcription
 */
export async function submitTranscription(audioUrl: string): Promise<string | null> {
  if (!ASSEMBLYAI_API_KEY) {
    console.error('[AssemblyAI] API key not configured');
    return null;
  }

  try {
    const response = await fetch(`${ASSEMBLYAI_API_BASE}/transcript`, {
      method: 'POST',
      headers: {
        'Authorization': ASSEMBLYAI_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: audioUrl,
        speaker_labels: true, // Enable speaker diarization
        punctuate: true,
        format_text: true,
      }),
    });

    if (!response.ok) {
      console.error('[AssemblyAI] Failed to submit transcription:', response.statusText);
      return null;
    }

    const data = await response.json();
    console.log('[AssemblyAI] Transcription submitted:', data.id);
    return data.id;
  } catch (error) {
    console.error('[AssemblyAI] Error submitting transcription:', error);
    return null;
  }
}

/**
 * Check transcription status and retrieve text when complete
 */
export async function getTranscription(transcriptId: string): Promise<TranscriptionResult | null> {
  if (!ASSEMBLYAI_API_KEY) {
    console.error('[AssemblyAI] API key not configured');
    return null;
  }

  try {
    const response = await fetch(`${ASSEMBLYAI_API_BASE}/transcript/${transcriptId}`, {
      headers: {
        'Authorization': ASSEMBLYAI_API_KEY,
      },
    });

    if (!response.ok) {
      console.error('[AssemblyAI] Failed to get transcription:', response.statusText);
      return null;
    }

    const data = await response.json();
    return {
      id: data.id,
      status: data.status,
      text: data.text,
      error: data.error,
    };
  } catch (error) {
    console.error('[AssemblyAI] Error getting transcription:', error);
    return null;
  }
}

/**
 * Transcribe call recording for a lead
 */
export async function transcribeLeadCall(leadId: string): Promise<boolean> {
  try {
    // Get lead with recording URL
    const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);

    if (!lead || !lead.recordingUrl) {
      console.log('[AssemblyAI] No recording URL for lead:', leadId);
      return false;
    }

    // Update status to processing
    await db.update(leads)
      .set({ transcriptionStatus: 'processing' })
      .where(eq(leads.id, leadId));

    // Submit for transcription
    const transcriptId = await submitTranscription(lead.recordingUrl);
    
    if (!transcriptId) {
      await db.update(leads)
        .set({ transcriptionStatus: 'failed' })
        .where(eq(leads.id, leadId));
      return false;
    }

    // Poll for completion (in production, use webhook)
    const maxAttempts = 30; // 5 minutes max
    let attempts = 0;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      
      const result = await getTranscription(transcriptId);
      
      if (result?.status === 'completed' && result.text) {
        // Save transcript
        await db.update(leads)
          .set({
            transcript: result.text,
            transcriptionStatus: 'completed',
          })
          .where(eq(leads.id, leadId));
        
        console.log('[AssemblyAI] Transcription completed for lead:', leadId);
        return true;
      }
      
      if (result?.status === 'error') {
        await db.update(leads)
          .set({ transcriptionStatus: 'failed' })
          .where(eq(leads.id, leadId));
        console.error('[AssemblyAI] Transcription error:', result.error);
        return false;
      }
      
      attempts++;
    }

    console.error('[AssemblyAI] Transcription timeout for lead:', leadId);
    await db.update(leads)
      .set({ transcriptionStatus: 'failed' })
      .where(eq(leads.id, leadId));
    return false;

  } catch (error) {
    console.error('[AssemblyAI] Error transcribing lead call:', error);
    return false;
  }
}

/**
 * Background job to process pending transcriptions
 */
export async function processPendingTranscriptions(): Promise<void> {
  try {
    const pendingLeads = await db.select()
      .from(leads)
      .where(eq(leads.transcriptionStatus, 'pending'))
      .limit(10);

    for (const lead of pendingLeads) {
      await transcribeLeadCall(lead.id);
    }
  } catch (error) {
    console.error('[AssemblyAI] Error processing pending transcriptions:', error);
  }
}
