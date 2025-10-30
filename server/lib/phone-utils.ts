import { parsePhoneNumber, CountryCode, getCountryCallingCode } from 'libphonenumber-js';

/**
 * Country code to ISO country mapping
 * Maps common country names to ISO 3166-1 alpha-2 codes
 */
const COUNTRY_NAME_TO_CODE: Record<string, CountryCode> = {
  // Primary English names
  'united states': 'US',
  'usa': 'US',
  'united kingdom': 'GB',
  'uk': 'GB',
  'canada': 'CA',
  'australia': 'AU',
  'germany': 'DE',
  'france': 'FR',
  'spain': 'ES',
  'italy': 'IT',
  'netherlands': 'NL',
  'belgium': 'BE',
  'switzerland': 'CH',
  'austria': 'AT',
  'sweden': 'SE',
  'norway': 'NO',
  'denmark': 'DK',
  'finland': 'FI',
  'poland': 'PL',
  'czech republic': 'CZ',
  'ireland': 'IE',
  'portugal': 'PT',
  'greece': 'GR',
  'india': 'IN',
  'china': 'CN',
  'japan': 'JP',
  'south korea': 'KR',
  'singapore': 'SG',
  'hong kong': 'HK',
  'malaysia': 'MY',
  'thailand': 'TH',
  'indonesia': 'ID',
  'philippines': 'PH',
  'vietnam': 'VN',
  'new zealand': 'NZ',
  'south africa': 'ZA',
  'brazil': 'BR',
  'mexico': 'MX',
  'argentina': 'AR',
  'chile': 'CL',
  'colombia': 'CO',
  'united arab emirates': 'AE',
  'uae': 'AE',
  'saudi arabia': 'SA',
  'israel': 'IL',
  'turkey': 'TR',
  'russia': 'RU',
  'ukraine': 'UA',
  'egypt': 'EG',
  'nigeria': 'NG',
  'kenya': 'KE',
};

/**
 * Normalize country name to ISO country code
 */
export function normalizeCountryToCode(country: string | null | undefined): CountryCode | null {
  if (!country) return null;
  
  const normalized = country.toLowerCase().trim();
  
  // Check if it's already a valid 2-letter code
  if (normalized.length === 2) {
    return normalized.toUpperCase() as CountryCode;
  }
  
  // Look up in mapping
  return COUNTRY_NAME_TO_CODE[normalized] || null;
}

/**
 * Get calling code prefix for a country
 */
export function getCountryDialCode(countryCode: CountryCode): string {
  try {
    const callingCode = getCountryCallingCode(countryCode);
    return `+${callingCode}`;
  } catch (error) {
    console.error(`[PhoneUtils] Error getting calling code for ${countryCode}:`, error);
    return '';
  }
}

/**
 * Normalize phone number with country code
 * If phone number doesn't have country code, add it based on contact's country
 */
