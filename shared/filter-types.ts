import { z } from "zod";

// Filter operators
export const textOperators = ['equals', 'notEquals', 'contains', 'doesNotContain', 'startsWith', 'endsWith', 'isEmpty', 'isNotEmpty'] as const;
export const numberOperators = ['equals', 'notEquals', 'greaterThan', 'lessThan', 'between', 'isEmpty', 'isNotEmpty'] as const;
export const arrayOperators = ['containsAny', 'containsAll', 'isEmpty', 'isNotEmpty'] as const;
export const booleanOperators = ['is'] as const;
export const dateOperators = ['before', 'after', 'between', 'isEmpty', 'isNotEmpty'] as const;

export type TextOperator = typeof textOperators[number];
export type NumberOperator = typeof numberOperators[number];
export type ArrayOperator = typeof arrayOperators[number];
export type BooleanOperator = typeof booleanOperators[number];
export type DateOperator = typeof dateOperators[number];
export type Operator = TextOperator | NumberOperator | ArrayOperator | BooleanOperator | DateOperator;

// Operator display labels with descriptions
export const operatorLabels: Record<string, string> = {
  equals: 'Equals (=)',
  notEquals: 'Not Equals (≠)',
  contains: 'Contains',
  doesNotContain: 'Does Not Contain',
  startsWith: 'Begins With',
  endsWith: 'Ends With',
  greaterThan: 'Greater Than (>)',
  lessThan: 'Less Than (<)',
  between: 'Between',
  before: 'Before',
  after: 'After',
  containsAny: 'Contains Any',
  containsAll: 'Contains All',
  isEmpty: 'Is Empty',
  isNotEmpty: 'Has Value',
  is: 'Is',
};

// Operator descriptions for tooltips/help text
export const operatorDescriptions: Record<string, string> = {
  equals: 'Returns records that exactly match the entered value',
  notEquals: 'Excludes records that exactly match the entered value',
  contains: 'Finds records where the field contains the specified text (case-insensitive)',
  doesNotContain: 'Excludes records that contain the specified text',
  startsWith: 'Returns records where the field starts with the entered text',
  endsWith: 'Returns records where the field ends with the entered text',
  greaterThan: 'Returns records where the value is greater than the specified number',
  lessThan: 'Returns records where the value is less than the specified number',
  between: 'Returns records where the value falls within the specified range',
  before: 'Returns records with a date before the specified date',
  after: 'Returns records with a date after the specified date',
  containsAny: 'Returns records containing at least one of the specified values',
  containsAll: 'Returns records containing all of the specified values',
  isEmpty: 'Displays records where the field is empty or null',
  isNotEmpty: 'Displays records where the field has a value (not empty or null)',
  is: 'Checks if the boolean field matches the specified true/false value',
};

// Filter field types
export type FilterFieldType = 'text' | 'number' | 'array' | 'boolean' | 'date' | 'enum';

// Enum operators (dropdown selection)
export const enumOperators = ['equals', 'notEquals', 'isEmpty', 'isNotEmpty'] as const;

// Account filter fields
export const accountFilterFields = {
  // Text fields
  name: { type: 'text' as const, label: 'Company Name' },
  industry: { type: 'text' as const, label: 'Industry' },
  domain: { type: 'text' as const, label: 'Domain' },
  hqStreet1: { type: 'text' as const, label: 'HQ Street 1' },
  hqStreet2: { type: 'text' as const, label: 'HQ Street 2' },
  hqStreet3: { type: 'text' as const, label: 'HQ Street 3' },
  hqCity: { type: 'text' as const, label: 'HQ City' },
  hqState: { type: 'text' as const, label: 'HQ State' },
  hqCountry: { type: 'text' as const, label: 'HQ Country' },
  companyLocation: { type: 'text' as const, label: 'Company Location' },
  sicCode: { type: 'text' as const, label: 'SIC Code' },
  naicsCode: { type: 'text' as const, label: 'NAICS Code' },
  // Enum fields (dropdown only)
  revenueRange: { type: 'enum' as const, label: 'Company Revenue Range' },
  employeesSizeRange: { type: 'enum' as const, label: 'Company Staff Count Range' },
  // Number fields
  staffCount: { type: 'number' as const, label: 'Staff Count' },
  yearFounded: { type: 'number' as const, label: 'Year Founded' },
  // Array fields
  techStack: { type: 'array' as const, label: 'Tech Stack' },
  linkedinSpecialties: { type: 'array' as const, label: 'LinkedIn Specialties' },
  previousNames: { type: 'array' as const, label: 'Previous Names' },
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
  formerPosition: { type: 'text' as const, label: 'Former Position' },
  timeInCurrentPosition: { type: 'text' as const, label: 'Time in Current Position' },
  timeInCurrentCompany: { type: 'text' as const, label: 'Time in Current Company' },
  timezone: { type: 'text' as const, label: 'Timezone' },
  city: { type: 'text' as const, label: 'City' },
  state: { type: 'text' as const, label: 'State' },
  country: { type: 'text' as const, label: 'Country' },
  contactLocation: { type: 'text' as const, label: 'Contact Location' },
  list: { type: 'text' as const, label: 'Source List' },
  // Date fields
  researchDate: { type: 'date' as const, label: 'Research Date' },
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
    ...dateOperators,
    ...enumOperators
  ]),
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string()),
    z.object({ from: z.union([z.string(), z.number()]), to: z.union([z.string(), z.number()]) }),
    z.null(),
    z.undefined()
  ]).optional(),
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
