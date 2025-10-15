# Pivotal B2B CRM

## Overview
Pivotal CRM is an enterprise-grade B2B customer relationship management platform designed to streamline B2B sales and marketing operations. It specializes in Account-Based Marketing (ABM), multi-channel campaign management (Email & Telemarketing), lead qualification, and includes a client portal. The platform emphasizes efficient customer engagement, robust compliance (DNC/Unsubscribe), comprehensive lead QA workflows, and features a "bridge model" for linking campaigns to orders.

## Recent Changes (October 15, 2025)
- **Campaign Builder Bug Fixes:** Resolved critical issues preventing campaign creation:
  - Fixed campaign type enum: Changed from "telemarketing" to "call" to match database schema (campaigns.type enum: "email" | "call" | "combo")
  - Corrected audience data structure: Transformed flat audience selections into `audienceRefs` jsonb format containing segments, lists, domainSets, and filters
  - Fixed field mappings: `scheduleConfig` → `scheduleJson`, `assignedAgents` → `assignedTeams`, `dialingPace` → `throttlingConfig`
  - Added campaign name input field to wizard Step 5 Summary for both email and telemarketing flows
  - Fixed typos in audience selection toggle functions for domain sets and excluded lists
  - **Important:** Compliance checks (Step 4) are frontend validation only and not stored in database - campaigns table has no compliance field

## User Preferences
- Clean, minimal enterprise design
- Professional blue color scheme (trust, reliability)
- Dense information display with clear hierarchy
- Fast, keyboard-friendly workflows
- Comprehensive but not overwhelming

## System Architecture
The system employs a modern web stack: **React 18 + Vite, TypeScript, TailwindCSS, and shadcn/ui** for the frontend, and **Node.js + Express + TypeScript** with a **PostgreSQL (Neon) database via Drizzle ORM** for the backend. JWT authentication provides role-based access control.

**UI/UX Design:**
- **Color Scheme:** Primary Royal Blue (220 90% 56%) with Teal accent (174 62% 42%), adaptive light/dark surfaces, and semantic status colors (success, warning, info).
- **Typography:** Inter font for text, JetBrains Mono for data.
- **Components:** shadcn/ui ensures consistent enterprise components, including role-based sidebar navigation, global search, data tables, and step wizards.
- **Dark Mode:** Fully implemented with theme toggle and localStorage persistence.
- **Global UX/UI Upgrade:** Introduced reusable components like `HeaderActionBar`, `IconButton`, and `SectionCard` for consistent interaction patterns across Account and Contact Details pages, featuring sticky headers, one-click actions, and responsive layouts.
- **Premium Design System (October 2025):** Comprehensive visual enhancement featuring:
  - **Animations:** Fade-in (translateY), count-up numbers, pulse-glow, slide-in-bottom, and staggered delays for lists (framer-motion)
  - **Visual Effects:** Glass morphism, gradient borders, shadow-smooth utilities, icon hover glows, status indicator dots with glows
  - **Enhanced Components:** Premium login page with gradient background, animated stat cards with count-up effects, enhanced empty states with circular gradients
  - **Micro-interactions:** Card elevation on hover, icon scaling, smooth transitions with cubic-bezier easing
  - **Gradient Utilities:** bg-gradient-primary, bg-gradient-surface, bg-gradient-card for visual depth
  - **Advanced Filtering:** AdvancedFilterBar component with multi-operator support, filter chips, and sophisticated search controls
  - **View Toggle System:** Dual-view architecture for Accounts (Cards/Table) with seamless state preservation:
    - **Premium Card View:** AccountCardPremium with gradient avatars, responsive grid layout (1/2/3 columns), animated hover effects, and icon action buttons
    - **Full Keyboard Accessibility:** role="button", tabIndex, Enter/Space navigation, focus rings, and ARIA labels
    - **Bulk Selection Support:** Individual checkboxes per card, "Select All" header control, integrated with existing bulk actions toolbar
    - **Event Isolation:** Proper stopPropagation for checkbox interactions to prevent unintended navigation
  - **Icon Action Buttons:** IconActionButton component with tooltips for quick actions (website, LinkedIn, email, phone)

