import { parsePhoneNumber, CountryCode } from 'libphonenumber-js';

export interface PhoneParseResult {
  e164: string | null;
  isValid: boolean;
  country: string | null;
  nationalNumber: string | null;
}

/**
 * Parse phone number to E.164 format
 */
export function parsePhone(
  phoneRaw: string,
  defaultCountry: CountryCode = 'US'
): PhoneParseResult {
  try {
    const phoneNumber = parsePhoneNumber(phoneRaw, defaultCountry);
    
    if (phoneNumber && phoneNumber.isValid()) {
      return {
        e164: phoneNumber.format('E.164'),
        isValid: true,
        country: phoneNumber.country || null,
        nationalNumber: phoneNumber.nationalNumber,
      };
    }
  } catch (error) {
    // Parsing failed
  }
  
  return {
    e164: null,
    isValid: false,
    country: null,
    nationalNumber: null,
  };
}

/**
 * Infer country from phone number
 */
export function inferCountry(phoneRaw: string): CountryCode | null {
  try {
    const phoneNumber = parsePhoneNumber(phoneRaw);
    return phoneNumber?.country || null;
  } catch {
    return null;
  }
}
