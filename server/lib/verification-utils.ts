import type { VerificationCampaign } from "@shared/schema";

export const normalize = {
  toKey: (s?: string | null) =>
    (s ?? "").toLowerCase().trim().replace(/\s+/g, " "),
  countryKey: (s?: string | null) =>
    (s ?? "").toLowerCase().replace(/\./g, "").trim(),
  emailLower: (s?: string | null) =>
    (s ?? "").toLowerCase().trim(),
};

export function evaluateEligibility(
  title: string | null | undefined,
  contactCountry: string | null | undefined,
  campaign: VerificationCampaign
) {
  const t = (title ?? "").toLowerCase();
  const c = normalize.countryKey(contactCountry);
  
  const { geoAllow, titleKeywords, seniorDmFallback } = campaign.eligibilityConfig;
  
  const countryOk = geoAllow.some(allowed => 
    c.includes(allowed.toLowerCase()) || allowed.toLowerCase().includes(c)
  );
  
  const titleMatch = titleKeywords.some(keyword => 
    t.includes(keyword.toLowerCase())
  );
  
  const seniorMatch = seniorDmFallback.some(senior => 
    t.includes(senior.toLowerCase())
  );
  
  if (!countryOk) {
    return { status: 'Out_of_Scope' as const, reason: 'country_not_in_geo_allow_list' };
  }
  
  if (!(titleMatch || seniorMatch)) {
    return { status: 'Out_of_Scope' as const, reason: 'title_not_matching_keywords' };
  }
  
  return { status: 'Eligible' as const, reason: 'eligible' };
}

export function computeNameCompanyHash(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  companyKey: string | null | undefined
): string {
  const crypto = require('crypto');
  const normalized = [
    normalize.toKey(firstName),
    normalize.toKey(lastName),
    normalize.toKey(companyKey)
  ].join('');
  
  return crypto.createHash('md5').update(normalized).digest('hex');
}

export function computeNormalizedKeys(contact: {
  firstName?: string | null;
  lastName?: string | null;
  contactCountry?: string | null;
  accountName?: string | null;
}) {
  return {
    firstNameNorm: normalize.toKey(contact.firstName),
    lastNameNorm: normalize.toKey(contact.lastName),
    contactCountryKey: normalize.countryKey(contact.contactCountry),
    companyKey: normalize.toKey(contact.accountName),
  };
}
