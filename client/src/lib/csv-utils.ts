import type { Account, Contact } from "@shared/schema";
import { parsePhoneNumberFromString } from 'libphonenumber-js';

// Escape and quote a CSV field according to RFC4180
function escapeCSVField(field: string): string {
  if (field == null) return "";

  const stringField = String(field);

  // Check if field contains comma, quote, or newline
  if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n') || stringField.includes('\r')) {
    // Escape quotes by doubling them
    const escaped = stringField.replace(/"/g, '""');
    // Wrap in quotes
    return `"${escaped}"`;
  }

  return stringField;
}

// Helper function to normalize email
const normalizeEmail = (email: string): string => {
  return email.toLowerCase().trim();
};

// Helper function to clean phone number (remove dots, dashes, spaces)
const cleanPhoneNumber = (phone: string): string => {
  if (!phone) return '';
  return phone.replace(/[\.\-\s\(\)]/g, '').trim();
};

// Helper function to format phone number with country code
const formatPhoneNumber = (phone: string, country?: string): string => {
  if (!phone) return '';
  try {
    const phoneNumber = parsePhoneNumberFromString(phone, country as any);
    if (phoneNumber) {
      return phoneNumber.formatInternational();
    }
  } catch (error) {
    console.error(`Error formatting phone number ${phone} for country ${country}:`, error);
  }
  // Fallback to cleaned number if formatting fails
  return cleanPhoneNumber(phone);
};


// Generate unified CSV template for Contacts with Account information
export function generateContactsWithAccountTemplate(): string {
  const headers = [
    // Contact fields
    "firstName",
    "lastName",
    "fullName",
    "email",
    "directPhone",
    "mobilePhone", // Added mobilePhone field
    "jobTitle",
    "department",
    "seniorityLevel",
    "city",
    "state",
    "county",
    "postalCode",
    "country",
    "contactLocation",
    "linkedinUrl",
    "consentBasis",
    "consentSource",
    "tags", // Comma-separated values in quotes
    "customFields", // JSON string
    // Account fields (prefixed with account_)
    "account_name",
    "account_domain",
    "account_industry",
    "account_employeesSize",
    "account_revenue",
    "account_hqStreet1",
    "account_hqStreet2",
    "account_hqStreet3",
    "account_hqCity",
    "account_hqState",
    "account_hqPostalCode",
    "account_hqCountry",
    "account_companyLocation",
    "account_phone",
    "account_linkedinUrl",
    "account_description",
    "account_techStack", // Comma-separated values in quotes
    "account_tags", // Comma-separated values in quotes
    "account_customFields", // JSON string
  ];

  const sampleRow = [
    // Contact data
    escapeCSVField("John"),
    escapeCSVField("Doe"),
    escapeCSVField("John Doe"),
    escapeCSVField("john.doe@example.com"),
    escapeCSVField("+14155551234"),
    escapeCSVField("+14155555678"), // Sample mobile direct phone
    escapeCSVField("VP of Sales"),
    escapeCSVField("Sales"),
    escapeCSVField("Executive"),
    escapeCSVField("San Francisco"),
    escapeCSVField("CA"),
    escapeCSVField("San Francisco County"),
    escapeCSVField("94102"),
    escapeCSVField("United States"),
    escapeCSVField("San Francisco, CA 94102, United States"),
    escapeCSVField("https://linkedin.com/in/johndoe"),
    escapeCSVField("legitimate_interest"),
    escapeCSVField("Website Form"),
    escapeCSVField("enterprise,vip"),
    escapeCSVField('{"favorite_color":"blue"}'),
    // Account data
    escapeCSVField("Acme Corporation"),
    escapeCSVField("acme.com"),
    escapeCSVField("Technology"),
    escapeCSVField("1000-5000"),
    escapeCSVField("$50M-$100M"),
    escapeCSVField("123 Main Street"),
    escapeCSVField("Suite 400"),
    escapeCSVField(""),
    escapeCSVField("San Francisco"),
    escapeCSVField("CA"),
    escapeCSVField("94105"),
    escapeCSVField("United States"),
    escapeCSVField("123 Main Street, Suite 400, San Francisco, CA 94105, United States"),
    escapeCSVField("+14155559999"),
    escapeCSVField("https://linkedin.com/company/acme"),
    escapeCSVField("Leading technology company"),
    escapeCSVField("Salesforce,HubSpot,AWS"),
    escapeCSVField("Enterprise,Hot Lead"),
    escapeCSVField('{"contract_type":"annual"}'),
  ];

  return [headers.join(","), sampleRow.join(",")].join("\n");
}

