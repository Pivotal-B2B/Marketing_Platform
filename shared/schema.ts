// CRM Database Schema - referenced from blueprint:javascript_database
import { sql } from "drizzle-orm";
import { 
  pgTable, 
  text, 
  varchar, 
  timestamp, 
  jsonb, 
  integer,
  pgEnum,
  index,
  uniqueIndex,
  serial,
  boolean,
  real,
  numeric,
  foreignKey,
  primaryKey
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum('user_role', [
  'admin', 
  'campaign_manager', 
  'data_ops', 
  'qa_analyst', 
  'agent', 
  'client_user'
]);

export const campaignTypeEnum = pgEnum('campaign_type', ['email', 'call', 'combo']);
export const accountCapModeEnum = pgEnum('account_cap_mode', ['queue_size', 'connected_calls', 'positive_disp']);
export const queueStatusEnum = pgEnum('queue_status', ['queued', 'in_progress', 'done', 'removed']);
export const campaignStatusEnum = pgEnum('campaign_status', [
  'draft', 
  'scheduled', 
  'active', 
  'paused', 
  'completed', 
  'cancelled'
]);

export const qaStatusEnum = pgEnum('qa_status', [
  'new', 
  'under_review', 
  'approved', 
  'rejected', 
  'returned', 
  'published'
]);

export const emailVerificationStatusEnum = pgEnum('email_verification_status', [
  'unknown', 
  'valid', 
  'invalid', 
  'risky'
]);

export const orderStatusEnum = pgEnum('order_status', [
  'draft', 
  'submitted', 
  'in_progress', 
  'completed', 
  'cancelled'
]);

export const callDispositionEnum = pgEnum('call_disposition', [
  'no_answer',
  'busy',
  'voicemail',
  'connected',
  'not_interested',
  'callback_requested',
  'qualified',
  'dnc_request'
]);

export const entityTypeEnum = pgEnum('entity_type', ['account', 'contact']);

export const customFieldTypeEnum = pgEnum('custom_field_type', [
  'text',
  'number',
  'date',
  'boolean',
  'select',
  'multi_select',
  'url',
  'email'
]);

export const selectionTypeEnum = pgEnum('selection_type', ['explicit', 'filtered']);

export const visibilityScopeEnum = pgEnum('visibility_scope', ['private', 'team', 'global']);

export const sourceTypeEnum = pgEnum('source_type', ['segment', 'manual_upload', 'selection', 'filter']);

export const industryAIStatusEnum = pgEnum('industry_ai_status', [
  'pending',
  'accepted', 
  'rejected',
  'partial'
]);

export const filterFieldCategoryEnum = pgEnum('filter_field_category', [
  'contact_fields',
  'account_fields', 
  'suppression_fields',
  'email_campaign_fields',
  'telemarketing_campaign_fields',
  'qa_fields',
  'list_segment_fields',
  'client_portal_fields'
]);

export const contentAssetTypeEnum = pgEnum('content_asset_type', [
  'email_template',
  'landing_page',
  'social_post',
  'ad_creative',
  'pdf_document',
  'video',
  'call_script',
  'sales_sequence',
  'blog_post'
]);

export const contentApprovalStatusEnum = pgEnum('content_approval_status', [
  'draft',
  'in_review',
  'approved',
  'rejected',
  'published'
]);

export const socialPlatformEnum = pgEnum('social_platform', [
  'linkedin',
  'twitter',
  'facebook',
  'instagram',
  'youtube'
]);

export const contentToneEnum = pgEnum('content_tone', [
  'formal',
  'conversational',
  'insightful',
  'persuasive',
  'technical'
]);

// Content distribution enums
export const eventTypeEnum = pgEnum('event_type', [
  'webinar',
  'forum',
  'executive_dinner',
  'roundtable',
  'conference'
]);

export const locationTypeEnum = pgEnum('location_type', [
  'virtual',
  'in_person',
  'hybrid'
]);

export const communityEnum = pgEnum('community', [
  'finance',
  'marketing',
  'it',
  'hr',
  'cx_ux',
  'data_ai',
  'ops'
]);

export const resourceTypeEnum = pgEnum('resource_type', [
  'ebook',
  'infographic',
  'white_paper',
  'guide',
  'case_study'
]);

export const contentStatusEnum = pgEnum('content_status', [
  'draft',
  'published',
  'archived'
]);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: userRoleEnum("role").notNull().default('agent'),
  firstName: text("first_name"),
  lastName: text("last_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  emailIdx: index("users_email_idx").on(table.email),
  usernameIdx: index("users_username_idx").on(table.username),
}));

// Custom Field Definitions table
export const customFieldDefinitions = pgTable("custom_field_definitions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: entityTypeEnum("entity_type").notNull(), // 'account' or 'contact'
  fieldKey: text("field_key").notNull(), // Unique key used in customFields JSONB
  displayLabel: text("display_label").notNull(), // Human-readable label
  fieldType: customFieldTypeEnum("field_type").notNull(), // text, number, date, etc.
  options: jsonb("options"), // For select/multi_select types: array of options
  required: boolean("required").notNull().default(false),
  defaultValue: text("default_value"),
  helpText: text("help_text"), // Tooltip/help text for users
  displayOrder: integer("display_order").notNull().default(0), // Order in forms
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
}, (table) => ({
  entityKeyIdx: uniqueIndex("custom_field_definitions_entity_key_idx").on(table.entityType, table.fieldKey),
  entityTypeIdx: index("custom_field_definitions_entity_type_idx").on(table.entityType),
}));

// Accounts table
export const accounts = pgTable("accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  nameNormalized: text("name_normalized"),
  
  // Dual-Industry Field Strategy (Phase 8)
  industryStandardized: text("industry_standardized"),
  industrySecondary: text("industry_secondary").array(),
  industryCode: text("industry_code"),
  industryRaw: text("industry_raw"),
  
  // AI Enrichment Fields
  industryAiSuggested: text("industry_ai_suggested"),
  industryAiCandidates: jsonb("industry_ai_candidates"),
  industryAiTopk: text("industry_ai_topk").array(),
  industryAiConfidence: numeric("industry_ai_confidence", { precision: 5, scale: 4 }),
  industryAiSource: text("industry_ai_source"),
  industryAiSuggestedAt: timestamp("industry_ai_suggested_at"),
  industryAiReviewedBy: varchar("industry_ai_reviewed_by").references(() => users.id, { onDelete: 'set null' }),
  industryAiReviewedAt: timestamp("industry_ai_reviewed_at"),
  industryAiStatus: industryAIStatusEnum("industry_ai_status"),
  
  annualRevenue: text("annual_revenue"),
  employeesSizeRange: text("employees_size_range"),
  staffCount: integer("staff_count"),
  description: text("description"),
  hqAddress: text("hq_address"),
  hqCity: text("hq_city"),
  hqState: text("hq_state"),
  hqCountry: text("hq_country"),
  yearFounded: integer("year_founded"),
  sicCode: text("sic_code"),
  naicsCode: text("naics_code"),
  domain: text("domain"),
  domainNormalized: text("domain_normalized"),
  previousNames: text("previous_names").array(),
  linkedinUrl: text("linkedin_url"),
  linkedinSpecialties: text("linkedin_specialties").array(),
  mainPhone: text("main_phone"),
  mainPhoneE164: text("main_phone_e164"),
  mainPhoneExtension: text("main_phone_extension"),
  intentTopics: text("intent_topics").array(),
  techStack: text("tech_stack").array(),
  parentAccountId: varchar("parent_account_id"),
  tags: text("tags").array(),
  ownerId: varchar("owner_id").references(() => users.id),
  customFields: jsonb("custom_fields"),
  sourceSystem: text("source_system"),
  sourceRecordId: text("source_record_id"),
  sourceUpdatedAt: timestamp("source_updated_at"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  domainIdx: index("accounts_domain_idx").on(table.domain),
  domainNormalizedUniqueIdx: uniqueIndex("accounts_domain_normalized_unique_idx").on(table.domainNormalized).where(sql`deleted_at IS NULL`),
  nameCityCountryUniqueIdx: uniqueIndex("accounts_name_city_country_unique_idx").on(table.nameNormalized, table.hqCity, table.hqCountry).where(sql`deleted_at IS NULL AND domain_normalized IS NULL`),
  ownerIdx: index("accounts_owner_idx").on(table.ownerId),
  nameIdx: index("accounts_name_idx").on(table.name),
  specialtiesGinIdx: index("accounts_specialties_gin_idx").using('gin', table.linkedinSpecialties),
  techStackGinIdx: index("accounts_tech_stack_gin_idx").using('gin', table.techStack),
  tagsGinIdx: index("accounts_tags_gin_idx").using('gin', table.tags),
  parentAccountFk: foreignKey({
    columns: [table.parentAccountId],
    foreignColumns: [table.id],
    name: "accounts_parent_account_id_fkey"
  }).onDelete('set null'),
}));

