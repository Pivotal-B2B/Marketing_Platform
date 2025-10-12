import { SQL, and, or, eq, like, gt, lt, gte, lte, ilike, sql, isNull, isNotNull, inArray } from "drizzle-orm";
import { FilterGroup, FilterCondition } from "@shared/filter-types";
import { accounts, contacts } from "@shared/schema";

type TableType = typeof accounts | typeof contacts;

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

  // Get the column from the table
  const column = (table as any)[field];
  if (!column) {
    console.warn(`Field ${field} not found in table`);
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
      return and(
        gte(column, rangeValue.from),
        lte(column, rangeValue.to)
      );
    
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