// Legacy function for backward compatibility
export function generateContactsTemplate(): string {
  return generateContactsWithAccountTemplate();
}

// Generate CSV template for Accounts
export function generateAccountsTemplate(): string {
  const headers = [
    "name",
    "domain",
    "industryStandardized",
    "employeesSizeRange",
    "annualRevenue",
    "hqStreet1",
    "hqStreet2",
    "hqStreet3",
    "hqCity",
    "hqState",
    "hqPostalCode",
    "hqCountry",
    "companyLocation",
    "mainPhone",
    "linkedinUrl",
    "description",
    "techStack", // Comma-separated values in quotes
    "tags", // Comma-separated values in quotes
    "customFields", // JSON string
  ];

  const sampleRow = [
    escapeCSVField("Acme Corporation"),
    escapeCSVField("acme.com"),
    escapeCSVField("Technology"),
    escapeCSVField("1000-5000"),
    escapeCSVField("$50M-$100M"),
    escapeCSVField("123 Main Street"),
    escapeCSVField("Suite 400"),
    escapeCSVField(""),
    escapeCSVField("San Francisco"),
    escapeCSVField("CA"),
    escapeCSVField("94105"),
    escapeCSVField("United States"),
    escapeCSVField("123 Main Street, Suite 400, San Francisco, CA 94105, United States"),
    escapeCSVField("+14155559999"),
    escapeCSVField("https://linkedin.com/company/acme"),
    escapeCSVField("Leading technology company"),
    escapeCSVField("Salesforce,HubSpot,AWS"),
    escapeCSVField("Enterprise,Hot Lead"),
    escapeCSVField('{"contract_type":"annual","preferred_contact":"email"}'),
  ];

  return [headers.join(","), sampleRow.join(",")].join("\n");
}