// Contacts table
export const contacts = pgTable("contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").references(() => accounts.id, { onDelete: 'set null' }),
  fullName: text("full_name").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  jobTitle: text("job_title"),
  email: text("email").notNull(),
  emailNormalized: text("email_normalized"),
  emailVerificationStatus: emailVerificationStatusEnum("email_verification_status").default('unknown'),
  directPhone: text("direct_phone"),
  directPhoneE164: text("direct_phone_e164"),
  phoneExtension: text("phone_extension"),
  phoneVerifiedAt: timestamp("phone_verified_at"),
  mobilePhone: text("mobile_phone"),
  mobilePhoneE164: text("mobile_phone_e164"),
  seniorityLevel: text("seniority_level"),
  department: text("department"),
  address: text("address"),
  linkedinUrl: text("linkedin_url"),
  intentTopics: text("intent_topics").array(),
  tags: text("tags").array(),
  consentBasis: text("consent_basis"),
  consentSource: text("consent_source"),
  consentTimestamp: timestamp("consent_timestamp"),
  ownerId: varchar("owner_id").references(() => users.id),
  customFields: jsonb("custom_fields"),
  emailStatus: text("email_status").default('unknown'),
  phoneStatus: text("phone_status").default('unknown'),
  sourceSystem: text("source_system"),
  sourceRecordId: text("source_record_id"),
  sourceUpdatedAt: timestamp("source_updated_at"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  emailIdx: index("contacts_email_idx").on(table.email),
  emailNormalizedUniqueIdx: uniqueIndex("contacts_email_normalized_unique_idx").on(table.emailNormalized).where(sql`deleted_at IS NULL`),
  accountIdx: index("contacts_account_idx").on(table.accountId),
  phoneIdx: index("contacts_phone_idx").on(table.directPhoneE164),
  ownerIdx: index("contacts_owner_idx").on(table.ownerId),
  tagsGinIdx: index("contacts_tags_gin_idx").using('gin', table.tags),
}));

// Contact Emails - Secondary email addresses for contacts
export const contactEmails = pgTable("contact_emails", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contactId: varchar("contact_id").notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  email: text("email").notNull(),
  emailNormalized: text("email_normalized").notNull(),
  isPrimary: boolean("is_primary").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  contactIdx: index("contact_emails_contact_idx").on(table.contactId),
  emailNormalizedUniqueIdx: uniqueIndex("contact_emails_email_normalized_unique_idx").on(table.emailNormalized).where(sql`deleted_at IS NULL`),
}));

// Account Domains - Alternate/additional domains for accounts
export const accountDomains = pgTable("account_domains", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  domain: text("domain").notNull(),
  domainNormalized: text("domain_normalized").notNull(),
  isPrimary: boolean("is_primary").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  accountIdx: index("account_domains_account_idx").on(table.accountId),
  domainNormalizedUniqueIdx: uniqueIndex("account_domains_domain_normalized_unique_idx").on(table.domainNormalized).where(sql`deleted_at IS NULL`),
}));

// Field Change Log - Audit trail for field-level survivorship
export const fieldChangeLog = pgTable("field_change_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: text("entity_type").notNull(), // 'contact', 'account'
  entityId: varchar("entity_id").notNull(),
  fieldKey: text("field_key").notNull(),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  sourceSystem: text("source_system"),
  actorId: varchar("actor_id").references(() => users.id),
  survivorshipPolicy: text("survivorship_policy"), // e.g., 'prefer_new', 'max_recency', 'union'
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  entityIdx: index("field_change_log_entity_idx").on(table.entityType, table.entityId),
  createdAtIdx: index("field_change_log_created_at_idx").on(table.createdAt),
}));

// Dedupe Review Queue - Human review for fuzzy matches
export const dedupeReviewQueue = pgTable("dedupe_review_queue", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: text("entity_type").notNull(), // 'contact', 'account'
  candidateAId: varchar("candidate_a_id").notNull(),
  candidateBId: varchar("candidate_b_id").notNull(),
  matchScore: real("match_score").notNull(), // 0.0 to 1.0 confidence
  matchReason: text("match_reason"), // e.g., 'similar_name_same_account', 'trigram_domain'
  status: text("status").notNull().default('pending'), // 'pending', 'approved_merge', 'rejected', 'auto_merged'
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  statusIdx: index("dedupe_review_queue_status_idx").on(table.status),
  entityTypeIdx: index("dedupe_review_queue_entity_type_idx").on(table.entityType),
}));

// Industry Reference - Standardized taxonomy (LinkedIn/NAICS)
export const industryReference = pgTable("industry_reference", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  naicsCode: text("naics_code"),
  synonyms: text("synonyms").array().default(sql`'{}'::text[]`),
  parentId: varchar("parent_id"), // For hierarchical grouping
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  nameIdx: index("industry_reference_name_idx").on(table.name),
  isActiveIdx: index("industry_reference_is_active_idx").on(table.isActive),
  parentIdFk: foreignKey({
    columns: [table.parentId],
    foreignColumns: [table.id],
    name: "industry_reference_parent_id_fkey"
  }).onDelete('set null'),
}));

// Company Size Reference - Standardized employee ranges
export const companySizeReference = pgTable("company_size_reference", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(), // A, B, C, D, E, F, G, H, I
  label: text("label").notNull(),
  minEmployees: integer("min_employees").notNull(),
  maxEmployees: integer("max_employees"), // NULL for "10,000+"
  sortOrder: integer("sort_order").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  codeIdx: index("company_size_reference_code_idx").on(table.code),
  sortOrderIdx: index("company_size_reference_sort_order_idx").on(table.sortOrder),
}));

// Revenue Range Reference - Standardized annual revenue brackets (USD)
export const revenueRangeReference = pgTable("revenue_range_reference", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  label: text("label").notNull().unique(),
  description: text("description"),
  minRevenue: numeric("min_revenue", { precision: 15, scale: 2 }),
  maxRevenue: numeric("max_revenue", { precision: 15, scale: 2 }), // NULL for "Over $5B"
  sortOrder: integer("sort_order").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  labelIdx: index("revenue_range_reference_label_idx").on(table.label),
  sortOrderIdx: index("revenue_range_reference_sort_order_idx").on(table.sortOrder),
}));

// Segments table (dynamic filters)
export const segments = pgTable("segments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  entityType: entityTypeEnum("entity_type").notNull().default('contact'),
  definitionJson: jsonb("definition_json").notNull(),
  ownerId: varchar("owner_id").references(() => users.id),
  lastRefreshedAt: timestamp("last_refreshed_at"),
  isActive: boolean("is_active").notNull().default(true),
  recordCountCache: integer("record_count_cache").default(0),
  tags: text("tags").array().default(sql`'{}'::text[]`),
  visibilityScope: visibilityScopeEnum("visibility_scope").notNull().default('private'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  entityTypeIdx: index("segments_entity_type_idx").on(table.entityType),
  isActiveIdx: index("segments_is_active_idx").on(table.isActive),
  ownerIdIdx: index("segments_owner_id_idx").on(table.ownerId),
}));

// Lists table (static snapshots)
export const lists = pgTable("lists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  entityType: entityTypeEnum("entity_type").notNull().default('contact'),
  sourceType: sourceTypeEnum("source_type").notNull().default('manual_upload'),
  sourceRef: varchar("source_ref"), // Segment ID, import ID, or selection context ID
  snapshotTs: timestamp("snapshot_ts").notNull().defaultNow(),
  recordIds: text("record_ids").array().notNull().default(sql`'{}'::text[]`),
  ownerId: varchar("owner_id").references(() => users.id),
  tags: text("tags").array().default(sql`'{}'::text[]`),
  visibilityScope: visibilityScopeEnum("visibility_scope").notNull().default('private'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  entityTypeIdx: index("lists_entity_type_idx").on(table.entityType),
  sourceTypeIdx: index("lists_source_type_idx").on(table.sourceType),
  ownerIdIdx: index("lists_owner_id_idx").on(table.ownerId),
}));

// Domain Sets table (Phase 21 - Upgraded for ABM & Campaign Audience Mapping)
export const domainSets = pgTable("domain_sets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  uploadFileUri: text("upload_file_uri"),
  totalUploaded: integer("total_uploaded").default(0),
  matchedAccounts: integer("matched_accounts").default(0),
  matchedContacts: integer("matched_contacts").default(0),
  duplicatesRemoved: integer("duplicates_removed").default(0),
  unknownDomains: integer("unknown_domains").default(0),
  status: text("status").notNull().default('processing'), // processing | completed | error
  ownerId: varchar("owner_id").references(() => users.id),
  tags: text("tags").array().default(sql`'{}'::text[]`),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  ownerIdIdx: index("domain_sets_owner_id_idx").on(table.ownerId),
  statusIdx: index("domain_sets_status_idx").on(table.status),
}));

