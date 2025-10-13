import crypto from 'crypto';
import type { ContentAsset, ContentAssetPush } from '@shared/schema';

// Get secrets from environment variables
const RESOURCES_CENTER_URL = process.env.RESOURCES_CENTER_URL || '';
const PUSH_SECRET_KEY = process.env.PUSH_SECRET_KEY || '';

interface PushPayload {
  assetId: string;
  assetType: string;
  title: string;
  slug?: string;
  summary?: string;
  bodyHtml?: string;
  thumbnailUrl?: string;
  ctaLink?: string;
  formId?: string;
  tags?: string[];
  metadata?: any;
  syncedAt: string;
}

/**
 * Generate HMAC-SHA256 signature for payload
 */
export function generateHMACSignature(payload: string, timestamp: string): string {
  const message = `${timestamp}.${payload}`;
  return crypto
    .createHmac('sha256', PUSH_SECRET_KEY)
    .update(message)
    .digest('hex');
}

/**
 * Push content asset to Resources Center
 */
export async function pushContentToResourcesCenter(
  asset: ContentAsset,
  targetUrl?: string
): Promise<{ success: boolean; externalId?: string; error?: string; responsePayload?: any }> {
  try {
    const url = targetUrl || RESOURCES_CENTER_URL;
    
    if (!url) {
      throw new Error('Resources Center URL not configured');
    }

    if (!PUSH_SECRET_KEY) {
      throw new Error('Push secret key not configured');
    }

    // Prepare payload
    const payload: PushPayload = {
      assetId: asset.id,
      assetType: asset.assetType,
      title: asset.title,
      slug: asset.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      summary: asset.description || undefined,
      bodyHtml: asset.contentHtml || asset.content || undefined,
      thumbnailUrl: asset.thumbnailUrl || undefined,
      ctaLink: asset.fileUrl || undefined,
      tags: asset.tags || undefined,
      metadata: asset.metadata || undefined,
      syncedAt: new Date().toISOString(),
    };

    const payloadString = JSON.stringify(payload);
    const timestamp = Date.now().toString();
    const signature = generateHMACSignature(payloadString, timestamp);

    // Make POST request to Resources Center
    const endpoint = `${url}/api/import/content`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature,
        'X-Timestamp': timestamp,
      },
      body: payloadString,
    });

    const responseData = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: responseData.message || `HTTP ${response.status}`,
        responsePayload: responseData,
      };
    }

    return {
      success: true,
      externalId: responseData.externalId || responseData.id,
      responsePayload: responseData,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Retry push with exponential backoff
 */
export async function retryPushWithBackoff(
  asset: ContentAsset,
  pushRecord: ContentAssetPush,
  targetUrl?: string
): Promise<{ success: boolean; externalId?: string; error?: string; responsePayload?: any }> {
  const maxAttempts = pushRecord.maxAttempts;
  const currentAttempt = pushRecord.attemptCount;

  if (currentAttempt >= maxAttempts) {
    return {
      success: false,
      error: 'Max retry attempts reached',
    };
  }

  // Calculate exponential backoff delay (2^attempt * 1000ms)
  const delay = Math.pow(2, currentAttempt) * 1000;
  
  // Wait for backoff delay
  await new Promise(resolve => setTimeout(resolve, delay));

  // Attempt push
  return await pushContentToResourcesCenter(asset, targetUrl);
}
