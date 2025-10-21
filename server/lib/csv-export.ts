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
      'Phone': contact.phone || '',
      'Mobile': contact.mobile || '',
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
    };

    // Add company fields if requested
    if (includeCompanyFields && contact.account) {
      const account = contact.account;
      
      row['Company Name'] = account.name || '';
      row['Company Domain'] = account.domain || '';
      row['Website Domain'] = account.websiteDomain || '';
      row['Company Industry'] = account.industry || '';
      row['Company Annual Revenue'] = account.annualRevenue ? formatNumberForCsv(account.annualRevenue) : '';
      row['Revenue Range'] = account.revenueRange || '';
      row['Staff Count Range'] = account.employeesSizeRange || '';
      row['Company Description'] = account.description || ''; // Multiline text
      row['Company Founded Date'] = account.foundedDate || '';
      row['Company LinkedIn URL'] = account.linkedinUrl || '';
      row['Company LinkedIn ID'] = account.linkedinId || '';
      row['Web Technologies'] = account.webTechnologies || '';
      row['SIC Code'] = account.sicCode || '';
      row['NAICS Code'] = account.naicsCode || '';
      
      // HQ fields
      row['HQ Address 1'] = account.hqStreet1 || '';
      row['HQ Address 2'] = account.hqStreet2 || '';
      row['HQ Address 3'] = account.hqStreet3 || '';
      row['HQ City'] = account.hqCity || '';
      row['HQ State'] = account.hqState || '';
      row['HQ Country'] = account.hqCountry || '';
      row['HQ Postal Code'] = account.hqPostalCode || '';
      row['HQ Phone'] = account.mainPhone || '';
    }

    // Add verification status fields
    row['Source Type'] = contact.sourceType || '';
    row['Eligibility Status'] = contact.eligibilityStatus || '';
    row['Verification Status'] = contact.verificationStatus || '';
    row['Queue Status'] = contact.queueStatus || '';
    row['Enrichment Status'] = contact.enrichmentStatus || '';
    row['Suppressed'] = contact.suppressed ? 'Yes' : 'No';
    row['Email Verification Status'] = contact.emailVerificationStatus || '';
    row['CAV ID'] = contact.cavId || '';
    row['CAV User ID'] = contact.cavUserId || '';

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