// Domain Set Items table (individual domains with matching results)
export const domainSetItems = pgTable("domain_set_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  domainSetId: varchar("domain_set_id").references(() => domainSets.id, { onDelete: 'cascade' }).notNull(),
  domain: text("domain").notNull(),
  normalizedDomain: text("normalized_domain").notNull(),
  accountId: varchar("account_id").references(() => accounts.id, { onDelete: 'set null' }),
  matchType: text("match_type"), // exact | fuzzy | none
  matchConfidence: numeric("match_confidence", { precision: 3, scale: 2 }), // 0.00 to 1.00
  matchedContactsCount: integer("matched_contacts_count").default(0),
  autoCreatedAccount: boolean("auto_created_account").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  domainSetIdIdx: index("domain_set_items_domain_set_id_idx").on(table.domainSetId),
  accountIdIdx: index("domain_set_items_account_id_idx").on(table.accountId),
  normalizedDomainIdx: index("domain_set_items_normalized_domain_idx").on(table.normalizedDomain),
}));

// Domain Set Contact Links table (links domains to contacts)
export const domainSetContactLinks = pgTable("domain_set_contact_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  domainSetId: varchar("domain_set_id").references(() => domainSets.id, { onDelete: 'cascade' }).notNull(),
  contactId: varchar("contact_id").references(() => contacts.id, { onDelete: 'cascade' }).notNull(),
  accountId: varchar("account_id").references(() => accounts.id, { onDelete: 'cascade' }),
  matchedVia: text("matched_via").notNull(), // domain | email | manual
  includedInList: boolean("included_in_list").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  domainSetIdIdx: index("domain_set_contact_links_domain_set_id_idx").on(table.domainSetId),
  contactIdIdx: index("domain_set_contact_links_contact_id_idx").on(table.contactId),
}));

// Campaigns table
export const campaigns = pgTable("campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: campaignTypeEnum("type").notNull(),
  name: text("name").notNull(),
  status: campaignStatusEnum("status").notNull().default('draft'),
  brandId: varchar("brand_id"),
  scheduleJson: jsonb("schedule_json"),
  assignedTeams: text("assigned_teams").array(),
  audienceRefs: jsonb("audience_refs"),
  throttlingConfig: jsonb("throttling_config"),
  emailSubject: text("email_subject"),
  emailHtmlContent: text("email_html_content"),
  callScript: text("call_script"),
  qualificationQuestions: jsonb("qualification_questions"),
  ownerId: varchar("owner_id").references(() => users.id),
  accountCapEnabled: boolean("account_cap_enabled").notNull().default(false),
  accountCapValue: integer("account_cap_value"),
  accountCapMode: accountCapModeEnum("account_cap_mode"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  launchedAt: timestamp("launched_at"),
}, (table) => ({
  statusIdx: index("campaigns_status_idx").on(table.status),
  typeIdx: index("campaigns_type_idx").on(table.type),
}));

// Campaign Queue table (for account lead cap enforcement)
export const campaignQueue = pgTable("campaign_queue", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").references(() => campaigns.id, { onDelete: 'cascade' }).notNull(),
  contactId: varchar("contact_id").references(() => contacts.id, { onDelete: 'cascade' }).notNull(),
  accountId: varchar("account_id").references(() => accounts.id, { onDelete: 'cascade' }).notNull(),
  agentId: varchar("agent_id").references(() => users.id),
  priority: integer("priority").notNull().default(0),
  status: queueStatusEnum("status").notNull().default('queued'),
  removedReason: text("removed_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  campaignAccountIdx: index("campaign_queue_camp_acct_idx").on(table.campaignId, table.accountId),
  campaignStatusIdx: index("campaign_queue_camp_status_idx").on(table.campaignId, table.status),
  campaignContactUniq: uniqueIndex("campaign_queue_camp_contact_uniq").on(table.campaignId, table.contactId),
  agentIdx: index("campaign_queue_agent_idx").on(table.agentId),
}));

// Campaign Account Stats table (for O(1) cap checks)
export const campaignAccountStats = pgTable("campaign_account_stats", {
  campaignId: varchar("campaign_id").references(() => campaigns.id, { onDelete: 'cascade' }).notNull(),
  accountId: varchar("account_id").references(() => accounts.id, { onDelete: 'cascade' }).notNull(),
  queuedCount: integer("queued_count").notNull().default(0),
  connectedCount: integer("connected_count").notNull().default(0),
  positiveDispCount: integer("positive_disp_count").notNull().default(0),
  lastEnforcedAt: timestamp("last_enforced_at"),
}, (table) => ({
  pk: primaryKey({ columns: [table.campaignId, table.accountId] }),
}));

// Email Messages table
export const emailMessages = pgTable("email_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").references(() => campaigns.id, { onDelete: 'cascade' }),
  contactId: varchar("contact_id").references(() => contacts.id, { onDelete: 'cascade' }),
  providerMessageId: text("provider_message_id"),
  status: text("status").notNull().default('pending'),
  deliveredAt: timestamp("delivered_at"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  bouncedAt: timestamp("bounced_at"),
  complaintAt: timestamp("complaint_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  campaignIdx: index("email_messages_campaign_idx").on(table.campaignId),
  contactIdx: index("email_messages_contact_idx").on(table.contactId),
  statusIdx: index("email_messages_status_idx").on(table.status),
}));

// Calls table
export const calls = pgTable("calls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  queueItemId: varchar("queue_item_id").references(() => campaignQueue.id, { onDelete: 'cascade' }),
  campaignId: varchar("campaign_id").references(() => campaigns.id, { onDelete: 'cascade' }),
  contactId: varchar("contact_id").references(() => contacts.id, { onDelete: 'cascade' }),
  agentId: varchar("agent_id").references(() => users.id),
  disposition: callDispositionEnum("disposition"),
  duration: integer("duration"),
  recordingUrl: text("recording_url"),
  callbackRequested: boolean("callback_requested").default(false),
  notes: text("notes"),
  qualificationData: jsonb("qualification_data"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  campaignIdx: index("calls_campaign_idx").on(table.campaignId),
  contactIdx: index("calls_contact_idx").on(table.contactId),
  agentIdx: index("calls_agent_idx").on(table.agentId),
  queueItemIdx: index("calls_queue_item_idx").on(table.queueItemId),
}));

// Leads table
export const leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contactId: varchar("contact_id").references(() => contacts.id, { onDelete: 'cascade' }).notNull(),
  campaignId: varchar("campaign_id").references(() => campaigns.id, { onDelete: 'cascade' }),
  qaStatus: qaStatusEnum("qa_status").notNull().default('new'),
  checklistJson: jsonb("checklist_json"),
  approvedAt: timestamp("approved_at"),
  approvedById: varchar("approved_by_id").references(() => users.id),
  rejectedReason: text("rejected_reason"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  qaStatusIdx: index("leads_qa_status_idx").on(table.qaStatus),
  campaignIdx: index("leads_campaign_idx").on(table.campaignId),
}));

// Suppression - Email
export const suppressionEmails = pgTable("suppression_emails", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  reason: text("reason"),
  source: text("source"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  emailIdx: index("suppression_emails_idx").on(table.email),
}));

// Suppression - Phone
export const suppressionPhones = pgTable("suppression_phones", {
  id: serial("id").primaryKey(),
  phoneE164: text("phone_e164").notNull().unique(),
  reason: text("reason"),
  source: text("source"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  phoneIdx: index("suppression_phones_idx").on(table.phoneE164),
}));

// Campaign Orders (Client Portal)
export const campaignOrders = pgTable("campaign_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientUserId: varchar("client_user_id").references(() => users.id).notNull(),
  orderNumber: text("order_number").notNull().unique(),
  type: campaignTypeEnum("type").notNull(),
  status: orderStatusEnum("status").notNull().default('draft'),
  leadGoal: integer("lead_goal"),
  pacingConfig: jsonb("pacing_config"),
  qualificationCriteriaJson: jsonb("qualification_criteria_json"),
  complianceConfirmed: boolean("compliance_confirmed").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  submittedAt: timestamp("submitted_at"),
}, (table) => ({
  clientIdx: index("campaign_orders_client_idx").on(table.clientUserId),
  statusIdx: index("campaign_orders_status_idx").on(table.status),
}));

// Order Audience Snapshots
export const orderAudienceSnapshots = pgTable("order_audience_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => campaignOrders.id, { onDelete: 'cascade' }).notNull(),
  audienceDefinitionJson: jsonb("audience_definition_json").notNull(),
  contactCount: integer("contact_count"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Order Assets
export const orderAssets = pgTable("order_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => campaignOrders.id, { onDelete: 'cascade' }).notNull(),
  assetType: text("asset_type").notNull(),
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Order Qualification Questions
export const orderQualificationQuestions = pgTable("order_qualification_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => campaignOrders.id, { onDelete: 'cascade' }).notNull(),
  questionText: text("question_text").notNull(),
  questionType: text("question_type").notNull(),
  optionsJson: jsonb("options_json"),
  required: boolean("required").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Order Campaign Links (Bridge Model - Manual Linking)
export const orderCampaignLinks = pgTable("order_campaign_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => campaignOrders.id, { onDelete: 'cascade' }).notNull(),
  campaignId: varchar("campaign_id").references(() => campaigns.id, { onDelete: 'cascade' }).notNull(),
  linkedById: varchar("linked_by_id").references(() => users.id).notNull(),
  linkedAt: timestamp("linked_at").notNull().defaultNow(),
}, (table) => ({
  orderIdx: index("order_campaign_links_order_idx").on(table.orderId),
  campaignIdx: index("order_campaign_links_campaign_idx").on(table.campaignId),
}));

// Campaign Audience Snapshots
export const campaignAudienceSnapshots = pgTable("campaign_audience_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").references(() => campaigns.id, { onDelete: 'cascade' }).notNull(),
  audienceDefinition: jsonb("audience_definition").notNull(),
  contactIds: text("contact_ids").array(),
  accountIds: text("account_ids").array(),
  contactCount: integer("contact_count").default(0),
  accountCount: integer("account_count").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  campaignIdx: index("campaign_audience_snapshots_campaign_idx").on(table.campaignId),
}));

