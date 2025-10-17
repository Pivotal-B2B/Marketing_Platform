import { DvExclusionList, DvRecord } from '@shared/schema';

export interface ExclusionCheckResult {
  isExcluded: boolean;
  reason?: string;
  listId?: string;
}

/**
 * Build a fast lookup map from exclusion lists
 */
export function buildExclusionMap(lists: DvExclusionList[]): {
  emailSet: Set<string>;
  domainSet: Set<string>;
  phoneSet: Set<string>;
  companySet: Set<string>;
} {
  const emailSet = new Set<string>();
  const domainSet = new Set<string>();
  const phoneSet = new Set<string>();
  const companySet = new Set<string>();
  
  for (const list of lists) {
    const fields = list.fields as any;
    
    if (fields.emails && Array.isArray(fields.emails)) {
      fields.emails.forEach((email: string) => emailSet.add(email.toLowerCase()));
    }
    
    if (fields.domains && Array.isArray(fields.domains)) {
      fields.domains.forEach((domain: string) => domainSet.add(domain.toLowerCase()));
    }
    
    if (fields.phones && Array.isArray(fields.phones)) {
      fields.phones.forEach((phone: string) => phoneSet.add(phone.replace(/\D/g, '')));
    }
    
    if (fields.companies && Array.isArray(fields.companies)) {
      fields.companies.forEach((company: string) => companySet.add(company.toLowerCase()));
    }
  }
  
  return { emailSet, domainSet, phoneSet, companySet };
}

/**
 * Check if a record matches any exclusion criteria
 */
export function checkExclusion(
  record: Partial<DvRecord>,
  exclusionMap: ReturnType<typeof buildExclusionMap>
): ExclusionCheckResult {
  // Check email
  if (record.email && exclusionMap.emailSet.has(record.email.toLowerCase())) {
    return { isExcluded: true, reason: 'Email in exclusion list' };
  }
  
  // Check domain
  if (record.accountDomain && exclusionMap.domainSet.has(record.accountDomain.toLowerCase())) {
    return { isExcluded: true, reason: 'Domain in exclusion list' };
  }
  
  // Check phone
  if (record.phoneE164) {
    const cleanPhone = record.phoneE164.replace(/\D/g, '');
    if (exclusionMap.phoneSet.has(cleanPhone)) {
      return { isExcluded: true, reason: 'Phone in exclusion list' };
    }
  }
  
  // Check company
  if (record.accountName && exclusionMap.companySet.has(record.accountName.toLowerCase())) {
    return { isExcluded: true, reason: 'Company in exclusion list' };
  }
  
  return { isExcluded: false };
}

/**
 * Merge global, client, and project exclusion lists
 */
export function mergeExclusionLists(
  globalLists: DvExclusionList[],
  clientLists: DvExclusionList[],
  projectLists: DvExclusionList[]
): DvExclusionList[] {
  return [...globalLists, ...clientLists, ...projectLists];
}
