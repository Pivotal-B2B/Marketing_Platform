# Pivotal Email Marketing Module (v1.3)

## Overview
- **Version:** 1.3
- **Status:** Final for Codex Submission
- **Audience:** Engineering, Data Science, QA, Product, RevOps
- **Scope:** Multi-client, project-driven B2B campaign management with integrated QA and lead project management, bot traffic exclusion, prefilled landing pages, and AI-powered account-based template generation.

## 1. Purpose
Deliver a data-driven, AI-assisted email marketing system that enables Pivotal to design, execute, and optimize Account-Based Marketing (ABM) campaigns by combining CRM data, campaign intelligence, human marketer guidance, and generative AI for account-personalized messaging.

## 2. AI-Powered Template Generation Overview
### Objective
Provide internal marketers with the ability to generate hyper-personalized email templates at scale using CRM and campaign data alongside AI generation models and human review.

### Core Principle
AI assists, humans approve. No email leaves the system without human verification and compliance QA.

### Template Output Schema
```json
{
  "account_id": "acc_123",
  "template_variants": [
    {
      "variant_id": "vA",
      "subject": "Helping {{Account.Name}} modernize B2B outreach",
      "body_html": "<p>Hi {{Contact.FirstName}}, ...</p>",
      "tone": "consultative",
      "cta": "Book a Strategy Call",
      "confidence": 0.92
    }
  ],
  "data_used": ["industry", "last_engagement", "lead_stage"]
}
```

## 3. Architecture Overview
1. CRM data, campaign context, and account insights feed the AI Template Engine.
2. The engine produces drafts which undergo human review and QA.
3. Approved templates move to campaign execution where tracking results feed back into the AI.

## 4. New Components
### 4.1 AI Template Engine
- Accepts account/segment context and creative brief.
- Retrieves CRM and campaign history.
- Generates custom subject lines, body content, and CTAs per account.
- Scores variants by predicted engagement and outputs structured JSON.
- Inputs include account data, contact data, campaign data, human inputs, and AI knowledge sources.

### 4.2 Human-in-the-Loop Workflow
- Marketer initiates the AI Template Wizard.
- Provides campaign goal, tone/style, and key value propositions.
- AI generates draft variants per account or persona cluster.
- Marketer reviews, edits, and approves; QA verifies compliance and tone.
- Approved templates stored in `email_templates` with metadata.

### 4.3 Template Storage Extensions
- `email_templates`: add `source`, `ai_model_version`, `data_features` (JSONB), `confidence_score`, `approved_by`, `approved_at`.
- `ai_generation_logs`: track generations with inputs, outputs, and metadata.
- `ai_feedback`: capture QA/user feedback with ratings and comments.

## 5. AI Personalization Features
- Account-level customization using dynamic fields and contextual sentences.
- Persona-based messaging tailored by contact role/seniority.
- Predictive content scoring delivering a `confidence_score`.
- Learning loop updating effectiveness models from campaign outcomes.

## 6. Data Integration
Integrates CRM accounts/contacts, leads and QA outcomes, human-only email events, project/client data, landing page data, and optional external firmographics.

## 7. Workflow Example
Describes end-to-end AI + human template creation from campaign selection through QA approval, linking templates to campaigns for sending.

## 8. User Interface Additions
### 8.1 AI Template Wizard (React)
- Located in Templates > New > Generate with AI.
- Provides selectors, audience filters, prompt controls, preview, and feedback pane.

### 8.2 QA & Review Panel
- Enables QA to rate templates, flag issues, and view data sources used.

## 9. Compliance & Human Override
- Human approval is mandatory; QA checks required.
- Compliance scanners and audit logs ensure CAN-SPAM/GDPR adherence.
- Clients see only approved content.

## 10. API Additions
Endpoints for generating templates, retrieving variants, approval, feedback, and listing model versions. Access restricted to internal marketers/QA with role `ai_template_manager` and full logging.

## 11. Storage & Performance
- AI payloads ≤ 50 KB per account.
- Asynchronous generation via queued workers.
- Redis + DB caching for variants.
- Nightly training jobs consume engagement feedback.

## 12. Analytics & Reporting Additions
- Dashboard tracking human engagement metrics, QA ratings, confidence vs actual, and top/underperforming variants.
- Learning summary including content effectiveness heatmap and tone correlations.

## 13. Data Security & Governance
- Tenant-scoped data usage with anonymization for external sharing.
- Secure model training environment.
- Sensitive inputs masked before reaching AI.
- Full audit trail of generations per client.

## 14. Acceptance Criteria (AI Extension)
Enumerates criteria ensuring AI-generated templates are personalized, reviewed, logged, distinguishable in reports, and governed by safety and learning requirements.

## 15. Deliverables (Additional)
Lists deliverables including microservice, OpenAPI endpoints, React UI, DB migrations, training pipeline, compliance QA module, dashboards, and comprehensive test plans.

## 16. Future Extensions
Outlines potential enhancements such as brand-specific tone tuning, real-time subject optimization, multilingual support, predictive send-time AI, and continuous learning.

## Final Remarks
This specification defines the complete AI-driven, project-integrated, client-visible B2B email marketing module, covering template generation, human QA, campaign linkage, bot filtering, landing pages, lead creation, client portal, and analytics.
