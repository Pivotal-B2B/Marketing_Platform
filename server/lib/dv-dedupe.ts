import crypto from 'crypto';

/**
 * Generate a dedupe hash for a record based on key fields
 */
export function generateDedupeHash(
  email?: string | null,
  domain?: string | null,
  name?: string | null,
  phone?: string | null,
  fallbackId?: string
): string {
  const parts: string[] = [];
  
  if (email) parts.push(email.toLowerCase().trim());
  if (domain) parts.push(domain.toLowerCase().trim());
  if (name) parts.push(name.toLowerCase().trim().replace(/\s+/g, ' '));
  if (phone) parts.push(phone.replace(/\D/g, ''));
  
  // If no identifying fields, use fallback ID to ensure uniqueness
  if (parts.length === 0 && fallbackId) {
    parts.push(fallbackId);
  }
  
  const combined = parts.join('|');
  return crypto.createHash('sha256').update(combined).digest('hex');
}

/**
 * Check if a record is a duplicate based on dedupe scope
 */
export function isDuplicate(
  hash: string,
  existingHashes: Set<string>
): boolean {
  return existingHashes.has(hash);
}
