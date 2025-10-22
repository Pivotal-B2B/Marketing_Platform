# Contacts, Accounts & Fields UI Reference

## 📁 File Structure

### Page Components (client/src/pages/)

#### **Contacts Pages**
1. **`contacts.tsx`** - Main contacts list page
   - Features: Search, filters, bulk actions, pagination
   - Import/Export CSV functionality
   - Create contact dialog with form validation
   - Suppression list warnings (email & phone)
   - Selection & bulk operations (update, delete, add to list)
   
2. **`contact-detail.tsx`** - Individual contact detail page
   - Full contact information display
   - Linked account information
   - Contact navigation (prev/next)
   - Edit contact dialog
   - Lists & segments membership
   - Activity timeline
   - Professional history section
   - Data quality & source information
   - Custom fields display

#### **Accounts Pages**
1. **`accounts.tsx`** - Main accounts list page
   - Dual view modes: Cards & Table view
   - Search, filters, bulk actions, pagination
   - Import/Export CSV functionality
   - Create account dialog with form validation
   - Selection & bulk operations
   
2. **`account-detail.tsx`** - Individual account detail page
   - Full account/company overview
   - Related contacts table
   - Account navigation (prev/next)
   - Edit account dialog
   - AI industry suggestions review system
   - Lists & segments membership
   - Activity timeline
   - Technology stack & intent signals
   - Custom fields display
   
3. **`accounts-list-detail.tsx`** - Account list details (additional component)

### Component Files (client/src/components/)

#### **Custom Fields**
1. **`custom-fields-renderer.tsx`** - Dynamic custom field renderer
   - Supports multiple field types: text, number, email, url, date, boolean, select, multi_select, textarea
   - Renders appropriate input controls based on field type
   - Used in both contacts and accounts
   - Fetches active custom field definitions from API

#### **Account-Specific Components**
1. **`csv-import-accounts-dialog.tsx`** - CSV import dialog for accounts
2. **`accounts/account-card-premium.tsx`** - Premium card display for accounts

#### **General Components**
1. **`csv-field-mapper.tsx`** - CSV field mapping component (used for imports)

---

## 🗂️ Database Schema Fields

### **CONTACTS** (76+ fields total)

#### Core Identity
- `id` (varchar, UUID primary key)
- `accountId` (varchar, foreign key to accounts)
- `fullName` (text, required)
- `firstName` (text)
- `lastName` (text)

#### Contact Information
- `email` (text, required, unique)
- `emailNormalized` (text, indexed)
- `emailVerificationStatus` (enum: unknown/valid/invalid/risky)
- `emailAiConfidence` (numeric 0-100%)
- `emailStatus` (text, default 'unknown')

#### Phone Numbers
- `directPhone` (text) - Work direct line
- `directPhoneE164` (text) - E.164 format for calling
- `phoneExtension` (text)
- `phoneVerifiedAt` (timestamp)
- `phoneAiConfidence` (numeric 0-100%)
- `phoneStatus` (text, default 'unknown')
- `mobilePhone` (text) - Mobile direct
- `mobilePhoneE164` (text) - E.164 format

#### Professional Details
- `jobTitle` (text)
- `department` (text)
- `seniorityLevel` (text)

#### Career & Tenure
- `formerPosition` (text)
- `timeInCurrentPosition` (text) - e.g., "2 years"
- `timeInCurrentPositionMonths` (integer) - Computed for filtering
- `timeInCurrentCompany` (text) - e.g., "4 years"
- `timeInCurrentCompanyMonths` (integer) - Computed for filtering

#### Location & Geography
- `address` (text)
- `city` (text)
- `state` (text)
- `stateAbbr` (text) - e.g., "NC", "CA"
- `county` (text)
- `postalCode` (text)
- `country` (text)
- `contactLocation` (text) - Full formatted location
- `timezone` (text) - IANA timezone (e.g., 'America/New_York')

#### Social & Professional Networks
- `linkedinUrl` (text)

#### Data Enrichment
- `intentTopics` (text array) - Intent signals
- `tags` (text array)
- `customFields` (jsonb) - Dynamic custom fields

#### Source & Tracking
- `sourceSystem` (text)
- `sourceRecordId` (text)
- `sourceUpdatedAt` (timestamp)
- `researchDate` (timestamp) - Enrichment date
- `list` (text) - Source list identifier (e.g., "InFynd", "ZoomInfo")

#### Data Quality
- `isInvalid` (boolean, default false)
- `invalidReason` (text)
- `invalidatedAt` (timestamp)
- `invalidatedBy` (varchar, user ID)

