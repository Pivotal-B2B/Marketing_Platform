# Pivotal B2B CRM

## Overview

Pivotal CRM is an enterprise-grade B2B customer relationship management platform focused on Account-Based Marketing (ABM), multi-channel campaign management (Email + Telemarketing), lead qualification, and a client portal. It features a "bridge model" for manual campaign-to-order linking, robust compliance management (DNC/Unsubscribe), and comprehensive lead QA workflows. The system aims to provide an integrated solution for B2B sales and marketing operations, enabling efficient customer engagement and data management.

## User Preferences

- Clean, minimal enterprise design
- Professional blue color scheme (trust, reliability)
- Dense information display with clear hierarchy
- Fast, keyboard-friendly workflows
- Comprehensive but not overwhelming

## System Architecture

The system employs a modern web stack: **React 18 + Vite, TypeScript, TailwindCSS, and shadcn/ui** for the frontend, and **Node.js + Express + TypeScript** with a **PostgreSQL (Neon) database via Drizzle ORM** for the backend. JWT authentication secures role-based access.

**UI/UX Design:**
- **Color Scheme:** Primary blue (220 90% 56%) for professionalism, adaptive light/dark surfaces, and semantic status colors.
- **Typography:** Inter font family for text, JetBrains Mono for data.
- **Components:** Utilizes shadcn/ui for consistent enterprise-grade components including role-based sidebar navigation, top bar with global search, data tables with advanced features, and step wizards.
- **Dark Mode:** Fully implemented with theme toggle and localStorage persistence.

**Technical Implementations & Features:**

- **Data Model:** Core entities include Users (with RBAC), Accounts (with domain matching, hierarchies, custom fields, and AI-powered industry enrichment), Contacts (with E.164 validation, normalized fields for deduplication), Dynamic Segments, Static Lists, Domain Sets, Campaigns (Email & Telemarketing), Leads (with multi-stage QA workflow), Suppressions (DNC/Unsubscribe), and Campaign Orders.
- **Audience Management:** Advanced multi-criteria filtering with AND/OR logic and saved filters, dynamic segments with real-time counts, static lists, and domain set uploader with match rate reporting. Supports 52+ filter fields categorized dynamically.
- **Data Quality & Deduplication:** Implemented deterministic upsert with field-level survivorship, normalization (email, domain, name, phone), source tracking, soft deletes, and secondary identifiers. Includes an audit trail for all field-level changes.
- **Bulk Operations:** Infrastructure for selecting multiple records across pages, with a bulk actions toolbar for operations like Export, Add to List, Update, and Delete.
- **Campaign Management:**
    - **Email:** HTML editor, personalization, tracking, pre-send guards, mandatory unsubscribe.
    - **Telemarketing:** Telnyx WebRTC integration, call scripts, qualification forms, DNC handling.
- **Lead QA Workflow:** Multi-stage workflow (New → Under Review → Approved/Rejected → Published) with checklist validation and bulk actions. Only approved leads are deliverable.
- **Client Portal (Bridge Model):** Allows clients to specify audience, type, assets, and goals for campaign orders. Existing campaigns are manually linked to orders by internal operations (no auto-creation). Provides order-scoped dashboards and lead downloads.
- **Compliance:** Real-time enforcement of global DNC and email unsubscribe lists. Supports consent tracking.
- **Security:** JWT token generation, bcrypt password hashing, and role-based access control (RBAC) middleware for all API routes.
- **Phase 11 - Lists & Segmentation Engine (October 2025):**
    - **Enhanced Segments Schema:** Added entityType (contact/account), lastRefreshedAt, isActive flag, recordCountCache, tags[], and visibilityScope (private/team/global) for advanced segment management
    - **Enhanced Lists Schema:** Entity-agnostic design with recordIds[] (replacing contactIds), sourceType enum (segment/manual_upload/selection/filter), sourceRef for traceability, snapshotTs timestamp, tags[], and visibilityScope
    - **Segment Preview API:** Live count and sample IDs endpoint (POST /api/segments/preview) for real-time audience size estimation before segment creation
    - **Segment to List Conversion:** Endpoint to convert dynamic segments to static lists (POST /api/segments/:id/convert-to-list) for campaign targeting
    - **List Export:** CSV/JSON export functionality (POST /api/lists/:id/export) with proper headers and filename generation
    - **Database Enums:** Created visibility_scope (private/team/global) and source_type (segment/manual_upload/selection/filter) PostgreSQL enums for data integrity
    - **Updated UI:** Segments & Lists page updated to reflect new schema fields, including tags display, record counts, and proper entity type handling
- **Phase 20 - Campaigns Upgrade (Email + Telemarketing) (October 2025):**
    - **Data Model Additions:**
        - **CampaignAudienceSnapshots:** Persistent audience versioning with contactIds[], accountIds[], and audienceDefinition for reproducibility
        - **Sender Profiles:** Email sender configuration (fromName, fromEmail, DKIM domain, tracking domain) with brand association
        - **Email Templates:** Template management with HTML content, placeholders, versioning, and approval workflow
        - **Email Sends:** Individual send records with templateId, senderProfileId, provider info, and send status tracking
        - **Email Events:** Event tracking (delivered/opened/clicked/bounced/complaint) with metadata and timestamps
        - **Call Scripts:** Versioned call scripts with content, changelog, and campaign association
        - **Call Attempts:** Enhanced call tracking with Telnyx integration, agent info, recording URL, duration, disposition
        - **Call Events:** Call event tracking (connect/disposition/voicemail/callback) with metadata
        - **Qualification Responses:** Structured qualification data linked to call attempts or leads with schema versioning
    - **Shared Foundations:**
        - Audience selection & snapshotting for reproducibility
        - Compliance guardrails (Unsubscribe/DNC enforcement at pre-enqueue and just-in-time stages)
        - Pacing, throttling, and frequency caps (per-campaign and per-tenant TPS limits)
        - Unified engagement model writing to Activity Timeline
    - **Email Campaign Features:**
        - Multi-provider support (AWS SES/SendGrid/Mailgun) via pluggable adapters
        - Template editor with personalization placeholders and fallbacks
        - Mandatory unsubscribe block and physical address
        - Open/click tracking with UTM auto-tagging
        - A/B/n testing and send-time optimization
    - **Telemarketing Features:**
        - Telnyx WebRTC embedded softphone
        - Pre-dial DNC check and per-country recording prompts
        - Scripts with merge tags and qualification forms
        - Standard dispositions (No Answer/VM/Callback/Not Interested/Qualified/DNC/Wrong Number)
        - Agent productivity dashboard (connect rate, talk time, conversions)
    - **Pre-Flight Checklist:** Audience health checks, compliance confirmations, pacing validation, seed testing
    - **Reporting:** Campaign stats (send/open/click rates, connect/talk time, disposition mix), order-scoped views with goal tracking
    - **API Endpoints:** /email-campaigns/*, /call-campaigns/*, /campaigns/:id/pause|resume|stop, /orders/:id/aggregate-stats

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
- **Telephony Integration:** Telnyx WebRTC
- **Email Service Providers:** SendGrid/SES/Mailgun
- **Job Queue:** BullMQ + Redis