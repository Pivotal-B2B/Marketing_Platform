/**
 * Domain normalization and matching utilities for Phase 21 Domain Sets
 */

/**
 * Normalize a domain by:
 * - Converting to lowercase
 * - Removing common prefixes (www., mail., m., ftp., web., smtp.)
 * - Removing protocol (http://, https://)
 * - Removing trailing slashes
 * - Extracting root domain
 */
export function normalizeDomain(domain: string): string {
  if (!domain) return '';
  
  let normalized = domain.toLowerCase().trim();
  
  // Remove protocol
  normalized = normalized.replace(/^(https?:\/\/)/, '');
  
  // Remove trailing slash
  normalized = normalized.replace(/\/$/, '');
  
  // Remove common subdomains
  const subdomainPrefixes = ['www.', 'mail.', 'm.', 'ftp.', 'web.', 'smtp.', 'webmail.'];
  for (const prefix of subdomainPrefixes) {
    if (normalized.startsWith(prefix)) {
      normalized = normalized.substring(prefix.length);
      break;
    }
  }
  
  // Extract just the domain part (remove paths, query strings, etc.)
  const domainMatch = normalized.match(/^([a-z0-9.-]+\.[a-z]{2,})/);
  if (domainMatch) {
    normalized = domainMatch[1];
  }
  
  return normalized;
}

/**
 * Validate if a string is a valid domain
 */
export function isValidDomain(domain: string): boolean {
  const normalized = normalizeDomain(domain);
  
  // Must have at least one dot and valid TLD pattern
  const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,}$/;
  
  return domainRegex.test(normalized);
}

/**
 * Detect and fix common domain typos (e.g., example,com → example.com)
 */
export function fixCommonDomainTypos(domain: string): string {
  let fixed = domain.trim();
  
  // Fix comma instead of dot before TLD
  fixed = fixed.replace(/,([a-z]{2,})$/i, '.$1');
  
  // Fix space before TLD
  fixed = fixed.replace(/\s+\.([a-z]{2,})$/i, '.$1');
  
  // Fix missing dot before common TLDs
  const commonTLDs = ['com', 'org', 'net', 'edu', 'gov', 'io', 'co', 'uk', 'us'];
  for (const tld of commonTLDs) {
    const regex = new RegExp(`([a-z0-9])${tld}$`, 'i');
    if (regex.test(fixed) && !fixed.includes('.')) {
      fixed = fixed.replace(regex, `$1.${tld}`);
      break;
    }
  }
  
  return fixed;
}

/**
 * Calculate Levenshtein distance between two strings (for fuzzy matching)
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Calculate similarity score between two strings (0 to 1)
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 1.0;
  
  const distance = levenshteinDistance(str1, str2);
  return 1.0 - (distance / maxLength);
}

/**
 * Extract company name from domain (e.g., acme.com → Acme)
 */
export function extractCompanyNameFromDomain(domain: string): string {
  const normalized = normalizeDomain(domain);
  
  // Get the part before the TLD
  const parts = normalized.split('.');
  if (parts.length >= 2) {
    const name = parts[0];
    // Title case the name
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
  
  return normalized;
}

/**
 * Parse CSV content and extract domains
 * Supports formats: domain, domain,account_name, domain,account_name,notes
 */
export function parseDomainsFromCSV(csvContent: string): Array<{
  domain: string;
  accountName?: string;
  notes?: string;
}> {
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim());
  const results: Array<{ domain: string; accountName?: string; notes?: string }> = [];
  
  for (const line of lines) {
    // Skip header row if it looks like a header
    if (line.toLowerCase().includes('domain') && line.toLowerCase().includes('name')) {
      continue;
    }
    
    const parts = line.split(',').map(p => p.trim());
    if (parts.length === 0 || !parts[0]) continue;
    
    const domain = parts[0];
    const accountName = parts[1] || undefined;
    const notes = parts[2] || undefined;
    
    results.push({ domain, accountName, notes });
  }
  
  return results;
}

/**
 * Deduplicate domains array (normalized comparison)
 */
export function deduplicateDomains(domains: string[]): {
  unique: string[];
  duplicates: string[];
} {
  const seen = new Set<string>();
  const unique: string[] = [];
  const duplicates: string[] = [];
  
  for (const domain of domains) {
    const normalized = normalizeDomain(domain);
    
    if (seen.has(normalized)) {
      duplicates.push(domain);
    } else {
      seen.add(normalized);
      unique.push(domain);
    }
  }
  
  return { unique, duplicates };
}

/**
 * Get match type and confidence based on similarity
 */
export function getMatchTypeAndConfidence(
  domain: string,
  accountDomain: string,
  accountName?: string
): { matchType: 'exact' | 'fuzzy' | 'none'; confidence: number } {
  const normalizedDomain = normalizeDomain(domain);
  const normalizedAccountDomain = normalizeDomain(accountDomain);
  
  // Exact match
  if (normalizedDomain === normalizedAccountDomain) {
    return { matchType: 'exact', confidence: 1.0 };
  }
  
  // Fuzzy match by domain similarity
  const domainSimilarity = calculateSimilarity(normalizedDomain, normalizedAccountDomain);
  
  // Fuzzy match by name similarity (if account name provided)
  let nameSimilarity = 0;
  if (accountName) {
    const domainName = extractCompanyNameFromDomain(normalizedDomain).toLowerCase();
    const accountNameLower = accountName.toLowerCase();
    nameSimilarity = calculateSimilarity(domainName, accountNameLower);
  }
  
  const maxSimilarity = Math.max(domainSimilarity, nameSimilarity);
  
  // Fuzzy match if similarity >= 0.85 and Levenshtein distance <= 3
  const distance = levenshteinDistance(normalizedDomain, normalizedAccountDomain);
  if (maxSimilarity >= 0.85 && distance <= 3) {
    return { matchType: 'fuzzy', confidence: parseFloat(maxSimilarity.toFixed(2)) };
  }
  
  return { matchType: 'none', confidence: 0 };
}
