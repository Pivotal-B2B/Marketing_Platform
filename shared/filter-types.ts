import { z } from "zod";

/**
 * Simplified Unified Operator Model
 * 
 * All fields support the same 8 operators (where applicable):
 * - equals, not_equals, contains, not_contains, begins_with, ends_with, is_empty, has_any_value
 * 
 * Multi-value support: users can provide one or more values per condition
 * - Values within same field = OR logic
 * - Different fields = AND logic
 */

// Core operators supported across all field types
export const operators = [
  'equals',
  'not_equals',
  'contains',
  'not_contains',
  'begins_with',
  'ends_with',
  'is_empty',
  'has_any_value'
] as const;

export type Operator = typeof operators[number];

// Operator display labels
export const operatorLabels: Record<Operator, string> = {
  equals: 'Equals',
  not_equals: 'Not Equals',
  contains: 'Contains',
  not_contains: 'Does Not Contain',
  begins_with: 'Begins With',
  ends_with: 'Ends With',
  is_empty: 'Is Empty',
  has_any_value: 'Has Any Value'
};

// Operator descriptions for tooltips
export const operatorDescriptions: Record<Operator, string> = {
  equals: 'Exactly matches any of the entered values',
  not_equals: 'Does not match any of the entered values',
  contains: 'Contains any of the entered text (case-insensitive)',
  not_contains: 'Does not contain any of the entered text',
  begins_with: 'Starts with any of the entered text',
  ends_with: 'Ends with any of the entered text',
  is_empty: 'Field is empty or null',
  has_any_value: 'Field has a value (not empty or null)'
};

// Field type categories (determines which operators are applicable)
export type FilterFieldType = 'text' | 'number' | 'date' | 'enum' | 'array';

// Field configuration with operator applicability
export interface FieldConfig {
  label: string;
  type: FilterFieldType;
  category?: string;
  // Which operators are applicable for this field type
  applicableOperators: Operator[];
  // Whether this field supports type-ahead chip selection
  typeAhead?: boolean;
  // Type-ahead source endpoint (if applicable)
  typeAheadSource?: string;
}

// Operator applicability by field type
export const operatorsByFieldType: Record<FilterFieldType, Operator[]> = {
  text: [
    'equals',
    'not_equals',
    'contains',
    'not_contains',
    'begins_with',
    'ends_with',
    'is_empty',
    'has_any_value'
  ],
  number: [
    'equals',
    'not_equals',
    'is_empty',
    'has_any_value'
    // Range operators (greaterThan, lessThan, between) can be added later
  ],
  date: [
    'equals',
    'not_equals',
    'is_empty',
    'has_any_value'
    // Date-specific operators (before, after, between) can be added later
  ],
  enum: [
    'equals',
    'not_equals',
    'is_empty',
    'has_any_value'
  ],
  array: [
    'contains',      // Contains any of the values
    'not_contains',  // Does not contain any of the values
    'is_empty',
    'has_any_value'
  ]
};

