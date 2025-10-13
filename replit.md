# Pivotal B2B CRM

## Overview
Pivotal CRM is an enterprise-grade B2B customer relationship management platform specializing in Account-Based Marketing (ABM), multi-channel campaign management (Email & Telemarketing), lead qualification, and a client portal. Its core purpose is to provide an integrated solution for B2B sales and marketing operations, focusing on efficient customer engagement, robust compliance (DNC/Unsubscribe), and comprehensive lead QA workflows. The system features a "bridge model" for manual campaign-to-order linking and aims to streamline customer relationship management for B2B enterprises.

## User Preferences
- Clean, minimal enterprise design
- Professional blue color scheme (trust, reliability)
- Dense information display with clear hierarchy
- Fast, keyboard-friendly workflows
- Comprehensive but not overwhelming

## System Architecture
The system utilizes a modern web stack: **React 18 + Vite, TypeScript, TailwindCSS, and shadcn/ui** for the frontend, and **Node.js + Express + TypeScript** with a **PostgreSQL (Neon) database via Drizzle ORM** for the backend. JWT authentication secures role-based access.

**UI/UX Design:**
- **Color Scheme:** Primary blue (220 90% 56%) with adaptive light/dark surfaces and semantic status colors.
- **Typography:** Inter font for text, JetBrains Mono for data.
- **Components:** shadcn/ui for consistent enterprise components, including role-based sidebar navigation, global search, data tables, and step wizards.
- **Dark Mode:** Fully implemented with theme toggle and localStorage persistence.

**Technical Implementations & Features:**
- **Data Model:** Core entities include Users (with RBAC), Accounts (with AI enrichment), Contacts (with validation and deduplication), Dynamic Segments, Static Lists, Domain Sets, Campaigns (Email & Telemarketing), Leads (multi-stage QA workflow), Suppressions, and Campaign Orders.
- **Audience Management:** Advanced multi-criteria filtering with AND/OR logic, dynamic segments with real-time counts, static lists, and domain set uploader.
- **Data Quality & Deduplication:** Deterministic upsert with field-level survivorship, normalization, source tracking, and soft deletes.
- **Bulk Operations:** Multi-page record selection with bulk actions (Export, Add to List, Update, Delete).
- **Campaign Management:**
    - **Email:** HTML editor, personalization, tracking, pre-send guards, mandatory unsubscribe.
    - **Telemarketing:** Telnyx WebRTC integration, call scripts, qualification forms, DNC handling.
    - **Advanced Campaign Features:** Audience snapshotting, compliance guardrails, pacing/throttling, frequency caps, multi-provider email support, A/B/n testing, pre-flight checklists, and reporting.
- **Lead QA Workflow:** Multi-stage workflow (New → Under Review → Approved/Rejected → Published) with checklist validation.
- **Client Portal (Bridge Model):** Allows clients to specify campaign order requirements; internal operations manually link campaigns to orders. Provides order-scoped dashboards.
- **Compliance:** Real-time enforcement of global DNC and email unsubscribe lists; consent tracking.
- **Security:** JWT token generation, bcrypt password hashing, and role-based access control (RBAC).
- **Lists & Segmentation Engine:** Enhanced schemas for segments and lists, segment preview API, segment to list conversion, and list export functionality.
- **Domain Sets Upgrade:** Advanced domain normalization, validation, and matching engine (exact and fuzzy) with confidence scoring. Supports bulk upload, expansion to contacts, and conversion to lists for ABM.
- **Menu & Navigation Architecture:** Simplified role-based navigation with 7 primary categories and collapsible nested dropdowns for improved UX and scalability.
- **Campaign Builder UI & Workflow:** A 5-step wizard for creating email and telemarketing campaigns, including audience selection, content setup (rich HTML editor, call script builder), scheduling/pacing, compliance review, and launch. Features dynamic placeholders, conditional content, and role-based access.
- **Content Studio & Social Media Management:** Centralized creative workspace featuring:
    - **Asset Library:** Unified repository for managing email templates, landing pages, social posts, PDFs, images, and videos with version control and approval workflows.
    - **AI Content Generator:** Multi-format AI-powered content creation supporting blog posts, social posts, email copy, ad copy with persona-based tone customization and CTA integration.
    - **Social Media Publisher:** Multi-platform publishing (LinkedIn, Twitter/X, Facebook, Instagram, YouTube) with platform-specific scheduling, multi-account posting, preview capabilities, and approval workflows.
    - **Asset Management:** Support for multiple content types (email_template, landing_page, social_post, pdf, image, video) with tags, versioning, and reusability across campaigns.