// Download CSV file
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Export contacts to CSV
export function exportContactsToCSV(contacts: Contact[]): string {
  const headers = [
    "id",
    "accountId",
    "firstName",
    "lastName",
    "fullName",
    "email",
    "emailNormalized",
    "emailVerificationStatus",
    "emailAiConfidence",
    "directPhone",
    "directPhoneE164",
    "phoneExtension",
    "phoneVerifiedAt",
    "phoneAiConfidence",
    "mobilePhone",
    "mobilePhoneE164",
    "jobTitle",
    "department",
    "seniorityLevel",
    "formerPosition",
    "timeInCurrentPosition",
    "timeInCurrentPositionMonths",
    "timeInCurrentCompany",
    "timeInCurrentCompanyMonths",
    "linkedinUrl",
    "address",
    "city",
    "state",
    "stateAbbr",
    "county",
    "postalCode",
    "country",
    "contactLocation",
    "timezone",
    "intentTopics",
    "tags",
    "consentBasis",
    "consentSource",
    "consentTimestamp",
    "ownerId",
    "customFields",
    "emailStatus",
    "phoneStatus",
    "sourceSystem",
    "sourceRecordId",
    "sourceUpdatedAt",
    "researchDate",
    "list",
    "isInvalid",
    "invalidReason",
    "invalidatedAt",
    "invalidatedBy",
    "deletedAt",
    "createdAt",
    "updatedAt",
  ];

  const rows = contacts.map((contact: any) => [
    escapeCSVField(contact.id),
    escapeCSVField(contact.accountId || ""),
    escapeCSVField(contact.firstName || ""),
    escapeCSVField(contact.lastName || ""),
    escapeCSVField(contact.fullName || ""),
    escapeCSVField(contact.email),
    escapeCSVField(contact.emailNormalized || ""),
    escapeCSVField(contact.emailVerificationStatus || ""),
    escapeCSVField(contact.emailAiConfidence || ""),
    escapeCSVField(contact.directPhone || ""),
    escapeCSVField(contact.directPhoneE164 || ""),
    escapeCSVField(contact.phoneExtension || ""),
    escapeCSVField(contact.phoneVerifiedAt || ""),
    escapeCSVField(contact.phoneAiConfidence || ""),
    escapeCSVField(contact.mobilePhone || ""),
    escapeCSVField(contact.mobilePhoneE164 || ""),
    escapeCSVField(contact.jobTitle || ""),
    escapeCSVField(contact.department || ""),
    escapeCSVField(contact.seniorityLevel || ""),
    escapeCSVField(contact.formerPosition || ""),
    escapeCSVField(contact.timeInCurrentPosition || ""),
    escapeCSVField(contact.timeInCurrentPositionMonths || ""),
    escapeCSVField(contact.timeInCurrentCompany || ""),
    escapeCSVField(contact.timeInCurrentCompanyMonths || ""),
    escapeCSVField(contact.linkedinUrl || ""),
    escapeCSVField(contact.address || ""),
    escapeCSVField(contact.city || ""),
    escapeCSVField(contact.state || ""),
    escapeCSVField(contact.stateAbbr || ""),
    escapeCSVField(contact.county || ""),
    escapeCSVField(contact.postalCode || ""),
    escapeCSVField(contact.country || ""),
    escapeCSVField(contact.contactLocation || ""),
    escapeCSVField(contact.timezone || ""),
    escapeCSVField(contact.intentTopics ? contact.intentTopics.join(",") : ""),
    escapeCSVField(contact.tags ? contact.tags.join(",") : ""),
    escapeCSVField(contact.consentBasis || ""),
    escapeCSVField(contact.consentSource || ""),
    escapeCSVField(contact.consentTimestamp || ""),
    escapeCSVField(contact.ownerId || ""),
    escapeCSVField(contact.customFields ? JSON.stringify(contact.customFields) : ""),
    escapeCSVField(contact.emailStatus || ""),
    escapeCSVField(contact.phoneStatus || ""),
    escapeCSVField(contact.sourceSystem || ""),
    escapeCSVField(contact.sourceRecordId || ""),
    escapeCSVField(contact.sourceUpdatedAt || ""),
    escapeCSVField(contact.researchDate || ""),
    escapeCSVField(contact.list || ""),
    escapeCSVField(contact.isInvalid !== undefined ? String(contact.isInvalid) : ""),
    escapeCSVField(contact.invalidReason || ""),
    escapeCSVField(contact.invalidatedAt || ""),
    escapeCSVField(contact.invalidatedBy || ""),
    escapeCSVField(contact.deletedAt || ""),
    escapeCSVField(contact.createdAt || ""),
    escapeCSVField(contact.updatedAt || ""),
  ]);

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

// Export accounts to CSV
export function exportAccountsToCSV(accounts: Account[]): string {
  const headers = [
    "id",
    "name",
    "nameNormalized",
    "canonicalName",
    "domain",
    "domainNormalized",
    "websiteDomain",
    "industryStandardized",
    "industrySecondary",
    "industryCode",
    "industryRaw",
    "industryAiSuggested",
    "industryAiTopk",
    "industryAiConfidence",
    "industryAiSource",
    "industryAiSuggestedAt",
    "industryAiStatus",
    "industryAiCandidates",
    "industryAiReviewedBy",
    "industryAiReviewedAt",
    "annualRevenue",
    "revenueRange",
    "employeesSizeRange",
    "staffCount",
    "description",
    "hqStreet1",
    "hqStreet2",
    "hqStreet3",
    "hqAddress",
    "hqCity",
    "hqState",
    "hqStateAbbr",
    "hqPostalCode",
    "hqCountry",
    "companyLocation",
    "yearFounded",
    "foundedDate",
    "foundedDatePrecision",
    "sicCode",
    "naicsCode",
    "previousNames",
    "linkedinUrl",
    "linkedinId",
    "linkedinSpecialties",
    "mainPhone",
    "mainPhoneE164",
    "mainPhoneExtension",
    "intentTopics",
    "techStack",
    "webTechnologies",
    "webTechnologiesJson",
    "parentAccountId",
    "tags",
    "ownerId",
    "customFields",
    "sourceSystem",
    "sourceRecordId",
    "sourceUpdatedAt",
    "aiEnrichmentDate",
    "aiEnrichmentData",
    "deletedAt",
    "createdAt",
    "updatedAt",
  ];

  const rows = accounts.map((account: any) => [
    escapeCSVField(account.id),
    escapeCSVField(account.name),
    escapeCSVField(account.nameNormalized || ""),
    escapeCSVField(account.canonicalName || ""),
    escapeCSVField(account.domain || ""),
    escapeCSVField(account.domainNormalized || ""),
    escapeCSVField(account.websiteDomain || ""),
    escapeCSVField(account.industryStandardized || ""),
    escapeCSVField(account.industrySecondary ? account.industrySecondary.join(",") : ""),
    escapeCSVField(account.industryCode || ""),
    escapeCSVField(account.industryRaw || ""),
    escapeCSVField(account.industryAiSuggested || ""),
    escapeCSVField(account.industryAiTopk ? account.industryAiTopk.join(",") : ""),
    escapeCSVField(account.industryAiConfidence || ""),
    escapeCSVField(account.industryAiSource || ""),
    escapeCSVField(account.industryAiSuggestedAt || ""),
    escapeCSVField(account.industryAiStatus || ""),
    escapeCSVField(account.industryAiCandidates ? JSON.stringify(account.industryAiCandidates) : ""),
    escapeCSVField(account.industryAiReviewedBy || ""),
    escapeCSVField(account.industryAiReviewedAt || ""),
    escapeCSVField(account.annualRevenue || ""),
    escapeCSVField(account.revenueRange || ""),
    escapeCSVField(account.employeesSizeRange || ""),
    escapeCSVField(account.staffCount || ""),
    escapeCSVField(account.description || ""),
    escapeCSVField(account.hqStreet1 || ""),
    escapeCSVField(account.hqStreet2 || ""),
    escapeCSVField(account.hqStreet3 || ""),
    escapeCSVField(account.hqAddress || ""),
    escapeCSVField(account.hqCity || ""),
    escapeCSVField(account.hqState || ""),
    escapeCSVField(account.hqStateAbbr || ""),
    escapeCSVField(account.hqPostalCode || ""),
    escapeCSVField(account.hqCountry || ""),
    escapeCSVField(account.companyLocation || ""),
    escapeCSVField(account.yearFounded || ""),
    escapeCSVField(account.foundedDate || ""),
    escapeCSVField(account.foundedDatePrecision || ""),
    escapeCSVField(account.sicCode || ""),
    escapeCSVField(account.naicsCode || ""),
    escapeCSVField(account.previousNames ? account.previousNames.join(",") : ""),
    escapeCSVField(account.linkedinUrl || ""),
    escapeCSVField(account.linkedinId || ""),
    escapeCSVField(account.linkedinSpecialties ? account.linkedinSpecialties.join(",") : ""),
    escapeCSVField(account.mainPhone || ""),
    escapeCSVField(account.mainPhoneE164 || ""),
    escapeCSVField(account.mainPhoneExtension || ""),
    escapeCSVField(account.intentTopics ? account.intentTopics.join(",") : ""),
    escapeCSVField(account.techStack ? account.techStack.join(",") : ""),
    escapeCSVField(account.webTechnologies || ""),
    escapeCSVField(account.webTechnologiesJson ? JSON.stringify(account.webTechnologiesJson) : ""),
    escapeCSVField(account.parentAccountId || ""),
    escapeCSVField(account.tags ? account.tags.join(",") : ""),
    escapeCSVField(account.ownerId || ""),
    escapeCSVField(account.customFields ? JSON.stringify(account.customFields) : ""),
    escapeCSVField(account.sourceSystem || ""),
    escapeCSVField(account.sourceRecordId || ""),
    escapeCSVField(account.sourceUpdatedAt || ""),
    escapeCSVField(account.aiEnrichmentDate || ""),
    escapeCSVField(account.aiEnrichmentData ? JSON.stringify(account.aiEnrichmentData) : ""),
    escapeCSVField(account.deletedAt || ""),
    escapeCSVField(account.createdAt || ""),
    escapeCSVField(account.updatedAt || ""),
  ]);

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

// Parse CSV content according to RFC4180
export function parseCSV(content: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < content.length) {
    const char = content[i];
    const nextChar = i + 1 < content.length ? content[i + 1] : null;

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote (doubled quotes) - add single quote to field
        current += '"';
        i += 2; // Skip both quotes
        continue;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      row.push(current);
      current = "";
    } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
      // End of row (handle both LF and CRLF)
      row.push(current);
      current = "";

      // Only add non-empty rows
      if (row.length > 0 && row.some(field => field.trim())) {
        result.push(row);
      }
      row = [];

      // Skip the LF if we just processed CR
      if (char === '\r' && nextChar === '\n') {
        i++; // Skip the \n
      }
    } else if (char === '\r' && nextChar !== '\n' && !inQuotes) {
      // Standalone CR (old Mac format) - treat as line break
      row.push(current);
      current = "";

      if (row.length > 0 && row.some(field => field.trim())) {
        result.push(row);
      }
      row = [];
    } else {
      // Regular character or quoted newline
      current += char;
    }

    i++;
  }

  // Add the last field and row if there's content
  if (current || row.length > 0) {
    row.push(current);
    if (row.some(field => field.trim())) {
      result.push(row);
    }
  }

  return result;
}

