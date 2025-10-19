/**
 * Platform-wide Dynamic Filter Configuration
 * 
 * Single source of truth for filter field definitions, types, data sources,
 * selection caps, and RBAC rules across all modules.
 */

/**
 * Filter Operators for Advanced Filtering
 * 
 * Text/Taxonomy fields (Industries, Job Titles, Seniority):
 *  - INCLUDES_ANY: Records having any of the selected values (OR)
 *  - INCLUDES_ALL: Records having all selected values (AND)
 *  - EXCLUDES_ANY: Records not having any of the selected values (NOT IN)
 *  - CONTAINS: Free-text substring match (case-insensitive)
 *  - NOT_CONTAINS: Free-text substring negative match
 * 
 * Categorical Bucket fields (Company Size, Revenue, Tenure):
 *  - INCLUDES_ANY, INCLUDES_ALL, EXCLUDES_ANY only
 */
export type Operator =
  | "INCLUDES_ANY"
  | "INCLUDES_ALL"
  | "EXCLUDES_ANY"
  | "CONTAINS"
  | "NOT_CONTAINS";

/**
 * Field Rule - Represents a single filter condition with an operator
 * 
 * Multiple rules can be applied to the same field, combined with AND logic
 */
export interface FieldRule {
  operator: Operator;
  values?: string[];   // Template-locked chips (required for INCLUDE/EXCLUDE ops)
  query?: string;      // Free-text for CONTAINS/NOT_CONTAINS
}

export type FilterFieldType = 
  | "multi"       // Multi-select dropdown with DB-backed options
  | "typeahead"   // Async type-ahead with search
  | "date-range"  // Date range picker with presets
  | "text"        // Text input
  | "number";     // Number input

/**
 * Operator Support by Field Type
 * 
 * Determines which operators are available for each field type
 */
export type OperatorSupport =
  | "text-taxonomy"   // Industries, Job Titles, Seniority (all 5 operators)
  | "categorical"     // Company Size, Revenue, Tenure (include/exclude only)
  | "none";           // Date ranges, text search (no operators)

export type FilterField =
  | "industries" | "companySizes" | "companyRevenue" | "seniorityLevels"
  | "countries" | "states" | "cities"
  | "technologies" | "jobFunctions" | "departments"
  | "accountOwners" | "createdDate" | "lastActivity" | "search"
  // Campaign-related filters
  | "campaignName" | "campaignType" | "campaignStatus" | "campaignOwner" | "dialMode"
  // QA-related filters
  | "qaStatus" | "qaReviewer" | "qaOutcome" | "reviewedDate"
  // List/Segment-related filters
  | "listName" | "segmentName" | "segmentOwner"
  // Contact-specific filters
  | "emailStatus" | "phoneStatus" | "verificationStatus" | "assignedAgent" | "contactSource";

export interface FilterFieldConfig {
  type: FilterFieldType;
  label: string;
  max?: number;           // Maximum selections for multi-select fields
  source?: string;        // API endpoint suffix for options
  parents?: FilterField[]; // Parent fields for scoped filtering (e.g., Country → State → City)
  placeholder?: string;   // Placeholder text
  category?: string;      // Category for grouping in UI
  operatorSupport?: OperatorSupport; // Which operators this field supports
}

/**
 * Base Filter Field Definitions
 * 
 * Defines all available filter fields with their configuration
 */
