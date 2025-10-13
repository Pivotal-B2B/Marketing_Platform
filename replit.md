# Pivotal B2B CRM

## Overview

Pivotal CRM is an enterprise-grade B2B customer relationship management platform designed for Account-Based Marketing (ABM), multi-channel campaign management (Email + Telemarketing), lead qualification, and a client portal. It incorporates a unique "bridge model" for manual campaign-to-order linking, ensuring compliance management (DNC/Unsubscribe) and robust lead QA workflows. The system aims to provide a comprehensive solution for managing B2B sales and marketing operations.

## Recent Progress (October 2025)

**Quick Win Phases Completed:**
- ✅ **Phase 1-2:** Schema enhancement (5 custom fields with GIN indexes) + auto-linking system (domain-based contact-account matching)
- ✅ **Phase 3:** Record Detail Views - Account & Contact detail pages with tabbed interfaces, navigation, and quick actions
- ✅ **Phase 4:** Advanced Filtering - Multi-criteria filter system with Sheet UI pattern, AND/OR logic, and saved filters backend
- ✅ **Phase 5:** Bulk Operations - Selection infrastructure with checkboxes, bulk actions toolbar on both Accounts and Contacts
- ✅ **Phase 6:** Dynamic Filter Field Registry - Categorized filtering with collapsible categories, search, and 52+ fields
- ✅ **Phase 7:** Data Quality & Deduplication - Deterministic upsert, field-level survivorship, comprehensive audit trail
- ✅ **Phase 8:** AI-Powered Industry Enrichment - Dual-industry strategy (primary + secondary[]), AI suggestions with confidence scores, human review workflow with mutually exclusive actions

**Phase 4 Deliverables (Completed):**
- Advanced filter infrastructure: Shared filter types (text/number/array/boolean), SQL query builder with Drizzle ORM integration
- FilterBuilder UI component with dynamic field/operator/value selectors in Sheet pattern
- Integrated filtering on Accounts and Contacts pages with filter badge indicators
- Support for text operators (equals, contains, startsWith, endsWith, notEquals)
- Support for numeric operators (equals, greaterThan, lessThan, between with open-ended ranges, notEquals)
- Support for array operators (containsAny, containsAll, isEmpty, isNotEmpty)
- Support for boolean operators (is true/false)
- AND/OR logic switching for multi-condition filters
- Saved filters database schema, API routes, and storage methods (UI pending as future enhancement)
- Fixed numeric range bug: properly handles empty bounds without Postgres casting to zero
- E2E tested and verified all filtering workflows on both entity types

**Phase 5 Deliverables (Completed):**
- ✅ Backend selection context infrastructure: selectionContexts table with entityType/selectionType enums, TTL enforcement (15min expiration)
- ✅ API routes for selection contexts (GET/POST/DELETE) with validation, auth, and opportunistic cleanup
- ✅ Reusable useSelection hook for managing page-level and global selections in frontend
- ✅ BulkActionsToolbar component with dynamic counter showing "X selected of Y", Clear Selection, and bulk action buttons
- ✅ Checkbox columns added to Accounts and Contacts pages with tri-state "Select All on This Page" functionality
- ✅ Selection state with proper indeterminate checkbox state, stopPropagation for row navigation
- ✅ Bulk action buttons on both Accounts and Contacts pages: Export, Add to List, Update, Delete
- ✅ All bulk actions show placeholder toast messages (ready for implementation)

**Future Phase 5 Enhancements:**
- Sticky selection persistence across pagination
- Global selection prompt ("Select all X records matching filter")
- Actual bulk operations implementation: Update Fields, Delete, Export CSV, Assign Owner, Add to List
- Auto-invalidation of selection context when filters/search changes

**Phase 6 Deliverables (Completed):**
- ✅ Dynamic filter field registry schema with 8 category enum (Contact, Account, Suppression, Email Campaign, Telemarketing, QA, List/Segment, Client Portal)
- ✅ Seed script populated 52 filter fields with metadata (entity, key, label, type, operators, category, sortOrder)
- ✅ Storage methods: getFilterFields(category?), getFilterFieldsByEntity(entity)
- ✅ API endpoints: GET /api/filters/fields (returns fields + grouped by category), GET /api/filters/fields/entity/:entity
- ✅ FilterBuilder UI refactor: Categorized collapsible panels with Collapsible component
- ✅ Field search bar with type-to-filter across all 52+ fields
- ✅ Auto-expand categories on search, chevron icons for expand/collapse state
- ✅ Badge showing field count per category

