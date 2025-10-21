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
- **Design System:** Comprehensive design system with accessible, high-performance pattern components incorporating design tokens.
- **Advanced Filtering:** `AdvancedFilterBar` component with multi-operator support and filter chips.
- **View Toggle System:** Dual-view architecture for Accounts (Cards/Table) with seamless state preservation.
- **Navigation Pattern:** Enterprise-standard layout with core business features (CRM, Campaigns, Analytics, Content, DV Projects) in left sidebar, and administrative settings (Infrastructure, Organization) in top-right Settings dropdown menu (admin-only).

**Technical Implementations & Features:**
- **Data Model:** Core entities include Users (RBAC), Accounts (AI enrichment), Contacts (validation/deduplication), Dynamic Segments, Static Lists, Domain Sets, Campaigns (Email & Telemarketing), Leads (multi-stage QA workflow), Suppressions, and Campaign Orders.
- **AI-Powered Quality Assurance:** Integrates AssemblyAI for call transcription and Replit AI (OpenAI-compatible) for lead qualification scoring, account enrichment, and multi-factor scoring.
- **Data Management:** Unified CSV Import/Export System with intelligent deduplication/upsert logic, platform-wide dynamic filters, and RBAC-enforced filter visibility. Domain Sets support enhanced CSV format with company names (domain,account_name,notes) enabling hybrid matching by both domain and company name for improved account identification. **Smart Company Name Normalization:** Handles company name variations, legal suffixes (Ltd, Inc, LLC, Corp, plc, etc.), punctuation, and common abbreviations (Airways→Air, International→Intl) for accurate account matching and deduplication across all data imports.
- **Compliance & Suppression:** Multi-tier suppression system with campaign-level and global enforcement for emails (unsubscribe) and phones (Do Not Call), preventing suppressed contacts from being queued. RESTful APIs support bulk operations.
- **Campaign Management:**
    - **Email:** HTML editor, personalization, tracking, pre-send guards, mandatory unsubscribe.
    - **Telemarketing - Dual Dialer Strategy:** Supports Manual Dial Mode (agent-driven queue with collision prevention) and Power Dial Mode (automated dialing with AMD, pacing engine, and human-only agent routing).
    - **Active Call Script Assignment:** Campaigns can be assigned versioned call scripts from the callScripts library via scriptId field, with backward compatibility fallback to campaign.callScript.
    - **Comprehensive Dynamic Call Script Personalization:** Agent Console features extensive placeholder replacement system supporting ALL Contact fields (fullName, firstName, lastName, email, directPhone, mobilePhone, jobTitle, department, seniorityLevel, city, state, county, postalCode, country, linkedinUrl, formerPosition, timeInCurrentPosition, timeInCurrentCompany) and ALL Account fields (name, domain, industry, staffCount, revenue, mainPhone, hqCity, hqState, hqPostalCode, hqCountry, hqStreet1, yearFounded, techStack, linkedinUrl) throughout the entire script. Supports both modern {{variable}} and legacy [Variable] placeholder formats.
    - **Call Recording Integration:** Full Telnyx recording integration with automated capture, webhook processing, secure playback, and RBAC enforcement.
