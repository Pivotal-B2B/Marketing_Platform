import OpenAI from 'openai';
import { db } from "../db";
import { leads, campaigns, contacts, accounts } from "@shared/schema";
import { eq } from "drizzle-orm";

// Initialize OpenAI client with Replit AI Integrations
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface QAParameters {
  required_info: string[];
  scoring_weights: {
    content_interest: number;
    permission_given: number;
    email_confirmation: number;
    compliance_consent: number;
    qualification_answers: number;
    data_accuracy: number;
    email_deliverable: number;
    phone_valid: number;
  };
  min_score: number;
  client_criteria: {
    industry?: string[];
    company_size?: string[];
    revenue_range?: string[];
    technologies?: string[];
    job_titles?: string[];
  };
  qualification_questions?: Array<{
    question: string;
    required: boolean;
    acceptable_responses: string[];
  }>;
}

interface AIAnalysisResult {
  score: number;
  qualification_status: 'qualified' | 'not_qualified' | 'needs_review';
  analysis: {
    content_interest: { score: number; evidence: string };
    permission_given: { score: number; evidence: string };
    email_confirmation: { score: number; evidence: string };
    compliance_consent: { score: number; evidence: string };
    qualification_answers: { score: number; evidence: string };
    data_accuracy: { score: number; evidence: string };
    email_deliverable: { score: number; evidence: string };
    phone_valid: { score: number; evidence: string };
  };
  missing_info: string[];
  recommendations: string[];
  account_verification: {
    industry_match: boolean;
    size_match: boolean;
    revenue_match: boolean;
    technology_match: boolean;
    confidence: number;
  };
}

/**
 * Analyze lead using AI based on transcript, contact data, account data, and QA parameters
 */
