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
- **Responsive Design:** Mobile-first responsive design across the entire application using consistent Tailwind breakpoints, ensuring optimal display and touch-friendly interaction on all devices.

**Technical Implementations & Features:**
- **Data Model:** Core entities include Users (RBAC), Accounts (AI enrichment), Contacts (validation/deduplication), Dynamic Segments, Static Lists, Domain Sets, Campaigns (Email & Telemarketing), Leads (multi-stage QA workflow), Suppressions, and Campaign Orders.
- **AI-Powered Quality Assurance:** Integrates AssemblyAI for call transcription and Replit AI (OpenAI-compatible) for lead qualification scoring, account enrichment, and multi-factor scoring. Includes AI-powered local office enrichment.
- **Data Management:** Unified CSV Import/Export System with intelligent deduplication/upsert logic, dynamic custom fields, smart company name normalization, and RBAC-enforced filter visibility.
- **Compliance & Suppression:** Multi-tier suppression system (campaign-level and global) for emails (unsubscribe) and phones (Do Not Call) with RESTful API support for bulk operations. Includes a strict 4-rule suppression system to prevent over-suppression.
- **Campaign Management:** Supports Email campaigns (HTML editor, personalization, tracking) and Telemarketing campaigns with a dual dialer strategy (Manual/Power Dial), active call script assignment with comprehensive dynamic personalization, and Telnyx call recording integration.
- **Lead QA Workflow:** Multi-stage workflow (New → Under Review → Approved/Rejected → Published) with checklist validation and agent insights, accessible via a comprehensive lead detail page.
- **Client Portal (Bridge Model):** Allows clients to specify campaign order requirements via configurable webhooks.
- **Data Verification (DV) Module:** Project-based workflow for data cleaning and verification with CSV upload, smart field mapping, multi-stage background processing, durable idempotency, smart deduplication, and suppression management. Features configurable campaigns with campaign-specific eligibility rules, enhanced company matching with Public Suffix List, and manual EmailListVerify validation.
- **Bulk Email Validation:** Job-based validation system with smart caching to minimize API costs and real-time progress tracking. Supports both automated API validation (EmailListVerify) and external validation workflows.
- **External Email Validation Workflow:** Complete workflow for validating emails externally: 1) Export eligible contacts (respects per-account caps), 2) Validate with any service (ZeroBounce, NeverBounce, etc.), 3) Upload results via CSV, 4) Lock validated contacts in submission buffer, 5) Export for client delivery, 6) Clear buffer. Includes submission tracking in `verification_lead_submissions` table.
- **Lead Cap Enforcement:** Configurable per-account lead limits enforced at multiple stages: export, validation queue, and submission/delivery using window functions and persistent tracking.
- **Security & User Management:** JWT token generation, bcrypt password hashing, and multi-role user management system with RBAC.
- **Call Reporting System:** Comprehensive analytics and reporting for telemarketing campaigns, including global dashboards, campaign analytics, agent performance, and detailed call lists, all with RBAC enforcement.
- **Content Studio & Integrations:** Unified asset library, AI content generator, multi-platform social media publishing, and secure inter-Repl communication with an external Resources Centre.
- **Email Infrastructure Settings:** Enterprise-grade email deliverability management including domain authentication, tracking domains, IP pools, warmup plans, and sender profiles.

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
- **Web Search API (Fallback):** Brave Search API (for AI enrichment)