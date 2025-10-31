import {
  validateEmail as runEmailValidation,
  validateAndStoreEmail as runAndStoreEmail,
  type ValidationResult,
} from '../lib/email-validation-engine';

export interface BusinessEmailValidationOptions {
  skipSmtp?: boolean;
  useCache?: boolean;
  detectAcceptAll?: boolean;
}

export interface BusinessEmailValidationSummary {
  status: ValidationResult['status'];
  confidence: number;
  isDeliverable: boolean;
  deliverability:
    | 'deliverable'
    | 'likely_deliverable'
    | 'risky'
    | 'undeliverable'
    | 'unknown';
  isCatchAll: boolean;
  shouldBlock: boolean;
  smtpStatus: 'accepted' | 'rejected' | 'unreachable' | 'skipped' | 'unknown';
  reasons: string[];
}

const DEFAULT_SKIP_SMTP = process.env.SKIP_SMTP_VALIDATION === 'true';
const DEFAULT_USE_CACHE = process.env.EMAIL_VALIDATION_USE_CACHE !== 'false';
const DEFAULT_DETECT_ACCEPT_ALL = process.env.EMAIL_VALIDATION_DETECT_ACCEPT_ALL !== 'false';

function mergeOptions(options?: BusinessEmailValidationOptions): Required<BusinessEmailValidationOptions> {
  const overrides = options ?? {};
  return {
    skipSmtp: overrides.skipSmtp ?? DEFAULT_SKIP_SMTP,
    useCache: overrides.useCache ?? DEFAULT_USE_CACHE,
    detectAcceptAll: overrides.detectAcceptAll ?? DEFAULT_DETECT_ACCEPT_ALL,
  };
}

export async function validateBusinessEmail(
  email: string,
  options?: BusinessEmailValidationOptions
): Promise<ValidationResult> {
  const merged = mergeOptions(options);
  return runEmailValidation(email, merged);
}

type Provider = 'api_free';

export async function validateAndStoreBusinessEmail(
  contactId: string,
  email: string,
  options: BusinessEmailValidationOptions & { provider?: Provider } = {}
) {
  const { provider = 'api_free', ...rest } = options;
  const merged = mergeOptions(rest);
  return runAndStoreEmail(contactId, email, provider, merged);
}

const DELIVERABLE_STATUSES = new Set<ValidationResult['status']>([
  'safe_to_send',
  'valid',
]);

const LIKELY_DELIVERABLE_STATUSES = new Set<ValidationResult['status']>([
  'send_with_caution',
]);

const BLOCKING_STATUSES = new Set<ValidationResult['status']>([
  'invalid',
  'disposable',
  'spam_trap',
  'disabled',
]);

export function summarizeBusinessEmailValidation(
  result: ValidationResult,
  options?: BusinessEmailValidationOptions
): BusinessEmailValidationSummary {
  const mergedOptions = mergeOptions(options);
  const isSmtpSkipped = mergedOptions.skipSmtp && !result.trace.smtp && !result.hasSmtp;
  const smtpStatus: BusinessEmailValidationSummary['smtpStatus'] = isSmtpSkipped
    ? 'skipped'
    : result.smtpAccepted === true
    ? 'accepted'
    : result.smtpAccepted === false
    ? 'rejected'
    : result.hasSmtp
    ? 'unreachable'
    : 'unknown';

  let deliverability: BusinessEmailValidationSummary['deliverability'] = 'unknown';
  if (DELIVERABLE_STATUSES.has(result.status) || result.smtpAccepted) {
    deliverability = 'deliverable';
  } else if (LIKELY_DELIVERABLE_STATUSES.has(result.status)) {
    deliverability = 'likely_deliverable';
  } else if (result.status === 'risky' || result.status === 'send_with_caution') {
    deliverability = 'risky';
  } else if (BLOCKING_STATUSES.has(result.status)) {
    deliverability = 'undeliverable';
  }

  const shouldBlock = BLOCKING_STATUSES.has(result.status);

  return {
    status: result.status,
    confidence: result.confidence,
    isDeliverable: deliverability === 'deliverable' || deliverability === 'likely_deliverable',
    deliverability,
    isCatchAll: result.isAcceptAll ?? false,
    shouldBlock,
    smtpStatus,
    reasons: result.trace.risk?.reasons ?? [],
  };
}
