# Pivotal B2B CRM

## Overview
Pivotal CRM is an enterprise-grade B2B customer relationship management platform designed to streamline B2B sales and marketing operations. It specializes in Account-Based Marketing (ABM), multi-channel campaign management (Email & Telemarketing), lead qualification, and includes a client portal. The platform emphasizes efficient customer engagement, robust compliance (DNC/Unsubscribe), comprehensive lead QA workflows, and features a "bridge model" for linking campaigns to orders. Its business vision is to provide a comprehensive, intelligent platform that drives sales growth and operational efficiency for B2B enterprises, capturing market share through advanced ABM and integrated campaign management.

## User Preferences
- Clean, minimal enterprise design
- Professional blue color scheme (trust, reliability)
- Dense information display with clear hierarchy
- Fast, keyboard-friendly workflows
- Comprehensive but not overwhelming

## System Architecture
The system employs a modern web stack: **React 18 + Vite, TypeScript, TailwindCSS, and shadcn/ui** for the frontend, and **Node.js + Express + TypeScript** with a **PostgreSQL (Neon) database via Drizzle ORM** for the backend. JWT authentication provides role-based access control.

**UI/UX Design:**
- **Color Scheme:** Primary Royal Blue with Teal accent, adaptive light/dark surfaces, and semantic status colors.
- **Typography:** Inter font for text, JetBrains Mono for data.
- **Components:** shadcn/ui for consistent enterprise components, including role-based sidebar navigation, global search, data tables, and step wizards.
- **Advanced Filtering:** `AdvancedFilterBar` component with multi-operator support and filter chips.
- **View Toggle System:** Dual-view architecture for Accounts (Cards/Table) with seamless state preservation.
- **Navigation Pattern:** Enterprise-standard layout with core business features in left sidebar, and administrative settings in top-right Settings dropdown menu (admin-only).
- **Responsive Design:** Mobile-first responsive design across the entire application using consistent Tailwind breakpoints.