- **Inter-Repl Communication (Push to Resources Center):** Secure content distribution system enabling Dashboard-to-Resources-Center publishing:
    - **Push Tracking:** content_asset_pushes table tracks push attempts, status, retry counts, and responses with full audit trail.
    - **Push API:** POST /api/content-assets/:id/push endpoint with HMAC-SHA256 authentication for secure inter-Repl communication.
    - **Status Management:** Push states (pending, in_progress, success, failed, retrying) with max 3 attempts enforced before retry execution.
    - **Security:** HMAC-SHA256 signature validation (X-Signature header) with mandatory timestamp validation (5-minute window) for replay attack prevention. Resources Center MUST validate timestamp freshness and use timing-safe signature comparison. Secrets managed via Replit environment variables.
    - **Error Handling:** Graceful handling of non-JSON responses with fallback to text parsing for accurate diagnostics during push failures.
    - **Resources Center Integration:** Dashboard sends content to Resources Center POST /api/import/content endpoint. Resources Center responds with externalId for tracking. Full API specification in RESOURCES_CENTER_API_SPEC.md.
    - **Sync Status Display:** UI shows push history, attempt counts, success/failure status with manual retry capability.
- **Phase 25: Global UX/UI Upgrade:** Modern interaction patterns for Account & Contact Details pages:
    - **Reusable Components:**
        - **HeaderActionBar:** Sticky header with avatar, title, subtitle, badges, and one-click action buttons (LinkedIn, Website, Call, Email, Copy).
        - **IconButton:** Reusable button with icon and tooltip support for consistent interactions.
        - **SectionCard:** Content card wrapper with title, icon, optional description and action button.
    - **Account Details Page:** Two-column responsive layout (2/3 primary content, 1/3 sidebar) featuring:
        - One-click actions in sticky header (LinkedIn, Website, Call, Email, Copy domain)
        - Overview section with industry, employee size, revenue, HQ location
        - Related contacts table with inline navigation
        - AI Industry Suggestions review interface
        - Activity Timeline placeholder
        - Sidebar with Quick Actions, Compliance & Health, Account Summary
    - **Contact Details Page:** Follows same pattern with:
        - Breadcrumb navigation (Contacts > Account > Contact)
        - One-click actions (LinkedIn, Call, Email, Copy email)
        - Prev/Next contact navigation in header
        - Contact Information section with email, phone, job details
        - Linked Account section with click-to-navigate
        - Sidebar with Quick Actions, Contact Status, Tags, Metadata
    - **Interaction Patterns:** Tooltips on all action buttons, disabled states for missing data, responsive grid layouts, clean information hierarchy.

## External Dependencies
- **Database:** Neon (PostgreSQL)
- **Frontend Framework:** React 18
- **UI Component Library:** shadcn/ui
- **Routing:** Wouter
- **Data Fetching:** TanStack Query
- **Form Management:** React Hook Form
- **Charting:** Recharts
- **Authentication:** JWT
- **Password Hashing:** bcrypt
- **Telephony Integration:** Telnyx WebRTC
- **Email Service Providers:** SendGrid/SES/Mailgun
- **Job Queue:** BullMQ + Redis