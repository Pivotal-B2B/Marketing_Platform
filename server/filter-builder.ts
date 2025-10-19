import { SQL, and, or, eq, like, gt, lt, gte, lte, ilike, sql, isNull, isNotNull, inArray } from "drizzle-orm";
import { FilterGroup, FilterCondition } from "@shared/filter-types";
import { accounts, contacts, leads } from "@shared/schema";

type TableType = typeof accounts | typeof contacts | typeof leads;

/**
 * Map filter field names to actual database column names
 * 
 * This ensures the filter UI can use user-friendly field names while
 * the backend queries use the correct database column names.
 */
const FIELD_MAPPINGS: Record<string, Record<string, string>> = {
  accounts: {
    // Company/Account fields
    'industries': 'industryStandardized',
    'industry': 'industryStandardized',
    'companySizes': 'employeesSizeRange',
    'companySize': 'employeesSizeRange',
    'companyRevenue': 'annualRevenue',
    'revenue': 'annualRevenue',
    'revenueRange': 'annualRevenue',
    'technologies': 'techStack',
    'techStack': 'techStack',
    
    // Geography fields (accounts use hq_ prefix)
    'countries': 'hqCountry',
    'country': 'hqCountry',
    'states': 'hqState',
    'state': 'hqState',
    'cities': 'hqCity',
    'city': 'hqCity',
    
    // Ownership
    'accountOwners': 'ownerId',
    'owner': 'ownerId',
    
    // Date fields
    'createdDate': 'createdAt',
    'lastActivity': 'updatedAt'
  },
  contacts: {
    // Contact fields
    'seniorityLevels': 'seniorityLevel',
    'seniority': 'seniorityLevel',
    'departments': 'department',
    
    // Company fields (accessed via account join)
    'industries': 'industryStandardized',  // Note: requires join to accounts table
    'industry': 'industryStandardized',     // Note: requires join to accounts table
    'companySizes': 'employeesSizeRange',   // Note: requires join to accounts table
    'companyRevenue': 'annualRevenue',      // Note: requires join to accounts table
    'technologies': 'techStack',            // Note: requires join to accounts table
    'techStack': 'techStack',               // Note: requires join to accounts table
    
    // Geography fields (contacts don't use prefix)
    'countries': 'country',
    'states': 'state',
    'cities': 'city',
    
    // Verification fields
    'emailStatus': 'emailVerificationStatus',
    'verificationStatus': 'emailVerificationStatus',
    'phoneStatus': 'phoneStatus',
    
    // Ownership
    'accountOwners': 'ownerId',
    'assignedAgent': 'ownerId',
    'owner': 'ownerId',
    
    // Source
    'contactSource': 'sourceSystem',
    
    // Date fields
    'createdDate': 'createdAt',
    'lastActivity': 'updatedAt',
    'reviewedDate': 'reviewedAt'
  },
  leads: {
    // Leads table uses standard field names
  }
};

function getColumnName(field: string, table: TableType): string {
  const tableName = table === accounts ? 'accounts' : table === contacts ? 'contacts' : 'leads';
  return FIELD_MAPPINGS[tableName]?.[field] || field;
}

export function buildFilterQuery(filterGroup: FilterGroup, table: TableType): SQL | undefined {
  if (!filterGroup.conditions || filterGroup.conditions.length === 0) {
    return undefined;
  }

  const conditions = filterGroup.conditions
    .map(condition => buildCondition(condition, table))
    .filter(Boolean) as SQL[];

  if (conditions.length === 0) {
    return undefined;
  }

  return filterGroup.logic === 'AND' ? and(...conditions) : or(...conditions);
}

