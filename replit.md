# Pivotal B2B CRM

A comprehensive B2B CRM system with ABM capabilities, email/telemarketing campaigns, lead QA workflows, and a client portal using a bridge model for manual order-to-campaign linking.

## Overview

Pivotal CRM is an enterprise-grade B2B customer relationship management platform designed for:
- Account-Based Marketing (ABM) with advanced segmentation
- Multi-channel campaign management (Email + Telemarketing)
- Lead qualification and QA workflows
- Client portal with campaign order management
- Manual campaign-to-order linking (bridge model - no auto-creation)
- Compliance management (DNC/Unsubscribe)

## Tech Stack

**Frontend:**
- React 18 + Vite
- TypeScript
- TailwindCSS + shadcn/ui components
- Wouter for routing
- TanStack Query for data fetching
- React Hook Form for forms
- Recharts for dashboards
- Inter font family (enterprise design)

**Backend:**
- Node.js + Express + TypeScript
- PostgreSQL database (Neon)
- Drizzle ORM
- JWT authentication

**Planned Integrations:**
- Telnyx WebRTC for telephony
- Email service providers (SendGrid/SES/Mailgun)
- BullMQ + Redis for job queues

## Architecture

### Data Model

**Core Entities:**
- **Users** - Authentication with role-based access (admin, campaign_manager, data_ops, qa_analyst, agent, client_user)
- **Accounts** - Company records with domain-based matching, linkedin_specialties, parent_account_id for hierarchies, tags, custom fields (JSONB)
- **Contacts** - Individual contacts linked to accounts, E.164 phone validation, phone_verified_at, tags
- **Segments** - Dynamic audience filters with AND/OR logic
- **Lists** - Static contact snapshots
- **Domain Sets** - Upload domains, normalize, match to accounts, expand to contacts
- **Campaigns** - Email and telemarketing campaigns with audience targeting
- **Leads** - QA workflow (New → Under Review → Approved/Rejected → Published)
- **Suppressions** - DNC (phone) and Unsubscribe (email) enforcement
- **Campaign Orders** - Client portal orders with manual campaign linking (bridge model)

### Key Features

**Audience Management:**
- Advanced filtering with custom fields support
- Dynamic segments with real-time preview counts
- Static lists for campaign snapshots
- Domain set uploader with match rate reporting

**Email Campaigns:**
- HTML editor with personalization placeholders
- Tracking (delivered/open/click/bounce/complaint)
- Pre-send guards excluding invalid/bounced contacts
- Mandatory unsubscribe enforcement

**Telemarketing:**
- Telnyx WebRTC click-to-call integration
- Call scripts and qualification forms
- Standard dispositions with queue rules
- DNC request handling and enforcement

**Lead QA:**
- Multi-stage workflow with approval/rejection
- Checklist validation (fields, ICP, consent, recordings)
- Bulk approve/reject actions
- Only approved leads deliverable to clients

**Client Portal (Bridge Model):**
- Campaign order wizard (audience, type, assets, goals, qualification)
- NO auto-creation of campaigns
- Internal ops manually links existing campaigns to orders
- Order-scoped dashboards and reporting
- Download approved leads only

**Compliance:**
- Global DNC (phone) suppression list
- Global email unsubscribe list
- Real-time enforcement before send/dial
- Consent tracking (basis, source, timestamp)

## Project Structure

```
├── client/                          # Frontend React app
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                  # shadcn components
│   │   │   ├── app-sidebar.tsx      # Main navigation
│   │   │   ├── layout/              # Layout components
│   │   │   ├── shared/              # Reusable components
│   │   │   ├── theme-provider.tsx   # Dark mode support
│   │   │   └── theme-toggle.tsx     # Theme switcher
│   │   ├── pages/                   # All page components
│   │   │   ├── login.tsx
│   │   │   ├── dashboard.tsx
│   │   │   ├── accounts.tsx
│   │   │   ├── contacts.tsx
│   │   │   ├── segments.tsx
│   │   │   ├── email-campaigns.tsx
│   │   │   ├── telemarketing.tsx
│   │   │   ├── leads.tsx
│   │   │   ├── suppressions.tsx
│   │   │   ├── orders.tsx           # Client portal
│   │   │   ├── reports.tsx
│   │   │   └── settings.tsx
│   │   ├── lib/                     # Utilities
│   │   ├── hooks/                   # Custom hooks
│   │   └── App.tsx                  # Main app with routing
│   └── index.html
├── server/                          # Backend Express app
│   ├── db.ts                        # Database connection (to be created)
│   ├── storage.ts                   # Storage interface
│   ├── routes.ts                    # API routes (to be implemented)
│   └── index.ts
├── shared/
│   └── schema.ts                    # Drizzle schema (complete)
├── design_guidelines.md             # Design system documentation
└── replit.md                        # This file
```