- **Lead QA Workflow:** Multi-stage workflow (New → Under Review → Approved/Rejected → Published) with checklist validation and agent insights.
- **Comprehensive Lead Detail Page:** Full-featured detail view displaying contact, account, campaign info, playable call recording, AI qualification analysis, call transcript, and QA approval workflow. RBAC enforces approve/reject actions.
- **Campaign Activity Log:** Real-time activity tracking system that logs campaign interactions.
- **Client Portal (Bridge Model):** Allows clients to specify campaign order requirements via configurable webhooks.
- **Data Verification (DV) Module:** Project-based workflow for data cleaning and verification with CSV upload, smart field mapping, multi-stage background processing, durable idempotency, smart deduplication, and suppression management. Includes an enhanced agent console for verification and dispositioning.
- **Verification System (Campaign-Based):** Configurable B2B CRM data verification and enrichment system with campaign-level eligibility rules, manual EmailListVerify validation, and strict quality controls. Features include:
    - **Configurable Campaigns:** Campaign-specific eligibility rules (geography allowlist, job title keywords, senior decision-maker fallback) stored as JSON config, allowing dynamic customization without code changes.
    - **Enhanced Company Matching with Public Suffix List:** Advanced 3-step intelligent company matching during CSV upload using Mozilla Public Suffix List (tldts library):
      - **Step 1 - Exact Root Domain Match:** Extracts root domain using PSL (e.g., "portal.microsoft.com" → "microsoft.com", "department.gov.uk" → "department.gov.uk"). Correctly handles multi-level TLDs (gov.uk, ac.uk, k12.ca.us) to prevent collapsing distinct organizations.
      - **Step 2 - Fuzzy Name+Domain Match:** Uses confidence-based matching (≥0.75 threshold) with legal suffix normalization, typo handling, and abbreviation support.
      - **Step 3 - Create New Account:** Stores canonical root domain to ensure future subdomain variations match correctly.
      - Prevents duplicate accounts from subdomain variations (www., mail., portal., etc.) while keeping distinct organizations separate (different .gov.uk entities remain distinct).
    - **Multi-Field Suppression:** 4-field suppression matching (email, CAV ID, CAV user ID, name+company hash) with smart company normalization in hash generation, ensuring suppression gates work across company name variations.
    - **Manual Email Validation:** EmailListVerify (ELV) integration with 60-day result caching, precondition enforcement (Eligible + Validated + Not Suppressed), and manual trigger from agent console.
    - **Bulk Email Validation with Progress Persistence:** Job-based validation system supporting long-running batch operations with database-persisted progress tracking. Features immediate HTTP response with jobId, background processing in 500-contact batches, real-time frontend polling (2-second intervals), progress updates after each batch (survives server restarts), automatic resume capability (skips already-validated contacts), comprehensive status tracking (pending/processing/completed/failed), and detailed result reporting (OK/Invalid/Risky/Disposable/Accept-All counts). Frontend displays live progress with batch X/Y, contact counts, and completion percentage.
    - **AI-Powered LOCAL Office Enrichment (Hybrid System):** Intelligent two-stage company data enrichment that finds regional/local office information based on contact's location, not global HQ. **Stage 1 (AI Internal Knowledge):** Uses Replit AI (GPT-4o) training data to find local office information. **Stage 2 (Web Search Fallback):** If Stage 1 fails or returns low confidence (<0.7), automatically falls back to Brave Search API to search the web for current company information (requires BRAVE_SEARCH_API_KEY environment variable). Search strategy: "Company Name" + "Contact Country" + "office" + "address" + "phone" to find local branches/subsidiaries. Features: separate confidence scoring for address (≥0.7) and phone (≥0.7) with independent gating, intelligent result merging (uses best source per field), complete address detection (requires all core fields), partial success preservation during errors, and country-specific formatting for 30+ countries including Singapore, Vietnam, UK, USA, etc.
    - **Lead Cap Enforcement:** Configurable per-account lead limits (default 10) with automatic cap tracking and submission blocking when limits reached.
    - **Quality Metrics:** Real-time monitoring of OK email rate (95% target) and deliverability (97% target) with progress visualization.
    - **Agent Console:** Multi-tab interface (Verify, Company, History, QA) with contact details, email validation, AI enrichment trigger, account cap meters, and quality assurance workflows. Displays correctly associated companies based on smart matching from upload.
    - **Campaign Stats Dashboard:** Real-time statistics showing eligible count, validated count, submission count, OK rate, and deliverability with progress bars against targets.
- **Security & User Management:** JWT token generation, bcrypt password hashing, and multi-role user management system with RBAC.
- **Call Reporting System:** Comprehensive analytics and reporting for telemarketing campaigns with specialized endpoints for global dashboards, campaign analytics, agent performance, and detailed call lists, all with RBAC enforcement.
- **Content Studio & Integrations:** Unified asset library, AI content generator, multi-platform social media publishing, and secure inter-Repl communication with an external Resources Centre.
- **Email Infrastructure Settings:** Enterprise-grade email deliverability management including domain authentication, tracking domains, IP pools, warmup plans, and sender profiles.
- **Responsive Design:** Mobile-first responsive design across the entire application using consistent Tailwind breakpoints, ensuring optimal display and touch-friendly interaction on all devices.

## External Dependencies
- **Database:** Neon (PostgreSQL)
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