import OpenAI from "openai";
import type { VerificationContact } from "@shared/schema";
import { searchWeb, formatSearchResultsForAI } from "./web-search";

// Referenced from blueprint:javascript_openai_ai_integrations
// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
// This is using Replit's AI Integrations service, which provides OpenAI-compatible API access without requiring your own OpenAI API key.
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

interface EnrichmentResult {
  success: boolean;
  address?: {
    address1: string;
    address2?: string;
    address3?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  phone?: string;
  addressError?: string;
  phoneError?: string;
  addressConfidence?: number;
  phoneConfidence?: number;
}

/**
 * AI-powered company data enrichment service
 * Enriches LOCAL office address and phone number based on contact's location
 * Searches for regional/local office information, not global HQ
 */
export class CompanyEnrichmentService {
  /**
   * Determines if a contact needs address enrichment
   * Returns true if ANY required AI enrichment address field is missing
   */
  static needsAddressEnrichment(contact: Partial<VerificationContact>): boolean {
    // Check AI enrichment fields - require ALL essential fields to be present for a complete address
    const hasCompleteAIEnrichedAddress = !!(
      contact.aiEnrichedAddress1 &&
      contact.aiEnrichedCity &&
      contact.aiEnrichedState &&
      contact.aiEnrichedPostal
    );
    return !hasCompleteAIEnrichedAddress;
  }

  /**
   * Determines if a contact needs phone enrichment
   * Checks if AI enriched phone is missing
   */
  static needsPhoneEnrichment(contact: Partial<VerificationContact>): boolean {
    return !contact.aiEnrichedPhone;
  }

  /**
   * Enriches both address AND phone for a company's LOCAL office in a single AI request
   * Searches for regional/local office data based on contact's country
   * @param contact - The contact to enrich (must have contactCountry)
   * @param accountName - The company name
   * @returns EnrichmentResult with structured LOCAL office address and phone data
   */
  static async enrichCompanyData(
    contact: Partial<VerificationContact>,
    accountName: string
  ): Promise<EnrichmentResult> {
    try {
      // Validate inputs
      if (!accountName?.trim()) {
        return {
          success: false,
          addressError: "Company name is required for enrichment",
          phoneError: "Company name is required for enrichment",
        };
      }

      // CRITICAL: Only use Contact Country for enrichment (no HQ country fallback)
      // Enrichment is based exclusively on where the contact is located
      if (!contact.contactCountry?.trim()) {
        return {
          success: false,
          addressError: "Contact Country is required for enrichment",
          phoneError: "Contact Country is required for enrichment",
        };
      }

      const country = contact.contactCountry;
      
      const needsAddress = this.needsAddressEnrichment(contact);
      const needsPhone = this.needsPhoneEnrichment(contact);

      if (!needsAddress && !needsPhone) {
        return {
          success: true,
          addressError: "Address already exists",
          phoneError: "Phone already exists",
        };
      }
      
      // Use GPT to research and extract both address and phone in single request
      const enrichmentData = await this.extractCompanyDataWithAI(
        accountName,
        country,
        needsAddress,
        needsPhone
      );
      
      return enrichmentData;
    } catch (error: any) {
      console.error("[CompanyEnrichment] Error:", error);
      return {
        success: false,
        addressError: error.message || "Unknown error during enrichment",
        phoneError: error.message || "Unknown error during enrichment",
      };
    }
  }

