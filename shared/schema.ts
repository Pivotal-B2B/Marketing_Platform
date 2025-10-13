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
  foreignKey
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

export const selectionTypeEnum = pgEnum('selection_type', ['explicit', 'filtered']);

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
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  nameIdx: index("industry_reference_name_idx").on(table.name),
  isActiveIdx: index("industry_reference_is_active_idx").on(table.isActive),
}));

// Segments table (dynamic filters)
export const segments = pgTable("segments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  definitionJson: jsonb("definition_json").notNull(),
  ownerId: varchar("owner_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Lists table (static snapshots)
export const lists = pgTable("lists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  contactIds: text("contact_ids").array(),
  ownerId: varchar("owner_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Domain Sets table
export const domainSets = pgTable("domain_sets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  domains: text("domains").array().notNull(),
  statsJson: jsonb("stats_json"),
  ownerId: varchar("owner_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

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
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  launchedAt: timestamp("launched_at"),
}, (table) => ({
  statusIdx: index("campaigns_status_idx").on(table.status),
  typeIdx: index("campaigns_type_idx").on(table.type),
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
});

export const insertSegmentSchema = createInsertSchema(segments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertListSchema = createInsertSchema(lists).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDomainSetSchema = createInsertSchema(domainSets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  launchedAt: true,
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
});

// Inferred Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

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

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;

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
