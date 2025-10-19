# Pivotal B2B CRM

## Overview
Pivotal CRM is an enterprise-grade B2B customer relationship management platform designed to streamline B2B sales and marketing operations. It specializes in Account-Based Marketing (ABM), multi-channel campaign management (Email & Telemarketing), lead qualification, and includes a client portal. The platform emphasizes efficient customer engagement, robust compliance (DNC/Unsubscribe), comprehensive lead QA workflows, and features a "bridge model" for linking campaigns to orders. Its business vision is to provide a comprehensive, intelligent platform that drives sales growth and operational efficiency for B2B enterprises, capturing market share through advanced ABM and integrated campaign management.

## Recent Changes (October 2025)
- **Comprehensive Responsive Design**: Implemented mobile-first responsive design across entire application:
  - **Agent Console**: Converted fixed-width panels (18%/70%/30%) to responsive flex layout - panels stack vertically on mobile/tablet, display side-by-side on desktop (lg: 1024px+)
  - **Dashboard**: Hero section and stat cards optimized with responsive text sizes, padding, and grid layouts (1 column mobile → 2 columns tablet → 4 columns desktop)
  - **TopBar**: Condensed layout for mobile with responsive padding, gap adjustments, and hidden non-critical controls on small screens
  - **App Layout**: Responsive padding system (p-3 sm:p-4 md:p-6) for optimal spacing across all viewport sizes
  - **Breakpoint Strategy**: Consistent use of Tailwind breakpoints - sm: 640px, md: 768px, lg: 1024px
  - **Touch-Friendly**: All interactive elements properly sized for mobile touch interaction
  - **Contact Info**: Responsive grids that stack on mobile for better readability
- **Automatic DNC Handling**: When agents select "Do Not Call" disposition, both directPhoneE164 and mobilePhoneE164 are automatically added to global phone suppression list with reason tracking. Graceful duplicate-key handling ensures call logging never fails.
- **Queue Limit Increase**: Maximum manual queue limit increased from 100 to 1000 contacts, allowing agents to bulk-load larger batches for efficient calling sessions.
- **Disposition UI Clarity**: Changed disposition label from "DNC" to "Do Not Call" in Agent Console for better clarity and professionalism.
- **Campaign-Level Suppression System**: Implemented intelligent suppression list management for telemarketing campaigns with both account-level and contact-level suppression. Features include:
  - Database tables: `campaign_suppression_accounts` and `campaign_suppression_contacts` with composite unique constraints
  - RESTful API endpoints for adding/removing/listing suppressions with bulk operations support
  - Automatic enforcement in both Manual and Power Dial queue builders
  - Multi-tier suppression hierarchy: campaign-level contact > campaign-level account > global email DNC > global phone DNC
  - Suppressed contacts and accounts are automatically skipped during queue building with detailed logging
- **Agent-Specific Dashboard**: Implemented personalized dashboard views for agent role users showing individual performance metrics (calls today/month, qualified leads, average call duration, approved/pending leads, and active campaigns). Admin/manager users continue to see global statistics.
- **Filter Options Fix**: Fixed filter dropdown endpoints to query actual database tables instead of showing empty results or text boxes:
  - `/api/filters/options/lists` - Now queries `lists` table to show actual Static Lists
  - `/api/filters/options/segments` - Now queries `segments` table to show actual Dynamic Segments (was returning empty array)
  - `/api/filters/options/domain-sets` - New endpoint that queries `domainSets` table to show Domain Sets/TAL
- **Null-Safety Improvements**: Enhanced agent dashboard with crash-resistant error handling using nullish coalescing operators and toast-based error notifications for API failures.

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
- **Design System:** Comprehensive design system upgrade with accessible, high-performance pattern components incorporating design tokens.
- **Advanced Filtering:** `AdvancedFilterBar` component with multi-operator support and filter chips.
- **View Toggle System:** Dual-view architecture for Accounts (Cards/Table) with seamless state preservation.
- **Navigation Pattern:** Enterprise-standard layout with core business features (CRM, Campaigns, Analytics, Content, DV Projects) in left sidebar, and administrative settings (Infrastructure, Organization) in top-right Settings dropdown menu (admin-only).