// Sender Profiles (Enhanced for Phase 26)
export const senderProfiles = pgTable("sender_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // e.g., "Pivotal — Marketing"
  brandId: varchar("brand_id"),
  fromName: text("from_name").notNull(),
  fromEmail: text("from_email").notNull(),
  replyTo: text("reply_to"),
  replyToEmail: text("reply_to_email"), // backward compatibility
  dkimDomain: text("dkim_domain"),
  trackingDomain: text("tracking_domain"),
  trackingDomainId: integer("tracking_domain_id"), // FK to tracking_domains
  espAdapter: text("esp_adapter").default('sendgrid'), // 'ses', 'sendgrid', 'mailgun'
  ipPoolId: integer("ip_pool_id"), // FK to ip_pools; null = shared
  defaultThrottleTps: integer("default_throttle_tps").default(10),
  dailyCap: integer("daily_cap"),
  signatureHtml: text("signature_html"),
  isActive: boolean("is_active").default(true),
  status: text("status").default('active'), // 'active' or 'suspended'
  // Phase 26: Email Infrastructure fields
  isDefault: boolean("is_default").default(false),
  espProvider: text("esp_provider"), // 'sendgrid', 'ses', 'mailgun'
  domainAuthId: integer("domain_auth_id"), // FK to domain_auth
  isVerified: boolean("is_verified"),
  reputationScore: integer("reputation_score"), // 0-100
  warmupStatus: text("warmup_status"), // 'not_started', 'in_progress', 'completed', 'paused'
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Email Templates
export const emailTemplates = pgTable("email_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  htmlContent: text("html_content").notNull(),
  placeholders: text("placeholders").array(),
  version: integer("version").default(1),
  isApproved: boolean("is_approved").default(false),
  approvedById: varchar("approved_by_id").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Email Sends
export const emailSends = pgTable("email_sends", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").references(() => campaigns.id, { onDelete: 'cascade' }).notNull(),
  contactId: varchar("contact_id").references(() => contacts.id, { onDelete: 'cascade' }).notNull(),
  templateId: varchar("template_id").references(() => emailTemplates.id),
  senderProfileId: varchar("sender_profile_id").references(() => senderProfiles.id),
  providerMessageId: text("provider_message_id"),
  provider: text("provider"),
  status: text("status").notNull().default('pending'),
  sendAt: timestamp("send_at"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  campaignIdx: index("email_sends_campaign_idx").on(table.campaignId),
  contactIdx: index("email_sends_contact_idx").on(table.contactId),
  statusIdx: index("email_sends_status_idx").on(table.status),
}));

// Email Events
export const emailEvents = pgTable("email_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sendId: varchar("send_id").references(() => emailSends.id, { onDelete: 'cascade' }).notNull(),
  type: text("type").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  sendIdx: index("email_events_send_idx").on(table.sendId),
  typeIdx: index("email_events_type_idx").on(table.type),
}));

// Call Scripts
export const callScripts = pgTable("call_scripts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").references(() => campaigns.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  content: text("content").notNull(),
  version: integer("version").default(1),
  changelog: text("changelog"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Call Attempts
export const callAttempts = pgTable("call_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").references(() => campaigns.id, { onDelete: 'cascade' }).notNull(),
  contactId: varchar("contact_id").references(() => contacts.id, { onDelete: 'cascade' }).notNull(),
  agentId: varchar("agent_id").references(() => users.id).notNull(),
  telnyxCallId: text("telnyx_call_id"),
  recordingUrl: text("recording_url"),
  disposition: callDispositionEnum("disposition"),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  duration: integer("duration"),
  notes: text("notes"),
  // Phase 27: Telephony enhancements
  wrapupSeconds: integer("wrapup_seconds"), // Time spent in wrap-up state
  scriptVersionId: varchar("script_version_id"), // FK to call_scripts (version tracking)
  qaLocked: boolean("qa_locked").default(false), // Prevents editing after QA review
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  campaignIdx: index("call_attempts_campaign_idx").on(table.campaignId),
  contactIdx: index("call_attempts_contact_idx").on(table.contactId),
  agentIdx: index("call_attempts_agent_idx").on(table.agentId),
}));

// Call Events
export const callEvents = pgTable("call_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  attemptId: varchar("attempt_id").references(() => callAttempts.id, { onDelete: 'cascade' }).notNull(),
  type: text("type").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  attemptIdx: index("call_events_attempt_idx").on(table.attemptId),
  typeIdx: index("call_events_type_idx").on(table.type),
}));

// ==================== PHASE 27: TELEPHONY - SOFTPHONE & COMPLIANCE ====================

// Softphone Profile - Per-agent audio device preferences
export const softphoneProfiles = pgTable("softphone_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  micDeviceId: text("mic_device_id"), // Browser audio input device ID
  speakerDeviceId: text("speaker_device_id"), // Browser audio output device ID
  lastTestAt: timestamp("last_test_at"), // Last time agent ran device test
  testResultsJson: jsonb("test_results_json"), // { micLevel: 85, latency: 45, mos: 4.2 }
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdx: index("softphone_profiles_user_idx").on(table.userId),
}));

// Call Recording Access Log - Audit trail for QA/Admin playback & downloads
export const callRecordingAccessLogs = pgTable("call_recording_access_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  callAttemptId: varchar("call_attempt_id").references(() => callAttempts.id, { onDelete: 'cascade' }).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  action: text("action").notNull(), // 'play' or 'download'
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  attemptIdx: index("call_recording_access_logs_attempt_idx").on(table.callAttemptId),
  userIdx: index("call_recording_access_logs_user_idx").on(table.userId),
  actionIdx: index("call_recording_access_logs_action_idx").on(table.action),
}));

// Qualification Responses
export const qualificationResponses = pgTable("qualification_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  attemptId: varchar("attempt_id").references(() => callAttempts.id, { onDelete: 'cascade' }),
  leadId: varchar("lead_id").references(() => leads.id, { onDelete: 'cascade' }),
  schemaVersion: text("schema_version"),
  answersJson: jsonb("answers_json").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  attemptIdx: index("qualification_responses_attempt_idx").on(table.attemptId),
  leadIdx: index("qualification_responses_lead_idx").on(table.leadId),
}));

// Bulk Imports
export const bulkImports = pgTable("bulk_imports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url"),
  status: text("status").notNull().default('processing'),
  totalRows: integer("total_rows"),
  successRows: integer("success_rows").default(0),
  errorRows: integer("error_rows").default(0),
  errorFileUrl: text("error_file_url"),
  uploadedById: varchar("uploaded_by_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  statusIdx: index("bulk_imports_status_idx").on(table.status),
}));

// Audit Logs
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: varchar("entity_id").notNull(),
  changesJson: jsonb("changes_json"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdx: index("audit_logs_user_idx").on(table.userId),
  entityIdx: index("audit_logs_entity_idx").on(table.entityType, table.entityId),
  createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt),
}));

// Saved Filters
export const savedFilters = pgTable("saved_filters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  entityType: text("entity_type").notNull(),
  filterGroup: jsonb("filter_group").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdx: index("saved_filters_user_idx").on(table.userId),
  entityTypeIdx: index("saved_filters_entity_type_idx").on(table.entityType),
}));

// Selection Contexts for bulk operations
export const selectionContexts = pgTable("selection_contexts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  entityType: entityTypeEnum("entity_type").notNull(),
  selectionType: selectionTypeEnum("selection_type").notNull(), // 'explicit' or 'filtered'
  ids: text("ids").array(), // For explicit selections (≤10k records)
  filterGroup: jsonb("filter_group"), // For filtered selections (all matching)
  totalCount: integer("total_count").notNull(), // Total records in selection
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(), // 15 min from creation
}, (table) => ({
  userIdx: index("selection_contexts_user_idx").on(table.userId),
  expiresIdx: index("selection_contexts_expires_idx").on(table.expiresAt),
}));