export function normalizePhoneWithCountryCode(
  phoneNumber: string | null | undefined,
  contactCountry: string | null | undefined
): { 
  normalized: string | null;
  e164: string | null;
  countryMatches: boolean;
  error?: string;
} {
  if (!phoneNumber) {
    return { normalized: null, e164: null, countryMatches: false };
  }

  const phone = phoneNumber.trim();
  if (!phone) {
    return { normalized: null, e164: null, countryMatches: false };
  }

  const countryCode = normalizeCountryToCode(contactCountry);
  if (!countryCode) {
    return { 
      normalized: null, 
      e164: null, 
      countryMatches: false,
      error: 'Invalid or missing contact country'
    };
  }

  try {
    // Clean the phone first - remove any non-digit characters except leading +
    let cleanPhone = phone.replace(/[^\d+]/g, '');
    
    // If phone doesn't start with + but starts with digits, try adding +
    // This handles cases like "4401234567890" which should be "+4401234567890"
    if (!cleanPhone.startsWith('+') && /^\d/.test(cleanPhone)) {
      // Try parsing with + prefix first (in case it's already in E.164 format minus the +)
      try {
        const withPlus = '+' + cleanPhone;
        const testParse = parsePhoneNumber(withPlus);
        if (testParse && testParse.isValid()) {
          // If it parses with just +, use it
          cleanPhone = withPlus;
        }
      } catch (e) {
        // Ignore - will try adding country code next
      }
    }
    
    // Try parsing with country code in the number first
    let parsedPhone = parsePhoneNumber(cleanPhone, { defaultCountry: countryCode });
    
    // If parsing failed or phone doesn't have country code, add it
    if (!parsedPhone || !parsedPhone.country) {
      // If phone doesn't start with +, add country code
      if (!cleanPhone.startsWith('+')) {
        const dialCode = getCountryDialCode(countryCode);
        const phoneWithCode = `${dialCode}${cleanPhone}`;
        parsedPhone = parsePhoneNumber(phoneWithCode);
      } else {
        parsedPhone = parsePhoneNumber(cleanPhone);
      }
    }

    if (!parsedPhone) {
      return {
        normalized: null,
        e164: null,
        countryMatches: false,
        error: 'Failed to parse phone number'
      };
    }

    // Check if phone's country matches contact's country
    const phoneCountry = parsedPhone.country;
    const countryMatches = phoneCountry === countryCode;

    // Only return valid phone numbers that match the contact's country
    if (!countryMatches) {
      return {
        normalized: null,
        e164: null,
        countryMatches: false,
        error: `Phone country (${phoneCountry}) doesn't match contact country (${countryCode})`
      };
    }

    // Validate the phone number
    if (!parsedPhone.isValid()) {
      return {
        normalized: null,
        e164: null,
        countryMatches,
        error: 'Phone number is not valid for the country'
      };
    }

    return {
      normalized: parsedPhone.formatInternational(),
      e164: parsedPhone.format('E.164'),
      countryMatches,
    };
  } catch (error) {
    // Silently return null for parsing errors (invalid numbers, malformed data, etc.)
    // Logging thousands of these errors causes performance issues during campaign launch
    return {
      normalized: null,
      e164: null,
      countryMatches: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Validate that phone number's country code matches contact's geo location
 */
export function validatePhoneCountryMatch(
  phoneE164: string | null | undefined,
  contactCountry: string | null | undefined
): boolean {
  if (!phoneE164 || !contactCountry) return false;

  const countryCode = normalizeCountryToCode(contactCountry);
  if (!countryCode) return false;

  try {
    const parsedPhone = parsePhoneNumber(phoneE164);
    if (!parsedPhone || !parsedPhone.isValid()) return false;

    return parsedPhone.country === countryCode;
  } catch (error) {
    // Silently return false for parsing errors (invalid countries, malformed numbers, etc.)
    // Logging thousands of these errors causes performance issues
    return false;
  }
}

/**
 * Get best phone number from contact with country validation
 * Returns the phone that matches the contact's country
 * 
 * Phone Priority:
 * 1. Contact direct phone (directPhoneE164 / directPhone) - LENIENT (accepts even without country)
 * 2. Contact mobile phone (mobilePhoneE164 / mobilePhone) - LENIENT (accepts even without country)
 * 3. Company HQ phone - STRICT (ONLY if hqCountry matches contactCountry)
 */
export function getBestPhoneForContact(contact: {
  directPhone?: string | null;
  directPhoneE164?: string | null;
  mobilePhone?: string | null;
  mobilePhoneE164?: string | null;
  country?: string | null;
  hqPhone?: string | null;
  hqPhoneE164?: string | null;
  hqCountry?: string | null;
}): { phone: string | null; type: 'direct' | 'mobile' | 'hq' | null } {
  const { country, hqCountry } = contact;

  // PRIORITY 1: Contact direct phone (E164 format preferred) - LENIENT
  // Accept the phone even if country is missing (contact's own phone is trusted)
  if (contact.directPhoneE164) {
    // If country exists, validate it matches. If no country, accept it anyway.
    if (!country || validatePhoneCountryMatch(contact.directPhoneE164, country)) {
      return { phone: contact.directPhoneE164, type: 'direct' };
    }
  }

  // PRIORITY 2: Contact mobile phone (E164 format) - LENIENT
  // Accept the phone even if country is missing (contact's own phone is trusted)
  if (contact.mobilePhoneE164) {
    // If country exists, validate it matches. If no country, accept it anyway.
    if (!country || validatePhoneCountryMatch(contact.mobilePhoneE164, country)) {
      return { phone: contact.mobilePhoneE164, type: 'mobile' };
    }
  }

  // PRIORITY 3: Try normalizing contact direct phone - LENIENT
  // If country is missing, try to parse as international format
  if (contact.directPhone) {
    if (country) {
      const result = normalizePhoneWithCountryCode(contact.directPhone, country);
      if (result.e164 && result.countryMatches) {
        return { phone: result.e164, type: 'direct' };
      }
    } else {
      // No country set - try to parse as international number
      try {
        let phoneToTest = contact.directPhone.trim();
        
        // If phone doesn't start with + but starts with digits, try adding + prefix
        if (!phoneToTest.startsWith('+') && /^\d/.test(phoneToTest)) {
          phoneToTest = '+' + phoneToTest;
        }
        
        const parsed = parsePhoneNumber(phoneToTest);
        if (parsed && parsed.isValid()) {
          return { phone: parsed.format('E.164'), type: 'direct' };
        }
      } catch (error) {
        // Ignore parsing errors for non-E164 formats
      }
    }
  }

  // PRIORITY 4: Try normalizing contact mobile phone - LENIENT
  // If country is missing, try to parse as international format
  if (contact.mobilePhone) {
    if (country) {
      const result = normalizePhoneWithCountryCode(contact.mobilePhone, country);
      if (result.e164 && result.countryMatches) {
        return { phone: result.e164, type: 'mobile' };
      }
    } else {
      // No country set - try to parse as international number
      try {
        let phoneToTest = contact.mobilePhone.trim();
        
        // If phone doesn't start with + but starts with digits, try adding + prefix
        if (!phoneToTest.startsWith('+') && /^\d/.test(phoneToTest)) {
          phoneToTest = '+' + phoneToTest;
        }
        
        const parsed = parsePhoneNumber(phoneToTest);
        if (parsed && parsed.isValid()) {
          return { phone: parsed.format('E.164'), type: 'mobile' };
        }
      } catch (error) {
        // Ignore parsing errors for non-E164 formats
      }
    }
  }

  // PRIORITY 5 (FALLBACK): Company HQ phone - STRICT COUNTRY MATCHING
  // Only use HQ phone if company's country matches contact's country
  if (contact.hqPhoneE164 && country && hqCountry) {
    // Normalize both countries for comparison
    const contactCountryNorm = normalizeCountryToCode(country);
    const hqCountryNorm = normalizeCountryToCode(hqCountry);
    
    if (contactCountryNorm && hqCountryNorm && contactCountryNorm === hqCountryNorm) {
      // Country match! Now validate the phone number is also valid for that country
      if (validatePhoneCountryMatch(contact.hqPhoneE164, country)) {
        return { phone: contact.hqPhoneE164, type: 'hq' };
      }
    }
  }

  // Try normalizing HQ phone (with same strict country matching)
  if (contact.hqPhone && country && hqCountry) {
    const contactCountryNorm = normalizeCountryToCode(country);
    const hqCountryNorm = normalizeCountryToCode(hqCountry);
    
    if (contactCountryNorm && hqCountryNorm && contactCountryNorm === hqCountryNorm) {
      const result = normalizePhoneWithCountryCode(contact.hqPhone, hqCountry);
      if (result.e164 && result.countryMatches) {
        return { phone: result.e164, type: 'hq' };
      }
    }
  }

  // No valid phone found
  return { phone: null, type: null };
}
