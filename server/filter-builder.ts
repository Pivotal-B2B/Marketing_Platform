import { SQL, and, or, eq, like, gt, lt, gte, lte, ilike, sql, isNull, isNotNull, inArray } from "drizzle-orm";
import { FilterGroup, FilterCondition } from "@shared/filter-types";
import { accounts, contacts } from "@shared/schema";

type TableType = typeof accounts | typeof contacts;

// Map filter field names to actual database column names
const FIELD_MAPPINGS: Record<string, Record<string, string>> = {
  accounts: {
    'industry': 'industryStandardized',
    'companySize': 'companySize',
    'revenue': 'revenue',
  },
  contacts: {
    // Contacts don't have direct industry field - would need to join with accounts
  }
};

function getColumnName(field: string, table: TableType): string {
  const tableName = table === accounts ? 'accounts' : 'contacts';
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