  /**
   * HYBRID ENRICHMENT: Two-stage approach
   * Stage 1: Try AI's internal training data
   * Stage 2: If no results, fall back to web search (if API key configured)
   */
  private static async extractCompanyDataWithAI(
    companyName: string,
    country: string,
    needsAddress: boolean,
    needsPhone: boolean
  ): Promise<EnrichmentResult> {
    try {
      // STAGE 1: Try AI's internal knowledge first
      console.log(`[CompanyEnrichment] Stage 1: Trying AI internal knowledge for "${companyName}" in ${country}`);
      
      const aiResult = await this.tryAIInternalKnowledge(
        companyName,
        country,
        needsAddress,
        needsPhone
      );

      // Check if we got good results from AI
      const hasGoodAddress = aiResult.address && (aiResult.addressConfidence || 0) >= 0.7;
      const hasGoodPhone = aiResult.phone && (aiResult.phoneConfidence || 0) >= 0.7;
      
      if ((needsAddress && hasGoodAddress) || (needsPhone && hasGoodPhone)) {
        console.log(`[CompanyEnrichment] Stage 1 SUCCESS - AI found data (address: ${hasGoodAddress}, phone: ${hasGoodPhone})`);
        return aiResult;
      }

      // STAGE 2: Fall back to web search if available
      const hasApiKey = !!(process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID);
      
      if (!hasApiKey) {
        console.log(`[CompanyEnrichment] Stage 2 SKIPPED - No web search API credentials configured`);
        return aiResult; // Return AI result even if low confidence
      }

      console.log(`[CompanyEnrichment] Stage 2: Trying web search fallback`);
      
      const webResult = await this.tryWebSearchEnrichment(
        companyName,
        country,
        needsAddress,
        needsPhone
      );

      // Merge results: Use web search data for fields that AI couldn't provide
      const mergedResult: EnrichmentResult = { success: false };

      if (hasGoodAddress) {
        mergedResult.address = aiResult.address;
        mergedResult.addressConfidence = aiResult.addressConfidence;
      } else if (webResult.address && (webResult.addressConfidence || 0) >= 0.7) {
        mergedResult.address = webResult.address;
        mergedResult.addressConfidence = webResult.addressConfidence;
        console.log(`[CompanyEnrichment] Using web search result for address`);
      } else {
        mergedResult.addressError = webResult.addressError || aiResult.addressError;
        mergedResult.addressConfidence = 0;
      }

      if (hasGoodPhone) {
        mergedResult.phone = aiResult.phone;
        mergedResult.phoneConfidence = aiResult.phoneConfidence;
      } else if (webResult.phone && (webResult.phoneConfidence || 0) >= 0.7) {
        mergedResult.phone = webResult.phone;
        mergedResult.phoneConfidence = webResult.phoneConfidence;
        console.log(`[CompanyEnrichment] Using web search result for phone`);
      } else {
        mergedResult.phoneError = webResult.phoneError || aiResult.phoneError;
        mergedResult.phoneConfidence = 0;
      }

      mergedResult.success = !!(mergedResult.address || mergedResult.phone);
      
      console.log(`[CompanyEnrichment] Final result - address: ${!!mergedResult.address}, phone: ${!!mergedResult.phone}`);
      
      return mergedResult;
    } catch (error: any) {
      console.error("[CompanyEnrichment] Error:", error);
      return {
        success: false,
        addressError: error.message,
        phoneError: error.message,
      };
    }
  }

