import { DvFieldConstraint, DvRecord } from '@shared/schema';

export interface ConstraintViolation {
  fieldName: string;
  ruleType: string;
  message: string;
}

/**
 * Evaluate a single constraint rule against a record value
 */
function evaluateRule(
  value: any,
  ruleType: string,
  ruleValue: any
): { valid: boolean; message?: string } {
  switch (ruleType) {
    case 'required':
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        return { valid: false, message: 'Field is required' };
      }
      return { valid: true };
      
    case 'in_list':
      if (!Array.isArray(ruleValue.values)) {
        return { valid: true };
      }
      if (!ruleValue.values.includes(value)) {
        return { valid: false, message: `Value must be one of: ${ruleValue.values.join(', ')}` };
      }
      return { valid: true };
      
    case 'not_in_list':
      if (!Array.isArray(ruleValue.values)) {
        return { valid: true };
      }
      if (ruleValue.values.includes(value)) {
        return { valid: false, message: `Value must not be: ${ruleValue.values.join(', ')}` };
      }
      return { valid: true };
      
    case 'regex':
      if (!value || typeof value !== 'string') {
        return { valid: false, message: 'Value must be a string' };
      }
      const regex = new RegExp(ruleValue.pattern);
      if (!regex.test(value)) {
        return { valid: false, message: `Value does not match pattern: ${ruleValue.pattern}` };
      }
      return { valid: true };
      
    case 'range':
      const numValue = typeof value === 'number' ? value : parseFloat(value);
      if (isNaN(numValue)) {
        return { valid: false, message: 'Value must be a number' };
      }
      if (ruleValue.min !== undefined && numValue < ruleValue.min) {
        return { valid: false, message: `Value must be >= ${ruleValue.min}` };
      }
      if (ruleValue.max !== undefined && numValue > ruleValue.max) {
        return { valid: false, message: `Value must be <= ${ruleValue.max}` };
      }
      return { valid: true };
      
    case 'allowed_values':
      if (!Array.isArray(ruleValue.values)) {
        return { valid: true };
      }
      if (!ruleValue.values.includes(value)) {
        return { valid: false, message: `Allowed values: ${ruleValue.values.join(', ')}` };
      }
      return { valid: true };
      
    default:
      return { valid: true };
  }
}

/**
 * Evaluate all constraints against a record
 */
export function evaluateConstraints(
  record: Partial<DvRecord>,
  constraints: DvFieldConstraint[]
): ConstraintViolation[] {
  const violations: ConstraintViolation[] = [];
  
  for (const constraint of constraints) {
    const fieldValue = (record as any)[constraint.fieldName];
    const result = evaluateRule(
      fieldValue,
      constraint.ruleType,
      constraint.ruleValue
    );
    
    if (!result.valid) {
      violations.push({
        fieldName: constraint.fieldName,
        ruleType: constraint.ruleType,
        message: result.message || 'Validation failed',
      });
    }
  }
  
  return violations;
}

/**
 * Check if record passes all constraints
 */
export function passesConstraints(
  record: Partial<DvRecord>,
  constraints: DvFieldConstraint[]
): boolean {
  return evaluateConstraints(record, constraints).length === 0;
}