// Filter Field Registry - Dynamic field definitions for scalable filtering
export const filterFieldRegistry = pgTable("filter_field_registry", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entity: text("entity").notNull(), // 'contact', 'account', 'campaign', etc.
  key: text("key").notNull(), // Field key in database (e.g., 'linkedin_url', 'job_title')
  label: text("label").notNull(), // Display name (e.g., 'LinkedIn Profile URL')
  type: text("type").notNull(), // 'string', 'number', 'boolean', 'array', 'date'
  operators: text("operators").array().notNull(), // Allowed operators for this field type
  category: filterFieldCategoryEnum("category").notNull(), // Categorization for UI grouping
  isCustom: boolean("is_custom").notNull().default(false), // Custom vs. system field
  visibleInFilters: boolean("visible_in_filters").notNull().default(true), // Show in filter UI
  description: text("description"), // Helper text for users
  sortOrder: integer("sort_order").default(0), // Display order within category
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  entityKeyIdx: index("filter_field_registry_entity_key_idx").on(table.entity, table.key),
  categoryIdx: index("filter_field_registry_category_idx").on(table.category),
  visibleIdx: index("filter_field_registry_visible_idx").on(table.visibleInFilters),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  ownedAccounts: many(accounts),
  ownedContacts: many(contacts),
  campaignOrders: many(campaignOrders),
  auditLogs: many(auditLogs),
  savedFilters: many(savedFilters),
  selectionContexts: many(selectionContexts),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  owner: one(users, { fields: [accounts.ownerId], references: [users.id] }),
  contacts: many(contacts),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  account: one(accounts, { fields: [contacts.accountId], references: [accounts.id] }),
  owner: one(users, { fields: [contacts.ownerId], references: [users.id] }),
  leads: many(leads),
  emailMessages: many(emailMessages),
  calls: many(calls),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  owner: one(users, { fields: [campaigns.ownerId], references: [users.id] }),
  emailMessages: many(emailMessages),
  calls: many(calls),
  leads: many(leads),
  orderLinks: many(orderCampaignLinks),
}));

export const campaignOrdersRelations = relations(campaignOrders, ({ one, many }) => ({
  client: one(users, { fields: [campaignOrders.clientUserId], references: [users.id] }),
  audienceSnapshots: many(orderAudienceSnapshots),
  assets: many(orderAssets),
  qualificationQuestions: many(orderQualificationQuestions),
  campaignLinks: many(orderCampaignLinks),
}));

export const savedFiltersRelations = relations(savedFilters, ({ one }) => ({
  user: one(users, { fields: [savedFilters.userId], references: [users.id] }),
}));

export const selectionContextsRelations = relations(selectionContexts, ({ one }) => ({
  user: one(users, { fields: [selectionContexts.userId], references: [users.id] }),
}));

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCustomFieldDefinitionSchema = createInsertSchema(customFieldDefinitions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateCustomFieldDefinitionSchema = insertCustomFieldDefinitionSchema.partial().extend({
  // Prevent changing entity type after creation
  entityType: z.never().optional(),
});

export const insertAccountSchema = createInsertSchema(accounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Industry update schemas (Phase 8: Dual-Industry Strategy)
export const updateAccountIndustrySchema = z.object({
  primary: z.string().optional(),
  secondary: z.array(z.string()).optional(),
  code: z.string().optional(),
});

export const reviewAccountIndustryAISchema = z.object({
  accept_primary: z.string().optional(),
  add_secondary: z.array(z.string()).optional(),
  reject: z.array(z.string()).optional(),
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  mobilePhone: z.string().optional(),
});

export const insertSegmentSchema = createInsertSchema(segments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  recordCountCache: true,
  lastRefreshedAt: true,
});

export const insertListSchema = createInsertSchema(lists).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  snapshotTs: true,
});

export const insertDomainSetSchema = createInsertSchema(domainSets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDomainSetItemSchema = createInsertSchema(domainSetItems).omit({
  id: true,
  createdAt: true,
});

export const insertDomainSetContactLinkSchema = createInsertSchema(domainSetContactLinks).omit({
  id: true,
  createdAt: true,
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  launchedAt: true,
});

export const insertCampaignQueueSchema = createInsertSchema(campaignQueue).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCampaignAccountStatsSchema = createInsertSchema(campaignAccountStats).omit({
  lastEnforcedAt: true,
});

export const insertCampaignAudienceSnapshotSchema = createInsertSchema(campaignAudienceSnapshots).omit({
  id: true,
  createdAt: true,
});

export const insertSenderProfileSchema = createInsertSchema(senderProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  approvedAt: true,
});

export const insertEmailSendSchema = createInsertSchema(emailSends).omit({
  id: true,
  createdAt: true,
  sentAt: true,
});

export const insertEmailEventSchema = createInsertSchema(emailEvents).omit({
  id: true,
  createdAt: true,
});

