/**
 * Centralized Field Label Mapping
 * 
 * Maps database field names to standardized display labels
 * This is presentation layer only - database schema remains unchanged
 * 
 * Usage:
 * - UI components should use these labels for display
 * - CSV exports should use these as column headers
 * - Forms should use these as field labels
 */

// ============================================
// CONTACT INFORMATION
// ============================================
export const CONTACT_FIELD_LABELS = {
  // Identity & Professional
  id: "Contact ID",
  cavId: "CAV_ID",
  cavUserId: "CAV_User_ID",
  fullName: "full_name",
  firstName: "first_name",
  lastName: "last_name",
  email: "Email_Address",
  emailNormalized: "Email_Address (normalized)",
  jobTitle: "job_title",
  department: "Department",
  seniorityLevel: "Seniority Level",
  linkedinUrl: "linkedin_url",
  
  // Career & Tenure
  formerPosition: "Former Position",
  timeInCurrentPosition: "Time in Current Position",
  timeInCurrentPositionMonths: "time_in_current_position_months",
  timeInCurrentCompany: "Time in Current Company",
  timeInCurrentCompanyMonths: "time_in_current_company_months",
  
  // Contact Methods
  directPhone: "Contact_Phone",
  directPhoneE164: "Contact_Phone (E164)",
  phoneExtension: "Phone Extension",
  mobilePhone: "Contact_Mobile",
  mobilePhoneE164: "Contact_Mobile (E164)",
  
  // Verification Status
  emailVerificationStatus: "Email Verification Status",
  emailStatus: "Email Status",
  phoneStatus: "Phone Status",
  emailAiConfidence: "Email AI Confidence",
  phoneAiConfidence: "Phone AI Confidence",
  phoneVerifiedAt: "Phone Verified At",
  
  // Other
  intentTopics: "Intent Topics",
  tags: "Tags",
  list: "List",
  sourceSystem: "Source System",
  sourceRecordId: "Source Record ID",
  ownerId: "Owner",
  researchDate: "Research Date",
} as const;

// ============================================
// CONTACT ADDRESS FIELDS
// ============================================
export const CONTACT_ADDRESS_LABELS = {
  address: "contact_street_1",
  city: "contact_city",
  state: "contact_state",
  stateAbbr: "contact_state_abbr",
  postalCode: "contact_postal_code",
  country: "contact_country",
  county: "County",
  contactLocation: "contact_location_snap",
  timezone: "Timezone",
} as const;

// ============================================
// ACCOUNT / COMPANY INFORMATION
// ============================================
export const ACCOUNT_FIELD_LABELS = {
  // Identity
  id: "Account ID",
  name: "account_name",
  nameNormalized: "account_name (normalized)",
  canonicalName: "Canonical Name",
  domain: "account_domain",
  domainNormalized: "account_domain (normalized)",
  websiteDomain: "Website Domain",
  previousNames: "Previous Names",
  
  // Industry & Classification
  industryStandardized: "account_industry",
  industrySecondary: "Secondary Industries",
  industryCode: "Industry Code",
  industryRaw: "Industry (Raw)",
  sicCode: "sic_code",
  naicsCode: "naics_code",
  
  // AI Industry Enrichment
  industryAiSuggested: "AI Suggested Industry",
  industryAiCandidates: "AI Industry Candidates",
  industryAiTopk: "AI Industry Top K",
  industryAiConfidence: "AI Industry Confidence",
  industryAiSource: "AI Industry Source",
  industryAiSuggestedAt: "AI Suggested At",
  industryAiStatus: "AI Industry Status",
  
  // Company Size & Revenue
  annualRevenue: "account_revenue",
  minAnnualRevenue: "account_min_revenue",
  maxAnnualRevenue: "account_max_revenue",
  revenueRange: "account_revenue_range",
  employeesSizeRange: "account_employee_size_range",
  staffCount: "Staff Count",
  minEmployeesSize: "account_min_employee_size",
  maxEmployeesSize: "account_max_employee_size",
  
  // Company Information
  description: "account_description",
  yearFounded: "Year Founded",
  foundedDate: "account_founded_date",
  foundedDatePrecision: "Founded Date Precision",
  linkedinUrl: "account_li_profile_url",
  linkedinId: "LinkedIn ID",
  linkedinSpecialties: "LinkedIn Specialties",
  
  // Contact Information
  mainPhone: "account_hq_phone",
  mainPhoneE164: "account_hq_phone (E164)",
  mainPhoneExtension: "HQ Phone Extension",
  
  // Technology & Intent
  intentTopics: "Intent Topics",
  techStack: "Tech Stack",
  webTechnologies: "Web Technologies",
  webTechnologiesJson: "Web Technologies (JSON)",
  
  // Hierarchy & Organization
  parentAccountId: "Parent Account",
  tags: "Tags",
  ownerId: "Owner",
  list: "List",
  
  // Source & Tracking
  sourceSystem: "Source System",
  sourceRecordId: "Source Record ID",
  sourceUpdatedAt: "Source Updated At",
  
  // AI Enrichment
  aiEnrichmentData: "AI Enrichment Data",
  aiEnrichmentDate: "Last AI Enrichment",
} as const;

