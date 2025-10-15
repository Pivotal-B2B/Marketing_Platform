import type { Account, Contact } from "@shared/schema";

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

// Generate unified CSV template for Contacts with Account information
export function generateContactsWithAccountTemplate(): string {
  const headers = [
    // Contact fields
    "firstName",
    "lastName", 
    "fullName",
    "email",
    "directPhone",
    "jobTitle",
    "department",
    "seniorityLevel",
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
    "account_city",
    "account_state",
    "account_country",
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
    escapeCSVField("VP of Sales"),
    escapeCSVField("Sales"),
    escapeCSVField("Executive"),
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
    escapeCSVField("San Francisco"),
    escapeCSVField("CA"),
    escapeCSVField("United States"),
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
    "hqCity",
    "hqState",
    "hqCountry",
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
    escapeCSVField("San Francisco"),
    escapeCSVField("CA"),
    escapeCSVField("United States"),
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
    "firstName",
    "lastName",
    "fullName",
    "email",
    "directPhone",
    "jobTitle",
    "department",
    "seniorityLevel",
    "accountId",
    "emailVerificationStatus",
    "linkedinUrl",
    "consentBasis",
    "consentSource",
    "tags",
    "customFields",
    "createdAt",
    "updatedAt",
  ];

  const rows = contacts.map((contact) => [
    escapeCSVField(contact.id),
    escapeCSVField(contact.firstName || ""),
    escapeCSVField(contact.lastName || ""),
    escapeCSVField(contact.fullName || ""),
    escapeCSVField(contact.email),
    escapeCSVField(contact.directPhone || ""),
    escapeCSVField(contact.jobTitle || ""),
    escapeCSVField(contact.department || ""),
    escapeCSVField(contact.seniorityLevel || ""),
    escapeCSVField(contact.accountId || ""),
    escapeCSVField(contact.emailVerificationStatus || ""),
    escapeCSVField(contact.linkedinUrl || ""),
    escapeCSVField(contact.consentBasis || ""),
    escapeCSVField(contact.consentSource || ""),
    escapeCSVField(contact.tags ? contact.tags.join(",") : ""),
    escapeCSVField(contact.customFields ? JSON.stringify(contact.customFields) : ""),
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
    "domain",
    "industryStandardized",
    "employeesSizeRange",
    "annualRevenue",
    "hqCity",
    "hqState",
    "hqCountry",
    "mainPhone",
    "linkedinUrl",
    "description",
    "techStack",
    "tags",
    "customFields",
    "createdAt",
    "updatedAt",
  ];

  const rows = accounts.map((account) => [
    escapeCSVField(account.id),
    escapeCSVField(account.name),
    escapeCSVField(account.domain || ""),
    escapeCSVField(account.industryStandardized || ""),
    escapeCSVField(account.employeesSizeRange || ""),
    escapeCSVField(account.annualRevenue || ""),
    escapeCSVField(account.hqCity || ""),
    escapeCSVField(account.hqState || ""),
    escapeCSVField(account.hqCountry || ""),
    escapeCSVField(account.mainPhone || ""),
    escapeCSVField(account.linkedinUrl || ""),
    escapeCSVField(account.description || ""),
    escapeCSVField(account.techStack ? account.techStack.join(",") : ""),
    escapeCSVField(account.tags ? account.tags.join(",") : ""),
    escapeCSVField(account.customFields ? JSON.stringify(account.customFields) : ""),
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

  // Email is required
  if (!rowData.email || !rowData.email.includes("@")) {
    errors.push({
      row: rowIndex,
      field: "email",
      value: rowData.email || "",
      error: "Valid email is required",
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

  const contact: any = {
    firstName: data.firstName || "",
    lastName: data.lastName || "",
    fullName: data.fullName || `${data.firstName} ${data.lastName}`.trim(),
    email: data.email,
    directPhone: data.directPhone || undefined,
    jobTitle: data.jobTitle || undefined,
    department: data.department || undefined,
    seniorityLevel: data.seniorityLevel || undefined,
    linkedinUrl: data.linkedinUrl || undefined,
    consentBasis: data.consentBasis || undefined,
    consentSource: data.consentSource || undefined,
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

  const account: any = {
    name: data.name,
    domain: data.domain || undefined,
    industryStandardized: data.industryStandardized || undefined,
    employeesSizeRange: data.employeesSizeRange || undefined,
    annualRevenue: data.annualRevenue || undefined,
    hqCity: data.hqCity || undefined,
    hqState: data.hqState || undefined,
    hqCountry: data.hqCountry || undefined,
    mainPhone: data.mainPhone || undefined,
    linkedinUrl: data.linkedinUrl || undefined,
    description: data.description || undefined,
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
  // Email is required
  if (!rowData.email || !rowData.email.includes("@")) {
    errors.push({
      row: rowIndex,
      field: "email",
      value: rowData.email || "",
      error: "Valid email is required for contact",
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

  const contact: any = {
    firstName: data.firstName || "",
    lastName: data.lastName || "",
    fullName: data.fullName || `${data.firstName} ${data.lastName}`.trim(),
    email: data.email,
    directPhone: data.directPhone || undefined,
    jobTitle: data.jobTitle || undefined,
    department: data.department || undefined,
    seniorityLevel: data.seniorityLevel || undefined,
    linkedinUrl: data.linkedinUrl || undefined,
    consentBasis: data.consentBasis || undefined,
    consentSource: data.consentSource || undefined,
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
    industryStandardized: data.account_industry || undefined,
    employeesSizeRange: data.account_employeesSize || undefined,
    annualRevenue: data.account_revenue || undefined,
    hqCity: data.account_city || undefined,
    hqState: data.account_state || undefined,
    hqCountry: data.account_country || undefined,
    mainPhone: data.account_phone || undefined,
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
