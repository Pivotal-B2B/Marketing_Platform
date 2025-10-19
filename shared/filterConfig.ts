/**
 * Platform-wide Dynamic Filter Configuration
 * 
 * Single source of truth for filter field definitions, types, data sources,
 * selection caps, and RBAC rules across all modules.
 */

export type FilterFieldType = 
  | "multi"       // Multi-select dropdown with DB-backed options
  | "typeahead"   // Async type-ahead with search
  | "date-range"  // Date range picker with presets
  | "text"        // Text input
  | "number";     // Number input

export type FilterField =
  | "industries" | "companySizes" | "companyRevenue" | "seniorityLevels"
  | "countries" | "states" | "cities"
  | "technologies" | "jobFunctions" | "departments"
  | "accountOwners" | "createdDate" | "lastActivity" | "search";

export interface FilterFieldConfig {
  type: FilterFieldType;
  label: string;
  max?: number;           // Maximum selections for multi-select fields
  source?: string;        // API endpoint suffix for options
  parents?: FilterField[]; // Parent fields for scoped filtering (e.g., Country → State → City)
  placeholder?: string;   // Placeholder text
  category?: string;      // Category for grouping in UI
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
    category: "Company Information"
  },
  companySizes: {
    type: "multi",
    label: "Company Size",
    max: 10,
    source: "company-sizes",
    category: "Company Information"
  },
  companyRevenue: {
    type: "multi",
    label: "Company Revenue",
    max: 10,
    source: "company-revenue",
    category: "Company Information"
  },
  seniorityLevels: {
    type: "multi",
    label: "Seniority Level",
    max: 10,
    source: "seniority-levels",
    category: "Contact Information"
  },
  technologies: {
    type: "multi",
    label: "Technologies",
    max: 10,
    source: "technologies",
    category: "Company Information"
  },
  jobFunctions: {
    type: "multi",
    label: "Job Function",
    max: 10,
    source: "job-functions",
    category: "Contact Information"
  },
  departments: {
    type: "multi",
    label: "Department",
    max: 10,
    source: "departments",
    category: "Contact Information"
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
    "countries",
    "states",
    "cities",
    "technologies",
    "jobFunctions",
    "departments",
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
    "accountOwners",
    "countries",
    "states",
    "cities",
    "lastActivity",
    "createdDate"
  ],
  emailCampaigns: [
    "search",
    "industries",
    "companySizes",
    "seniorityLevels",
    "countries",
    "states",
    "cities",
    "lastActivity",
    "createdDate"
  ],
  callCampaigns: [
    "search",
    "industries",
    "companySizes",
    "seniorityLevels",
    "countries",
    "states",
    "cities",
    "accountOwners",
    "lastActivity",
    "createdDate"
  ],
  agentConsole: [
    "search",
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
      "search",
      "industries",
      "companySizes",
      "companyRevenue",
      "seniorityLevels",
      "countries",
      "states",
      "cities",
      "accountOwners",
      "lastActivity",
      "createdDate"
    ]
  },
  Agent: {
    allow: [
      "search",
      "seniorityLevels",
      "countries",
      "states",
      "cities",
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
 */
export interface FilterValues {
  search?: string;
  industries?: string[];
  companySizes?: string[];
  companyRevenue?: string[];
  seniorityLevels?: string[];
  countries?: string[];
  states?: string[];
  cities?: string[];
  technologies?: string[];
  jobFunctions?: string[];
  departments?: string[];
  accountOwners?: string[];
  createdDate?: { from?: string; to?: string };
  lastActivity?: { from?: string; to?: string };
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
