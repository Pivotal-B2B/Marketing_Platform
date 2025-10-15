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
- **Dark Mode:** Fully implemented with theme toggle and localStorage persistence.
- **Global UX/UI Upgrade:** Reusable components like `HeaderActionBar`, `IconButton`, and `SectionCard` for consistent interaction patterns.
- **Premium Design System:** Incorporates animations (fade-in, count-up, pulse-glow), visual effects (glass morphism, gradient borders), enhanced components (animated stat cards, premium login), micro-interactions (card elevation on hover, icon scaling), and gradient utilities.
- **Advanced Filtering:** `AdvancedFilterBar` component with multi-operator support and filter chips.
- **View Toggle System:** Dual-view architecture for Accounts (Cards/Table) with seamless state preservation, including a Premium Card View with gradient avatars and animated hover effects.
- **Accessibility:** Full keyboard accessibility and bulk selection support.

**Technical Implementations & Features:**
- **Data Model:** Core entities include Users (RBAC), Accounts (AI enrichment), Contacts (validation/deduplication), Dynamic Segments, Static Lists, Domain Sets, Campaigns (Email & Telemarketing), Leads (multi-stage QA workflow), Suppressions, and Campaign Orders.
- **Audience Management:** Advanced multi-criteria filtering, dynamic segments, static lists, and domain set uploaders.
- **Data Quality & Deduplication:** Deterministic upsert, normalization, source tracking, and soft deletes.
- **Unified CSV Import/Export System with Field Mapping:** RFC4180-compliant CSV parsing with smart field mapping, batch processing, and intelligent matching.
- **Bulk Operations:** Multi-page record selection with bulk actions (Export, Add to List, Update, Delete).
- **Campaign Management:**
    - **Email:** HTML editor, personalization, tracking, pre-send guards, mandatory unsubscribe.
    - **Telemarketing:** Telnyx WebRTC integration, call scripts, qualification forms, DNC handling, Agent Console with disposition workflow.
    - **Advanced Features:** Audience snapshotting, compliance guardrails, pacing/throttling, frequency caps, multi-provider email support, A/B/n testing, pre-flight checklists, and reporting.
- **Account Lead Cap Implementation:** Intelligent contact distribution system to prevent over-contacting accounts across campaigns, with configurable cap modes (Queue Size, Connected Calls, Positive Dispositions).
- **Lead QA Workflow:** Multi-stage workflow (New → Under Review → Approved/Rejected → Published) with checklist validation.
- **Client Portal (Bridge Model):** Allows clients to specify campaign order requirements.
- **Compliance:** Real-time enforcement of global DNC and email unsubscribe lists; consent tracking.
- **Security:** JWT token generation, bcrypt password hashing, and role-based access control (RBAC).
- **Segmentation Engine:** Enhanced schemas for segments and lists, segment preview API, and conversion/export functionalities.
- **Domain Sets Upgrade:** Advanced normalization, validation, and matching engine for ABM.
- **Content Studio & Social Media Management:** Unified asset library with version control, AI content generator, and multi-platform social media publishing with scheduling.
- **Inter-Repl Communication (Push to Resources Center):** Secure content distribution to an external Resources Center via HMAC-authenticated API.
- **Resources Centre Integration:** Bi-directional integration for content distribution and reference data sync (speakers, organizers, sponsors), with admin UI for management.
- **Email Infrastructure Settings:** Enterprise-grade email deliverability management including domain authentication, tracking domains, IP pools, warmup plans, and sender profiles with full CRUD management.
- **Campaign-Content Linking & Tracking URL System:** Integration with Resources Centre for linking campaigns to external content and generating personalized tracking URLs.
- **Telephony - Softphone UI & Compliance:** Browser-based calling interface with softphone profiles, call recording access logs, and an Agent Console UI for call management.

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