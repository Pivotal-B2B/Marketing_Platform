/**
 * Phone Number Formatting Utility
 * Formats phone numbers with country code prefix in the format: "country_code number"
 */

// Comprehensive country-to-dial-code mapping
const COUNTRY_DIAL_CODES: Record<string, string> = {
  // A
  'Afghanistan': '93',
  'Albania': '355',
  'Algeria': '213',
  'Andorra': '376',
  'Angola': '244',
  'Argentina': '54',
  'Armenia': '374',
  'Australia': '61',
  'Austria': '43',
  'Azerbaijan': '994',
  
  // B
  'Bahrain': '973',
  'Bangladesh': '880',
  'Belarus': '375',
  'Belgium': '32',
  'Belize': '501',
  'Benin': '229',
  'Bhutan': '975',
  'Bolivia': '591',
  'Bosnia and Herzegovina': '387',
  'Botswana': '267',
  'Brazil': '55',
  'Brunei': '673',
  'Bulgaria': '359',
  'Burkina Faso': '226',
  'Burundi': '257',
  
  // C
  'Cambodia': '855',
  'Cameroon': '237',
  'Canada': '1',
  'Cape Verde': '238',
  'Central African Republic': '236',
  'Chad': '235',
  'Chile': '56',
  'China': '86',
  'Colombia': '57',
  'Comoros': '269',
  'Congo': '242',
  'Costa Rica': '506',
  'Croatia': '385',
  'Cuba': '53',
  'Cyprus': '357',
  'Czech Republic': '420',
  
  // D
  'Denmark': '45',
  'Djibouti': '253',
  'Dominican Republic': '1',
  
  // E
  'Ecuador': '593',
  'Egypt': '20',
  'El Salvador': '503',
  'Equatorial Guinea': '240',
  'Eritrea': '291',
  'Estonia': '372',
  'Ethiopia': '251',
  
  // F
  'Fiji': '679',
  'Finland': '358',
  'France': '33',
  
  // G
  'Gabon': '241',
  'Gambia': '220',
  'Georgia': '995',
  'Germany': '49',
  'Ghana': '233',
  'Greece': '30',
  'Grenada': '1',
  'Guatemala': '502',
  'Guinea': '224',
  'Guinea-Bissau': '245',
  'Guyana': '592',
  
  // H
  'Haiti': '509',
  'Honduras': '504',
  'Hong Kong': '852',
  'Hungary': '36',
  
  // I
  'Iceland': '354',
  'India': '91',
  'Indonesia': '62',
  'Iran': '98',
  'Iraq': '964',
  'Ireland': '353',
  'Israel': '972',
  'Italy': '39',
  'Ivory Coast': '225',
  
  // J
  'Jamaica': '1',
  'Japan': '81',
  'Jordan': '962',
  
  // K
  'Kazakhstan': '7',
  'Kenya': '254',
  'Kuwait': '965',
  'Kyrgyzstan': '996',
  
  // L
  'Laos': '856',
  'Latvia': '371',
  'Lebanon': '961',
  'Lesotho': '266',
  'Liberia': '231',
  'Libya': '218',
  'Liechtenstein': '423',
  'Lithuania': '370',
  'Luxembourg': '352',
  
  // M
  'Macau': '853',
  'Macedonia': '389',
  'Madagascar': '261',
  'Malawi': '265',
  'Malaysia': '60',
  'Maldives': '960',
  'Mali': '223',
  'Malta': '356',
  'Mauritania': '222',
  'Mauritius': '230',
  'Mexico': '52',
  'Moldova': '373',
  'Monaco': '377',
  'Mongolia': '976',
  'Montenegro': '382',
  'Morocco': '212',
  'Mozambique': '258',
  'Myanmar': '95',
  
  // N
  'Namibia': '264',
  'Nepal': '977',
  'Netherlands': '31',
  'New Zealand': '64',
  'Nicaragua': '505',
  'Niger': '227',
  'Nigeria': '234',
  'North Korea': '850',
  'Norway': '47',
  
  // O
  'Oman': '968',
  
  // P
  'Pakistan': '92',
  'Palestine': '970',
  'Panama': '507',
  'Papua New Guinea': '675',
  'Paraguay': '595',
  'Peru': '51',
  'Philippines': '63',
  'Poland': '48',
  'Portugal': '351',
  
  // Q
  'Qatar': '974',
  
  // R
  'Romania': '40',
  'Russia': '7',
  'Rwanda': '250',
  
  // S
  'Saudi Arabia': '966',
  'Senegal': '221',
  'Serbia': '381',
  'Seychelles': '248',
  'Sierra Leone': '232',
  'Singapore': '65',
  'Slovakia': '421',
  'Slovenia': '386',
  'Somalia': '252',
  'South Africa': '27',
  'South Korea': '82',
  'South Sudan': '211',
  'Spain': '34',
  'Sri Lanka': '94',
  'Sudan': '249',
  'Suriname': '597',
  'Swaziland': '268',
  'Sweden': '46',
  'Switzerland': '41',
  'Syria': '963',
  
  // T
  'Taiwan': '886',
  'Tajikistan': '992',
  'Tanzania': '255',
  'Thailand': '66',
  'Togo': '228',
  'Trinidad and Tobago': '1',
  'Tunisia': '216',
  'Turkey': '90',
  'Turkmenistan': '993',
  
  // U
  'Uganda': '256',
  'Ukraine': '380',
  'United Arab Emirates': '971',
  'United Kingdom': '44',
  'United States': '1',
  'Uruguay': '598',
  'Uzbekistan': '998',
  
  // V
  'Vatican City': '379',
  'Venezuela': '58',
  'Vietnam': '84',
  
  // Y
  'Yemen': '967',
  
  // Z
  'Zambia': '260',
  'Zimbabwe': '263',
  
  // Common alternative names
  'UAE': '971',
  'UK': '44',
  'USA': '1',
  'US': '1',
  'Korea, South': '82',
  'Korea, North': '850',
  'Congo (DRC)': '243',
  'Congo (Republic)': '242',
};

