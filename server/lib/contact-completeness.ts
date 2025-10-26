/**
 * Contact Completeness Validation
 * Determines if a contact has complete information ready for client delivery
 */

import type { BestContactData } from './verification-best-data';

export interface CompletenessResult {
  hasCompletePhone: boolean;
  hasCompleteAddress: boolean;
  isClientReady: boolean; // Both phone and address complete
  missingFields: string[];
}

/**
 * Check if a phone number is complete (not empty, not "None", and has actual value)
 */
export function isPhoneComplete(phone: { phone: string; source: string }): boolean {
  if (!phone || !phone.phone || phone.phone.trim() === '') return false;
  if (phone.source === 'None') return false;
  if (phone.phone === null || phone.phone === undefined) return false;
  
  // Phone must be at least 5 digits (minimum valid phone)
  const digitsOnly = phone.phone.replace(/\D/g, '');
  return digitsOnly.length >= 5;
}

/**
 * Check if an address is complete based on smart selection result
 * STRICT CHECK: Must have line1 + city + (state OR postal) + country
 */
export function isAddressDataComplete(address: { address: any; source: string; isComplete: boolean }): boolean {
  if (!address || address.source === 'None') return false;
  if (!address.isComplete) return false;
  
  const addr = address.address;
  if (!addr) return false;
  
  // CRITICAL: Must have ALL required fields populated
  const hasLine1 = addr.line1 && addr.line1.trim() !== '';
  const hasCity = addr.city && addr.city.trim() !== '';
  const hasStateOrPostal = 
    (addr.state && addr.state.trim() !== '') || 
    (addr.postal && addr.postal.trim() !== '');
  const hasCountry = addr.country && addr.country.trim() !== '';
  
  return hasLine1 && hasCity && hasStateOrPostal && hasCountry;
}

/**
 * Analyze contact completeness for export eligibility
 */
export function analyzeContactCompleteness(smartData: BestContactData): CompletenessResult {
  const hasCompletePhone = isPhoneComplete(smartData.phone);
  const hasCompleteAddress = isAddressDataComplete(smartData.address);
  
  const missingFields: string[] = [];
  if (!hasCompletePhone) missingFields.push('phone');
  if (!hasCompleteAddress) missingFields.push('address');
  
  return {
    hasCompletePhone,
    hasCompleteAddress,
    isClientReady: hasCompletePhone && hasCompleteAddress,
    missingFields,
  };
}