export const BASE_FILTERS: Record<FilterField, FilterFieldConfig> = {
  // Search/Text
  search: {
    type: "text",
    label: "Search",
    placeholder: "Search by name, email, company...",
    category: "General"
  },
  
  // Multi-select dropdowns (DB-backed)
  industries: {
    type: "multi",
    label: "Industries",
    max: 10,
    source: "industries",
    category: "Company Information",
    operatorSupport: "text-taxonomy"  // Supports all 5 operators
  },
  companySizes: {
    type: "multi",
    label: "Company Size",
    max: 10,
    source: "company-sizes",
    category: "Company Information",
    operatorSupport: "categorical"  // Include/exclude only
  },
  companyRevenue: {
    type: "multi",
    label: "Company Revenue",
    max: 10,
    source: "company-revenue",
    category: "Company Information",
    operatorSupport: "categorical"  // Include/exclude only
  },
  seniorityLevels: {
    type: "multi",
    label: "Seniority Level",
    max: 10,
    source: "seniority-levels",
    category: "Contact Information",
    operatorSupport: "text-taxonomy"  // Supports all 5 operators
  },
  technologies: {
    type: "multi",
    label: "Technologies",
    max: 10,
    source: "technologies",
    category: "Company Information",
    operatorSupport: "text-taxonomy"  // Supports all 5 operators
  },
  jobFunctions: {
    type: "multi",
    label: "Job Function",
    max: 10,
    source: "job-functions",
    category: "Contact Information",
    operatorSupport: "text-taxonomy"  // Supports all 5 operators
  },
  departments: {
    type: "multi",
    label: "Department",
    max: 10,
    source: "departments",
    category: "Contact Information",
    operatorSupport: "text-taxonomy"  // Supports all 5 operators
  },
  accountOwners: {
    type: "multi",
    label: "Account Owner",
    max: 10,
    source: "users",
    category: "Ownership"
  },
  
  // Async type-ahead with scoped dependencies (Country → State → City)
  countries: {
    type: "typeahead",
    label: "Country",
    max: 10,
    source: "countries",
    category: "Geography"
  },
  states: {
    type: "typeahead",
    label: "State / Province",
    max: 5,
    source: "states",
    parents: ["countries"],
    category: "Geography"
  },
  cities: {
    type: "typeahead",
    label: "City",
    max: 5,
    source: "cities",
    parents: ["countries", "states"],
    category: "Geography"
  },
  
  // Date ranges
  createdDate: {
    type: "date-range",
    label: "Created Date",
    category: "Dates"
  },
  lastActivity: {
    type: "date-range",
    label: "Last Activity",
    category: "Dates"
  },
  reviewedDate: {
    type: "date-range",
    label: "Reviewed Date",
    category: "Dates"
  },
  
  // Campaign-related filters
  campaignName: {
    type: "typeahead",
    label: "Campaign Name",
    source: "campaigns",
    category: "Campaign"
  },
  campaignType: {
    type: "multi",
    label: "Campaign Type",
    max: 3,
    source: "campaign-types",
    category: "Campaign"
  },
  campaignStatus: {
    type: "multi",
    label: "Campaign Status",
    max: 6,
    source: "campaign-status",
    category: "Campaign"
  },
  campaignOwner: {
    type: "multi",
    label: "Campaign Owner",
    max: 10,
    source: "users",
    category: "Campaign"
  },
  dialMode: {
    type: "multi",
    label: "Dial Mode",
    max: 2,
    source: "dial-modes",
    category: "Campaign"
  },
  
  // QA-related filters
  qaStatus: {
    type: "multi",
    label: "QA Status",
    max: 6,
    source: "qa-status",
    category: "QA & Verification"
  },
  qaReviewer: {
    type: "multi",
    label: "QA Reviewer",
    max: 10,
    source: "users",
    category: "QA & Verification"
  },
  qaOutcome: {
    type: "multi",
    label: "QA Outcome",
    max: 3,
    source: "qa-outcomes",
    category: "QA & Verification"
  },
  
  // List/Segment-related filters
  listName: {
    type: "typeahead",
    label: "List Name",
    source: "lists",
    category: "Lists & Segments"
  },
  segmentName: {
    type: "typeahead",
    label: "Segment Name",
    source: "segments",
    category: "Lists & Segments"
  },
  segmentOwner: {
    type: "multi",
    label: "Segment Owner",
    max: 10,
    source: "users",
    category: "Lists & Segments"
  },
  
  // Contact-specific filters
  emailStatus: {
    type: "multi",
    label: "Email Status",
    max: 4,
    source: "email-verification-status",
    category: "Verification"
  },
  phoneStatus: {
    type: "multi",
    label: "Phone Status",
    max: 4,
    source: "phone-status",
    category: "Verification"
  },
  verificationStatus: {
    type: "multi",
    label: "Verification Status",
    max: 4,
    source: "email-verification-status",
    category: "Verification"
  },
  assignedAgent: {
    type: "multi",
    label: "Assigned Agent",
    max: 10,
    source: "users",
    category: "Ownership"
  },
  contactSource: {
    type: "multi",
    label: "Source",
    max: 10,
    source: "contact-sources",
    category: "Contact Information"
  }
} as const;