// Validation error interface
export interface ValidationError {
  row: number;
  field: string;
  value: string;
  error: string;
}

// Validate contact row (contacts-only format)
export function validateContactRow(
  row: string[],
  headers: string[],
  rowIndex: number
): ValidationError[] {
  const errors: ValidationError[] = [];
  const rowData: Record<string, string> = {};

  headers.forEach((header, index) => {
    rowData[header] = row[index] || "";
  });

  // Email validation - only validate format if email is provided
  if (rowData.email && !rowData.email.includes("@")) {
    errors.push({
      row: rowIndex,
      field: "email",
      value: rowData.email || "",
      error: "Invalid email format",
    });
  }

  // Validate custom fields JSON
  if (rowData.customFields) {
    try {
      JSON.parse(rowData.customFields);
    } catch {
      errors.push({
        row: rowIndex,
        field: "customFields",
        value: rowData.customFields,
        error: "Invalid JSON format",
      });
    }
  }

  return errors;
}

// Validate account row
export function validateAccountRow(
  row: string[],
  headers: string[],
  rowIndex: number
): ValidationError[] {
  const errors: ValidationError[] = [];
  const rowData: Record<string, string> = {};

  headers.forEach((header, index) => {
    rowData[header] = row[index] || "";
  });

  // Name is required
  if (!rowData.name || rowData.name.trim().length === 0) {
    errors.push({
      row: rowIndex,
      field: "name",
      value: rowData.name || "",
      error: "Account name is required",
    });
  }

  // Validate custom fields JSON
  if (rowData.customFields) {
    try {
      JSON.parse(rowData.customFields);
    } catch {
      errors.push({
        row: rowIndex,
        field: "customFields",
        value: rowData.customFields,
        error: "Invalid JSON format",
      });
    }
  }

  return errors;
}

