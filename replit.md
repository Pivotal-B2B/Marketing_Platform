# Pivotal B2B CRM

## Overview
Pivotal CRM is an enterprise-grade B2B customer relationship management platform designed to streamline B2B sales and marketing operations. It specializes in Account-Based Marketing (ABM), multi-channel campaign management (Email & Telemarketing), lead qualification, and includes a client portal. The platform emphasizes efficient customer engagement, robust compliance (DNC/Unsubscribe), comprehensive lead QA workflows, and features a "bridge model" for linking campaigns to orders.

## User Preferences
- Clean, minimal enterprise design
- Professional blue color scheme (trust, reliability)
- Dense information display with clear hierarchy
- Fast, keyboard-friendly workflows
- Comprehensive but not overwhelming

## System Architecture
The system employs a modern web stack: **React 18 + Vite, TypeScript, TailwindCSS, and shadcn/ui** for the frontend, and **Node.js + Express + TypeScript** with a **PostgreSQL (Neon) database via Drizzle ORM** for the backend. JWT authentication provides role-based access control.

**UI/UX Design:**
- **Color Scheme:** Primary blue (220 90% 56%) with adaptive light/dark surfaces and semantic status colors.
- **Typography:** Inter font for text, JetBrains Mono for data.
- **Components:** shadcn/ui ensures consistent enterprise components, including role-based sidebar navigation, global search, data tables, and step wizards.
- **Dark Mode:** Fully implemented with theme toggle and localStorage persistence.
- **Global UX/UI Upgrade:** Introduced reusable components like `HeaderActionBar`, `IconButton`, and `SectionCard` for consistent interaction patterns across Account and Contact Details pages, featuring sticky headers, one-click actions, and responsive layouts.

**Technical Implementations & Features:**
- **Data Model:** Core entities include Users (RBAC), Accounts (AI enrichment), Contacts (validation/deduplication), Dynamic Segments, Static Lists, Domain Sets, Campaigns (Email & Telemarketing), Leads (multi-stage QA workflow), Suppressions, and Campaign Orders.
- **Audience Management:** Advanced multi-criteria filtering, dynamic segments, static lists, and domain set uploaders.
- **Data Quality & Deduplication:** Deterministic upsert with field-level survivorship, normalization, source tracking, and soft deletes.
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
- **Resources Centre Reference Data:** Local caching of speakers, organizers, and sponsors from Resources Centre with full CRUD APIs (GET/POST/PUT/DELETE /api/speakers, /api/organizers, /api/sponsors) protected by admin/data_ops roles. Event form integrates searchable dropdowns for organizer/sponsor selection and multi-select combobox for speakers.
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
- **Authentication:** JWT
- **Password Hashing:** bcrypt
- **Telephony Integration:** Telnyx WebRTC
- **Email Service Providers:** SendGrid, AWS SES, Mailgun
- **Job Queue:** BullMQ (powered by Redis)