function buildCondition(condition: FilterCondition, table: TableType): SQL | undefined {
  const { field, operator, value } = condition;

  // Handle special boolean fields
  if (field === 'hasContacts' && table === accounts) {
    const boolValue = value as boolean;
    return boolValue 
      ? sql`EXISTS (SELECT 1 FROM ${contacts} WHERE ${contacts.accountId} = ${accounts.id})`
      : sql`NOT EXISTS (SELECT 1 FROM ${contacts} WHERE ${contacts.accountId} = ${accounts.id})`;
  }

  if (field === 'hasParent' && table === accounts) {
    const boolValue = value as boolean;
    return boolValue ? isNotNull(accounts.parentAccountId) : isNull(accounts.parentAccountId);
  }

  if (field === 'hasAccount' && table === contacts) {
    const boolValue = value as boolean;
    return boolValue ? isNotNull(contacts.accountId) : isNull(contacts.accountId);
  }

  // Handle account relationship fields for contacts
  if (table === contacts && field === 'accountName') {
    if (operator === 'equals') {
      return sql`EXISTS (SELECT 1 FROM ${accounts} WHERE ${accounts.id} = ${contacts.accountId} AND ${accounts.name} = ${value})`;
    } else if (operator === 'contains') {
      return sql`EXISTS (SELECT 1 FROM ${accounts} WHERE ${accounts.id} = ${contacts.accountId} AND ${accounts.name} ILIKE ${'%' + value + '%'})`;
    } else if (operator === 'startsWith') {
      return sql`EXISTS (SELECT 1 FROM ${accounts} WHERE ${accounts.id} = ${contacts.accountId} AND ${accounts.name} ILIKE ${value + '%'})`;
    } else if (operator === 'isEmpty') {
      return isNull(contacts.accountId);
    } else if (operator === 'isNotEmpty') {
      return isNotNull(contacts.accountId);
    }
  }

  if (table === contacts && field === 'accountDomain') {
    if (operator === 'equals') {
      return sql`EXISTS (SELECT 1 FROM ${accounts} WHERE ${accounts.id} = ${contacts.accountId} AND ${accounts.domain} = ${value})`;
    } else if (operator === 'contains') {
      return sql`EXISTS (SELECT 1 FROM ${accounts} WHERE ${accounts.id} = ${contacts.accountId} AND ${accounts.domain} ILIKE ${'%' + value + '%'})`;
    } else if (operator === 'containsAny') {
      const values = value as string[];
      if (values.length === 0) return undefined;
      return sql`EXISTS (SELECT 1 FROM ${accounts} WHERE ${accounts.id} = ${contacts.accountId} AND ${accounts.domain} = ANY(${values}))`;
    } else if (operator === 'isEmpty') {
      return isNull(contacts.accountId);
    } else if (operator === 'isNotEmpty') {
      return isNotNull(contacts.accountId);
    }
  }

  // Handle company fields for contacts (requires JOIN to accounts table)
  const companyFields = ['industries', 'industry', 'companySizes', 'companyRevenue', 'technologies', 'techStack'];
  const arrayCompanyFields = ['technologies', 'techStack']; // Array fields
  
  if (table === contacts && companyFields.includes(field)) {
    const accountColumnName = getColumnName(field, accounts);
    const accountColumn = (accounts as any)[accountColumnName];
    
    if (!accountColumn) {
      console.warn(`Company field ${field} (mapped to ${accountColumnName}) not found in accounts table`);
      return undefined;
    }
    
    const isArrayField = arrayCompanyFields.includes(field);
    
    // Build EXISTS subquery with account JOIN
    // CRITICAL: Must check contacts.accountId IS NOT NULL to exclude contacts without accounts
    if (operator === 'equals') {
      return sql`${contacts.accountId} IS NOT NULL AND EXISTS (SELECT 1 FROM ${accounts} WHERE ${accounts.id} = ${contacts.accountId} AND ${accountColumn} = ${value})`;
    } else if (operator === 'notEquals') {
      // NOT EXISTS excludes contacts with no account OR contacts whose account has this value
      return sql`${contacts.accountId} IS NOT NULL AND NOT EXISTS (SELECT 1 FROM ${accounts} WHERE ${accounts.id} = ${contacts.accountId} AND ${accountColumn} = ${value})`;
    } else if (operator === 'contains') {
      return sql`${contacts.accountId} IS NOT NULL AND EXISTS (SELECT 1 FROM ${accounts} WHERE ${accounts.id} = ${contacts.accountId} AND ${accountColumn} ILIKE ${'%' + value + '%'})`;
    } else if (operator === 'doesNotContain') {
      return sql`${contacts.accountId} IS NOT NULL AND NOT EXISTS (SELECT 1 FROM ${accounts} WHERE ${accounts.id} = ${contacts.accountId} AND ${accountColumn} ILIKE ${'%' + value + '%'})`;
    } else if (operator === 'startsWith') {
      return sql`${contacts.accountId} IS NOT NULL AND EXISTS (SELECT 1 FROM ${accounts} WHERE ${accounts.id} = ${contacts.accountId} AND ${accountColumn} ILIKE ${value + '%'})`;
    } else if (operator === 'endsWith') {
      return sql`${contacts.accountId} IS NOT NULL AND EXISTS (SELECT 1 FROM ${accounts} WHERE ${accounts.id} = ${contacts.accountId} AND ${accountColumn} ILIKE ${'%' + value})`;
    } else if (operator === 'containsAny') {
      const values = value as string[];
      if (values.length === 0) return undefined;
      
      if (isArrayField) {
        // For array fields like techStack, let Drizzle handle array parameterization
        return sql`${contacts.accountId} IS NOT NULL AND EXISTS (SELECT 1 FROM ${accounts} WHERE ${accounts.id} = ${contacts.accountId} AND ${accountColumn} && ${values})`;
      } else {
        // For scalar fields like industry/revenue, use inArray
        return and(
          isNotNull(contacts.accountId),
          sql`EXISTS (SELECT 1 FROM ${accounts} WHERE ${accounts.id} = ${contacts.accountId} AND ${inArray(accountColumn, values)})`
        )!;
      }
    } else if (operator === 'containsAll') {
      const values = value as string[];
      if (values.length === 0) return undefined;
      
      if (isArrayField) {
        // For array fields, let Drizzle handle array parameterization
        return sql`${contacts.accountId} IS NOT NULL AND EXISTS (SELECT 1 FROM ${accounts} WHERE ${accounts.id} = ${contacts.accountId} AND ${accountColumn} @> ${values})`;
      } else {
        // containsAll doesn't make sense for scalar fields - fail gracefully
        // For now, match ALL values using AND clauses (equivalent to IN with all values)
        if (values.length === 1) {
          return sql`${contacts.accountId} IS NOT NULL AND EXISTS (SELECT 1 FROM ${accounts} WHERE ${accounts.id} = ${contacts.accountId} AND ${accountColumn} = ${values[0]})`;
        }
        // For multiple values, a scalar can only equal one value, so this is impossible
        // Return a condition that's always false
        return sql`FALSE`;
      }
    } else if (operator === 'isEmpty') {
      // Check if contact has no account OR account field is empty
      return or(
        isNull(contacts.accountId),
        sql`EXISTS (SELECT 1 FROM ${accounts} WHERE ${accounts.id} = ${contacts.accountId} AND (${accountColumn} IS NULL OR ${accountColumn} = ''))`
      );
    } else if (operator === 'isNotEmpty') {
      // Contact must have account AND field must not be empty
      return sql`${contacts.accountId} IS NOT NULL AND EXISTS (SELECT 1 FROM ${accounts} WHERE ${accounts.id} = ${contacts.accountId} AND ${accountColumn} IS NOT NULL AND ${accountColumn} != '')`;
    }
  }

  // Get the actual column name from field mapping
  const columnName = getColumnName(field, table);
  
  // Get the column from the table
  const column = (table as any)[columnName];
  if (!column) {
    console.warn(`Field ${field} (mapped to ${columnName}) not found in table`);
    return undefined;
  }

  // Handle different operators
  switch (operator) {
    case 'equals':
      return eq(column, value as string | number);
    
    case 'notEquals':
      return sql`${column} != ${value}`;
    
    case 'contains':
      return ilike(column, `%${value}%`);
    
    case 'doesNotContain':
      return sql`${column} NOT ILIKE ${'%' + value + '%'}`;
    
    case 'startsWith':
      return ilike(column, `${value}%`);
    
    case 'endsWith':
      return ilike(column, `%${value}`);
    
    case 'greaterThan':
      return gt(column, value as number);
    
    case 'lessThan':
      return lt(column, value as number);
    
    case 'between':
      const rangeValue = value as { from: string | number; to: string | number };
      const conditions: SQL[] = [];
      
      // Only add from condition if value is present and not empty string
      if (rangeValue.from !== '' && rangeValue.from !== null && rangeValue.from !== undefined) {
        conditions.push(gte(column, rangeValue.from));
      }
      
      // Only add to condition if value is present and not empty string
      if (rangeValue.to !== '' && rangeValue.to !== null && rangeValue.to !== undefined) {
        conditions.push(lte(column, rangeValue.to));
      }
      
      // Return combined conditions or undefined if no valid bounds
      if (conditions.length === 0) return undefined;
      if (conditions.length === 1) return conditions[0];
      return and(...conditions);
    
    case 'containsAny':
      // For array fields, check if any value in the filter array is in the column array
      const anyValues = value as string[];
      if (anyValues.length === 0) return undefined;
      return sql`${column} && ${anyValues}`;
    
    case 'containsAll':
      // For array fields, check if all values in the filter array are in the column array
      const allValues = value as string[];
      if (allValues.length === 0) return undefined;
      return sql`${column} @> ${allValues}`;
    
    case 'isEmpty':
      return or(
        isNull(column),
        sql`${column} = '{}'`
      );
    
    case 'isNotEmpty':
      return and(
        isNotNull(column),
        sql`${column} != '{}'`
      );
    
    case 'before':
      return lt(column, value as string);
    
    case 'after':
      return gt(column, value as string);
    
    case 'is':
      return eq(column, value as boolean);
    
    default:
      console.warn(`Operator ${operator} not supported`);
      return undefined;
  }
}

// Helper to apply suppression filters for contacts
export function buildSuppressionFilter(
  isEmailSuppressed?: boolean,
  isPhoneSuppressed?: boolean
): SQL | undefined {
  const conditions: SQL[] = [];

  if (isEmailSuppressed !== undefined) {
    if (isEmailSuppressed) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM suppression_emails 
          WHERE suppression_emails.email = ${contacts.email}
        )`
      );
    } else {
      conditions.push(
        sql`NOT EXISTS (
          SELECT 1 FROM suppression_emails 
          WHERE suppression_emails.email = ${contacts.email}
        )`
      );
    }
  }

  if (isPhoneSuppressed !== undefined && isPhoneSuppressed) {
    if (isPhoneSuppressed) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM suppression_phones 
          WHERE suppression_phones.phone_e164 = ${contacts.directPhoneE164}
        )`
      );
    } else {
      conditions.push(
        sql`NOT EXISTS (
          SELECT 1 FROM suppression_phones 
          WHERE suppression_phones.phone_e164 = ${contacts.directPhoneE164}
        )`
      );
    }
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}
