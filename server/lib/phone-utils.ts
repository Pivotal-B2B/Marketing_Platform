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
 * Get best phone number from contact - ULTRA LENIENT for maximum queue coverage
 * Returns the first parseable phone number, prioritizing contact-level phones
 * 
 * Phone Priority (NO country matching - accept ANY valid phone):
 * 1. Contact direct phone (E164 or raw) - Accept ANY valid parseable phone
 * 2. Contact mobile phone (E164 or raw) - Accept ANY valid parseable phone
 * 3. Company HQ phone - Accept ANY valid parseable phone
 * 
 * CRITICAL: Properly handles trunk prefixes (e.g., UK "0" prefix)
 * Example: "4401908802874" → "+441908802874" (removes "0" trunk prefix)
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
  
  // Helper: Try to parse any phone string into E.164 with proper trunk prefix handling
  const tryParsePhone = (phone: string | null | undefined, hintCountry?: string | null): string | null => {
    if (!phone) return null;
    
    const phoneStr = phone.trim();
    if (!phoneStr) return null;
    
    // Clean phone - remove non-digit characters except leading +
    let cleanPhone = phoneStr.replace(/[^\d+]/g, '');
    if (!cleanPhone) return null;
    
    // Get country code hint if provided
    const countryCode = hintCountry ? normalizeCountryToCode(hintCountry) : null;
    
    try {
      // Strategy 1: Try parsing with country hint (handles trunk prefixes automatically)
      if (countryCode) {
        // Try with country code context (libphonenumber-js handles trunk prefix removal)
        const parsed = parsePhoneNumber(cleanPhone, countryCode);
        if (parsed && parsed.isValid()) {
          return parsed.format('E.164');
        }
      }
      
      // Strategy 2: Try parsing as international format (with + prefix)
      if (cleanPhone.startsWith('+')) {
        const parsed = parsePhoneNumber(cleanPhone);
        if (parsed && parsed.isValid()) {
          return parsed.format('E.164');
        }
      }
      
      // Strategy 3: Try adding + prefix and parsing (handles "4401908..." → "+4401908...")
      // BUT libphonenumber needs country hint to remove trunk prefix
      if (!cleanPhone.startsWith('+')) {
        // First, try with + prefix as-is (might work for clean E.164 without +)
        try {
          const withPlus = '+' + cleanPhone;
          const parsed = parsePhoneNumber(withPlus);
          if (parsed && parsed.isValid()) {
            return parsed.format('E.164');
          }
        } catch (e) {
          // Not a valid international number, continue
        }
        
        // If we have a country hint, try parsing without + using country code
        // This lets libphonenumber-js handle trunk prefixes correctly
        if (countryCode) {
          // Remove leading country code if present to let parser add it correctly
          const callingCode = getCountryCallingCode(countryCode);
          let phoneWithoutCountryCode = cleanPhone;
          
          if (cleanPhone.startsWith(callingCode)) {
            phoneWithoutCountryCode = cleanPhone.substring(callingCode.length);
          }
          
          const parsed = parsePhoneNumber(phoneWithoutCountryCode, countryCode);
          if (parsed && parsed.isValid()) {
            return parsed.format('E.164');
          }
        }
      }
      
      // Strategy 4: Try common country codes (GB, US, etc.) as fallback
      const commonCountries: CountryCode[] = ['GB', 'US', 'CA', 'AU', 'DE', 'FR'];
      for (const tryCountry of commonCountries) {
        try {
          const parsed = parsePhoneNumber(cleanPhone, tryCountry);
          if (parsed && parsed.isValid()) {
            return parsed.format('E.164');
          }
        } catch (e) {
          // Try next country
        }
      }
    } catch (error) {
      // Ignore parsing errors
    }
    
    return null;
  };

  // PRIORITY 1: Contact direct phone (E164 format preferred) - ULTRA LENIENT
  // Accept ANY E164 phone, regardless of country match
  if (contact.directPhoneE164) {
    try {
      const parsed = parsePhoneNumber(contact.directPhoneE164);
      if (parsed && parsed.isValid()) {
        return { phone: contact.directPhoneE164, type: 'direct' };
      }
    } catch (error) {
      // Try parsing as raw phone instead
    }
  }

  // PRIORITY 2: Contact mobile phone (E164 format) - ULTRA LENIENT
  // Accept ANY E164 phone, regardless of country match
  if (contact.mobilePhoneE164) {
    try {
      const parsed = parsePhoneNumber(contact.mobilePhoneE164);
      if (parsed && parsed.isValid()) {
        return { phone: contact.mobilePhoneE164, type: 'mobile' };
      }
    } catch (error) {
      // Try parsing as raw phone instead
    }
  }

  // PRIORITY 3: Try parsing contact direct phone - ULTRA LENIENT
  // Accept ANY parseable phone (use country hint to handle trunk prefixes)
  if (contact.directPhone) {
    const parsed = tryParsePhone(contact.directPhone, contact.country);
    if (parsed) {
      return { phone: parsed, type: 'direct' };
    }
  }

  // PRIORITY 4: Try parsing contact mobile phone - ULTRA LENIENT
  // Accept ANY parseable phone (use country hint to handle trunk prefixes)
  if (contact.mobilePhone) {
    const parsed = tryParsePhone(contact.mobilePhone, contact.country);
    if (parsed) {
      return { phone: parsed, type: 'mobile' };
    }
  }

  // PRIORITY 5 (FALLBACK): Company HQ phone - ULTRA LENIENT
  // Accept ANY parseable HQ phone (use HQ country hint for trunk prefixes)
  if (contact.hqPhoneE164) {
    try {
      const parsed = parsePhoneNumber(contact.hqPhoneE164);
      if (parsed && parsed.isValid()) {
        return { phone: contact.hqPhoneE164, type: 'hq' };
      }
    } catch (error) {
      // Try parsing as raw phone instead
    }
  }

  // Try parsing HQ phone from raw format (use HQ country hint)
  if (contact.hqPhone) {
    const parsed = tryParsePhone(contact.hqPhone, contact.hqCountry);
    if (parsed) {
      return { phone: parsed, type: 'hq' };
    }
  }

  // No valid phone found
  return { phone: null, type: null };
}