**Future Phase 6 Enhancements:**
- Real-time count preview on filter changes (show "X records match" before applying)
- Cross-entity join support in filter-builder.ts (Contacts ↔ Accounts ↔ Campaigns ↔ QA)
- Time-based operators (within_last_days, between_dates, not_updated_since)

**Phase 7 Deliverables (Completed & Architect-Approved):**
- ✅ **Schema Enhancements:** Added normalization fields (email_normalized, domain_normalized, name_normalized) to contacts/accounts with proper uniqueIndex() constraints
- ✅ **Source Tracking:** Added source_system, source_record_id, source_updated_at for provenance tracking
- ✅ **Soft Deletes:** Implemented deleted_at with partial unique indexes (WHERE deleted_at IS NULL) for deduplication
- ✅ **Secondary Identifiers:** Created contact_emails and account_domains tables with unique constraints on normalized values
- ✅ **Audit Trail:** Created field_change_log table tracking all field-level changes with survivorship policy metadata
- ✅ **Fuzzy Match Queue:** Created dedupe_review_queue for human review of potential duplicates
- ✅ **Normalization Engine:** Built utilities for email (Gmail dot/alias handling), domain, name (legal suffix removal), and phone (E.164)
- ✅ **Deterministic Upsert:** Implemented storage.upsertContact() with normalized email lookup, field-level survivorship (prefer_new_if_not_null, union for arrays), change tracking
- ✅ **Account Deduplication:** Implemented storage.upsertAccount() with domain-first lookup, name+city+country fallback when no domain
- ✅ **Upsert APIs:** Added POST /contacts:upsert and POST /accounts:upsert with suppression enforcement and idempotent responses
- ✅ **Database Constraints:** All unique constraints properly enforced via uniqueIndex() with soft-delete awareness
- ✅ **Change Auditing:** All field updates logged to field_change_log with old/new values, actor, source, and survivorship policy

**Future Enhancements (Phase 7+):**
- Real-time duplicate detection UI in Contact/Account forms
- Bulk import dry-run mode showing create vs update preview
- Merge/consolidation workflow with FK re-pointing and rollback support

**Phase 8 Deliverables (Completed & Architect-Approved):**
- ✅ **Dual-Industry Schema:** Added 11 industry fields to accounts: industryStandardized (primary), industrySecondary[] (array), industryRaw, plus AI metadata fields
- ✅ **AI Enrichment Fields:** industryAiSuggested, industryAiCandidates (JSONB with confidence scores), industryAiTopk[], industryAiConfidence, industryAiSource, industryAiSuggestedAt
- ✅ **Review Workflow:** industryAiReviewedBy, industryAiReviewedAt, industryAiStatus enum (pending/accepted/rejected/partial)
- ✅ **Storage Methods:** updateAccountIndustry() for manual updates, reviewAccountIndustryAI() for processing AI reviews with accept/reject/partial logic, getAccountsNeedingReview() with confidence threshold filtering (≥0.5)
- ✅ **API Routes:** PATCH /api/accounts/:id/industry (manual industry updates), POST /api/accounts/:id/industry/ai-review (AI review submission), GET /api/accounts/ai-review/pending (pending review queue)
- ✅ **Role-Based Access:** All industry APIs restricted to admin, data_ops, campaign_manager roles
- ✅ **Account Detail UI:** Updated Overview tab with Primary Industry + Secondary Industries badges, added AI Enrichment tab with "New" badge for pending suggestions
- ✅ **AI Review Interface:** Multi-select review UI with confidence scores, mutually exclusive actions (Set as Primary/Add to Secondary/Reject), optimistic state reset on success
- ✅ **Data Validation:** Zod schemas for updateAccountIndustrySchema and reviewAccountIndustryAISchema with proper field validation

**Future Phase 8+ Enhancements:**
- Add industry filter operators to advanced filtering (industry_any_in, industry_primary, industry_contains)
- Playwright test coverage for AI review workflow end-to-end
- Data seeding scripts to populate AI confidence fields for testing pending review queue
- Bulk AI review operations for processing multiple accounts simultaneously

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