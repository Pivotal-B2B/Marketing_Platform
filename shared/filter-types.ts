import { z } from "zod";

// Filter operators
export const textOperators = ['equals', 'contains', 'startsWith', 'endsWith', 'notEquals'] as const;
export const numberOperators = ['equals', 'greaterThan', 'lessThan', 'between', 'notEquals'] as const;
export const arrayOperators = ['containsAny', 'containsAll', 'isEmpty', 'isNotEmpty'] as const;
export const booleanOperators = ['is'] as const;
export const dateOperators = ['before', 'after', 'between'] as const;

export type TextOperator = typeof textOperators[number];
export type NumberOperator = typeof numberOperators[number];
export type ArrayOperator = typeof arrayOperators[number];
export type BooleanOperator = typeof booleanOperators[number];
export type DateOperator = typeof dateOperators[number];
export type Operator = TextOperator | NumberOperator | ArrayOperator | BooleanOperator | DateOperator;

// Filter field types
export type FilterFieldType = 'text' | 'number' | 'array' | 'boolean' | 'date';

// Account filter fields
export const accountFilterFields = {
  // Text fields
  name: { type: 'text' as const, label: 'Company Name' },
  industry: { type: 'text' as const, label: 'Industry' },
  domain: { type: 'text' as const, label: 'Domain' },
  hqCity: { type: 'text' as const, label: 'City' },
  hqState: { type: 'text' as const, label: 'State' },
  hqCountry: { type: 'text' as const, label: 'Country' },
  sicCode: { type: 'text' as const, label: 'SIC Code' },
  naicsCode: { type: 'text' as const, label: 'NAICS Code' },
  // Number fields
  staffCount: { type: 'number' as const, label: 'Staff Count' },
  yearFounded: { type: 'number' as const, label: 'Year Founded' },
  // Array fields
  techStack: { type: 'array' as const, label: 'Tech Stack' },
  linkedinSpecialties: { type: 'array' as const, label: 'LinkedIn Specialties' },
  intentTopics: { type: 'array' as const, label: 'Intent Topics' },
  tags: { type: 'array' as const, label: 'Tags' },
  // Boolean fields
  hasContacts: { type: 'boolean' as const, label: 'Has Contacts' },
  hasParent: { type: 'boolean' as const, label: 'Has Parent Account' },
};

// Contact filter fields
export const contactFilterFields = {
  // Text fields
  fullName: { type: 'text' as const, label: 'Full Name' },
  firstName: { type: 'text' as const, label: 'First Name' },
  lastName: { type: 'text' as const, label: 'Last Name' },
  email: { type: 'text' as const, label: 'Email' },
  jobTitle: { type: 'text' as const, label: 'Job Title' },
  department: { type: 'text' as const, label: 'Department' },
  seniorityLevel: { type: 'text' as const, label: 'Seniority Level' },
  // Array fields
  intentTopics: { type: 'array' as const, label: 'Intent Topics' },
  tags: { type: 'array' as const, label: 'Tags' },
  // Boolean fields
  hasAccount: { type: 'boolean' as const, label: 'Has Linked Account' },
  isEmailSuppressed: { type: 'boolean' as const, label: 'Email Suppressed' },
  isPhoneSuppressed: { type: 'boolean' as const, label: 'Phone DNC' },
};

// Filter condition schema
export const filterConditionSchema = z.object({
  id: z.string(),
  field: z.string(),
  operator: z.enum([
    ...textOperators,
    ...numberOperators,
    ...arrayOperators,
    ...booleanOperators,
    ...dateOperators
  ]),
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string()),
    z.object({ from: z.union([z.string(), z.number()]), to: z.union([z.string(), z.number()]) })
  ]),
});

export type FilterCondition = z.infer<typeof filterConditionSchema>;

// Filter group schema (for AND/OR logic)
export const filterGroupSchema = z.object({
  logic: z.enum(['AND', 'OR']),
  conditions: z.array(filterConditionSchema),
});

export type FilterGroup = z.infer<typeof filterGroupSchema>;

// Saved filter schema
export const savedFilterSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Filter name is required'),
  description: z.string().optional(),
  entityType: z.enum(['account', 'contact']),
  filterGroup: filterGroupSchema,
});

export type SavedFilter = z.infer<typeof savedFilterSchema>;