**Technical Implementations & Features:**
- **AI-Powered Quality Assurance:** Integrates AssemblyAI for call transcription and Replit AI (OpenAI-compatible) for lead qualification scoring, account enrichment, and multi-factor scoring. Includes AI-powered local office enrichment.
- **Data Management:** Unified CSV Import/Export System with intelligent deduplication/upsert logic, dynamic custom fields, smart company name normalization, and RBAC-enforced filter visibility.
- **Compliance & Suppression:** Multi-tier suppression system (campaign-level and global) for emails (unsubscribe) and phones (Do Not Call) with RESTful API support and a strict 4-rule suppression system.
- **Campaign Management:** Supports Email campaigns (HTML editor, personalization, tracking) and Telemarketing campaigns with a dual dialer strategy (Manual/Power Dial), active call script assignment, and Telnyx call recording integration.
- **Lead QA Workflow:** Multi-stage workflow (New → Under Review → Approved/Rejected → Published) with checklist validation and agent insights.
- **Client Portal (Bridge Model):** Allows clients to specify campaign order requirements via configurable webhooks.
- **Data Verification (DV) Module:** Project-based workflow for data cleaning and verification with CSV upload, smart field mapping, multi-stage background processing, durable idempotency, smart deduplication, and suppression management.
- **API-Free Email Validation (10-Status System):** Zero-cost email validation system with comprehensive quality assessment, two-stage eligibility flow, comprehensive validation engine (syntax, DNS/MX, risk assessment, domain-level caching). **DNS-only validation by default** to avoid false positives from corporate anti-spam measures. SMTP probing optional via `SKIP_SMTP_VALIDATION=false` env var (not recommended for B2B). SMTP rejection codes (550/551/552/553) downgraded to "unknown" status instead of "disabled" to prevent false positives from enterprise mail servers (Emirates, British Airways, etc.) that block anonymous SMTP verification attempts.
- **External Email Validation Workflow:** Complete workflow for validating emails externally via export, validation, upload results, and submission.
- **Smart Export with Template Mapper & Flexible Quality Control:** Client-customizable CSV export system with intelligent data quality assessment. Exports contacts with **less than 4 blank fields** in their best postal address (line1, city, state, postal, country) and phone/tel fields combined. Smart data selection prioritizes CAV custom fields > Contact data > AI enriched > Company HQ. Includes quality scoring (0-100%), template management, field mapping, custom column headers, column ordering, comprehensive quality metrics logging (Perfect/Good/Acceptable breakdown), and optional submission tracking with `markAsSubmitted` parameter. Flexible criteria increases export quantity by 30-50% while maintaining client-ready data quality.
- **CAV Address & Phone Merger:** Account-level data consolidation system that merges CAV custom field addresses and phone numbers from verification contacts. Conditionally updates account HQ fields when missing or when there's a country mismatch with contact data. Prioritizes CAV custom fields (custom_cav_addr1/2/3, custom_cav_town, custom_cav_state, custom_cav_postcode, custom_cav_tel) over other data sources, with intelligent country matching and frequency-based phone selection.
- **Lead Cap Enforcement with Data Quality Priority Scoring:** Intelligent per-account lead cap system (default 10 contacts/account) with comprehensive multi-factor priority scoring. Prioritizes contacts with best data quality: (1) Email validation status (safe_to_send/valid > others), (2) Phone completeness (CAV > mobile > contact > AI > HQ), (3) Address completeness (complete > partial > minimal), (4) Seniority level (executive > vp > director > manager > ic), (5) Title alignment with campaign targets. Configurable weights (default: 30% email quality, 20% phone, 20% address, 20% seniority, 10% title). BullMQ-powered background job system with retry logic, progress tracking, and job status polling. Smart cap enforcement API selects top N contacts per account, marking excess as Ineligible_Cap_Reached while preserving their scores for potential future selection. Graceful fallback to direct execution when Redis unavailable.
- **Submission Tracking & 2-Year Auto-Exclusion:** Production-grade submission workflow tracks all exported contacts in `verificationLeadSubmissions` table. Auto-excludes recently submitted contacts (<2 years) with `Ineligible_Recently_Submitted` status. Automatically reactivates contacts to `Pending_Email_Validation` after 2 years for re-evaluation. Uses MAX(created_at) aggregation per contact to prevent reactivation of contacts with ANY recent submission. Campaign-scoped to prevent cross-campaign contamination.
- **Continuous AI Enrichment Workflow:** Intelligent background system identifies Eligible+Validated contacts missing phone or address data. Analyzes completeness using same strict validation as smart export. Auto-queues incomplete contacts by setting `phone_enrichment_status` and `address_enrichment_status` to 'pending'. Categorizes by deficiency type (phone only, address only, or both) for targeted enrichment. Returns detailed stats and categorized contact lists for downstream processing.
- **Security & User Management:** JWT token generation, bcrypt password hashing, and multi-role user management system with RBAC.
- **Call Reporting System:** Comprehensive analytics and reporting for telemarketing campaigns.
- **Content Studio & Integrations:** Unified asset library, AI content generator, multi-platform social media publishing, and secure inter-Repl communication with an external Resources Centre.
- **Email Infrastructure Settings:** Enterprise-grade email deliverability management including domain authentication, tracking domains, IP pools, warmup plans, and sender profiles.
- **S3-First File Architecture:** Production-grade file handling with direct-to-S3 uploads, streaming CSV processing, and presigned URLs.
- **BullMQ Job Queue System:** Production-ready asynchronous job processing with Redis-backed queues for CSV import, with worker architecture, retry logic, and job monitoring.

## External Dependencies
- **Database:** Neon (PostgreSQL)
- **Object Storage:** AWS S3 / Cloudflare R2 / Wasabi / MinIO (S3-compatible)
- **Cache & Queue:** Redis (Upstash recommended for production)
- **Frontend Framework:** React 18
- **UI Component Library:** shadcn/ui
- **Routing:** Wouter
- **Data Fetching:** TanStack Query
- **Form Management:** React Hook Form
- **Charting:** Recharts
- **Animations:** Framer Motion
- **Authentication:** JWT
- **Password Hashing:** bcrypt
- **Telephony Integration:** Telnyx WebRTC
- **AI Services:** AssemblyAI, Replit AI (OpenAI-compatible)
- **Email Service Providers:** SendGrid, AWS SES, Mailgun
- **Job Queue:** BullMQ (powered by Redis)
- **Domain Parsing:** tldts (Mozilla Public Suffix List)
- **Web Search API (Fallback):** Google Programmable Search Engine (Custom Search JSON API) - for AI enrichment fallback