export const insertCallScriptSchema = createInsertSchema(callScripts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCallAttemptSchema = createInsertSchema(callAttempts).omit({
  id: true,
  createdAt: true,
});

export const insertCallEventSchema = createInsertSchema(callEvents).omit({
  id: true,
  createdAt: true,
});

export const insertSoftphoneProfileSchema = createInsertSchema(softphoneProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCallRecordingAccessLogSchema = createInsertSchema(callRecordingAccessLogs).omit({
  id: true,
  createdAt: true,
});

export const insertQualificationResponseSchema = createInsertSchema(qualificationResponses).omit({
  id: true,
  createdAt: true,
});

export const insertEmailMessageSchema = createInsertSchema(emailMessages).omit({
  id: true,
  createdAt: true,
});

export const insertCallSchema = createInsertSchema(calls).omit({
  id: true,
  createdAt: true,
});

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSuppressionEmailSchema = createInsertSchema(suppressionEmails).omit({
  id: true,
  createdAt: true,
});

export const insertSuppressionPhoneSchema = createInsertSchema(suppressionPhones).omit({
  id: true,
  createdAt: true,
});

export const insertCampaignOrderSchema = createInsertSchema(campaignOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  submittedAt: true,
});

export const insertOrderAudienceSnapshotSchema = createInsertSchema(orderAudienceSnapshots).omit({
  id: true,
  createdAt: true,
});

export const insertOrderAssetSchema = createInsertSchema(orderAssets).omit({
  id: true,
  createdAt: true,
});

export const insertOrderQualificationQuestionSchema = createInsertSchema(orderQualificationQuestions).omit({
  id: true,
  createdAt: true,
});

export const insertOrderCampaignLinkSchema = createInsertSchema(orderCampaignLinks).omit({
  id: true,
  linkedAt: true,
});

export const insertBulkImportSchema = createInsertSchema(bulkImports).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export const insertSavedFilterSchema = createInsertSchema(savedFilters).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSelectionContextSchema = createInsertSchema(selectionContexts).omit({
  id: true,
  createdAt: true,
}).refine(
  (data) => {
    // For explicit selections, enforce ≤10k IDs limit
    if (data.selectionType === 'explicit' && data.ids && data.ids.length > 10000) {
      return false;
    }
    // For explicit selections, ids must be provided
    if (data.selectionType === 'explicit' && (!data.ids || data.ids.length === 0)) {
      return false;
    }
    // For filtered selections, filterGroup must be provided
    if (data.selectionType === 'filtered' && !data.filterGroup) {
      return false;
    }
    return true;
  },
  {
    message: "Invalid selection: explicit selections require ≤10k IDs, filtered selections require filterGroup"
  }
);

export const insertFilterFieldSchema = createInsertSchema(filterFieldRegistry).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContactEmailSchema = createInsertSchema(contactEmails).omit({
  id: true,
  createdAt: true,
});

export const insertAccountDomainSchema = createInsertSchema(accountDomains).omit({
  id: true,
  createdAt: true,
});

export const insertFieldChangeLogSchema = createInsertSchema(fieldChangeLog).omit({
  id: true,
  createdAt: true,
});

export const insertDedupeReviewQueueSchema = createInsertSchema(dedupeReviewQueue).omit({
  id: true,
  createdAt: true,
});

export const insertIndustryReferenceSchema = createInsertSchema(industryReference).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCompanySizeReferenceSchema = createInsertSchema(companySizeReference).omit({
  id: true,
  createdAt: true,
});

export const insertRevenueRangeReferenceSchema = createInsertSchema(revenueRangeReference).omit({
  id: true,
  createdAt: true,
});

// Inferred Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type CustomFieldDefinition = typeof customFieldDefinitions.$inferSelect;
export type InsertCustomFieldDefinition = z.infer<typeof insertCustomFieldDefinitionSchema>;

export type Account = typeof accounts.$inferSelect;
export type InsertAccount = z.infer<typeof insertAccountSchema>;

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;

export type Segment = typeof segments.$inferSelect;
export type InsertSegment = z.infer<typeof insertSegmentSchema>;

export type List = typeof lists.$inferSelect;
export type InsertList = z.infer<typeof insertListSchema>;

export type DomainSet = typeof domainSets.$inferSelect;
export type InsertDomainSet = z.infer<typeof insertDomainSetSchema>;

export type DomainSetItem = typeof domainSetItems.$inferSelect;
export type InsertDomainSetItem = z.infer<typeof insertDomainSetItemSchema>;

export type DomainSetContactLink = typeof domainSetContactLinks.$inferSelect;
export type InsertDomainSetContactLink = z.infer<typeof insertDomainSetContactLinkSchema>;

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;

export type CampaignAudienceSnapshot = typeof campaignAudienceSnapshots.$inferSelect;
export type InsertCampaignAudienceSnapshot = z.infer<typeof insertCampaignAudienceSnapshotSchema>;

export type SenderProfile = typeof senderProfiles.$inferSelect;
export type InsertSenderProfile = z.infer<typeof insertSenderProfileSchema>;

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;

export type EmailSend = typeof emailSends.$inferSelect;
export type InsertEmailSend = z.infer<typeof insertEmailSendSchema>;

export type EmailEvent = typeof emailEvents.$inferSelect;
export type InsertEmailEvent = z.infer<typeof insertEmailEventSchema>;

export type CallScript = typeof callScripts.$inferSelect;
export type InsertCallScript = z.infer<typeof insertCallScriptSchema>;

export type CallAttempt = typeof callAttempts.$inferSelect;
export type InsertCallAttempt = z.infer<typeof insertCallAttemptSchema>;

export type CallEvent = typeof callEvents.$inferSelect;
export type InsertCallEvent = z.infer<typeof insertCallEventSchema>;

export type SoftphoneProfile = typeof softphoneProfiles.$inferSelect;
export type InsertSoftphoneProfile = z.infer<typeof insertSoftphoneProfileSchema>;

export type CallRecordingAccessLog = typeof callRecordingAccessLogs.$inferSelect;
export type InsertCallRecordingAccessLog = z.infer<typeof insertCallRecordingAccessLogSchema>;

export type QualificationResponse = typeof qualificationResponses.$inferSelect;
export type InsertQualificationResponse = z.infer<typeof insertQualificationResponseSchema>;

export type EmailMessage = typeof emailMessages.$inferSelect;
export type InsertEmailMessage = z.infer<typeof insertEmailMessageSchema>;

export type Call = typeof calls.$inferSelect;
export type InsertCall = z.infer<typeof insertCallSchema>;

export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;

export type SuppressionEmail = typeof suppressionEmails.$inferSelect;
export type InsertSuppressionEmail = z.infer<typeof insertSuppressionEmailSchema>;

export type SuppressionPhone = typeof suppressionPhones.$inferSelect;
export type InsertSuppressionPhone = z.infer<typeof insertSuppressionPhoneSchema>;

export type CampaignOrder = typeof campaignOrders.$inferSelect;
export type InsertCampaignOrder = z.infer<typeof insertCampaignOrderSchema>;

export type OrderAudienceSnapshot = typeof orderAudienceSnapshots.$inferSelect;
export type InsertOrderAudienceSnapshot = z.infer<typeof insertOrderAudienceSnapshotSchema>;

export type OrderAsset = typeof orderAssets.$inferSelect;
export type InsertOrderAsset = z.infer<typeof insertOrderAssetSchema>;

export type OrderQualificationQuestion = typeof orderQualificationQuestions.$inferSelect;
export type InsertOrderQualificationQuestion = z.infer<typeof insertOrderQualificationQuestionSchema>;

export type OrderCampaignLink = typeof orderCampaignLinks.$inferSelect;
export type InsertOrderCampaignLink = z.infer<typeof insertOrderCampaignLinkSchema>;

export type BulkImport = typeof bulkImports.$inferSelect;
export type InsertBulkImport = z.infer<typeof insertBulkImportSchema>;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

export type SavedFilter = typeof savedFilters.$inferSelect;
export type InsertSavedFilter = z.infer<typeof insertSavedFilterSchema>;

export type SelectionContext = typeof selectionContexts.$inferSelect;
export type InsertSelectionContext = z.infer<typeof insertSelectionContextSchema>;

export type FilterField = typeof filterFieldRegistry.$inferSelect;
export type InsertFilterField = z.infer<typeof insertFilterFieldSchema>;

export type ContactEmail = typeof contactEmails.$inferSelect;
export type InsertContactEmail = z.infer<typeof insertContactEmailSchema>;

export type AccountDomain = typeof accountDomains.$inferSelect;
export type InsertAccountDomain = z.infer<typeof insertAccountDomainSchema>;

export type FieldChangeLog = typeof fieldChangeLog.$inferSelect;
export type InsertFieldChangeLog = z.infer<typeof insertFieldChangeLogSchema>;

export type DedupeReviewQueue = typeof dedupeReviewQueue.$inferSelect;
export type InsertDedupeReviewQueue = z.infer<typeof insertDedupeReviewQueueSchema>;

export type IndustryReference = typeof industryReference.$inferSelect;
export type InsertIndustryReference = z.infer<typeof insertIndustryReferenceSchema>;

export type CompanySizeReference = typeof companySizeReference.$inferSelect;
export type InsertCompanySizeReference = z.infer<typeof insertCompanySizeReferenceSchema>;

export type RevenueRangeReference = typeof revenueRangeReference.$inferSelect;
export type InsertRevenueRangeReference = z.infer<typeof insertRevenueRangeReferenceSchema>;

// ============================================================================
// CONTENT STUDIO & SOCIAL MEDIA MANAGEMENT
// ============================================================================

// Content Assets table
export const contentAssets = pgTable("content_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assetType: contentAssetTypeEnum("asset_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  content: text("content"), // HTML/text content
  contentHtml: text("content_html"), // Rendered HTML for emails/landing pages
  thumbnailUrl: text("thumbnail_url"),
  fileUrl: text("file_url"), // For PDFs, videos, images
  tags: text("tags").array().default(sql`ARRAY[]::text[]`),
  metadata: jsonb("metadata"), // Custom metadata, AI-extracted keywords
  approvalStatus: contentApprovalStatusEnum("approval_status").notNull().default('draft'),
  tone: contentToneEnum("tone"),
  targetAudience: text("target_audience"),
  ctaGoal: text("cta_goal"),
  linkedCampaigns: text("linked_campaigns").array().default(sql`ARRAY[]::text[]`),
  usageHistory: jsonb("usage_history").default(sql`'[]'::jsonb`), // Track where asset was used
  version: integer("version").notNull().default(1),
  currentVersionId: varchar("current_version_id"),
  ownerId: varchar("owner_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  assetTypeIdx: index("content_assets_asset_type_idx").on(table.assetType),
  approvalStatusIdx: index("content_assets_approval_status_idx").on(table.approvalStatus),
  ownerIdx: index("content_assets_owner_idx").on(table.ownerId),
}));

// Content Versions table
export const contentVersions = pgTable("content_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assetId: varchar("asset_id").notNull().references(() => contentAssets.id, { onDelete: 'cascade' }),
  versionNumber: integer("version_number").notNull(),
  content: text("content").notNull(),
  contentHtml: text("content_html"),
  metadata: jsonb("metadata"),
  changedBy: varchar("changed_by").notNull().references(() => users.id),
  changeDescription: text("change_description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  assetIdIdx: index("content_versions_asset_id_idx").on(table.assetId),
  versionIdx: index("content_versions_version_number_idx").on(table.assetId, table.versionNumber),
}));

// Content Approvals table
export const contentApprovals = pgTable("content_approvals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assetId: varchar("asset_id").notNull().references(() => contentAssets.id, { onDelete: 'cascade' }),
  reviewerId: varchar("reviewer_id").notNull().references(() => users.id),
  status: contentApprovalStatusEnum("status").notNull(),
  comments: text("comments"),
  reviewedAt: timestamp("reviewed_at").notNull().defaultNow(),
}, (table) => ({
  assetIdIdx: index("content_approvals_asset_id_idx").on(table.assetId),
  reviewerIdx: index("content_approvals_reviewer_idx").on(table.reviewerId),
}));

// Social Posts table
export const socialPosts = pgTable("social_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assetId: varchar("asset_id").references(() => contentAssets.id, { onDelete: 'set null' }),
  platform: socialPlatformEnum("platform").notNull(),
  content: text("content").notNull(),
  mediaUrls: text("media_urls").array().default(sql`ARRAY[]::text[]`),
  scheduledAt: timestamp("scheduled_at"),
  publishedAt: timestamp("published_at"),
  status: contentApprovalStatusEnum("status").notNull().default('draft'),
  utmParameters: jsonb("utm_parameters"), // UTM tracking
  platformPostId: text("platform_post_id"), // ID from social platform
  engagement: jsonb("engagement"), // likes, shares, comments, impressions
  sentiment: text("sentiment"), // AI-analyzed: positive/neutral/negative
  ownerId: varchar("owner_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  platformIdx: index("social_posts_platform_idx").on(table.platform),
  statusIdx: index("social_posts_status_idx").on(table.status),
  scheduledAtIdx: index("social_posts_scheduled_at_idx").on(table.scheduledAt),
  ownerIdx: index("social_posts_owner_idx").on(table.ownerId),
}));