/**
 * Module-Specific Filter Configurations
 * 
 * Defines which filter fields are available for each module
 */
export const MODULE_FILTERS: Record<string, FilterField[]> = {
  contacts: [
    "search",
    "industries",
    "companySizes",
    "companyRevenue",
    "seniorityLevels",
    "jobFunctions",
    "departments",
    "countries",
    "states",
    "cities",
    "technologies",
    "emailStatus",
    "phoneStatus",
    "verificationStatus",
    "assignedAgent",
    "contactSource",
    "listName",
    "accountOwners",
    "lastActivity",
    "createdDate"
  ],
  accounts: [
    "search",
    "industries",
    "companySizes",
    "companyRevenue",
    "countries",
    "states",
    "cities",
    "technologies",
    "departments",
    "accountOwners",
    "lastActivity",
    "createdDate"
  ],
  qa: [
    "search",
    "qaStatus",
    "qaReviewer",
    "qaOutcome",
    "campaignName",
    "campaignType",
    "accountOwners",
    "countries",
    "states",
    "cities",
    "reviewedDate",
    "lastActivity",
    "createdDate"
  ],
  emailCampaigns: [
    "search",
    "campaignStatus",
    "campaignOwner",
    "industries",
    "companySizes",
    "seniorityLevels",
    "jobFunctions",
    "countries",
    "states",
    "cities",
    "listName",
    "segmentName",
    "lastActivity",
    "createdDate"
  ],
  callCampaigns: [
    "search",
    "campaignStatus",
    "campaignType",
    "campaignOwner",
    "dialMode",
    "industries",
    "companySizes",
    "seniorityLevels",
    "jobFunctions",
    "countries",
    "states",
    "cities",
    "listName",
    "segmentName",
    "accountOwners",
    "lastActivity",
    "createdDate"
  ],
  agentConsole: [
    "search",
    "campaignName",
    "industries",
    "companySizes",
    "seniorityLevels",
    "countries",
    "states",
    "cities"
  ]
};

/**
 * RBAC Filter Visibility
 * 
 * Defines which filter fields are visible to each user role
 */
export type UserRole = "Admin" | "Manager" | "Agent";

export const FILTER_RBAC: Record<UserRole, { allow: FilterField[] | "all" }> = {
  Admin: {
    allow: "all" // Admins can see all filters
  },
  Manager: {
    allow: [
      // General & Search
      "search",
      // Company Information
      "industries",
      "companySizes",
      "companyRevenue",
      "technologies",
      "departments",
      // Contact Information
      "seniorityLevels",
      "jobFunctions",
      "contactSource",
      // Geography
      "countries",
      "states",
      "cities",
      // Campaign filters
      "campaignName",
      "campaignType",
      "campaignStatus",
      "campaignOwner",
      "dialMode",
      // QA filters
      "qaStatus",
      "qaReviewer",
      "qaOutcome",
      // List/Segment filters
      "listName",
      "segmentName",
      "segmentOwner",
      // Verification filters
      "emailStatus",
      "phoneStatus",
      "verificationStatus",
      "assignedAgent",
      // Ownership & Dates
      "accountOwners",
      "lastActivity",
      "createdDate",
      "reviewedDate"
    ]
  },
  Agent: {
    allow: [
      "search",
      "seniorityLevels",
      "jobFunctions",
      "countries",
      "states",
      "cities",
      "campaignName",
      "listName",
      "lastActivity"
    ]
  }
} as const;

/**
 * Filter Categories for UI Grouping
 * 
 * Organizes filters into collapsible categories
 */
export const FILTER_CATEGORIES = [
  "General",
  "Company Information",
  "Contact Information",
  "Geography",
  "Campaign",
  "QA & Verification",
  "Verification",
  "Lists & Segments",
  "Ownership",
  "Dates"
] as const;

/**
 * Date Range Presets
 * 
 * Quick date range selection options
 */
export const DATE_RANGE_PRESETS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "Last 6 months", days: 180 },
  { label: "Last year", days: 365 },
  { label: "Custom", days: null }
] as const;

