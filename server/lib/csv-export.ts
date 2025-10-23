import Papa from 'papaparse';
import { formatNumberForCsv } from './data-normalization';

/**
 * CSV Export Utilities
 * 
 * Handles proper CSV serialization with:
 * - UTF-8 encoding with BOM (for Excel compatibility)
 * - Multiline text support (RFC-4180 compliant)
 * - No scientific notation for large numbers
 * - Proper quoting of fields with special characters
 */

/**
 * Clean phone number for CSV export
 * Removes dots, spaces, and formats consistently
 * Handles E.164 format (+1.234.567.8900) and other formats
 */
function cleanPhoneForExport(phone: string | null | undefined): string {
  if (!phone) return '';
  
  // Remove dots, extra spaces, and format cleanly
  // E.164 format: +1.234.567.8900 → +12345678900
  // Keep only digits, plus sign, and parentheses/dashes
  return phone
    .replace(/\./g, '')  // Remove dots
    .replace(/\s+/g, '')  // Remove extra spaces
    .trim();
}

export interface ExportOptions {
  /**
   * Include UTF-8 BOM at the start of the file (recommended for Excel)
   */
  includeBOM?: boolean;
  
  /**
   * Headers to include in the CSV
   */
  headers?: string[];
  
  /**
   * Custom delimiter (default: comma)
   */
  delimiter?: string;
}

/**
 * Convert data to CSV string with proper formatting
 * 
 * Features:
 * - UTF-8 BOM for Excel compatibility
 * - RFC-4180 compliant quoting for multiline fields
 * - Prevents scientific notation for large numbers
 * - Preserves accented characters (é, è, etc.)
 */
export function exportToCsv(
  data: Record<string, any>[],
  options: ExportOptions = {}
): string {
  const {
    includeBOM = true,
    delimiter = ',',
  } = options;

  if (data.length === 0) {
    return includeBOM ? '\uFEFF' : '';
  }

  // Ensure all number fields are formatted without scientific notation
  const formattedData = data.map(row => {
    const formattedRow: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(row)) {
      if (typeof value === 'number') {
        // Format numbers without scientific notation
        formattedRow[key] = formatNumberForCsv(value);
      } else if (value === null || value === undefined) {
        formattedRow[key] = '';
      } else {
        formattedRow[key] = value;
      }
    }
    
    return formattedRow;
  });

  // Use PapaParse to generate CSV with proper quoting
  const csvString = Papa.unparse(formattedData, {
    delimiter,
    header: true,
    quotes: true, // Always quote fields to handle multiline text, commas, quotes
    quoteChar: '"',
    escapeChar: '"',
    newline: '\r\n', // Windows-style line endings for Excel compatibility
  });

  // Add UTF-8 BOM for Excel to recognize encoding
  if (includeBOM) {
    return '\uFEFF' + csvString;
  }

  return csvString;
}

/**
 * Export verification contacts to CSV with all custom fields
 */