// AI Content Generations table (track AI-generated content)
export const aiContentGenerations = pgTable("ai_content_generations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assetId: varchar("asset_id").references(() => contentAssets.id, { onDelete: 'set null' }),
  prompt: text("prompt").notNull(),
  contentType: contentAssetTypeEnum("content_type").notNull(),
  targetAudience: text("target_audience"),
  tone: contentToneEnum("tone"),
  ctaGoal: text("cta_goal"),
  generatedContent: text("generated_content").notNull(),
  model: text("model").notNull(), // GPT-4, Claude, etc.
  tokensUsed: integer("tokens_used"),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  assetIdIdx: index("ai_content_generations_asset_id_idx").on(table.assetId),
  userIdx: index("ai_content_generations_user_idx").on(table.userId),
  createdAtIdx: index("ai_content_generations_created_at_idx").on(table.createdAt),
}));

// Push Status enum for inter-Repl communication
export const pushStatusEnum = pgEnum('push_status', [
  'pending',
  'in_progress',
  'success',
  'failed',
  'retrying'
]);

// Content Asset Pushes table (track push attempts to Resources Center)
export const contentAssetPushes = pgTable("content_asset_pushes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assetId: varchar("asset_id").notNull().references(() => contentAssets.id, { onDelete: 'cascade' }),
  targetUrl: text("target_url").notNull(), // Resources Center URL
  status: pushStatusEnum("status").notNull().default('pending'),
  attemptCount: integer("attempt_count").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(3),
  lastAttemptAt: timestamp("last_attempt_at"),
  successAt: timestamp("success_at"),
  errorMessage: text("error_message"),
  responsePayload: jsonb("response_payload"), // Response from Resources Center
  externalId: text("external_id"), // ID returned from Resources Center
  pushedBy: varchar("pushed_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  assetIdIdx: index("content_asset_pushes_asset_id_idx").on(table.assetId),
  statusIdx: index("content_asset_pushes_status_idx").on(table.status),
  targetUrlIdx: index("content_asset_pushes_target_url_idx").on(table.targetUrl),
}));

// ============================================================================
// EVENTS, RESOURCES, AND NEWS (Structured Content for Distribution)
// ============================================================================

// Events table
export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  eventType: eventTypeEnum("event_type").notNull(),
  locationType: locationTypeEnum("location_type").notNull(),
  community: communityEnum("community").notNull(),
  organizer: text("organizer"),
  sponsor: text("sponsor"),
  speakers: jsonb("speakers").default(sql`'[]'::jsonb`), // Array of speaker objects
  startIso: text("start_iso").notNull(),
  endIso: text("end_iso"),
  timezone: text("timezone"),
  overviewHtml: text("overview_html"),
  learnBullets: text("learn_bullets").array().default(sql`ARRAY[]::text[]`),
  thumbnailUrl: text("thumbnail_url"),
  ctaLink: text("cta_link"),
  formId: text("form_id"),
  seo: jsonb("seo"), // SEO metadata object
  status: contentStatusEnum("status").notNull().default('draft'),
  ownerId: varchar("owner_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  slugIdx: index("events_slug_idx").on(table.slug),
  eventTypeIdx: index("events_event_type_idx").on(table.eventType),
  communityIdx: index("events_community_idx").on(table.community),
  statusIdx: index("events_status_idx").on(table.status),
  startIsoIdx: index("events_start_iso_idx").on(table.startIso),
}));

// Resources table
export const resources = pgTable("resources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  resourceType: resourceTypeEnum("resource_type").notNull(),
  community: communityEnum("community").notNull(),
  overviewHtml: text("overview_html"),
  bullets: text("bullets").array().default(sql`ARRAY[]::text[]`),
  bodyHtml: text("body_html"),
  thumbnailUrl: text("thumbnail_url"),
  ctaLink: text("cta_link"),
  formId: text("form_id"),
  seo: jsonb("seo"), // SEO metadata object
  status: contentStatusEnum("status").notNull().default('draft'),
  ownerId: varchar("owner_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  slugIdx: index("resources_slug_idx").on(table.slug),
  resourceTypeIdx: index("resources_resource_type_idx").on(table.resourceType),
  communityIdx: index("resources_community_idx").on(table.community),
  statusIdx: index("resources_status_idx").on(table.status),
}));

// Speakers, Organizers, Sponsors (Resources Centre Reference Data)
export const speakers = pgTable("speakers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  title: text("title"), // Job title
  company: text("company"),
  bio: text("bio"),
  photoUrl: text("photo_url"),
  linkedinUrl: text("linkedin_url"),
  externalId: varchar("external_id", { length: 255 }), // ID from Resources Centre
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (t) => ({
  nameIdx: index("speakers_name_idx").on(t.name),
  externalIdIdx: uniqueIndex("speakers_external_id_idx").on(t.externalId)
}));

export const organizers = pgTable("organizers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  logoUrl: text("logo_url"),
  websiteUrl: text("website_url"),
  externalId: varchar("external_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (t) => ({
  nameIdx: index("organizers_name_idx").on(t.name)
}));

export const sponsors = pgTable("sponsors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  tier: varchar("tier", { length: 50 }), // platinum, gold, silver, bronze
  description: text("description"),
  logoUrl: text("logo_url"),
  websiteUrl: text("website_url"),
  externalId: varchar("external_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (t) => ({
  nameIdx: index("sponsors_name_idx").on(t.name)
}));

// News table
export const news = pgTable("news", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  community: communityEnum("community").notNull(),
  overviewHtml: text("overview_html"),
  bodyHtml: text("body_html"),
  authors: text("authors").array().default(sql`ARRAY[]::text[]`),
  publishedIso: text("published_iso"),
  thumbnailUrl: text("thumbnail_url"),
  seo: jsonb("seo"), // SEO metadata object
  status: contentStatusEnum("status").notNull().default('draft'),
  ownerId: varchar("owner_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  slugIdx: index("news_slug_idx").on(table.slug),
  communityIdx: index("news_community_idx").on(table.community),
  statusIdx: index("news_status_idx").on(table.status),
  publishedIsoIdx: index("news_published_iso_idx").on(table.publishedIso),
}));