## Design System

**Colors:**
- Primary: Blue (220 90% 56%) - Trust, professionalism
- Surface: Adaptive light/dark backgrounds
- Semantic: Success (green), Warning (orange), Error (red), Info (cyan)

**Typography:**
- Font: Inter (400, 500, 600, 700)
- Monospace: JetBrains Mono for data fields
- Scale: Display, H1-H3, Body, Small, Caption

**Components:**
- All UI follows shadcn/ui component library
- Sidebar navigation with role-based filtering
- Top bar with global search, notifications, profile
- Data tables with sorting/filtering
- Step wizards for complex workflows
- Cards with hover elevation
- Empty states with CTAs
- Loading skeletons

**Dark Mode:**
- Fully implemented with theme toggle
- Automatic color adaptation
- Stored in localStorage

## User Roles

1. **Admin** - Full system access
2. **Campaign Manager** - Create/manage campaigns
3. **Data Ops** - Manage data, imports, suppressions
4. **QA Analyst** - Review and approve leads
5. **Agent** - Make calls, qualify leads
6. **Client User** - Create orders, view reports, download leads

## Development Status

### ✅ Completed (Task 1: Schema & Frontend)
- Complete database schema with all entities and relations
- Database pushed successfully (19+ tables created)
- Design system setup (Inter font, enterprise colors)
- All page components and layouts created:
  - Authentication (Login)
  - Dashboard with KPI cards and charts
  - Accounts and Contacts management
  - Segments, Lists, and Domain Sets
  - Email and Telemarketing campaigns
  - Lead QA portal
  - Suppressions management
  - Client Orders (Client Portal)
  - Reports and Analytics
  - Settings
- Reusable components (StatCard, EmptyState, LoadingState)
- Role-based sidebar navigation
- Top bar with search, notifications, theme toggle
- Dark mode support with ThemeProvider
- Routing with Wouter

### ✅ Completed (Task 2: Backend - Core)
**Database & Storage:**
- server/db.ts: Neon PostgreSQL connection with WebSocket support
- server/storage.ts: Complete DatabaseStorage with IStorage for all entities
- All CRUD operations implemented for: Users, Accounts, Contacts, Campaigns, Segments, Lists, Domain Sets, Leads, Suppressions, Campaign Orders, Order-Campaign Links, Bulk Imports, Email Messages, Calls, Audit Logs

**API Routes (Basic):**
- ✅ Auth: POST /api/auth/login (basic auth - needs JWT upgrade)
- ✅ Accounts: Full CRUD (GET/POST/PATCH/DELETE /api/accounts)
- ✅ Contacts: Full CRUD with suppression checks
- ✅ Campaigns: Full CRUD + launch endpoint
- ✅ Segments: GET/POST endpoints
- ✅ Lists: GET/POST endpoints
- ✅ Domain Sets: GET/POST endpoints
- ✅ Leads: Full CRUD + approve/reject workflows
- ✅ Suppressions: Email and Phone management
- ✅ Campaign Orders: Full CRUD + submit
- ✅ Order-Campaign Links: Bridge model (manual linking)
- ✅ Bulk Imports: POST/GET endpoints (queue TBD)

**Application Status:**
- ✅ Running successfully on port 5000
- ✅ Vite HMR connected
- ✅ All routes registered
- ✅ Database schema synced

### ✅ Completed (Task 2.5: Security & Auth)
**Security & Auth:**
- ✅ JWT token generation and verification (server/auth.ts)
- ✅ Password hashing with bcrypt
- ✅ Role-based access control middleware (requireAuth, requireRole)
- ✅ All API routes protected with appropriate RBAC
- ✅ POST /api/auth/register endpoint with password hashing
- ✅ Express Request extended with user context

**Advanced Query Features:**
- ⏳ Pagination support in GET endpoints
- ⏳ Advanced filtering (multiple fields, operators)
- ⏳ Sorting options
- ⏳ Search functionality