// Account filter fields with simplified configuration
export const accountFilterFields: Record<string, FieldConfig> = {
  // Text fields
  name: {
    label: 'Company Name',
    type: 'text',
    category: 'Company Information',
    applicableOperators: operatorsByFieldType.text
  },
  domain: {
    label: 'Domain',
    type: 'text',
    category: 'Company Information',
    applicableOperators: operatorsByFieldType.text
  },
  industryStandardized: {
    label: 'Industry',
    type: 'text',
    category: 'Company Information',
    applicableOperators: operatorsByFieldType.text,
    typeAhead: true,
    typeAheadSource: 'industries'
  },
  description: {
    label: 'Description',
    type: 'text',
    category: 'Company Information',
    applicableOperators: operatorsByFieldType.text
  },
  hqCity: {
    label: 'City',
    type: 'text',
    category: 'Geography',
    applicableOperators: operatorsByFieldType.text,
    typeAhead: true,
    typeAheadSource: 'cities'
  },
  hqState: {
    label: 'State / Province',
    type: 'text',
    category: 'Geography',
    applicableOperators: operatorsByFieldType.text,
    typeAhead: true,
    typeAheadSource: 'states'
  },
  hqCountry: {
    label: 'Country',
    type: 'text',
    category: 'Geography',
    applicableOperators: operatorsByFieldType.text,
    typeAhead: true,
    typeAheadSource: 'countries'
  },
  sicCode: {
    label: 'SIC Code',
    type: 'text',
    category: 'Company Information',
    applicableOperators: operatorsByFieldType.text
  },
  naicsCode: {
    label: 'NAICS Code',
    type: 'text',
    category: 'Company Information',
    applicableOperators: operatorsByFieldType.text
  },
  mainPhone: {
    label: 'Main Phone',
    type: 'text',
    category: 'Company Information',
    applicableOperators: operatorsByFieldType.text
  },
  linkedinUrl: {
    label: 'LinkedIn URL',
    type: 'text',
    category: 'Company Information',
    applicableOperators: operatorsByFieldType.text
  },
  
  // Enum fields (controlled vocabulary)
  employeesSizeRange: {
    label: 'Company Size',
    type: 'enum',
    category: 'Company Information',
    applicableOperators: operatorsByFieldType.enum,
    typeAhead: true,
    typeAheadSource: 'company-sizes'
  },
  annualRevenue: {
    label: 'Company Revenue',
    type: 'enum',
    category: 'Company Information',
    applicableOperators: operatorsByFieldType.enum,
    typeAhead: true,
    typeAheadSource: 'company-revenue'
  },
  
  // Number fields
  staffCount: {
    label: 'Staff Count',
    type: 'number',
    category: 'Company Information',
    applicableOperators: operatorsByFieldType.number
  },
  yearFounded: {
    label: 'Year Founded',
    type: 'number',
    category: 'Company Information',
    applicableOperators: operatorsByFieldType.number
  },
  
  // Array fields
  techStack: {
    label: 'Technologies',
    type: 'array',
    category: 'Company Information',
    applicableOperators: operatorsByFieldType.array,
    typeAhead: true,
    typeAheadSource: 'technologies'
  },
  tags: {
    label: 'Tags',
    type: 'array',
    category: 'General',
    applicableOperators: operatorsByFieldType.array,
    typeAhead: true,
    typeAheadSource: 'account-tags'
  }
};

