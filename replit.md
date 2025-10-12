# Pivotal B2B CRM

## Overview

Pivotal CRM is an enterprise-grade B2B customer relationship management platform designed for Account-Based Marketing (ABM), multi-channel campaign management (Email + Telemarketing), lead qualification, and a client portal. It incorporates a unique "bridge model" for manual campaign-to-order linking, ensuring compliance management (DNC/Unsubscribe) and robust lead QA workflows. The system aims to provide a comprehensive solution for managing B2B sales and marketing operations.

## Recent Progress (October 2025)

**Quick Win Phases Completed:**
- ✅ **Phase 1-2:** Schema enhancement (5 custom fields with GIN indexes) + auto-linking system (domain-based contact-account matching)
- ✅ **Phase 3:** Record Detail Views - Account & Contact detail pages with tabbed interfaces, navigation, and quick actions

**Phase 3 Deliverables (Completed):**
- Account Detail Page (/accounts/:id) with tabs (Overview, Contacts, Activity, Notes), side panel stats, quick actions (Edit | Merge | Export), related contacts table
- Contact Detail Page (/contacts/:id) with tabs (Overview, Account Info, Activity, Notes), breadcrumb navigation, linked account card with "View Company" button, Previous/Next record navigation
- Clickable table rows in both accounts and contacts lists → navigate to detail pages
- Cross-entity navigation (account → contacts, contact → account)
- E2E tested and verified all navigation flows

## User Preferences

- Clean, minimal enterprise design
- Professional blue color scheme (trust, reliability)
- Dense information display with clear hierarchy
- Fast, keyboard-friendly workflows
- Comprehensive but not overwhelming

## System Architecture

The system utilizes a modern web stack with **React 18 + Vite, TypeScript, TailwindCSS, and shadcn/ui** for the frontend, and **Node.js + Express + TypeScript** with a **PostgreSQL (Neon) database via Drizzle ORM** for the backend. JWT authentication secures role-based access.

**UI/UX Design:**
- **Color Scheme:** Primary blue (220 90% 56%) for trust and professionalism, adaptive light/dark surfaces, and semantic colors for status.
- **Typography:** Inter font family for main text, JetBrains Mono for data fields.
- **Components:** Leverages shadcn/ui for consistent enterprise-grade components including role-based sidebar navigation, top bar with global search, data tables with advanced features, and step wizards.
- **Dark Mode:** Fully implemented with theme toggle and localStorage persistence.

**Technical Implementations & Features:**

- **Data Model:** Core entities include Users (with role-based access: admin, campaign_manager, data_ops, qa_analyst, agent, client_user), Accounts (with domain matching, hierarchies, and custom fields), Contacts (with E.164 validation), Dynamic Segments, Static Lists, Domain Sets, Campaigns (Email & Telemarketing), Leads (with QA workflow), Suppressions (DNC/Unsubscribe), and Campaign Orders.
- **Audience Management:** Advanced filtering, dynamic segments with real-time counts, static lists, and domain set uploader with match rate reporting.
- **Campaign Management:**
    - **Email:** HTML editor, personalization, tracking, pre-send guards, mandatory unsubscribe.
    - **Telemarketing:** Telnyx WebRTC integration, call scripts, qualification forms, DNC handling.
- **Lead QA Workflow:** Multi-stage (New → Under Review → Approved/Rejected → Published) with checklist validation and bulk actions. Only approved leads are deliverable.
- **Client Portal (Bridge Model):** Campaign order wizard allows clients to specify audience, type, assets, and goals. **Crucially, existing campaigns are manually linked to orders by internal operations; there is NO auto-creation of campaigns.** Provides order-scoped dashboards and allows download of approved leads.
- **Compliance:** Global DNC and email unsubscribe lists are enforced in real-time. Consent tracking is also supported.
- **Security:** JWT token generation, bcrypt password hashing, and role-based access control (RBAC) middleware for all API routes.

## External Dependencies

- **Database:** Neon (PostgreSQL)
- **Frontend Framework:** React 18
- **UI Component Library:** shadcn/ui
- **Routing:** Wouter
- **Data Fetching:** TanStack Query
- **Form Management:** React Hook Form
- **Charting:** Recharts
- **Authentication:** JWT (JSON Web Tokens)
- **Password Hashing:** bcrypt
- **Planned Telephony Integration:** Telnyx WebRTC
- **Planned Email Service Providers:** SendGrid/SES/Mailgun
- **Planned Job Queue:** BullMQ + Redis