/**
 * Clean phone number by removing common formatting characters
 */
function cleanPhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // Remove common separators and whitespace
  return phone
    .replace(/[\s\-\(\)\[\]\.]/g, '')
    .replace(/^[\+]/g, ''); // Remove leading + if present
}

/**
 * Check if a phone number already has a country code
 */
function hasCountryCode(phone: string, countryCode: string): boolean {
  const cleaned = cleanPhoneNumber(phone);
  return cleaned.startsWith(countryCode);
}

/**
 * Format phone number with country code prefix
 * @param phone - The phone number to format
 * @param country - The country name to derive the dial code from
 * @returns Formatted phone number as "country_code number" (e.g., "91 1234567890")
 */
export function formatPhoneWithCountryCode(phone: string | null | undefined, country: string | null | undefined): string {
  // Return empty if no phone number
  if (!phone || phone.trim() === '') {
    return '';
  }
  
  // Clean the phone number
  const cleanedPhone = cleanPhoneNumber(phone);
  
  // Return as-is if empty after cleaning
  if (!cleanedPhone) {
    return '';
  }
  
  // Get country code
  const countryCode = getCountryDialCode(country);
  
  // If no country code found, return cleaned phone as-is
  if (!countryCode) {
    return cleanedPhone;
  }
  
  // If phone already has the country code, format it correctly
  if (hasCountryCode(phone, countryCode)) {
    const numberWithoutCode = cleanedPhone.substring(countryCode.length);
    return `${countryCode} ${numberWithoutCode}`;
  }
  
  // Add country code prefix
  return `${countryCode} ${cleanedPhone}`;
}

/**
 * Get dial code for a country
 */
export function getCountryDialCode(country: string | null | undefined): string | null {
  if (!country) return null;
  
  // Trim and normalize
  const normalizedCountry = country.trim();
  
  // Direct lookup
  if (COUNTRY_DIAL_CODES[normalizedCountry]) {
    return COUNTRY_DIAL_CODES[normalizedCountry];
  }
  
  // Case-insensitive lookup
  const countryLower = normalizedCountry.toLowerCase();
  for (const [key, code] of Object.entries(COUNTRY_DIAL_CODES)) {
    if (key.toLowerCase() === countryLower) {
      return code;
    }
  }
  
  return null;
}
