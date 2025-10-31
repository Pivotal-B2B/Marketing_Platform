import {
  summarizeBusinessEmailValidation,
  validateBusinessEmail,
  type BusinessEmailValidationOptions,
} from '../services/email-validation';
import type { ValidationResult } from './email-validation-engine';

export interface EmailValidationResult {
  syntax: boolean;
  mx: boolean;
  smtp: 'valid' | 'invalid' | 'catch_all' | 'unknown';
  isDisposable: boolean;
  domain: string | null;
  status: ValidationResult['status'];
  confidence: number;
  isCatchAll: boolean;
  isDeliverable: boolean;
  reasons: string[];
}

function deriveDeliverability(
  result: ValidationResult,
  options?: BusinessEmailValidationOptions
): Pick<EmailValidationResult, 'smtp' | 'isCatchAll' | 'isDeliverable' | 'reasons'> {
  const summary = summarizeBusinessEmailValidation(result, options);

  return {
    smtp: summary.isCatchAll ? 'catch_all' : summary.smtpStatus === 'accepted' ? 'valid' : summary.smtpStatus === 'rejected' ? 'invalid' : 'unknown',
    isCatchAll: summary.isCatchAll,
    isDeliverable: summary.isDeliverable,
    reasons: summary.reasons,
  };
}

export async function validateEmail(
  email: string,
  _timeoutMs?: number,
  options?: BusinessEmailValidationOptions
): Promise<EmailValidationResult> {
  const mergedOptions: BusinessEmailValidationOptions = {
    ...options,
  };

  const validation = await validateBusinessEmail(email, mergedOptions);
  const domain = email.includes('@') ? email.split('@')[1] : null;

  return {
    syntax: validation.syntaxValid,
    mx: validation.hasMx,
    isDisposable: validation.isDisposable,
    domain,
    status: validation.status,
    confidence: validation.confidence,
    ...deriveDeliverability(validation, mergedOptions),
  };
}

export async function batchValidateEmails(
  emails: string[],
  timeoutMs?: number,
  options?: BusinessEmailValidationOptions
): Promise<Map<string, EmailValidationResult>> {
  const results = new Map<string, EmailValidationResult>();

  await Promise.all(
    emails.map(async (email) => {
      const result = await validateEmail(email, timeoutMs, options);
      results.set(email, result);
    })
  );

  return results;
}
