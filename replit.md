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
- **Design System:** Comprehensive design system upgrade with joyful, accessible, high-performance pattern components (PageShell, CommandPalette, EmptyState/NoResults, Stepper, KpiCard, TrendChart, Leaderboard, ActivityTimeline, DataTable) incorporating design tokens for color, typography, motion, spacing, and elevation.
- **Advanced Filtering:** `AdvancedFilterBar` component with multi-operator support and filter chips.
- **View Toggle System:** Dual-view architecture for Accounts (Cards/Table) with seamless state preservation.

**Technical Implementations & Features:**
- **Data Model:** Core entities include Users (RBAC), Accounts (AI enrichment), Contacts (validation/deduplication), Dynamic Segments, Static Lists, Domain Sets, Campaigns (Email & Telemarketing), Leads (multi-stage QA workflow), Suppressions, and Campaign Orders.
- **AI-Powered Quality Assurance:** Integrates AssemblyAI for call transcription and Replit AI (OpenAI-compatible) for lead qualification scoring, account enrichment, and multi-factor scoring.
- **Data Management:** Unified CSV Import/Export System with smart field mapping and optimized bulk database operations (inserts, updates, suppressions). Advanced filtering system with 54 filter fields across 9 categories.
- **Compliance:** Real-time enforcement of global DNC and email unsubscribe lists; consent tracking.
- **Campaign Management:**
    - **Email:** HTML editor, personalization, tracking, pre-send guards, mandatory unsubscribe.
    - **Telemarketing - Dual Dialer Strategy (PRODUCTION READY):**
        - **Manual Dial Mode:** Agent-driven queue with pull/lock workflow, campaign-level collision prevention (partial unique index on campaign_id+contact_id), dual suppression checking (email & phone E164 fields), filter-based audience selection, and retry rules. Powered by ManualQueueService with atomic ON CONFLICT handling. Uses `agent_queue` table for manual pull-based contact assignment.
        - **Power Dial Mode:** Automated dialing with AMD decision pipeline (configurable confidence threshold 0.00-1.00, default 0.70), progressive/predictive/preview modes, business hours enforcement, PID-like pacing engine with abandon-rate feedback (3% target), human-only agent routing. Powered by PowerDialerEngine with dynamic dial ratio adjustment. Uses `campaign_queue` table for auto-assigned contact distribution.
        - **AMD & Voicemail:** Advanced Machine Detection with confidence scoring (0.00-1.00, preserves zero values), VoicemailPolicyExecutor for TTS/audio message delivery, campaign/contact-level VM caps, cooldown enforcement, callback scheduling via disposition system, and restricted region blocking.
        - **Campaign Builder Integration:** Step 2B dial mode configuration panel with AMD settings (confidence threshold slider, timeout, unknown action), voicemail policy editor (TTS message composition with personalization tokens, VM caps, regional restrictions).
        - **Power Dialer Control UI:** 3-tab configuration dialog (Auto-Dialer Settings, AMD & Voicemail, Business Hours) with real-time settings sync. AMD tab includes confidence threshold control, voicemail message editor, and campaign/contact VM cap management. Tab disabled for manual dial campaigns with explanatory messaging.
        - **Agent Console Mode Awareness:** Real-time mode detection badges (Power Dial/Manual Dial), AMD enablement indicator, mode-specific UI controls. Dial-mode aware queue routing ensures manual campaigns query `agent_queue` and power campaigns query `campaign_queue` with proper agent filtering. Dual-query cache invalidation ensures instant UI updates when AMD/voicemail settings change (invalidates both `/api/campaigns` collection and `/api/campaigns/:id` detail queries).
        - **API Endpoints:** POST /campaigns/:id/dial-mode, POST /campaigns/:id/agents (agent assignment with auto-population), POST /campaigns/:id/manual/queue/add (filters or IDs), POST /campaigns/:id/manual/queue/pull, GET /api/agents/me/queue (dial-mode aware), PATCH /campaigns/:id (powerSettings update), POST /telephony/events/amd (webhook), GET /campaigns/:id/pacing-metrics.
        - **Database Schema:** Campaigns table includes `dial_mode` enum (manual|power) and `power_settings` jsonb field storing AMD and voicemail configuration. Dual-queue architecture: `agent_queue` for manual dial, `campaign_queue` for power dial.
        - **Infrastructure:** Telnyx WebRTC browser-based calling, real-time SIP trunk management, call scripts, DNC handling, Agent Console with disposition workflow and live audio. Power Dialer accessible via sidebar navigation for admin and campaign managers.
    - **Advanced Features:** Audience snapshotting, compliance guardrails, pacing/throttling, frequency caps, multi-provider email support, A/B/n testing, pre-flight checklists, and reporting.
- **Lead QA Workflow:** Multi-stage workflow (New → Under Review → Approved/Rejected → Published) with checklist validation. Includes agent insights showing which agent qualified each lead, with comprehensive lead detail view displaying agent information, call recording, transcript, AI analysis, QA checklist, and approve/reject actions.
- **Campaign Activity Log:** Real-time activity tracking system that continuously logs campaign interactions on contacts and accounts. Auto-dialer integration captures call_started and call_ended events with full campaign context (campaign name, agent, disposition, duration). ActivityTimeline component displays activity streams on Contact and Account detail pages with auto-refresh (30s intervals) for live updates. Secure authenticated API endpoints with comprehensive validation ensure data integrity.
- **Client Portal (Bridge Model):** Allows clients to specify campaign order requirements and includes one-click client submission via configurable webhooks.
- **Security & User Management:** JWT token generation, bcrypt password hashing, and multi-role user management system with RBAC.
- **Content Studio & Integrations:** Unified asset library, AI content generator, multi-platform social media publishing, and secure inter-Repl communication with an external Resources Centre for content distribution and reference data sync.
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