/**
 * Filter Value Type Definitions
 * 
 * Supports operator-based filtering with FieldRule arrays for fields that
 * have operator support. Fields with operators use FieldRule[], while simple
 * fields (dates, text search) use their original types.
 */
export interface FilterValues {
  search?: string;
  
  // Text/Taxonomy fields (support all 5 operators)
  industries?: FieldRule[];
  seniorityLevels?: FieldRule[];
  technologies?: FieldRule[];
  jobFunctions?: FieldRule[];
  departments?: FieldRule[];
  
  // Categorical fields (support include/exclude only)
  companySizes?: FieldRule[];
  companyRevenue?: FieldRule[];
  
  // Geography (simple multi-select, no operators for now)
  countries?: string[];
  states?: string[];
  cities?: string[];
  
  // Ownership (simple multi-select)
  accountOwners?: string[];
  
  // Date ranges (no operators)
  createdDate?: { from?: string; to?: string };
  lastActivity?: { from?: string; to?: string };
  reviewedDate?: { from?: string; to?: string };
  
  // Campaign filters (simple multi-select for now)
  campaignName?: string[];
  campaignType?: string[];
  campaignStatus?: string[];
  campaignOwner?: string[];
  dialMode?: string[];
  
  // QA filters (simple multi-select)
  qaStatus?: string[];
  qaReviewer?: string[];
  qaOutcome?: string[];
  
  // List/Segment filters (simple multi-select)
  listName?: string[];
  segmentName?: string[];
  segmentOwner?: string[];
  
  // Contact filters (simple multi-select)
  emailStatus?: string[];
  phoneStatus?: string[];
  verificationStatus?: string[];
  assignedAgent?: string[];
  contactSource?: string[];
}

/**
 * Helper function to get allowed fields for a module and user role
 */
export function getAllowedFields(
  module: keyof typeof MODULE_FILTERS,
  userRole: UserRole
): FilterField[] {
  const moduleFields = MODULE_FILTERS[module] || [];
  const rolePermissions = FILTER_RBAC[userRole];
  
  if (rolePermissions.allow === "all") {
    return moduleFields;
  }
  
  // Filter module fields by role permissions
  return moduleFields.filter(field => 
    (rolePermissions.allow as FilterField[]).includes(field)
  );
}

/**
 * Helper function to get field configuration
 */
export function getFieldConfig(field: FilterField): FilterFieldConfig {
  return BASE_FILTERS[field];
}

/**
 * Get available operators for a field based on its operator support
 */
export function getAvailableOperators(field: FilterField): Operator[] {
  const config = BASE_FILTERS[field];
  const support = config.operatorSupport;
  
  if (!support || support === "none") {
    return ["INCLUDES_ANY"]; // Default fallback
  }
  
  if (support === "text-taxonomy") {
    // Industries, Job Titles, Seniority, Technologies, Departments, Job Functions
    return ["INCLUDES_ANY", "INCLUDES_ALL", "EXCLUDES_ANY", "CONTAINS", "NOT_CONTAINS"];
  }
  
  if (support === "categorical") {
    // Company Size, Revenue, Tenure buckets
    return ["INCLUDES_ANY", "INCLUDES_ALL", "EXCLUDES_ANY"];
  }
  
  return ["INCLUDES_ANY"];
}

/**
 * Get operator label for display
 */
export function getOperatorLabel(operator: Operator): string {
  const labels: Record<Operator, string> = {
    "INCLUDES_ANY": "Includes any",
    "INCLUDES_ALL": "Includes all",
    "EXCLUDES_ANY": "Exclude",
    "CONTAINS": "Contains",
    "NOT_CONTAINS": "Doesn't contain"
  };
  return labels[operator];
}

/**
 * Check if operator requires text query input (vs chip selection)
 */
export function isTextOperator(operator: Operator): boolean {
  return operator === "CONTAINS" || operator === "NOT_CONTAINS";
}

/**
 * Helper function to get fields grouped by category
 */
export function getFieldsByCategory(
  fields: FilterField[]
): Record<string, FilterField[]> {
  const grouped: Record<string, FilterField[]> = {};
  
  fields.forEach(field => {
    const config = BASE_FILTERS[field];
    const category = config.category || "Other";
    
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(field);
  });
  
  return grouped;
}