// Convert CSV row to Contact object
export function csvRowToContact(
  row: string[],
  headers: string[]
): Partial<Contact> {
  const data: Record<string, string> = {};
  headers.forEach((header, index) => {
    data[header] = row[index] || "";
  });

  // Helper to get value from multiple possible column names
  const getValue = (...keys: string[]) => {
    for (const key of keys) {
      if (data[key]) return data[key];
    }
    return undefined;
  };

  const contact: any = {
    firstName: getValue('firstName', 'First Name', 'first_name') || "",
    lastName: getValue('lastName', 'Last Name', 'last_name') || "",
    fullName: getValue('fullName', 'Full Name', 'full_name') || `${getValue('firstName', 'First Name', 'first_name')} ${getValue('lastName', 'Last Name', 'last_name')}`.trim(),
    email: normalizeEmail(getValue('email', 'Email', 'Email Address') || ''),
    directPhone: formatPhoneNumber(getValue('directPhone', 'Direct Phone', 'direct_phone', 'Phone') || '', getValue('country', 'Country')),
    mobilePhone: formatPhoneNumber(getValue('mobilePhone', 'Mobile Phone', 'mobile_phone', 'Mobile') || '', getValue('country', 'Country')),
    jobTitle: getValue('jobTitle', 'Job Title', 'job_title', 'Title'),
    department: getValue('department', 'Department'),
    seniorityLevel: getValue('seniorityLevel', 'Seniority Level', 'seniority_level', 'Seniority'),
    city: getValue('city', 'City'),
    state: getValue('state', 'State'),
    county: getValue('county', 'County'),
    postalCode: getValue('postalCode', 'Postal Code', 'postal_code', 'Zip', 'ZIP Code'),
    country: getValue('country', 'Country'),
    contactLocation: getValue('contactLocation', 'Contact Location', 'contact_location', 'Location'),
    linkedinUrl: getValue('linkedinUrl', 'LinkedIn URL', 'linkedin_url', 'LinkedIn'),
    consentBasis: getValue('consentBasis', 'Consent Basis', 'consent_basis'),
    consentSource: getValue('consentSource', 'Consent Source', 'consent_source'),
  };

  // Parse tags
  if (data.tags) {
    const tagsStr = data.tags.replace(/^"|"$/g, "");
    contact.tags = tagsStr.split(",").map((t) => t.trim()).filter(Boolean);
  }

  // Parse custom fields
  if (data.customFields) {
    try {
      contact.customFields = JSON.parse(data.customFields);
    } catch {
      contact.customFields = {};
    }
  }

  return contact;
}