export async function analyzeLeadQualification(leadId: string): Promise<AIAnalysisResult | null> {
  try {
    // Fetch lead with all related data
    const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
    if (!lead) return null;

    const [contact] = lead.contactId 
      ? await db.select().from(contacts).where(eq(contacts.id, lead.contactId)).limit(1)
      : [];

    const [account] = contact?.accountId
      ? await db.select().from(accounts).where(eq(accounts.id, contact.accountId)).limit(1)
      : [];

    const [campaign] = lead.campaignId
      ? await db.select().from(campaigns).where(eq(campaigns.id, lead.campaignId)).limit(1)
      : [];

    if (!lead.transcript) {
      console.log('[AI-QA] No transcript available for lead:', leadId);
      return null;
    }

    // Get QA parameters from campaign
    const qaParams = (campaign?.qaParameters as QAParameters) || getDefaultQAParameters();

    // Build context for AI analysis
    const analysisPrompt = buildAnalysisPrompt(lead, contact, account, campaign, qaParams);

    // Call OpenAI for analysis using GPT-4.1-mini (cost-effective)
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert B2B lead qualification analyst. Analyze call transcripts and data to determine if leads meet qualification criteria. Return structured JSON analysis.`
        },
        {
          role: 'user',
          content: analysisPrompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const analysisText = completion.choices[0]?.message?.content;
    if (!analysisText) return null;

    const analysis: AIAnalysisResult = JSON.parse(analysisText);

    // Save AI analysis to database
    await db.update(leads)
      .set({
        aiScore: analysis.score, // Store as number
        aiAnalysis: analysis as any,
        aiQualificationStatus: analysis.qualification_status,
      })
      .where(eq(leads.id, leadId));

    console.log('[AI-QA] Analysis completed for lead:', leadId, 'Score:', analysis.score);
    return analysis;

  } catch (error) {
    console.error('[AI-QA] Error analyzing lead:', error);
    return null;
  }
}

/**
 * Build comprehensive analysis prompt
 */
function buildAnalysisPrompt(
  lead: any,
  contact: any,
  account: any,
  campaign: any,
  qaParams: QAParameters
): string {
  return `Analyze this B2B telemarketing lead for qualification:

## CALL TRANSCRIPT:
${lead.transcript}

## CONTACT DATA:
- Full Name: ${contact?.fullName || 'Unknown'}
- Email: ${contact?.email || 'Unknown'}
- Phone: ${contact?.directPhone || 'Unknown'}
- Job Title: ${contact?.title || 'Unknown'}
- Email Verification: ${contact?.emailVerificationStatus || 'unknown'}

## COMPANY/ACCOUNT DATA:
- Company Name: ${account?.name || 'Unknown'}
- Industry: ${account?.industry || 'Unknown'}
- Company Size: ${account?.employeesSizeRange || 'Unknown'}
- Annual Revenue: ${account?.revenueRange || 'Unknown'}
- Technologies: ${account?.technologies?.join(', ') || 'Unknown'}
- Domain: ${account?.domain || 'Unknown'}

## CAMPAIGN OFFER:
${campaign?.name || 'Content offer'}
Call Script Context: ${campaign?.callScript?.substring(0, 500) || 'Marketing campaign'}

## QUALIFICATION CRITERIA:
${JSON.stringify(qaParams, null, 2)}

## YOUR TASK:
Evaluate this lead based on the following criteria (each scored 0-100):

1. **content_interest** (${qaParams.scoring_weights.content_interest}% weight): 
   - Did prospect show genuine interest in the whitepaper/eBook/guide?
   - Did they ask questions or express enthusiasm?

2. **permission_given** (${qaParams.scoring_weights.permission_given}% weight):
   - Did they explicitly agree to receive the content?
   - Did they say "yes" or give clear affirmative consent?

3. **email_confirmation** (${qaParams.scoring_weights.email_confirmation}% weight):
   - Did the agent confirm/verify their email address?
   - Did prospect confirm it's correct?

4. **compliance_consent** (${qaParams.scoring_weights.compliance_consent}% weight):
   - Did they agree to compliance statements (marketing, privacy)?
   - Did they acknowledge terms or not disagree?

5. **qualification_answers** (${qaParams.scoring_weights.qualification_answers}% weight):
   - Did they answer qualification questions satisfactorily?
   - Were responses aligned with client criteria?

6. **data_accuracy** (${qaParams.scoring_weights.data_accuracy}% weight):
   - Does contact/company data match client audience criteria?
   - Industry: ${qaParams.client_criteria.industry?.join(', ') || 'any'}
   - Company Size: ${qaParams.client_criteria.company_size?.join(', ') || 'any'}
   - Revenue: ${qaParams.client_criteria.revenue_range?.join(', ') || 'any'}

7. **email_deliverable** (${qaParams.scoring_weights.email_deliverable}% weight):
   - Is email verified as deliverable? (Status: ${contact?.emailVerificationStatus})

8. **phone_valid** (${qaParams.scoring_weights.phone_valid}% weight):
   - Is phone number valid and formatted correctly?

## ACCOUNT VERIFICATION:
Verify if the account data aligns with client criteria:
- Industry match: ${qaParams.client_criteria.industry ? 'Required: ' + qaParams.client_criteria.industry.join(', ') : 'Any'}
- Size match: ${qaParams.client_criteria.company_size ? 'Required: ' + qaParams.client_criteria.company_size.join(', ') : 'Any'}
- Revenue match: ${qaParams.client_criteria.revenue_range ? 'Required: ' + qaParams.client_criteria.revenue_range.join(', ') : 'Any'}

Return JSON in this exact format:
{
  "score": <0-100>,
  "qualification_status": "qualified" | "not_qualified" | "needs_review",
  "analysis": {
    "content_interest": { "score": <0-100>, "evidence": "<quote or explanation>" },
    "permission_given": { "score": <0-100>, "evidence": "<quote or explanation>" },
    "email_confirmation": { "score": <0-100>, "evidence": "<quote or explanation>" },
    "compliance_consent": { "score": <0-100>, "evidence": "<quote or explanation>" },
    "qualification_answers": { "score": <0-100>, "evidence": "<quote or explanation>" },
    "data_accuracy": { "score": <0-100>, "evidence": "<explanation>" },
    "email_deliverable": { "score": <0-100>, "evidence": "<verification status>" },
    "phone_valid": { "score": <0-100>, "evidence": "<validation result>" }
  },
  "missing_info": ["<list any missing critical info>"],
  "recommendations": ["<action items for QA team>"],
  "account_verification": {
    "industry_match": <true/false>,
    "size_match": <true/false>,
    "revenue_match": <true/false>,
    "technology_match": <true/false>,
    "confidence": <0-100>
  }
}

Calculate final score as weighted average. If score >= ${qaParams.min_score}, status is "qualified". If score < 40, status is "not_qualified". Otherwise "needs_review".`;
}

/**
 * Default QA parameters (used if campaign doesn't have custom params)
 */
function getDefaultQAParameters(): QAParameters {
  return {
    required_info: ['permission', 'email_confirmation'],
    scoring_weights: {
      content_interest: 20,
      permission_given: 25,
      email_confirmation: 15,
      compliance_consent: 10,
      qualification_answers: 10,
      data_accuracy: 10,
      email_deliverable: 5,
      phone_valid: 5,
    },
    min_score: 70,
    client_criteria: {},
  };
}

/**
 * Background job to analyze leads with transcripts but no AI analysis
 */
export async function processUnanalyzedLeads(): Promise<void> {
  try {
    // Find leads with transcripts but no AI analysis
    const unanalyzedLeads = await db.select()
      .from(leads)
      .where(eq(leads.transcriptionStatus, 'completed'))
      .limit(10);

    for (const lead of unanalyzedLeads) {
      if (!lead.aiScore && lead.transcript) {
        await analyzeLeadQualification(lead.id);
      }
    }
  } catch (error) {
    console.error('[AI-QA] Error processing unanalyzed leads:', error);
  }
}
