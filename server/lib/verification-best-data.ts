/**
 * Smart Data Selection Utility for Verification Contacts
 * 
 * Analyzes multiple data sources (Contact, Company HQ, CAV custom fields, AI enrichment)
 * to intelligently select the "best" phone number and complete postal address for client exports.
 */

import { formatPhoneWithCountryCode } from "./phone-formatter";

// Phone number data source types
type PhoneSource = 'Contact Mobile' | 'Contact Phone' | 'CAV Tel' | 'AI Enriched Phone' | 'Company HQ Phone' | 'None';

// Address data source types
type AddressSource = 'Contact Address' | 'AI Enriched Address' | 'Company HQ Address' | 'CAV Custom Fields' | 'None';

// Address components
interface AddressComponents {
  line1: string;
  line2: string;
  line3: string;
  city: string;
  state: string;
  country: string;
  postal: string;
}

// Phone selection result
export interface BestPhone {
  phone: string;
  phoneFormatted: string;
  source: PhoneSource;
}

// Address selection result
export interface BestAddress {
  address: AddressComponents;
  source: AddressSource;
  isComplete: boolean;
  countryMatches: boolean;
}

// Combined result
export interface BestContactData {
  phone: BestPhone;
  address: BestAddress;
}

// Input contact data structure
export interface VerificationContactData {
  // Contact fields
  phone?: string | null;
  mobile?: string | null;
  contactAddress1?: string | null;
  contactAddress2?: string | null;
  contactAddress3?: string | null;
  contactCity?: string | null;
  contactState?: string | null;
  contactCountry?: string | null;
  contactPostal?: string | null;
  
  // Company HQ fields
  hqPhone?: string | null;
  hqAddress1?: string | null;
  hqAddress2?: string | null;
  hqAddress3?: string | null;
  hqCity?: string | null;
  hqState?: string | null;
  hqCountry?: string | null;
  hqPostal?: string | null;
  
  // AI Enrichment fields
  aiEnrichedPhone?: string | null;
  aiEnrichedAddress1?: string | null;
  aiEnrichedAddress2?: string | null;
  aiEnrichedAddress3?: string | null;
  aiEnrichedCity?: string | null;
  aiEnrichedState?: string | null;
  aiEnrichedCountry?: string | null;
  aiEnrichedPostal?: string | null;
  
  // Custom fields (JSON)
  customFields?: {
    [key: string]: any;
  } | null;
}

/**
 * Normalize country name/code for comparison
 */
function normalizeCountry(country: string | null | undefined): string {
  if (!country) return '';
  return country.trim().toLowerCase();
}

/**
 * Check if an address is complete
 * Requirements: line1 + city + (state OR postal)
 */
function isAddressComplete(address: Partial<AddressComponents>): boolean {
  const hasLine1 = !!address.line1 && address.line1.trim() !== '';
  const hasCity = !!address.city && address.city.trim() !== '';
  const hasStateOrPostal = 
    (!!address.state && address.state.trim() !== '') || 
    (!!address.postal && address.postal.trim() !== '');
  
  return hasLine1 && hasCity && hasStateOrPostal;
}

/**
 * Check if address country matches the contact's country
 */
function doesCountryMatch(
  contactCountry: string | null | undefined,
  addressCountry: string | null | undefined
): boolean {
  const normalizedContact = normalizeCountry(contactCountry);
  const normalizedAddress = normalizeCountry(addressCountry);
  
  // If contact has no country, accept any address
  if (!normalizedContact) return true;
  
  // If address has no country but contact does, we can infer it matches
  // (e.g., CAV custom fields may not have country but are assumed to match)
  if (!normalizedAddress) return true;
  
  // Both have countries - they must match
  return normalizedContact === normalizedAddress;
}

/**
 * Extract CAV Tel from custom fields
 * Supports various spellings: "CAV Tel", "CAV_Tel", "cavTel", etc.
 */
function getCavTel(customFields: any): string | null {
  if (!customFields || typeof customFields !== 'object') return null;
  
  // Try various key patterns
  const patterns = [
    'CAV Tel',
    'CAV_Tel',
    'cavTel',
    'cav_tel',
    'CAT Tel', // User mentioned this variant
    'CAT_Tel',
  ];
  
  for (const pattern of patterns) {
    if (customFields[pattern]) {
      return String(customFields[pattern]);
    }
  }
  
  return null;
}

/**
 * Extract CAV Address from custom fields
 */