// Convert CSV row to Account object
export function csvRowToAccount(
  row: string[],
  headers: string[]
): Partial<Account> {
  const data: Record<string, string> = {};
  headers.forEach((header, index) => {
    data[header] = row[index] || "";
  });

  // Helper to get value from multiple possible column names
  const getValue = (...keys: string[]) => {
    for (const key of keys) {
      if (data[key]) return data[key];
    }
    return undefined;
  };

  const account: any = {
    name: getValue('name', 'Name'),
    domain: getValue('domain', 'Website', 'website'),
    industryStandardized: getValue('industryStandardized', 'Industry', 'industry'),
    employeesSizeRange: getValue('employeesSizeRange', 'Employee Size', 'employee_size', 'employees'),
    annualRevenue: getValue('annualRevenue', 'Annual Revenue', 'revenue'),
    hqStreet1: getValue('hqStreet1', 'HQ Street Address 1', 'street1', 'address1'),
    hqStreet2: getValue('hqStreet2', 'HQ Street Address 2', 'street2', 'address2'),
    hqStreet3: getValue('hqStreet3', 'HQ Street Address 3', 'street3', 'address3'),
    hqCity: getValue('hqCity', 'HQ City', 'city'),
    hqState: getValue('hqState', 'HQ State', 'state'),
    hqPostalCode: getValue('hqPostalCode', 'HQ Postal Code', 'postal_code', 'zip'),
    hqCountry: getValue('hqCountry', 'HQ Country', 'country'),
    companyLocation: getValue('companyLocation', 'Full Address String', 'full_address'),
    mainPhone: formatPhoneNumber(getValue('mainPhone', 'Main HQ Phone', 'phone', 'main_phone') || '', getValue('hqCountry', 'HQ Country', 'country')),
    linkedinUrl: getValue('linkedinUrl', 'LinkedIn URL', 'linkedin'),
    description: getValue('description', 'Description'),
    yearFounded: getValue('yearFounded', 'Year Founded', 'year_founded') ? parseInt(getValue('yearFounded', 'Year Founded', 'year_founded')!) : undefined,
    sicCode: getValue('sicCode', 'SIC Code', 'sic'),
    naicsCode: getValue('naicsCode', 'NAICS Code', 'naics'),
  };

  // Parse tech stack
  if (data.techStack) {
    const techStr = data.techStack.replace(/^"|"$/g, "");
    account.techStack = techStr.split(",").map((t) => t.trim()).filter(Boolean);
  }

  // Parse tags
  if (data.tags) {
    const tagsStr = data.tags.replace(/^"|"$/g, "");
    account.tags = tagsStr.split(",").map((t) => t.trim()).filter(Boolean);
  }

  // Parse custom fields
  if (data.customFields) {
    try {
      account.customFields = JSON.parse(data.customFields);
    } catch {
      account.customFields = {};
    }
  }

  return account;
}