// ============================================
// ACCOUNT HQ ADDRESS FIELDS
// ============================================
export const ACCOUNT_ADDRESS_LABELS = {
  hqStreet1: "account_hq_street_1",
  hqStreet2: "account_hq_street_2",
  hqStreet3: "account_hq_street_3",
  hqAddress: "HQ Address (Legacy)",
  hqCity: "account_city",
  hqState: "account_state",
  hqStateAbbr: "account_state_abbr",
  hqPostalCode: "account_postal_code",
  hqCountry: "account_country",
  companyLocation: "account_location_snap",
} as const;

// ============================================
// AI ENRICHMENT FIELDS
// ============================================
export const AI_ENRICHMENT_LABELS = {
  // Status Fields
  addressEnrichmentStatus: "address_enrichment_status",
  phoneEnrichmentStatus: "phone_enrichment_status",
  
  // Confidence Scores
  aiAddressConfidence: "ai_address_confidence",
  aiPhoneConfidence: "ai_phone_confidence",
  
  // Enriched Data
  aiEnrichedPhone: "ai_enriched_phone",
  aiEnrichedStreet1: "ai_enriched_street_1",
  aiEnrichedStreet2: "ai_enriched_street_2",
  aiEnrichedStreet3: "ai_enriched_street_3",
  aiEnrichedCity: "ai_enriched_city",
  aiEnrichedState: "ai_enriched_state",
  aiEnrichedPostalCode: "ai_enriched_postal_code",
  
  // Metadata
  enrichmentSource: "enrichment_source",
  lastEnrichmentRun: "last_enrichment_run",
  aiIndustryClassificationOverview: "ai_industry_classification_overview",
  aiAccountKeywords: "ai_account_keywords",
} as const;

// ============================================
// SMART TEMPLATE - BEST DATA FIELDS
// ============================================
export const BEST_DATA_LABELS = {
  bestAddressLine1: "best_address_line_1",
  bestAddressLine2: "best_address_line_2",
  bestAddressLine3: "best_address_line_3",
  bestCity: "best_city",
  bestState: "best_state",
  bestPostalCode: "best_postal_code",
  bestPhoneNumber: "best_phone_number",
} as const;

// ============================================
// COMBINED MAPPING (ALL FIELDS)
// ============================================
export const FIELD_LABELS = {
  ...CONTACT_FIELD_LABELS,
  ...CONTACT_ADDRESS_LABELS,
  ...ACCOUNT_FIELD_LABELS,
  ...ACCOUNT_ADDRESS_LABELS,
  ...AI_ENRICHMENT_LABELS,
  ...BEST_DATA_LABELS,
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get display label for a database field name
 */
export function getFieldLabel(fieldName: string): string {
  return FIELD_LABELS[fieldName as keyof typeof FIELD_LABELS] || fieldName;
}

/**
 * Get multiple field labels as a mapping object
 */
export function getFieldLabels(fieldNames: string[]): Record<string, string> {
  return fieldNames.reduce((acc, fieldName) => {
    acc[fieldName] = getFieldLabel(fieldName);
    return acc;
  }, {} as Record<string, string>);
}

/**
 * Transform object keys from database field names to display labels
 */
export function transformToDisplayLabels<T extends Record<string, any>>(
  data: T
): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    const displayLabel = getFieldLabel(key);
    result[displayLabel] = value;
  }
  return result;
}

/**
 * Get category-specific labels
 */
export const getContactLabels = () => CONTACT_FIELD_LABELS;
export const getContactAddressLabels = () => CONTACT_ADDRESS_LABELS;
export const getAccountLabels = () => ACCOUNT_FIELD_LABELS;
export const getAccountAddressLabels = () => ACCOUNT_ADDRESS_LABELS;
export const getAiEnrichmentLabels = () => AI_ENRICHMENT_LABELS;
export const getBestDataLabels = () => BEST_DATA_LABELS;