  /**
   * Stage 1: Try to extract data from AI's internal training data
   */
  private static async tryAIInternalKnowledge(
    companyName: string,
    country: string,
    needsAddress: boolean,
    needsPhone: boolean
  ): Promise<EnrichmentResult> {
    try {
      const prompt = this.buildAIPrompt(companyName, country, needsAddress, needsPhone);
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a precise company data extraction expert. Extract LOCAL/REGIONAL office information from your training data.

CRITICAL REQUIREMENTS:
- Find the company's LOCAL office/branch in the SPECIFIED COUNTRY from your knowledge
- Do NOT return global HQ information unless it's located in the specified country
- Only return data you are CERTAIN about from your training data
- Never fabricate or guess information
- Return SEPARATE confidence scores for address and phone data (0.0-1.0)
- Confidence should reflect how certain you are based on your training data
- If you don't have information about this company in this country, mark as not found

Output valid JSON only.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 1500,
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        return {
          success: false,
          addressError: "No response from AI model",
          phoneError: "No response from AI model",
        };
      }

      const parsed = JSON.parse(responseText);
      
      const result: EnrichmentResult = {
        success: false,
      };

      // Extract address if needed and found
      if (needsAddress) {
        if (parsed.addressFound && parsed.address) {
          const address = this.normalizeAddress(parsed.address, country);
          if (this.validateAddress(address, country)) {
            result.address = address;
            result.addressConfidence = parsed.addressConfidence || parsed.confidence || 0.8;
          } else {
            result.addressError = "Extracted address failed validation";
            result.addressConfidence = 0;
          }
        } else {
          result.addressError = parsed.addressReason || "Address not found in knowledge base";
          result.addressConfidence = 0;
        }
      }

      // Extract phone if needed and found
      if (needsPhone) {
        if (parsed.phoneFound && parsed.phone) {
          const phone = this.normalizePhone(parsed.phone, country);
          if (phone) {
            result.phone = phone;
            result.phoneConfidence = parsed.phoneConfidence || parsed.confidence || 0.8;
          } else {
            result.phoneError = "Extracted phone failed normalization";
            result.phoneConfidence = 0;
          }
        } else {
          result.phoneError = parsed.phoneReason || "Phone not found in knowledge base";
          result.phoneConfidence = 0;
        }
      }

      // Success if we got at least one piece of data
      result.success = !!(result.address || result.phone);
      
      return result;
    } catch (error: any) {
      console.error("[CompanyEnrichment] AI extraction error:", error);
      return {
        success: false,
        addressError: `AI extraction failed: ${error.message}`,
        phoneError: `AI extraction failed: ${error.message}`,
      };
    }
  }