**Technical Implementations & Features:**
- **Data Model:** Core entities include Users (RBAC), Accounts (AI enrichment), Contacts (validation/deduplication), Dynamic Segments, Static Lists, Domain Sets, Campaigns (Email & Telemarketing), Leads (multi-stage QA workflow), Suppressions, and Campaign Orders.
- **Audience Management:** Advanced multi-criteria filtering, dynamic segments, static lists, and domain set uploaders.
- **Data Quality & Deduplication:** Deterministic upsert with field-level survivorship, normalization, source tracking, and soft deletes.
- **Unified CSV Import/Export System with Field Mapping:** RFC4180-compliant CSV parsing with unified Contact+Account import from a single CSV file. Features include:
  - **Smart Field Mapping**: Interactive UI for mapping CSV columns to Contact/Account fields with auto-detection based on column name similarity
  - **Large File Optimization**: Batch processing (50 records/batch) with real-time progress tracking and per-record error reporting
  - **Flexible Import**: Supports any CSV format via custom field mapping, account_* prefix for account fields
  - **Intelligent Matching**: Automatic account matching/creation by normalized domain (trim/lowercase)
  - **Data Quality**: Suppression list validation, custom fields support for both entities
- **Bulk Operations:** Multi-page record selection with bulk actions (Export, Add to List, Update, Delete).
- **Campaign Management:**
    - **Email:** HTML editor, personalization, tracking, pre-send guards, mandatory unsubscribe.
    - **Telemarketing:** Telnyx WebRTC integration, call scripts, qualification forms, DNC handling.
    - **Advanced Campaign Features:** Audience snapshotting, compliance guardrails, pacing/throttling, frequency caps, multi-provider email support, A/B/n testing, pre-flight checklists, and reporting.
- **Lead QA Workflow:** Multi-stage workflow (New → Under Review → Approved/Rejected → Published) with checklist validation.
- **Client Portal (Bridge Model):** Allows clients to specify campaign order requirements, linked manually to internal campaigns.
- **Compliance:** Real-time enforcement of global DNC and email unsubscribe lists; consent tracking.
- **Security:** JWT token generation, bcrypt password hashing, and role-based access control (RBAC).
- **Segmentation Engine:** Enhanced schemas for segments and lists, segment preview API, segment to list conversion, and list export.
- **Domain Sets Upgrade:** Advanced normalization, validation, and matching engine (exact and fuzzy) for ABM.
- **Content Studio & Social Media Management:**
    - **Asset Library:** Unified repository for managing various content types (email templates, landing pages, social posts, PDFs, images, videos) with version control and approval workflows.
    - **AI Content Generator:** AI-powered content creation for multiple formats with persona-based tone customization.
    - **Social Media Publisher:** Multi-platform publishing (LinkedIn, Twitter/X, Facebook, Instagram, YouTube) with scheduling, multi-account posting, and approval workflows.
- **Inter-Repl Communication (Push to Resources Center):** Secure content distribution to an external Resources Center via a dedicated Push API with HMAC-SHA256 authentication, timestamp validation, and robust error handling for content assets like Events, Resources, and News.
- **Resources Centre Integration:** Complete bi-directional integration with external Resources Centre repl for content distribution and reference data sync:
  - **Reference Data Sync:** Local caching of speakers, organizers, and sponsors with full CRUD APIs protected by RBAC. Automated sync service (POST /api/sync/resources-centre) pulls data from Resources Centre API with smart timestamp-based conflict resolution.
  - **Content Distribution:** Events, Resources, and News content types with push capabilities to Resources Centre via HMAC-authenticated API.
  - **Admin UI:** Comprehensive Resources Centre Management page (/resources-centre) with one-click sync, content overview tabs, quick create actions, and integration status monitoring.
  - **Event Form Integration:** Searchable dropdowns for organizer/sponsor selection and multi-select combobox for speakers pulled from synced reference data.
- **Email Infrastructure Settings:** Enterprise-grade email deliverability management including database schemas for domain authentication (SPF/DKIM/DMARC), tracking domains, IP pools, warmup plans, and send policies. Features enhanced sender profiles with ESP provider integration, reputation scores, and warmup status. Provides a full CRUD management UI for sender profiles.
- **Campaign-Content Linking & Tracking URL System:** Strategic integration with Resources Centre for linking campaigns to external content (Events, Resources) and generating personalized tracking URLs with contact parameters and campaign attribution.
- **Telephony - Softphone UI & Compliance:** Browser-based calling interface with database schemas for softphone profiles (agent audio preferences) and call recording access logs (audit trail). Includes an Agent Console UI with call queue, softphone controls (dial, hangup, mute), call script panel, notes, qualification questions, and disposition bar.

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
- **Email Service Providers:** SendGrid, AWS SES, Mailgun
- **Job Queue:** BullMQ (powered by Redis)