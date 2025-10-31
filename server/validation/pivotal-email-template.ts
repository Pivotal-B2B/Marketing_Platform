import { BULLETPROOF_HEADER_MARKER, type EmailTemplateLintResult } from '@shared/pivotal-email-marketing';

const GRADIENT_PATTERN = /linear-gradient\s*\(/i;
const VML_RECT_PATTERN = /<v:rect[^>]+fillcolor=/i;
const VML_FALLBACK_PATTERN = /<v:fill[^>]+type="gradient"/i;
const MARKER_ATTRIBUTE_PATTERN = new RegExp(`${BULLETPROOF_HEADER_MARKER}`, 'i');

export function lintBulletproofHeader(html: string): EmailTemplateLintResult {
  const issues: EmailTemplateLintResult['issues'] = [];

  if (!MARKER_ATTRIBUTE_PATTERN.test(html)) {
    issues.push({
      type: 'error',
      message:
        'Email header is missing the data-pivotal-bulletproof-header marker required for enforcement.',
    });
  }

  if (!GRADIENT_PATTERN.test(html)) {
    issues.push({
      type: 'error',
      message: 'Bulletproof header must declare a CSS linear-gradient background.',
    });
  }

  if (!VML_RECT_PATTERN.test(html) || !VML_FALLBACK_PATTERN.test(html)) {
    issues.push({
      type: 'error',
      message: 'Bulletproof header must include a VML rectangle with gradient fill for Outlook.',
    });
  }

  return { valid: issues.length === 0, issues };
}