**Technical Implementations & Features:**
- **Data Model:** Core entities include Users (RBAC), Accounts (AI enrichment), Contacts (validation/deduplication), Dynamic Segments, Static Lists, Domain Sets, Campaigns (Email & Telemarketing), Leads (multi-stage QA workflow), Suppressions, and Campaign Orders.
- **AI-Powered Quality Assurance:** Integrates AssemblyAI for call transcription and Replit AI (OpenAI-compatible) for lead qualification scoring, account enrichment, and multi-factor scoring.
- **Data Management:** Unified CSV Import/Export System, platform-wide dynamic filters with collapsible category accordions, multi-select dropdowns, async type-ahead search, and date range pickers. Filter options pull from actual database values, and RBAC enforces filter visibility.
- **Compliance & Suppression:** Multi-tier suppression system with campaign-level and global enforcement:
  - **Global Suppressions**: Platform-wide DNC lists for emails (unsubscribe) and phones (Do Not Call)
  - **Campaign Suppressions**: Campaign-specific suppression lists for accounts (entire company) and contacts (individuals)
  - **Enforcement**: Automatic checks in Manual Queue and Power Dial modes prevent suppressed contacts from being queued
  - **API Management**: RESTful endpoints for adding/removing suppressions with bulk operations and reason tracking
- **Campaign Management:**
    - **Email:** HTML editor, personalization, tracking, pre-send guards, mandatory unsubscribe.
    - **Telemarketing - Dual Dialer Strategy:** Supports Manual Dial Mode (agent-driven queue with collision prevention) and Power Dial Mode (automated dialing with AMD, pacing engine, and human-only agent routing). Includes AMD with confidence scoring, Voicemail Policy Executor, and campaign builder integration for dial mode configuration.
    - **Dynamic Call Script Personalization:** Agent Console features comprehensive placeholder replacement system supporting {{contact.*}}, {{account.*}}, {{agent.*}}, and {{campaign.*}} variables, as well as legacy [Bracket] format for backwards compatibility. Scripts automatically populate with contact details (name, email, job title), account information (name, industry, revenue), and agent information from active queue contact.
    - **Call Recording Integration:** Full Telnyx recording integration with automated capture, webhook processing, and secure playback. WebRTC client enables recording on all calls (record-from-answer). Webhook handler processes call.recording.saved events asynchronously, fetches signed URLs from Telnyx API, and updates call_attempts and leads tables. Recording access endpoint generates time-limited signed URLs (1-hour expiry) with RBAC enforcement and audit logging. Call control IDs captured during calls link to Telnyx recordings for playback/download in Lead QA workflow.
- **Lead QA Workflow:** Multi-stage workflow (New → Under Review → Approved/Rejected → Published) with checklist validation and agent insights.
- **Comprehensive Lead Detail Page:** Full-featured detail view displaying contact information, account details, assigned agent, campaign context, playable call recording with progress tracking and download, AI qualification analysis, call transcript, and QA approval workflow. Includes RBAC-enforced approve/reject actions for admin and qa_analyst roles.
- **Campaign Activity Log:** Real-time activity tracking system that logs campaign interactions on contacts and accounts, displayed via ActivityTimeline components.
- **Client Portal (Bridge Model):** Allows clients to specify campaign order requirements and submit via configurable webhooks.
- **Data Verification (DV) Module:** Project-based workflow for data cleaning and verification with CSV upload, smart field mapping, multi-stage background processing, durable idempotency, smart deduplication, and suppression management. Includes an enhanced agent console for verification and dispositioning.
- **Security & User Management:** JWT token generation, bcrypt password hashing, and multi-role user management system with RBAC.
- **Call Reporting System:** Comprehensive analytics and reporting for telemarketing campaigns with specialized endpoints for global dashboards, campaign analytics, agent performance, and detailed call lists, all with RBAC enforcement.
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