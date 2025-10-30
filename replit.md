# Pivotal B2B CRM

## Overview
Pivotal CRM is an enterprise B2B customer relationship management platform focused on optimizing sales and marketing. It features Account-Based Marketing (ABM), multi-channel campaign management (Email & Telemarketing), advanced lead qualification, and a client portal. The platform prioritizes efficient customer engagement, robust compliance (DNC/Unsubscribe), comprehensive lead QA workflows, and a "bridge model" linking campaigns to orders. Its vision is to be a comprehensive, intelligent platform driving sales growth and operational efficiency for B2B enterprises through advanced ABM and integrated campaign management.

## User Preferences
- Clean, minimal enterprise design
- Professional blue color scheme (trust, reliability)
- Dense information display with clear hierarchy
- Fast, keyboard-friendly workflows
- Comprehensive but not overwhelming

## System Architecture
The system uses a modern web stack: **React 18 + Vite, TypeScript, TailwindCSS, and shadcn/ui** for the frontend, and **Node.js + Express + TypeScript** with **PostgreSQL (Neon) via Drizzle ORM** for the backend. JWT authentication provides role-based access control.

**UI/UX Design:**
- **Color Scheme:** Primary Royal Blue with Teal accent, adaptive light/dark surfaces, and semantic status colors.
- **Typography:** Inter font for text, JetBrains Mono for data.
- **Components:** shadcn/ui for consistent enterprise components, including role-based sidebar navigation, global search, data tables, and step wizards.
- **Advanced Filtering:** `AdvancedFilterBar` component with multi-operator support and filter chips.
- **View Toggle System:** Dual-view architecture for Accounts (Cards/Table) with seamless state preservation.
- **Navigation Pattern:** Enterprise-standard layout with core business features in left sidebar, and administrative settings in top-right dropdown menu.
- **Responsive Design:** Mobile-first responsive design across the entire application using consistent Tailwind breakpoints.

**Technical Implementations & Features:**
- **AI-Powered Quality Assurance:** Integrates AssemblyAI for call transcription and Replit AI for lead qualification, account enrichment, and multi-factor scoring.
- **Data Management:** Unified CSV Import/Export System with intelligent deduplication/upsert, dynamic custom fields, smart company name normalization, and RBAC-enforced filter visibility. Includes a centralized field label system (`shared/field-labels.ts`) for all UI, CSV, filter, and form fields.
- **Compliance & Suppression:** Multi-tier suppression system (campaign-level and global) for emails (unsubscribe) and phones (Do Not Call) with RESTful API support and dynamic account cap enforcement. Auto-suppression on Qualified/Lead disposition.
- **Campaign Management:** Supports Email campaigns (HTML editor, personalization, tracking) and Telemarketing campaigns with dual dialer strategy (Manual/Power Dial), active call script assignment, Telnyx call recording integration, and intelligent retry scheduling with preserved delays for voicemail/callback dispositions.
- **Agent Console Enhancements:** Professional call script UI with semantic theming, improved readability, and "Related Contacts" feature that displays other contacts from the same company in the agent's queue for efficient multi-contact engagement.
- **Lead QA Workflow:** Multi-stage workflow (New → Under Review → Approved/Rejected → Published) with checklist validation and agent insights.
- **Client Portal (Bridge Model):** Allows clients to specify campaign order requirements via configurable webhooks.
- **Data Verification (DV) Module:** Project-based workflow for data cleaning and verification with CSV upload, smart field mapping, background processing, and deduplication.
- **API-Free Email Validation (10-Status System):** Zero-cost email validation system with comprehensive quality assessment, two-stage eligibility flow, and DNS-only validation by default to avoid corporate anti-spam issues.
- **Smart Export with Template Mapper & Flexible Quality Control:** Client-customizable CSV export system with intelligent data quality assessment, prioritizing contacts with complete postal addresses and phone/tel fields. Includes quality scoring, template management, and submission tracking.
- **Best Phone & Best Address Selection with Strict Country Matching:** Intelligent data selection that prevents cross-country data assignments, prioritizing CAV custom fields, contact data, AI enriched data, and company HQ data with strict country matching rules. Includes CAV Address & Phone Merger for account-level data consolidation.
- **Lead Cap Enforcement with Data Quality Priority Scoring:** Intelligent per-account lead cap system with multi-factor priority scoring based on email validation, phone completeness, address completeness, seniority, and title alignment. Uses BullMQ for background processing.
- **Submission Tracking & 2-Year Auto-Exclusion:** Production-grade submission workflow tracking exported contacts with automatic 2-year exclusion enforcement and reactivation.
- **Continuous AI Enrichment Workflow:** Background system that continuously identifies and queues eligible and validated contacts missing both best phone and best address for AI enrichment.
- **Security & User Management:** JWT token generation, bcrypt password hashing, and multi-role user management with RBAC.
- **Call Reporting System:** Comprehensive analytics and reporting for telemarketing campaigns.
- **Queue Management with Retry Preservation:** Advanced agent queue system with intelligent contact scheduling. When agents set dispositions like voicemail or callback-requested, contacts are scheduled for retry after a 3-day delay. Queue refresh operations preserve these scheduled retry dates, preventing contacts from reappearing prematurely.
- **Email Infrastructure Settings:** Enterprise-grade email deliverability management including domain authentication, tracking domains, and sender profiles.
- **S3-First File Architecture:** Production-grade file handling with direct-to-S3 uploads, streaming CSV processing, and presigned URLs.
- **BullMQ Job Queue System:** Asynchronous job processing with Redis-backed queues for CSV import, with worker architecture, retry logic, and job monitoring.

## External Dependencies
- **Database:** Neon (PostgreSQL)
- **Object Storage:** AWS S3 / Cloudflare R2 / Wasabi / MinIO (S3-compatible)
- **Cache & Queue:** Redis (Upstash)
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
- **Domain Parsing:** tldts
- **Web Search API (Fallback):** Google Programmable Search Engine (Custom Search JSON API)