// Insert schemas for Content Studio
export const insertContentAssetSchema = createInsertSchema(contentAssets).omit({
  id: true,
  version: true,
  currentVersionId: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContentVersionSchema = createInsertSchema(contentVersions).omit({
  id: true,
  createdAt: true,
});

export const insertContentApprovalSchema = createInsertSchema(contentApprovals).omit({
  id: true,
  reviewedAt: true,
});

export const insertSocialPostSchema = createInsertSchema(socialPosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAIContentGenerationSchema = createInsertSchema(aiContentGenerations).omit({
  id: true,
  createdAt: true,
});

export const insertContentAssetPushSchema = createInsertSchema(contentAssetPushes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Export types for Content Studio
export type ContentAsset = typeof contentAssets.$inferSelect;
export type InsertContentAsset = z.infer<typeof insertContentAssetSchema>;

export type ContentVersion = typeof contentVersions.$inferSelect;
export type InsertContentVersion = z.infer<typeof insertContentVersionSchema>;

export type ContentApproval = typeof contentApprovals.$inferSelect;
export type InsertContentApproval = z.infer<typeof insertContentApprovalSchema>;

export type SocialPost = typeof socialPosts.$inferSelect;
export type InsertSocialPost = z.infer<typeof insertSocialPostSchema>;

export type AIContentGeneration = typeof aiContentGenerations.$inferSelect;
export type InsertAIContentGeneration = z.infer<typeof insertAIContentGenerationSchema>;

export type ContentAssetPush = typeof contentAssetPushes.$inferSelect;
export type InsertContentAssetPush = z.infer<typeof insertContentAssetPushSchema>;

// Insert schemas for Speakers, Organizers, Sponsors
export const insertSpeakerSchema = createInsertSchema(speakers).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertOrganizerSchema = createInsertSchema(organizers).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertSponsorSchema = createInsertSchema(sponsors).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type Speaker = typeof speakers.$inferSelect;
export type InsertSpeaker = z.infer<typeof insertSpeakerSchema>;

export type Organizer = typeof organizers.$inferSelect;
export type InsertOrganizer = z.infer<typeof insertOrganizerSchema>;

export type Sponsor = typeof sponsors.$inferSelect;
export type InsertSponsor = z.infer<typeof insertSponsorSchema>;

// Insert schemas for Events, Resources, and News
export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertResourceSchema = createInsertSchema(resources).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNewsSchema = createInsertSchema(news).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Export types for Events, Resources, and News
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;

export type Resource = typeof resources.$inferSelect;
export type InsertResource = z.infer<typeof insertResourceSchema>;

export type News = typeof news.$inferSelect;
export type InsertNews = z.infer<typeof insertNewsSchema>;

// ============================================================================
// EMAIL INFRASTRUCTURE (Phase 26)
// ============================================================================

// Enums for Email Infrastructure
export const authStatusEnum = pgEnum('auth_status', ['pending', 'verified', 'failed']);
export const warmupStatusEnum = pgEnum('warmup_status', ['not_started', 'in_progress', 'completed', 'paused']);
export const stoModeEnum = pgEnum('sto_mode', ['off', 'global_model', 'per_contact']);
export const sendPolicyScopeEnum = pgEnum('send_policy_scope', ['tenant', 'campaign']);

// Domain Authentication
export const domainAuth = pgTable("domain_auth", {
  id: serial("id").primaryKey(),
  domain: text("domain").notNull().unique(),
  spfStatus: authStatusEnum("spf_status").default('pending').notNull(),
  dkimStatus: authStatusEnum("dkim_status").default('pending').notNull(),
  dmarcStatus: authStatusEnum("dmarc_status").default('pending').notNull(),
  trackingDomainStatus: authStatusEnum("tracking_domain_status").default('pending').notNull(),
  bimiStatus: authStatusEnum("bimi_status").default('pending'),
  lastCheckedAt: timestamp("last_checked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// DKIM Keys
export const dkimKeys = pgTable("dkim_keys", {
  id: serial("id").primaryKey(),
  domainAuthId: integer("domain_auth_id").notNull().references(() => domainAuth.id, { onDelete: 'cascade' }),
  selector: text("selector").notNull(),
  publicKey: text("public_key").notNull(),
  rotationDueAt: timestamp("rotation_due_at"),
  status: authStatusEnum("status").default('pending').notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tracking Domains
export const trackingDomains = pgTable("tracking_domains", {
  id: serial("id").primaryKey(),
  cname: text("cname").notNull().unique(), // e.g., click.brand.com
  target: text("target").notNull(), // provider target
  tlsStatus: authStatusEnum("tls_status").default('pending').notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// IP Pools
export const ipPools = pgTable("ip_pools", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  provider: text("provider").notNull(), // 'ses', 'sendgrid', 'mailgun'
  ipAddresses: text("ip_addresses").array().notNull(), // array of IPs
  warmupStatus: warmupStatusEnum("warmup_status").default('not_started').notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Warmup Plans
export const warmupPlans = pgTable("warmup_plans", {
  id: serial("id").primaryKey(),
  ipPoolId: integer("ip_pool_id").notNull().references(() => ipPools.id, { onDelete: 'cascade' }),
  day: integer("day").notNull(), // day of warmup (1-28)
  dailyCap: integer("daily_cap").notNull(),
  domainSplitJson: jsonb("domain_split_json"), // per-domain distribution
  status: warmupStatusEnum("status").default('not_started').notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Send Policies (STO, Batching, Throttling)
export const sendPolicies = pgTable("send_policies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  scope: sendPolicyScopeEnum("scope").default('tenant').notNull(),
  
  // STO Settings
  stoMode: stoModeEnum("sto_mode").default('off').notNull(),
  stoWindowHours: integer("sto_window_hours").default(24),
  
  // Batching Settings
  batchSize: integer("batch_size").default(5000),
  batchGapMinutes: integer("batch_gap_minutes").default(15),
  seedTestBatch: boolean("seed_test_batch").default(false),
  
  // Throttling Settings
  globalTps: integer("global_tps").default(10),
  perDomainCaps: jsonb("per_domain_caps"), // { "gmail.com": 500, "outlook.com": 300 }
  frequencyCap: integer("frequency_cap"), // max emails per contact per week
  
  status: text("status").default('active').notNull(), // 'active' or 'suspended'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Domain Reputation Snapshots
export const domainReputationSnapshots = pgTable("domain_reputation_snapshots", {
  id: serial("id").primaryKey(),
  domain: text("domain").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  metricsJson: jsonb("metrics_json").notNull(), // delivery%, bounces, complaints, etc.
  healthScore: integer("health_score"), // 0-100
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Per-Domain Stats (aggregated by day)
export const perDomainStats = pgTable("per_domain_stats", {
  id: serial("id").primaryKey(),
  sendingDomain: text("sending_domain").notNull(),
  recipientProvider: text("recipient_provider").notNull(), // gmail.com, outlook.com, etc.
  day: text("day").notNull(), // YYYY-MM-DD
  delivered: integer("delivered").default(0),
  bouncesHard: integer("bounces_hard").default(0),
  bouncesSoft: integer("bounces_soft").default(0),
  complaints: integer("complaints").default(0),
  opens: integer("opens").default(0),
  clicks: integer("clicks").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Content Events from Resources Centre (reverse webhook)
export const contentEvents = pgTable("content_events", {
  id: serial("id").primaryKey(),
  eventName: varchar("event_name", { length: 50 }).notNull(), // page_view | form_submission
  contentType: varchar("content_type", { length: 50 }), // event | resource | news
  contentId: varchar("content_id", { length: 255 }),
  slug: varchar("slug", { length: 255 }),
  title: text("title"),
  community: varchar("community", { length: 100 }),
  contactId: varchar("contact_id", { length: 50 }),
  email: varchar("email", { length: 255 }),
  url: text("url"),
  payloadJson: jsonb("payload_json"), // full event data
  ts: timestamp("ts").notNull(),
  uniqKey: varchar("uniq_key", { length: 500 }).notNull().unique(), // deduplication key
  createdAt: timestamp("created_at").defaultNow()
}, (t) => ({
  eventNameIdx: index("content_events_event_name_idx").on(t.eventName),
  contactIdIdx: index("content_events_contact_id_idx").on(t.contactId),
  contentIdIdx: index("content_events_content_id_idx").on(t.contentId),
  tsIdx: index("content_events_ts_idx").on(t.ts)
}));

// Campaign Content Links (for linking campaigns to Events/Resources from Resources Centre)
export const campaignContentLinks = pgTable("campaign_content_links", {
  id: serial("id").primaryKey(),
  campaignId: varchar("campaign_id").references(() => campaigns.id, { onDelete: "cascade" }).notNull(),
  contentType: varchar("content_type", { length: 50 }).notNull(), // event | resource
  contentId: varchar("content_id", { length: 255 }).notNull(), // External ID from Resources Centre
  contentSlug: varchar("content_slug", { length: 255 }).notNull(),
  contentTitle: text("content_title").notNull(),
  contentUrl: text("content_url").notNull(), // Base URL without tracking params
  formId: varchar("form_id", { length: 255 }), // If content has gated form
  metadata: jsonb("metadata"), // Additional content metadata
  createdBy: varchar("created_by", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (t) => ({
  campaignContentIdx: uniqueIndex("campaign_content_unique_idx").on(t.campaignId, t.contentType, t.contentId),
  contentIdIdx: index("campaign_content_links_content_id_idx").on(t.contentId)
}));

// Insert Schemas
export const insertDomainAuthSchema = createInsertSchema(domainAuth).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDkimKeySchema = createInsertSchema(dkimKeys).omit({
  id: true,
  createdAt: true,
});

export const insertTrackingDomainSchema = createInsertSchema(trackingDomains).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertIpPoolSchema = createInsertSchema(ipPools).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWarmupPlanSchema = createInsertSchema(warmupPlans).omit({
  id: true,
  createdAt: true,
});

export const insertSendPolicySchema = createInsertSchema(sendPolicies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDomainReputationSnapshotSchema = createInsertSchema(domainReputationSnapshots).omit({
  id: true,
  createdAt: true,
});

export const insertPerDomainStatsSchema = createInsertSchema(perDomainStats).omit({
  id: true,
  createdAt: true,
});

export const insertContentEventSchema = createInsertSchema(contentEvents).omit({
  id: true,
  createdAt: true,
});

export const insertCampaignContentLinkSchema = createInsertSchema(campaignContentLinks).omit({
  id: true,
  createdAt: true,
});

// Export Types
export type DomainAuth = typeof domainAuth.$inferSelect;
export type InsertDomainAuth = z.infer<typeof insertDomainAuthSchema>;

export type DkimKey = typeof dkimKeys.$inferSelect;
export type InsertDkimKey = z.infer<typeof insertDkimKeySchema>;

export type TrackingDomain = typeof trackingDomains.$inferSelect;
export type InsertTrackingDomain = z.infer<typeof insertTrackingDomainSchema>;

export type IpPool = typeof ipPools.$inferSelect;
export type InsertIpPool = z.infer<typeof insertIpPoolSchema>;

export type WarmupPlan = typeof warmupPlans.$inferSelect;
export type InsertWarmupPlan = z.infer<typeof insertWarmupPlanSchema>;

export type SendPolicy = typeof sendPolicies.$inferSelect;
export type InsertSendPolicy = z.infer<typeof insertSendPolicySchema>;

export type DomainReputationSnapshot = typeof domainReputationSnapshots.$inferSelect;
export type InsertDomainReputationSnapshot = z.infer<typeof insertDomainReputationSnapshotSchema>;

export type PerDomainStats = typeof perDomainStats.$inferSelect;
export type InsertPerDomainStats = z.infer<typeof insertPerDomainStatsSchema>;

export type ContentEvent = typeof contentEvents.$inferSelect;
export type InsertContentEvent = z.infer<typeof insertContentEventSchema>;

export type CampaignContentLink = typeof campaignContentLinks.$inferSelect;
export type InsertCampaignContentLink = z.infer<typeof insertCampaignContentLinkSchema>;