export function exportVerificationContactsToCsv(
  contacts: any[],
  includeCompanyFields: boolean = true
): string {
  const rows = contacts.map(contact => {
    const row: Record<string, any> = {
      // Contact fields
      'Full Name': contact.fullName || '',
      'First Name': contact.firstName || '',
      'Last Name': contact.lastName || '',
      'Title': contact.title || '',
      'Department': contact.department || '',
      'Seniority Level': contact.seniorityLevel || '',
      'Email': contact.email || '',
      'Email Status': contact.emailStatus || '',
      'Phone': cleanPhoneForExport(contact.phone),
      'Mobile': cleanPhoneForExport(contact.mobile),
      'LinkedIn URL': contact.linkedinUrl || '',
      
      // Career fields (with shadow duration months)
      'Former Position': contact.formerPosition || '',
      'Time in Current Position': contact.timeInCurrentPosition || '',
      'Time in Current Position (Months)': contact.timeInCurrentPositionMonths || '',
      'Time in Current Company': contact.timeInCurrentCompany || '',
      'Time in Current Company (Months)': contact.timeInCurrentCompanyMonths || '',
      
      // Contact location
      'Contact Address 1': contact.contactAddress1 || '',
      'Contact Address 2': contact.contactAddress2 || '',
      'Contact Address 3': contact.contactAddress3 || '',
      'Contact City': contact.contactCity || '',
      'Contact State': contact.contactState || '',
      'Contact Country': contact.contactCountry || '',
      'Contact Postal Code': contact.contactPostal || '',
      
      // Contact's own HQ fields (from original data source)
      'Contact HQ Address 1': contact.hqAddress1 || '',
      'Contact HQ Address 2': contact.hqAddress2 || '',
      'Contact HQ Address 3': contact.hqAddress3 || '',
      'Contact HQ City': contact.hqCity || '',
      'Contact HQ State': contact.hqState || '',
      'Contact HQ Country': contact.hqCountry || '',
      'Contact HQ Postal Code': contact.hqPostal || '',
      'Contact HQ Phone': cleanPhoneForExport(contact.hqPhone),
      
      // AI Enrichment Results (based on Contact Country)
      'AI Enriched Address 1': contact.aiEnrichedAddress1 || '',
      'AI Enriched Address 2': contact.aiEnrichedAddress2 || '',
      'AI Enriched Address 3': contact.aiEnrichedAddress3 || '',
      'AI Enriched City': contact.aiEnrichedCity || '',
      'AI Enriched State': contact.aiEnrichedState || '',
      'AI Enriched Postal Code': contact.aiEnrichedPostal || '',
      'AI Enriched Country': contact.aiEnrichedCountry || '',
      'AI Enriched Phone': cleanPhoneForExport(contact.aiEnrichedPhone),
    };

    // Add company fields if requested
    if (includeCompanyFields && contact.account) {
      const account = contact.account;
      
      row['Account Name'] = account.name || '';
      row['Account Domain'] = account.domain || '';
      row['Account Website'] = account.websiteDomain || '';
      row['Account Industry'] = account.industry || '';
      row['Account Revenue'] = account.annualRevenue ? formatNumberForCsv(account.annualRevenue) : '';
      row['Account Revenue Range'] = account.revenueRange || '';
      row['Account Size'] = account.employeesSizeRange || '';
      row['Account Description'] = account.description || ''; // Multiline text
      row['Account Founded'] = account.foundedDate || '';
      row['Account LinkedIn'] = account.linkedinUrl || '';
      row['Account LinkedIn ID'] = account.linkedinId || '';
      row['Account Tech Stack'] = account.webTechnologies || '';
      row['Account SIC Code'] = account.sicCode || '';
      row['Account NAICS Code'] = account.naicsCode || '';
      
      // Account HQ fields (from account master data)
      row['Account HQ Address 1'] = account.hqStreet1 || '';
      row['Account HQ Address 2'] = account.hqStreet2 || '';
      row['Account HQ Address 3'] = account.hqStreet3 || '';
      row['Account HQ City'] = account.hqCity || '';
      row['Account HQ State'] = account.hqState || '';
      row['Account HQ Country'] = account.hqCountry || '';
      row['Account HQ Postal Code'] = account.hqPostalCode || '';
      row['Account HQ Phone'] = cleanPhoneForExport(account.mainPhone);
    }

    // Add verification status fields
    row['Source Type'] = contact.sourceType || '';
    row['Eligibility Status'] = contact.eligibilityStatus || '';
    row['Verification Status'] = contact.verificationStatus || '';
    row['Queue Status'] = contact.queueStatus || '';
    row['Suppressed'] = contact.suppressed ? 'Yes' : 'No';
    row['CAV ID'] = contact.cavId || '';
    row['CAV User ID'] = contact.cavUserId || '';
    
    // Add custom fields dynamically (expand JSONB)
    if (contact.customFields && typeof contact.customFields === 'object') {
      for (const [key, value] of Object.entries(contact.customFields)) {
        // Use a clear prefix to distinguish custom fields
        const fieldName = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
        row[fieldName] = value !== null && value !== undefined ? String(value) : '';
      }
    }

    return row;
  });

  return exportToCsv(rows, { includeBOM: true });
}

/**
 * Prepare file for download with proper headers
 */
export function createCsvDownloadResponse(
  csvContent: string,
  filename: string
): {
  content: Buffer;
  headers: Record<string, string>;
} {
  // Convert to UTF-8 buffer (BOM already included in csvContent if requested)
  const buffer = Buffer.from(csvContent, 'utf8');

  return {
    content: buffer,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length.toString(),
    },
  };
}