#### Consent & Compliance
- `consentBasis` (text)
- `consentSource` (text)
- `consentTimestamp` (timestamp)

#### Ownership & Metadata
- `ownerId` (varchar, user ID)
- `deletedAt` (timestamp) - Soft delete
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

---

### **ACCOUNTS** (70+ fields total)

#### Core Identity
- `id` (varchar, UUID primary key)
- `name` (text, required)
- `nameNormalized` (text)
- `canonicalName` (text) - Standardized name
- `domain` (text)
- `domainNormalized` (text, unique)
- `websiteDomain` (text) - Naked domain (e.g., aircanada.com)
- `previousNames` (text array)

#### Industry Classification (Dual-Strategy)
- `industryStandardized` (text) - Primary industry
- `industrySecondary` (text array) - Secondary industries
- `industryCode` (text)
- `industryRaw` (text) - Original industry value
- `sicCode` (text)
- `naicsCode` (text)

#### AI Industry Enrichment
- `industryAiSuggested` (text)
- `industryAiCandidates` (jsonb) - AI candidate suggestions
- `industryAiTopk` (text array) - Top K suggestions
- `industryAiConfidence` (numeric 0-1)
- `industryAiSource` (text)
- `industryAiSuggestedAt` (timestamp)
- `industryAiReviewedBy` (varchar, user ID)
- `industryAiReviewedAt` (timestamp)
- `industryAiStatus` (enum: pending/reviewed/accepted/rejected)

#### Company Size & Revenue
- `annualRevenue` (numeric)
- `revenueRange` (enum) - "$500M - $1B", "$1B+", etc.
- `employeesSizeRange` (enum) - "501-1000", "10000+", etc.
- `staffCount` (integer)

#### Company Information
- `description` (text) - Multiline UTF-8 company description
- `yearFounded` (integer)
- `foundedDate` (date) - YYYY-MM-DD or YYYY
- `foundedDatePrecision` (text) - 'year' or 'full'

#### Headquarters Location
- `hqStreet1` (text)
- `hqStreet2` (text)
- `hqStreet3` (text)
- `hqAddress` (text) - Legacy combined
- `hqCity` (text)
- `hqState` (text)
- `hqStateAbbr` (text) - e.g., "NC", "CA"
- `hqPostalCode` (text)
- `hqCountry` (text)
- `companyLocation` (text) - Full formatted location

#### Contact Information
- `mainPhone` (text)
- `mainPhoneE164` (text) - E.164 format for calling
- `mainPhoneExtension` (text)

#### Social & Professional Networks
- `linkedinUrl` (text)
- `linkedinId` (text) - LinkedIn numeric ID
- `linkedinSpecialties` (text array)

#### Technology & Intent
- `techStack` (text array) - Technologies installed
- `webTechnologies` (text) - BuiltWith URL or CSV list
- `webTechnologiesJson` (jsonb) - Normalized array
- `intentTopics` (text array) - Intent signals

#### Enrichment & AI
- `aiEnrichmentData` (jsonb) - Full AI research results
- `aiEnrichmentDate` (timestamp) - Last enrichment

#### Hierarchy & Organization
- `parentAccountId` (varchar) - Parent company
- `tags` (text array)
- `customFields` (jsonb) - Dynamic custom fields

#### Source & Tracking
- `sourceSystem` (text)
- `sourceRecordId` (text)
- `sourceUpdatedAt` (timestamp)

#### Ownership & Metadata
- `ownerId` (varchar, user ID)
- `deletedAt` (timestamp) - Soft delete
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

---

## 🎨 UI Display Patterns

### **Contact Detail Page Sections**

1. **Contact Information Card**
   - Email with icon
   - Phone numbers (direct work + mobile) with click-to-call
   - Job title, department, seniority
   - Phone extensions
   - Email verification status badge
   - Location (city, state, county, postal code, country)
   - Full address strings
   - Intent topics (badges)

2. **Professional History Card** (conditional)
   - Former position
   - Time in current position
   - Time at company

3. **Data Quality & Source Card** (conditional)
   - Email AI confidence
   - Phone AI confidence
   - Source system
   - Research date
   - Timezone
   - List identifier

4. **Custom Fields Card** (conditional)
   - Dynamic display of all custom fields
   - 2-column grid layout

5. **Linked Account Card**
   - Company name with icon
   - Domain
   - Industry
   - Employee size
   - Revenue
   - Location
   - Click to view full account