// Contact filter fields with simplified configuration
export const contactFilterFields: Record<string, FieldConfig> = {
  // Text fields
  fullName: {
    label: 'Full Name',
    type: 'text',
    category: 'Contact Information',
    applicableOperators: operatorsByFieldType.text
  },
  firstName: {
    label: 'First Name',
    type: 'text',
    category: 'Contact Information',
    applicableOperators: operatorsByFieldType.text
  },
  lastName: {
    label: 'Last Name',
    type: 'text',
    category: 'Contact Information',
    applicableOperators: operatorsByFieldType.text
  },
  email: {
    label: 'Email',
    type: 'text',
    category: 'Contact Information',
    applicableOperators: operatorsByFieldType.text
  },
  jobTitle: {
    label: 'Job Title',
    type: 'text',
    category: 'Contact Information',
    applicableOperators: operatorsByFieldType.text,
    typeAhead: true,
    typeAheadSource: 'job-titles'
  },
  department: {
    label: 'Department',
    type: 'text',
    category: 'Contact Information',
    applicableOperators: operatorsByFieldType.text,
    typeAhead: true,
    typeAheadSource: 'departments'
  },
  seniorityLevel: {
    label: 'Seniority Level',
    type: 'text',
    category: 'Contact Information',
    applicableOperators: operatorsByFieldType.text,
    typeAhead: true,
    typeAheadSource: 'seniority-levels'
  },
  directPhone: {
    label: 'Direct Phone',
    type: 'text',
    category: 'Contact Information',
    applicableOperators: operatorsByFieldType.text
  },
  mobilePhone: {
    label: 'Mobile Phone',
    type: 'text',
    category: 'Contact Information',
    applicableOperators: operatorsByFieldType.text
  },
  linkedinUrl: {
    label: 'LinkedIn URL',
    type: 'text',
    category: 'Contact Information',
    applicableOperators: operatorsByFieldType.text
  },
  city: {
    label: 'City',
    type: 'text',
    category: 'Geography',
    applicableOperators: operatorsByFieldType.text,
    typeAhead: true,
    typeAheadSource: 'cities'
  },
  state: {
    label: 'State / Province',
    type: 'text',
    category: 'Geography',
    applicableOperators: operatorsByFieldType.text,
    typeAhead: true,
    typeAheadSource: 'states'
  },
  country: {
    label: 'Country',
    type: 'text',
    category: 'Geography',
    applicableOperators: operatorsByFieldType.text,
    typeAhead: true,
    typeAheadSource: 'countries'
  },
  consentBasis: {
    label: 'Consent Basis',
    type: 'text',
    category: 'Compliance',
    applicableOperators: operatorsByFieldType.text,
    typeAhead: true,
    typeAheadSource: 'consent-basis'
  },
  consentSource: {
    label: 'Consent Source',
    type: 'text',
    category: 'Compliance',
    applicableOperators: operatorsByFieldType.text,
    typeAhead: true,
    typeAheadSource: 'consent-source'
  },
  list: {
    label: 'Source List',
    type: 'text',
    category: 'General',
    applicableOperators: operatorsByFieldType.text
  },
  
  // Array fields
  tags: {
    label: 'Tags',
    type: 'array',
    category: 'General',
    applicableOperators: operatorsByFieldType.array,
    typeAhead: true,
    typeAheadSource: 'contact-tags'
  },
  
  // Company fields (via JOIN to accounts table)
  accountName: {
    label: 'Account Name',
    type: 'text',
    category: 'Company Information',
    applicableOperators: operatorsByFieldType.text,
    typeAhead: true,
    typeAheadSource: 'account-names'
  },
  accountDomain: {
    label: 'Account Domain',
    type: 'text',
    category: 'Company Information',
    applicableOperators: operatorsByFieldType.text,
    typeAhead: true,
    typeAheadSource: 'account-domains'
  },
  industryStandardized: {
    label: 'Industry (Company)',
    type: 'text',
    category: 'Company Information',
    applicableOperators: operatorsByFieldType.text,
    typeAhead: true,
    typeAheadSource: 'industries'
  },
  employeesSizeRange: {
    label: 'Company Size',
    type: 'enum',
    category: 'Company Information',
    applicableOperators: operatorsByFieldType.enum,
    typeAhead: true,
    typeAheadSource: 'company-sizes'
  },
  annualRevenue: {
    label: 'Company Revenue',
    type: 'enum',
    category: 'Company Information',
    applicableOperators: operatorsByFieldType.enum,
    typeAhead: true,
    typeAheadSource: 'company-revenue'
  },
  techStack: {
    label: 'Technologies (Company)',
    type: 'array',
    category: 'Company Information',
    applicableOperators: operatorsByFieldType.array,
    typeAhead: true,
    typeAheadSource: 'technologies'
  }
};

/**
 * Simplified Filter Condition
 * 
 * Each condition has:
 * - field: The field to filter on
 * - operator: One of the 8 standard operators
 * - values: Array of values (multi-value support with OR logic within field)
 */
export const filterConditionSchema = z.object({
  id: z.string(),
  field: z.string(),
  operator: z.enum(operators),
  values: z.array(z.union([z.string(), z.number()])).default([])
});

export type FilterCondition = z.infer<typeof filterConditionSchema>;

// Filter group schema (for AND/OR logic between conditions)
export const filterGroupSchema = z.object({
  logic: z.enum(['AND', 'OR']).default('AND'),
  conditions: z.array(filterConditionSchema)
});

export type FilterGroup = z.infer<typeof filterGroupSchema>;

// Saved filter schema
export const savedFilterSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Filter name is required'),
  description: z.string().optional(),
  entityType: z.enum(['account', 'contact']),
  filterGroup: filterGroupSchema
});

export type SavedFilter = z.infer<typeof savedFilterSchema>;