// Validate unified Contact+Account row
export function validateContactWithAccountRow(
  row: string[],
  headers: string[],
  rowIndex: number
): ValidationError[] {
  const errors: ValidationError[] = [];
  const rowData: Record<string, string> = {};

  headers.forEach((header, index) => {
    rowData[header] = row[index] || "";
  });

  // Contact validations
  // Email validation - only validate format if email is provided
  if (rowData.email && !rowData.email.includes("@")) {
    errors.push({
      row: rowIndex,
      field: "email",
      value: rowData.email || "",
      error: "Invalid email format for contact",
    });
  }

  // Validate contact custom fields JSON
  if (rowData.customFields) {
    try {
      JSON.parse(rowData.customFields);
    } catch {
      errors.push({
        row: rowIndex,
        field: "customFields",
        value: rowData.customFields,
        error: "Invalid JSON format for contact custom fields",
      });
    }
  }

  // Account validations
  // Either account name or domain is required
  if ((!rowData.account_name || rowData.account_name.trim().length === 0) &&
      (!rowData.account_domain || rowData.account_domain.trim().length === 0)) {
    errors.push({
      row: rowIndex,
      field: "account_name/account_domain",
      value: "",
      error: "Either account name or domain is required",
    });
  }

  // Validate account custom fields JSON
  if (rowData.account_customFields) {
    try {
      JSON.parse(rowData.account_customFields);
    } catch {
      errors.push({
        row: rowIndex,
        field: "account_customFields",
        value: rowData.account_customFields,
        error: "Invalid JSON format for account custom fields",
      });
    }
  }

  return errors;
}