**Job Queues & Async Processing:**
- ⏳ BullMQ setup for bulk imports
- ⏳ Chunked processing for 100k+ records
- ⏳ Email queue for campaign sends
- ⏳ Call queue for telemarketing

**Business Logic:**
- ⏳ Pre-launch campaign guards (audience validation)
- ⏳ Real-time suppression enforcement during sends
- ⏳ Lead delivery reports
- ⏳ Order-scoped dashboard data aggregation

**Additional Endpoints:**
- ⏳ GET /api/campaigns/:id/stats (detailed metrics)
- ⏳ GET /api/orders/:id/reports (order analytics)
- ⏳ GET /api/orders/:id/leads/download (approved leads CSV)
- ⏳ POST /api/imports/:id/process (trigger import job)
- ⏳ GET /api/imports/:id/errors (download reject CSV)

### 🚧 In Progress (Task 3: Integration & Testing)

**Authentication & Context:**
- ✅ AuthContext for JWT token management with isLoading state
- ✅ Protected route wrapper with loading spinner
- ✅ Login page integration with /api/auth/login
- ✅ Token persistence in localStorage
- ✅ Logout functionality in TopBar
- ✅ Authorization headers auto-added to all API requests
- ✅ E2E auth flow tested and passing

**Data Integration:**
- ⏳ Dashboard API integration (KPI metrics)
- ⏳ Accounts CRUD with TanStack Query
- ⏳ Contacts CRUD with suppression checks
- ⏳ Campaigns management
- ⏳ Lead QA workflow
- ⏳ Client Orders & Bridge linking

**Polish:**
- ⏳ Loading states (skeletons, spinners)
- ⏳ Error handling & toast notifications
- ⏳ Form validation feedback
- ⏳ Optimistic updates
- ⏳ Cache invalidation

**Testing:**
- ⏳ E2E auth flow
- ⏳ CRUD operations
- ⏳ Role-based access
- ⏳ Critical paths

## API Routes (To Be Implemented)

**Auth:**
- POST /api/auth/login
- POST /api/auth/logout

**Audience:**
- GET/POST /api/accounts
- GET/POST /api/contacts
- POST /api/imports (bulk import)
- GET /api/imports/:id/errors

**Segments & Lists:**
- GET/POST /api/segments
- GET /api/segments/:id/run
- GET/POST /api/lists
- POST /api/lists/:id/snapshot

**Domain Sets:**
- POST /api/domain-sets (upload)
- GET /api/domain-sets/:id
- POST /api/domain-sets/:id/expand-to-contacts

**Campaigns:**
- GET/POST /api/campaigns/email
- GET/POST /api/campaigns/call
- POST /api/campaigns/:id/launch
- POST /api/calls/:id/disposition

**Leads & QA:**
- GET /api/leads?qa_status=...
- POST /api/leads/:id/approve
- POST /api/leads/:id/reject

**Suppressions:**
- GET/POST /api/suppressions/email
- GET/POST /api/suppressions/phone

**Client Orders (Bridge):**
- GET/POST /api/client/orders
- PATCH /api/client/orders/:id
- POST /api/client/orders/:id/submit
- POST /api/orders/:id/campaign-links (manual linking)
- GET /api/orders/:id/campaign-links
- GET /api/client/orders/:id/reports
- GET /api/client/orders/:id/leads/download

## Running the Project

```bash
# Install dependencies
npm install

# Push database schema
npm run db:push

# Start development server
npm run dev
```

The application will be available at http://localhost:5000

## Key Principles

1. **Bridge Model** - Orders never auto-create campaigns; ops manually links
2. **Role-Based Access** - Users see only what they need
3. **Compliance First** - DNC/Unsubscribe enforced before send/dial
4. **Quality Over Quantity** - Only approved leads count
5. **Audit Everything** - All critical actions logged
6. **2-Click Access** - Primary actions visible and accessible

## Recent Changes

- 2024-01-12: Initial project setup with complete schema and frontend components
- Complete data model with 15+ entities
- All page components built with responsive design
- Dark mode support implemented
- Design system established with Inter font

## User Preferences

- Clean, minimal enterprise design
- Professional blue color scheme (trust, reliability)
- Dense information display with clear hierarchy
- Fast, keyboard-friendly workflows
- Comprehensive but not overwhelming