6. **Lists & Segments Membership**
   - Shows all lists and dynamic segments

7. **Activity Timeline**
   - Real-time activity feed
   - Auto-refresh every 30 seconds

### **Account Detail Page Sections**

1. **Overview Card**
   - Industry (primary + secondary badges)
   - Employee size
   - Annual revenue
   - HQ location (city, state, country)
   - Postal code
   - Year founded
   - Main HQ phone with click-to-call
   - HQ street addresses (1, 2, 3)
   - Description
   - Full address string
   - Custom fields (2-column grid)
   - Tech stack (badges)
   - Intent topics (badges)

2. **AI Industry Suggestions Card** (conditional)
   - Shows AI-suggested industries
   - Confidence scores
   - Accept/Reject workflow
   - Primary/Secondary selection

3. **Related Contacts Table**
   - Name with avatar
   - Title
   - Email
   - Direct work phone
   - Mobile direct
   - Click-to-call links
   - View contact button

4. **Lists & Segments Membership**
   - Shows all lists and dynamic segments

5. **Activity Timeline**
   - Real-time activity feed
   - Auto-refresh every 30 seconds

---

## 📊 Custom Fields System

### **Field Types Supported**
1. **text** - Single-line text input
2. **number** - Numeric input
3. **email** - Email input with validation
4. **url** - URL input with validation
5. **date** - Date picker
6. **boolean** - Toggle switch
7. **select** - Single-select dropdown
8. **multi_select** - Multiple checkbox selection
9. **textarea** - Multi-line text (default fallback)

### **Custom Field Definition Table**
Fields stored in `custom_field_definitions`:
- `entityType` - 'account' or 'contact'
- `fieldKey` - Unique key in customFields JSONB
- `displayLabel` - Human-readable label
- `fieldType` - Type from list above
- `options` - For select/multi_select (JSON array)
- `required` - Boolean
- `defaultValue` - Text
- `helpText` - Tooltip/placeholder
- `displayOrder` - Sort order
- `active` - Enable/disable

### **Storage**
- Custom field values stored in `customFields` JSONB column
- Completely dynamic - no schema changes needed
- Filtered by entityType and active status
- Rendered using `CustomFieldsRenderer` component

---

## 🔧 Key UI Features

### **Contacts Page**
- ✅ Search by name, email, title, company
- ✅ Advanced sidebar filters (SidebarFilters component)
- ✅ Bulk selection (single page or all pages)
- ✅ Bulk operations: Update, Delete, Export, Add to List
- ✅ CSV Import with field mapping
- ✅ CSV Export (filtered results)
- ✅ Suppression warnings (email & phone)
- ✅ Create contact dialog with validation
- ✅ Pagination (50 items per page)

### **Accounts Page**
- ✅ Dual view modes (Cards / Table toggle)
- ✅ Search by name, domain, industry
- ✅ Advanced sidebar filters
- ✅ Bulk selection (cards or table rows)
- ✅ Bulk operations: Update, Delete, Export, Add to List
- ✅ CSV Import with smart field mapping
- ✅ CSV Export (filtered results)
- ✅ Create account dialog
- ✅ Pagination (50 items per page)

### **Detail Pages Navigation**
- ✅ Breadcrumb navigation
- ✅ Previous/Next entity navigation
- ✅ Quick action buttons (LinkedIn, Call, Email, Copy, Website)
- ✅ Edit dialog
- ✅ Related entity links (contact ↔ account)

---

## 📋 Data Completeness Indicators

Both contact and account detail pages calculate data completeness scores based on:

**Contact Key Fields:**
- firstName, lastName, jobTitle, department, seniorityLevel
- directPhone, mobilePhone, linkedinUrl
- city, state, country

**Account Key Fields:**
- domain, industryStandardized, employeesSizeRange
- annualRevenue, hqCity, hqState, hqCountry
- mainPhone, linkedinUrl

Displayed as percentage with color-coded badges.

---

## 🎯 Summary

**Total UI Files:**
- 5 page components (contacts, contact-detail, accounts, account-detail, accounts-list-detail)
- 4 component files (custom-fields-renderer, csv-import-accounts-dialog, account-card-premium, csv-field-mapper)

**Total Database Fields:**
- Contacts: 76+ fields
- Accounts: 70+ fields
- Custom Fields: Unlimited via JSONB

**Total Features:**
- Full CRUD operations
- Advanced filtering
- Bulk operations
- CSV Import/Export
- AI enrichment
- Custom fields system
- Activity tracking
- Suppression management
- Data quality scoring