function getCavAddress(customFields: any): Partial<AddressComponents> {
  if (!customFields || typeof customFields !== 'object') {
    return {};
  }
  
  return {
    line1: customFields['CAV Street Address 1'] || customFields['cav_street_address_1'] || '',
    line2: customFields['CAV Street Address 2'] || customFields['cav_street_address_2'] || '',
    line3: customFields['CAV Street Address 3'] || customFields['cav_street_address_3'] || '',
    city: customFields['CAV Town'] || customFields['cav_town'] || '',
    state: customFields['CAV State'] || customFields['cav_state'] || '',
    postal: customFields['CAV Postal Code'] || customFields['cav_postal_code'] || '',
    country: '', // CAV fields typically don't have country
  };
}

/**
 * Select the best phone number from available sources
 * Priority: Mobile > Contact Phone > CAV Tel > AI Enriched > HQ Phone
 */
export function selectBestPhone(contact: VerificationContactData): BestPhone {
  const candidates: Array<{ value: string | null | undefined; source: PhoneSource }> = [
    { value: contact.mobile, source: 'Contact Mobile' },
    { value: contact.phone, source: 'Contact Phone' },
    { value: getCavTel(contact.customFields), source: 'CAV Tel' },
    { value: contact.aiEnrichedPhone, source: 'AI Enriched Phone' },
    { value: contact.hqPhone, source: 'Company HQ Phone' },
  ];
  
  // Find first non-empty candidate
  for (const candidate of candidates) {
    if (candidate.value && candidate.value.trim() !== '') {
      const phoneFormatted = formatPhoneWithCountryCode(
        candidate.value,
        contact.contactCountry
      );
      
      return {
        phone: candidate.value,
        phoneFormatted: phoneFormatted || candidate.value,
        source: candidate.source,
      };
    }
  }
  
  // No phone found
  return {
    phone: '',
    phoneFormatted: '',
    source: 'None',
  };
}

/**
 * Select the best address from available sources with country matching
 * Priority: Contact > AI Enriched > Company HQ > CAV Custom Fields
 */
export function selectBestAddress(contact: VerificationContactData): BestAddress {
  const contactCountry = contact.contactCountry;
  
  // Define address candidates with their sources
  const candidates: Array<{
    address: Partial<AddressComponents>;
    source: AddressSource;
    country: string | null | undefined;
  }> = [
    {
      address: {
        line1: contact.contactAddress1 || '',
        line2: contact.contactAddress2 || '',
        line3: contact.contactAddress3 || '',
        city: contact.contactCity || '',
        state: contact.contactState || '',
        country: contact.contactCountry || '',
        postal: contact.contactPostal || '',
      },
      source: 'Contact Address',
      country: contact.contactCountry,
    },
    {
      address: {
        line1: contact.aiEnrichedAddress1 || '',
        line2: contact.aiEnrichedAddress2 || '',
        line3: contact.aiEnrichedAddress3 || '',
        city: contact.aiEnrichedCity || '',
        state: contact.aiEnrichedState || '',
        country: contact.aiEnrichedCountry || '',
        postal: contact.aiEnrichedPostal || '',
      },
      source: 'AI Enriched Address',
      country: contact.aiEnrichedCountry,
    },
    {
      address: {
        line1: contact.hqAddress1 || '',
        line2: contact.hqAddress2 || '',
        line3: contact.hqAddress3 || '',
        city: contact.hqCity || '',
        state: contact.hqState || '',
        country: contact.hqCountry || '',
        postal: contact.hqPostal || '',
      },
      source: 'Company HQ Address',
      country: contact.hqCountry,
    },
    {
      address: getCavAddress(contact.customFields),
      source: 'CAV Custom Fields',
      country: contactCountry, // Infer from contact country
    },
  ];
  
  // Find first complete address that matches contact country
  for (const candidate of candidates) {
    const isComplete = isAddressComplete(candidate.address);
    const countryMatches = doesCountryMatch(contactCountry, candidate.country);
    
    if (isComplete && countryMatches) {
      // Fill in country if missing (e.g., from CAV fields)
      const finalAddress: AddressComponents = {
        line1: candidate.address.line1 || '',
        line2: candidate.address.line2 || '',
        line3: candidate.address.line3 || '',
        city: candidate.address.city || '',
        state: candidate.address.state || '',
        country: candidate.address.country || contactCountry || '',
        postal: candidate.address.postal || '',
      };
      
      return {
        address: finalAddress,
        source: candidate.source,
        isComplete: true,
        countryMatches: true,
      };
    }
  }
  
  // No complete matching address found - return empty
  return {
    address: {
      line1: '',
      line2: '',
      line3: '',
      city: '',
      state: '',
      country: contactCountry || '',
      postal: '',
    },
    source: 'None',
    isComplete: false,
    countryMatches: false,
  };
}

/**
 * Main function: Select best phone and address from a verification contact
 */
export function selectBestVerificationContactData(
  contact: VerificationContactData
): BestContactData {
  return {
    phone: selectBestPhone(contact),
    address: selectBestAddress(contact),
  };
}
