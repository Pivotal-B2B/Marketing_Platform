import { DvRecord } from '@shared/schema';

export interface EnrichmentProvider {
  name: string;
  enrich(record: Partial<DvRecord>): Promise<EnrichmentResult>;
}

export interface EnrichmentResult {
  data: Partial<DvRecord>;
  confidence: number;
  source: string;
}

/**
 * Clearbit enrichment stub
 */
class ClearbitProvider implements EnrichmentProvider {
  name = 'clearbit';
  
  async enrich(record: Partial<DvRecord>): Promise<EnrichmentResult> {
    // Stub implementation
    return {
      data: {},
      confidence: 0,
      source: 'clearbit',
    };
  }
}

/**
 * ZoomInfo enrichment stub
 */
class ZoomInfoProvider implements EnrichmentProvider {
  name = 'zoominfo';
  
  async enrich(record: Partial<DvRecord>): Promise<EnrichmentResult> {
    // Stub implementation
    return {
      data: {},
      confidence: 0,
      source: 'zoominfo',
    };
  }
}

/**
 * Provider registry
 */
const providers: Map<string, EnrichmentProvider> = new Map([
  ['clearbit', new ClearbitProvider()],
  ['zoominfo', new ZoomInfoProvider()],
]);

/**
 * Enrich a record using specified provider
 */
export async function enrichRecord(
  record: Partial<DvRecord>,
  providerName: string = 'clearbit'
): Promise<EnrichmentResult> {
  const provider = providers.get(providerName);
  
  if (!provider) {
    throw new Error(`Unknown enrichment provider: ${providerName}`);
  }
  
  return provider.enrich(record);
}

/**
 * Merge enrichment data with existing record
 * Strategy: prefer existing unless empty, or provider if confidence > threshold
 */
export function mergeEnrichmentData(
  existingRecord: Partial<DvRecord>,
  enrichmentData: Partial<DvRecord>,
  confidenceThreshold: number = 0.7,
  enrichmentConfidence: number = 0
): Partial<DvRecord> {
  const merged = { ...existingRecord };
  
  for (const [key, value] of Object.entries(enrichmentData)) {
    const existingValue = (merged as any)[key];
    
    // If existing is empty and enrichment has value, use enrichment
    if (!existingValue && value) {
      (merged as any)[key] = value;
    }
    // If enrichment confidence is high enough, prefer enrichment
    else if (enrichmentConfidence >= confidenceThreshold && value) {
      (merged as any)[key] = value;
    }
  }
  
  return merged;
}

/**
 * Batch enrich records
 */
export async function batchEnrichRecords(
  records: Partial<DvRecord>[],
  providerName: string = 'clearbit'
): Promise<Map<string, EnrichmentResult>> {
  const results = new Map<string, EnrichmentResult>();
  
  await Promise.all(
    records.map(async (record) => {
      if (record.id) {
        const result = await enrichRecord(record, providerName);
        results.set(record.id, result);
      }
    })
  );
  
  return results;
}