// Extract Contact data from unified CSV row
export function csvRowToContactFromUnified(
  row: string[],
  headers: string[]
): Partial<Contact> {
  const data: Record<string, string> = {};
  headers.forEach((header, index) => {
    data[header] = row[index] || "";
  });

  // Helper to get value from multiple possible column names
  const getValue = (...keys: string[]) => {
    for (const key of keys) {
      if (data[key]) return data[key];
    }
    return undefined;
  };

  const contact: any = {
    firstName: getValue('firstName', 'First Name', 'first_name') || "",
    lastName: getValue('lastName', 'Last Name', 'last_name') || "",
    fullName: getValue('fullName', 'Full Name', 'full_name') || `${getValue('firstName', 'First Name', 'first_name')} ${getValue('lastName', 'Last Name', 'last_name')}`.trim(),
    email: normalizeEmail(getValue('email', 'Email', 'Email Address') || ''),
    directPhone: formatPhoneNumber(
      getValue('directPhone', 'Direct Phone', 'direct_phone', 'Phone') || '', 
      getValue('country', 'Country') || getValue('account_country', 'account_hqCountry')
    ),
    mobilePhone: formatPhoneNumber(
      getValue('mobilePhone', 'Mobile Phone', 'mobile_phone', 'Mobile') || '', 
      getValue('country', 'Country') || getValue('account_country', 'account_hqCountry')
    ),
    jobTitle: getValue('jobTitle', 'Job Title', 'job_title', 'Title'),
    department: getValue('department', 'Department'),
    seniorityLevel: getValue('seniorityLevel', 'Seniority Level', 'seniority_level', 'Seniority'),
    city: getValue('city', 'City'),
    state: getValue('state', 'State'),
    county: getValue('county', 'County'),
    postalCode: getValue('postalCode', 'Postal Code', 'postal_code', 'Zip', 'ZIP Code'),
    country: getValue('country', 'Country'),
    contactLocation: getValue('contactLocation', 'Contact Location', 'contact_location', 'Location'),
    linkedinUrl: getValue('linkedinUrl', 'LinkedIn URL', 'linkedin_url', 'LinkedIn'),
    consentBasis: getValue('consentBasis', 'Consent Basis', 'consent_basis'),
    consentSource: getValue('consentSource', 'Consent Source', 'consent_source'),
  };

  // Parse tags
  if (data.tags) {
    const tagsStr = data.tags.replace(/^"|"$/g, "");
    contact.tags = tagsStr.split(",").map((t) => t.trim()).filter(Boolean);
  }

  // Parse custom fields
  if (data.customFields) {
    try {
      contact.customFields = JSON.parse(data.customFields);
    } catch {
      contact.customFields = {};
    }
  }

  return contact;
}

// Extract Account data from unified CSV row (account_ prefixed fields)
export function csvRowToAccountFromUnified(
  row: string[],
  headers: string[]
): Partial<Account> {
  const data: Record<string, string> = {};
  headers.forEach((header, index) => {
    data[header] = row[index] || "";
  });

  const account: any = {
    name: data.account_name,
    domain: data.account_domain || undefined,
    industryStandardized: data.account_industry || data.account_industryStandardized || undefined,
    employeesSizeRange: data.account_employeesSize || data.account_employeesSizeRange || undefined,
    annualRevenue: data.account_revenue || data.account_annualRevenue || undefined,
    hqStreet1: data.account_hqStreet1 || undefined,
    hqStreet2: data.account_hqStreet2 || undefined,
    hqStreet3: data.account_hqStreet3 || undefined,
    hqCity: data.account_city || data.account_hqCity || undefined,
    hqState: data.account_state || data.account_hqState || undefined,
    hqPostalCode: data.account_hqPostalCode || undefined,
    hqCountry: data.account_country || data.account_hqCountry || undefined,
    companyLocation: data.account_companyLocation || undefined,
    mainPhone: formatPhoneNumber(data.account_phone || data.account_mainPhone, data.account_country || data.account_hqCountry), // Format with account country
    linkedinUrl: data.account_linkedinUrl || undefined,
    description: data.account_description || undefined,
  };

  // Parse tech stack
  if (data.account_techStack) {
    const techStr = data.account_techStack.replace(/^"|"$/g, "");
    account.techStack = techStr.split(",").map((t) => t.trim()).filter(Boolean);
  }

  // Parse tags
  if (data.account_tags) {
    const tagsStr = data.account_tags.replace(/^"|"$/g, "");
    account.tags = tagsStr.split(",").map((t) => t.trim()).filter(Boolean);
  }

  // Parse custom fields
  if (data.account_customFields) {
    try {
      account.customFields = JSON.parse(data.account_customFields);
    } catch {
      account.customFields = {};
    }
  }

  return account;
}