  /**
   * Stage 2: Try web search enrichment using Google Custom Search API
   */
  private static async tryWebSearchEnrichment(
    companyName: string,
    country: string,
    needsAddress: boolean,
    needsPhone: boolean
  ): Promise<EnrichmentResult> {
    try {
      // Enhanced search query: Company + Location + office + contact details
      // This targets local office information specifically within the contact's location
      const searchQuery = `"${companyName}" ${country} office address phone contact location`;
      const searchResults = await searchWeb(searchQuery);

      if (!searchResults.success || searchResults.results.length === 0) {
        return {
          success: false,
          addressError: searchResults.error || "No web search results found",
          phoneError: searchResults.error || "No web search results found",
        };
      }

      // Format search results for AI to analyze
      const searchContext = formatSearchResultsForAI(searchResults.results);
      
      const prompt = this.buildWebSearchPrompt(
        companyName,
        country,
        needsAddress,
        needsPhone,
        searchContext
      );

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a precise data extraction expert. Extract LOCAL office information from the provided web search results.

CRITICAL REQUIREMENTS:
- Analyze the web search results provided
- Extract the company's LOCAL office information in the SPECIFIED COUNTRY
- Do NOT return global HQ data unless it's in the specified country
- Extract COMPLETE address components:
  * Street Address Line 1 (required)
  * Street Address Line 2 (suite/floor/building - if available)
  * Street Address Line 3 (additional info - if available)
  * City (required)
  * State/Province (required)
  * Postal Code (required)
  * Country (required)
- Extract phone number with country code for the local office
- Only extract information explicitly stated in the search results
- Return SEPARATE confidence scores for address and phone (0.0-1.0)
- Confidence 0.9-1.0: Found on official company website or verified Google Business
- Confidence 0.7-0.89: Found on reputable directories
- Never guess or fabricate - only use provided search results

Output valid JSON only.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 1500,
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        return {
          success: false,
          addressError: "No response from AI",
          phoneError: "No response from AI",
        };
      }

      const parsed = JSON.parse(responseText);
      const result: EnrichmentResult = { success: false };

      // Extract address
      if (needsAddress) {
        if (parsed.addressFound && parsed.address) {
          const address = this.normalizeAddress(parsed.address, country);
          if (this.validateAddress(address, country)) {
            result.address = address;
            result.addressConfidence = parsed.addressConfidence || 0.8;
          } else {
            result.addressError = "Invalid address format";
            result.addressConfidence = 0;
          }
        } else {
          result.addressError = parsed.addressReason || "Address not found in search results";
          result.addressConfidence = 0;
        }
      }

      // Extract phone
      if (needsPhone) {
        if (parsed.phoneFound && parsed.phone) {
          const phone = this.normalizePhone(parsed.phone, country);
          if (phone) {
            result.phone = phone;
            result.phoneConfidence = parsed.phoneConfidence || 0.8;
          } else {
            result.phoneError = "Invalid phone format";
            result.phoneConfidence = 0;
          }
        } else {
          result.phoneError = parsed.phoneReason || "Phone not found in search results";
          result.phoneConfidence = 0;
        }
      }

      result.success = !!(result.address || result.phone);
      return result;
    } catch (error: any) {
      console.error("[CompanyEnrichment] Web search error:", error);
      return {
        success: false,
        addressError: `Web search failed: ${error.message}`,
        phoneError: `Web search failed: ${error.message}`,
      };
    }
  }

  /**
   * Build AI-only prompt (Stage 1)
   */
  private static buildAIPrompt(
    companyName: string,
    country: string,
    needsAddress: boolean,
    needsPhone: boolean
  ): string {
    const parts: string[] = [];
    parts.push(`Find LOCAL office information for "${companyName}" in ${country} from your training data.\n`);

    if (needsAddress) {
      parts.push(`Address: Extract COMPLETE local office address in ${country}:
- Street Address Line 1 (required)
- Street Address Line 2 (suite/floor/building if available)
- Street Address Line 3 (additional info if available)
- City (required)
- State/Province (required)
- Postal Code (required)`);
    }
    if (needsPhone) {
      parts.push(`Phone: Local office phone number in ${country} with country code`);
    }

    parts.push(this.getJSONFormat(needsAddress, needsPhone));
    return parts.join('\n\n');
  }

  /**
   * Build web search prompt (Stage 2)
   */
  private static buildWebSearchPrompt(
    companyName: string,
    country: string,
    needsAddress: boolean,
    needsPhone: boolean,
    searchContext: string
  ): string {
    const parts: string[] = [];
    
    parts.push(`Extract LOCAL office information for "${companyName}" in ${country} from these web search results:\n\n${searchContext}\n`);

    if (needsAddress) {
      parts.push(`Address: Extract COMPLETE local office address in ${country}:
- Street Address Line 1 (building number and street name - REQUIRED)
- Street Address Line 2 (suite/floor/building/unit - if mentioned)
- Street Address Line 3 (additional location info - if mentioned)
- City (REQUIRED)
- State/Province (REQUIRED)
- Postal Code (REQUIRED)
Target the office location within ${country} specifically.`);
    }
    if (needsPhone) {
      parts.push(`Phone: Extract the local office phone number in ${country} with country code`);
    }

    parts.push(this.getJSONFormat(needsAddress, needsPhone));
    return parts.join('\n\n');
  }

  /**
   * Get JSON format template
   */
  private static getJSONFormat(needsAddress: boolean, needsPhone: boolean): string {
    return `Return JSON in this format:
{
  ${needsAddress ? `"addressFound": true/false,
  "addressConfidence": 0.0-1.0,
  "addressReason": "explanation if not found",
  "address": {
    "address1": "street address line 1 (building number and street name)",
    "address2": "street address line 2 (suite/floor/building/unit - optional)",
    "address3": "street address line 3 (additional info - optional)",
    "city": "city name",
    "state": "state/province",
    "postalCode": "postal code",
    "country": "country name"
  },` : ''}
  ${needsPhone ? `"phoneFound": true/false,
  "phoneConfidence": 0.0-1.0,
  "phoneReason": "explanation if not found",
  "phone": "phone with country code"` : ''}
}`;
  }

  /**
   * DEPRECATED: Old method kept for reference
   * Build GPT prompt for LOCAL office company data extraction with web search
   * Provides specific search query and instructions for web-based research
   */
  private static buildEnrichmentPrompt_DEPRECATED(
    companyName: string,
    country: string,
    needsAddress: boolean,
    needsPhone: boolean,
    searchQuery: string
  ): string {
    const parts: string[] = [];
    
    parts.push(`TASK: Find the LOCAL OFFICE information for "${companyName}" in ${country}

WEB SEARCH QUERY TO USE:
"${searchQuery}"

SEARCH STRATEGY:
- Search the web using the query above
- Look for the company's official website, Google Business listing, LinkedIn company page
- Find the company's regional/local office, branch, or subsidiary physically located in ${country}
- Do NOT return global headquarters information unless the HQ is actually in ${country}
- Check multiple sources for verification
- If the company has no web presence or office in ${country}, mark as not found\n`);

    if (needsAddress) {
      parts.push(`REQUIRED: Local Office Address in ${country}
- Extract the complete, accurate address of the company's office/branch in ${country}
- Include: Street (lines 1, 2, 3 if applicable), City, State/Province, Postal Code, Country
- Use country-specific formatting
- Must be physically located in ${country}`);
    }

    if (needsPhone) {
      parts.push(`REQUIRED: Local Office Phone Number in ${country}
- Find the local office phone number for the company's ${country} location
- Format with country code and proper formatting
- ONLY provide the local office main line in ${country}
- Do NOT provide global HQ phone unless HQ is in ${country}`);
    }

    parts.push(`\nReturn JSON in this EXACT format:
{
  ${needsAddress ? `"addressFound": true/false,
  "addressConfidence": 0.0-1.0,
  "addressReason": "explanation if not found or low confidence",
  "address": {
    "address1": "primary street address",
    "address2": "suite/building/floor (optional)",
    "address3": "additional info (optional)",
    "city": "city name",
    "state": "state/province full name",
    "stateAbbr": "state abbreviation (e.g., CA, NY, NC)",
    "postalCode": "postal/zip code",
    "country": "country name"
  },` : ''}
  ${needsPhone ? `"phoneFound": true/false,
  "phoneConfidence": 0.0-1.0,
  "phoneReason": "explanation if not found",
  "phone": "main company phone number with country code"` : ''}
}

CRITICAL REQUIREMENTS:
- Find LOCAL office in ${country} using WEB SEARCH - NOT global HQ (unless HQ is in ${country})
- Search the web for CURRENT information - don't rely only on training data
- Look for official sources: company website, Google Business Profile, LinkedIn, business directories
- Verify the address and phone are actually located in ${country}
- If the company has no web presence or office in ${country}, mark as not found
- Use proper country-specific formatting:
  * USA: State abbr (CA, NY), 5-digit ZIP, phone: +1-XXX-XXX-XXXX
  * UK: Postal codes (SW1A 1AA), phone: +44-XXXX-XXXXXX
  * Canada: Province (ON, BC), postal (A1A 1A1), phone: +1-XXX-XXX-XXXX
  * Singapore: Postal codes (6 digits), phone: +65-XXXX-XXXX
  * Vietnam: Province/City, phone: +84-XX-XXXX-XXXX
  * Other: Follow local standards
- For address and phone: Must be for ${country} location specifically
- Confidence 0.9-1.0 = Found on official website or verified Google Business listing
- Confidence 0.7-0.89 = Found on reputable business directory
- Below 0.7 = mark as not found`);

    return parts.join('\n\n');
  }

  /**
   * Normalize address components based on country format
   */
  private static normalizeAddress(rawAddress: any, country: string): EnrichmentResult['address'] {
    return {
      address1: this.cleanAddressLine(rawAddress.address1 || rawAddress.street),
      address2: rawAddress.address2 ? this.cleanAddressLine(rawAddress.address2) : undefined,
      address3: rawAddress.address3 ? this.cleanAddressLine(rawAddress.address3) : undefined,
      city: this.cleanText(rawAddress.city),
      state: rawAddress.stateAbbr || rawAddress.state || "",
      postalCode: this.cleanPostalCode(rawAddress.postalCode || rawAddress.zip || "", country),
      country: rawAddress.country || country,
    };
  }

  /**
   * Normalize phone number
   */
  private static normalizePhone(rawPhone: string, country: string): string | undefined {
    if (!rawPhone) return undefined;
    
    // Remove all non-digit characters except + and -
    let cleaned = rawPhone.trim().replace(/[^\d+\-().\s]/g, '');
    
    // Ensure it starts with + for international format
    if (!cleaned.startsWith('+')) {
      // Try to add country code based on country
      const countryCode = this.getCountryCode(country);
      if (countryCode) {
        cleaned = `+${countryCode}-${cleaned}`;
      }
    }
    
    // Basic validation - must have at least 10 digits
    const digitCount = (cleaned.match(/\d/g) || []).length;
    if (digitCount < 10) return undefined;
    
    return cleaned;
  }

  /**
   * Get country calling code
   */
  private static getCountryCode(country: string): string | null {
    const codes: Record<string, string> = {
      'USA': '1',
      'United States': '1',
      'Canada': '1',
      'UK': '44',
      'United Kingdom': '44',
      'Australia': '61',
      'Germany': '49',
      'France': '33',
      'India': '91',
      'China': '86',
      'Japan': '81',
      'Singapore': '65',
      'Vietnam': '84',
      'Thailand': '66',
      'Malaysia': '60',
      'Indonesia': '62',
      'Philippines': '63',
      'South Korea': '82',
      'Hong Kong': '852',
      'Taiwan': '886',
      'New Zealand': '64',
      'Mexico': '52',
      'Brazil': '55',
      'Spain': '34',
      'Italy': '39',
      'Netherlands': '31',
      'Switzerland': '41',
      'Sweden': '46',
      'Norway': '47',
      'Denmark': '45',
      'Poland': '48',
      'UAE': '971',
      'Saudi Arabia': '966',
      'South Africa': '27',
      // Add more as needed
    };
    
    return codes[country] || null;
  }

  /**
   * Clean address line text
   */
  private static cleanAddressLine(text: string): string {
    if (!text) return "";
    return text.trim().replace(/\s+/g, ' ');
  }

  /**
   * Clean general text
   */
  private static cleanText(text: string): string {
    if (!text) return "";
    return text.trim();
  }

  /**
   * Clean and format postal code based on country
   */
  private static cleanPostalCode(code: string, country: string): string {
    if (!code) return "";
    
    const cleaned = code.trim().toUpperCase();
    
    if (country === "USA" || country === "United States") {
      return cleaned.replace(/[^0-9-]/g, '');
    } else if (country === "Canada") {
      return cleaned.replace(/[^A-Z0-9 ]/g, '');
    } else if (country === "UK" || country === "United Kingdom") {
      return cleaned.replace(/[^A-Z0-9 ]/g, '');
    }
    
    return cleaned;
  }

  /**
   * Validate extracted address has required components
   */
  private static validateAddress(address: EnrichmentResult['address'], country: string): boolean {
    if (!address) return false;
    
    if (!address.address1?.trim()) return false;
    if (!address.city?.trim()) return false;
    if (!address.country?.trim()) return false;
    
    // Country-specific validation
    if (country === "USA" || country === "United States") {
      if (!address.state?.trim()) return false;
      if (!address.postalCode?.match(/^\d{5}(-\d{4})?$/)) return false;
    } else if (country === "Canada") {
      if (!address.state?.trim()) return false;
      if (!address.postalCode?.match(/^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/)) return false;
    }
    
    return true;
  }
}

export default CompanyEnrichmentService;
