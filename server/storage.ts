// Storage layer - referenced from blueprint:javascript_database
import { eq, sql, and, or, isNull, isNotNull, like, ilike, gte, lte, gt, lt, desc, inArray } from "drizzle-orm";
import { db } from "./db";
import { buildFilterQuery, buildSuppressionFilter } from "./filter-builder";
import type { FilterGroup } from "@shared/filter-types";
import {
  users, accounts, contacts, campaigns, segments, lists, domainSets, domainSetItems, domainSetContactLinks,
  leads, emailMessages, calls, suppressionEmails, suppressionPhones,
  campaignOrders, orderCampaignLinks, bulkImports, auditLogs, savedFilters,
  selectionContexts, filterFieldRegistry, fieldChangeLog, industryReference,
  companySizeReference, revenueRangeReference,
  campaignAudienceSnapshots, campaignQueue, campaignAccountStats, senderProfiles, emailTemplates, emailSends, emailEvents,
  callScripts, callAttempts, callEvents, qualificationResponses,
  contentAssets, socialPosts, aiContentGenerations, contentAssetPushes,
  events, resources, news,
  softphoneProfiles, callRecordingAccessLogs,
  campaignContentLinks,
  speakers, organizers, sponsors,
  type User, type InsertUser,
  type Account, type InsertAccount,
  type Contact, type InsertContact,
  type Campaign, type InsertCampaign,
  type Segment, type InsertSegment,
  type List, type InsertList,
  type DomainSet, type InsertDomainSet,
  type DomainSetItem, type InsertDomainSetItem,
  type DomainSetContactLink, type InsertDomainSetContactLink,
  type Lead, type InsertLead,
  type EmailMessage, type InsertEmailMessage,
  type Call, type InsertCall,
  type SuppressionEmail, type InsertSuppressionEmail,
  type SuppressionPhone, type InsertSuppressionPhone,
  type CampaignOrder, type InsertCampaignOrder,
  type OrderCampaignLink, type InsertOrderCampaignLink,
  type BulkImport, type InsertBulkImport,
  type AuditLog, type InsertAuditLog,
  type SavedFilter, type InsertSavedFilter,
  type SelectionContext, type InsertSelectionContext,
  type FilterField,
  type IndustryReference,
  type CompanySizeReference,
  type RevenueRangeReference,
  type CampaignAudienceSnapshot, type InsertCampaignAudienceSnapshot,
  type SenderProfile, type InsertSenderProfile,
  type EmailTemplate, type InsertEmailTemplate,
  type EmailSend, type InsertEmailSend,
  type EmailEvent, type InsertEmailEvent,
  type CallScript, type InsertCallScript,
  type CallAttempt, type InsertCallAttempt,
  type CallEvent, type InsertCallEvent,
  type QualificationResponse, type InsertQualificationResponse,
  type SoftphoneProfile, type InsertSoftphoneProfile,
  type CallRecordingAccessLog, type InsertCallRecordingAccessLog,
  type CampaignContentLink, type InsertCampaignContentLink,
  type ContentAsset, type InsertContentAsset,
  type SocialPost, type InsertSocialPost,
  type AIContentGeneration, type InsertAIContentGeneration,
  type ContentAssetPush, type InsertContentAssetPush,
  type Event, type InsertEvent,
  type Resource, type InsertResource,
  type News, type InsertNews,
  type Speaker, type InsertSpeaker,
  type Organizer, type InsertOrganizer,
  type Sponsor, type InsertSponsor,
  domainAuth, trackingDomains, ipPools, warmupPlans, sendPolicies,
  domainReputationSnapshots, perDomainStats,
  type DomainAuth, type InsertDomainAuth,
  type TrackingDomain, type InsertTrackingDomain,
  type IpPool, type InsertIpPool,
  type WarmupPlan, type InsertWarmupPlan,
  type SendPolicy, type InsertSendPolicy,
  type DomainReputationSnapshot, type InsertDomainReputationSnapshot,
  type PerDomainStats, type InsertPerDomainStats,
  customFieldDefinitions,
  type CustomFieldDefinition, type InsertCustomFieldDefinition,
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;

  // Accounts
  getAccounts(filters?: FilterGroup): Promise<Account[]>;
  getAccount(id: string): Promise<Account | undefined>;
  getAccountsByIds(ids: string[]): Promise<Account[]>;
  getAccountByDomain(domain: string): Promise<Account | undefined>;
  createAccount(account: InsertAccount): Promise<Account>;
  updateAccount(id: string, account: Partial<InsertAccount>): Promise<Account | undefined>;
  deleteAccount(id: string): Promise<void>;

  // Contacts
  getContacts(filters?: FilterGroup): Promise<Contact[]>;
  getContact(id: string): Promise<Contact | undefined>;
  getContactsByAccountId(accountId: string): Promise<Contact[]>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: string, contact: Partial<InsertContact>): Promise<Contact | undefined>;
  deleteContact(id: string): Promise<void>;

  // Custom Field Definitions
  getCustomFieldDefinitions(entityType?: 'account' | 'contact'): Promise<CustomFieldDefinition[]>;
  getCustomFieldDefinition(id: string): Promise<CustomFieldDefinition | undefined>;
  createCustomFieldDefinition(definition: InsertCustomFieldDefinition): Promise<CustomFieldDefinition>;
  updateCustomFieldDefinition(id: string, definition: Partial<InsertCustomFieldDefinition>): Promise<CustomFieldDefinition | undefined>;
  deleteCustomFieldDefinition(id: string): Promise<void>;

  // Campaigns
  getCampaigns(filters?: any): Promise<Campaign[]>;
  getCampaign(id: string): Promise<Campaign | undefined>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: string, campaign: Partial<InsertCampaign>): Promise<Campaign | undefined>;
  deleteCampaign(id: string): Promise<void>;

  // Campaign Audience Snapshots
  createCampaignAudienceSnapshot(snapshot: InsertCampaignAudienceSnapshot): Promise<CampaignAudienceSnapshot>;
  getCampaignAudienceSnapshots(campaignId: string): Promise<CampaignAudienceSnapshot[]>;

  // Campaign Queue (Account Lead Cap)
  getCampaignQueue(campaignId: string, status?: string): Promise<any[]>;
  enqueueContact(campaignId: string, contactId: string, accountId: string, priority?: number): Promise<any>;
  updateQueueStatus(id: string, status: string, removedReason?: string, isPositiveDisposition?: boolean): Promise<any>;
  removeFromQueue(campaignId: string, contactId: string, reason: string): Promise<void>;
  removeFromQueueById(campaignId: string, queueId: string, reason: string): Promise<void>;
  getCampaignAccountStats(campaignId: string, accountId?: string): Promise<any[]>;
  upsertCampaignAccountStats(campaignId: string, accountId: string, updates: any): Promise<any>;
  enforceAccountCap(campaignId: string): Promise<{ removed: number; accounts: string[] }>;
  
  // Agent Queue Assignment
  getAgents(): Promise<User[]>;
  assignQueueToAgents(campaignId: string, agentIds: string[], mode?: 'round_robin' | 'weighted'): Promise<{ assigned: number }>;
  getAgentQueue(agentId: string, campaignId?: string, status?: string): Promise<any[]>;

  // Email Templates
  getEmailTemplates(): Promise<EmailTemplate[]>;
  getEmailTemplate(id: string): Promise<EmailTemplate | undefined>;
  createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate>;
  updateEmailTemplate(id: string, template: Partial<InsertEmailTemplate>): Promise<EmailTemplate | undefined>;
  approveEmailTemplate(id: string, approvedById: string): Promise<EmailTemplate | undefined>;
  deleteEmailTemplate(id: string): Promise<void>;

  // Email Sends
  getEmailSends(campaignId?: string): Promise<EmailSend[]>;
  getEmailSend(id: string): Promise<EmailSend | undefined>;
  createEmailSend(send: InsertEmailSend): Promise<EmailSend>;
  updateEmailSend(id: string, send: Partial<InsertEmailSend>): Promise<EmailSend | undefined>;

  // Email Events
  createEmailEvent(event: InsertEmailEvent): Promise<EmailEvent>;
  getEmailEvents(sendId: string): Promise<EmailEvent[]>;

  // Call Scripts
  getCallScripts(campaignId?: string): Promise<CallScript[]>;
  getCallScript(id: string): Promise<CallScript | undefined>;
  createCallScript(script: InsertCallScript): Promise<CallScript>;
  updateCallScript(id: string, script: Partial<InsertCallScript>): Promise<CallScript | undefined>;
  deleteCallScript(id: string): Promise<void>;

  // Call Attempts
  getCallAttempts(campaignId?: string, agentId?: string): Promise<CallAttempt[]>;
  getCallAttempt(id: string): Promise<CallAttempt | undefined>;
  createCallAttempt(attempt: InsertCallAttempt): Promise<CallAttempt>;
  updateCallAttempt(id: string, attempt: Partial<InsertCallAttempt>): Promise<CallAttempt | undefined>;

  // Call Events
  createCallEvent(event: InsertCallEvent): Promise<CallEvent>;
  getCallEvents(attemptId: string): Promise<CallEvent[]>;

  // Softphone Profiles (Phase 27)
  getSoftphoneProfile(userId: string): Promise<SoftphoneProfile | undefined>;
  upsertSoftphoneProfile(profile: InsertSoftphoneProfile): Promise<SoftphoneProfile>;

  // Call Recording Access Logs (Phase 27)
  createCallRecordingAccessLog(log: InsertCallRecordingAccessLog): Promise<CallRecordingAccessLog>;
  getCallRecordingAccessLogs(callAttemptId: string): Promise<CallRecordingAccessLog[]>;

  // Campaign Content Links (Resources Centre Integration)
  getCampaignContentLinks(campaignId: string): Promise<CampaignContentLink[]>;
  getCampaignContentLink(id: number): Promise<CampaignContentLink | undefined>;
  createCampaignContentLink(link: InsertCampaignContentLink): Promise<CampaignContentLink>;
  deleteCampaignContentLink(id: number): Promise<void>;

  // Speakers, Organizers, Sponsors
  getSpeakers(): Promise<Speaker[]>;
  getSpeaker(id: number): Promise<Speaker | undefined>;
  createSpeaker(speaker: InsertSpeaker): Promise<Speaker>;
  updateSpeaker(id: number, speaker: Partial<InsertSpeaker>): Promise<Speaker | undefined>;
  deleteSpeaker(id: number): Promise<void>;

  getOrganizers(): Promise<Organizer[]>;
  getOrganizer(id: number): Promise<Organizer | undefined>;
  createOrganizer(organizer: InsertOrganizer): Promise<Organizer>;
  updateOrganizer(id: number, organizer: Partial<InsertOrganizer>): Promise<Organizer | undefined>;
  deleteOrganizer(id: number): Promise<void>;

  getSponsors(): Promise<Sponsor[]>;
  getSponsor(id: number): Promise<Sponsor | undefined>;
  createSponsor(sponsor: InsertSponsor): Promise<Sponsor>;
  updateSponsor(id: number, sponsor: Partial<InsertSponsor>): Promise<Sponsor | undefined>;
  deleteSponsor(id: number): Promise<void>;

  // Qualification Responses
  createQualificationResponse(response: InsertQualificationResponse): Promise<QualificationResponse>;
  getQualificationResponses(attemptId?: string, leadId?: string): Promise<QualificationResponse[]>;

  // Segments
  getSegments(filters?: any): Promise<Segment[]>;
  getSegment(id: string): Promise<Segment | undefined>;
  getSegmentMembers(segmentId: string): Promise<(Contact | Account)[]>;
  createSegment(segment: InsertSegment): Promise<Segment>;
  updateSegment(id: string, segment: Partial<InsertSegment>): Promise<Segment | undefined>;
  deleteSegment(id: string): Promise<void>;
  previewSegment(entityType: 'contact' | 'account', criteria: any): Promise<{ count: number; sampleIds: string[] }>;
  convertSegmentToList(segmentId: string, listName: string, listDescription?: string): Promise<List>;

  // Lists
  getLists(filters?: any): Promise<List[]>;
  getList(id: string): Promise<List | undefined>;
  getListById(id: string): Promise<List | undefined>;
  getListMembers(listId: string): Promise<(Contact | Account)[]>;
  createList(list: InsertList): Promise<List>;
  updateList(id: string, list: Partial<InsertList>): Promise<List | undefined>;
  deleteList(id: string): Promise<void>;
  exportList(listId: string, format: 'csv' | 'json'): Promise<{ data: any; filename: string }>;

  // Leads
  getLeads(filters?: any): Promise<Lead[]>;
  getLead(id: string): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: string, lead: Partial<InsertLead>): Promise<Lead | undefined>;
  approveLead(id: string, approvedById: string): Promise<Lead | undefined>;
  rejectLead(id: string, reason: string): Promise<Lead | undefined>;

  // Suppressions
  getEmailSuppressions(): Promise<SuppressionEmail[]>;
  addEmailSuppression(suppression: InsertSuppressionEmail): Promise<SuppressionEmail>;
  deleteEmailSuppression(id: number): Promise<void>;
  isEmailSuppressed(email: string): Promise<boolean>;
  getPhoneSuppressions(): Promise<SuppressionPhone[]>;
  addPhoneSuppression(suppression: InsertSuppressionPhone): Promise<SuppressionPhone>;
  deletePhoneSuppression(id: number): Promise<void>;
  isPhoneSuppressed(phoneE164: string): Promise<boolean>;

  // Campaign Orders
  getCampaignOrders(filters?: any): Promise<CampaignOrder[]>;
  getCampaignOrder(id: string): Promise<CampaignOrder | undefined>;
  createCampaignOrder(order: InsertCampaignOrder): Promise<CampaignOrder>;
  updateCampaignOrder(id: string, order: Partial<InsertCampaignOrder>): Promise<CampaignOrder | undefined>;

  // Order Campaign Links (Bridge Model)
  getOrderCampaignLinks(orderId: string): Promise<OrderCampaignLink[]>;
  createOrderCampaignLink(link: InsertOrderCampaignLink): Promise<OrderCampaignLink>;
  deleteOrderCampaignLink(id: string): Promise<void>;

  // Bulk Imports
  getBulkImports(): Promise<BulkImport[]>;
  createBulkImport(bulkImport: InsertBulkImport): Promise<BulkImport>;
  getBulkImport(id: string): Promise<BulkImport | undefined>;
  updateBulkImport(id: string, bulkImport: Partial<InsertBulkImport>): Promise<BulkImport | undefined>;

  // Email Messages
  createEmailMessage(message: InsertEmailMessage): Promise<EmailMessage>;
  getEmailMessagesByCampaign(campaignId: string): Promise<EmailMessage[]>;

  // Calls
  createCall(call: InsertCall): Promise<Call>;
  getCallsByCampaign(campaignId: string): Promise<Call[]>;

  // Audit Logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(filters?: any): Promise<AuditLog[]>;

  // Saved Filters
  getSavedFilters(userId: string, entityType?: string): Promise<SavedFilter[]>;
  getSavedFilter(id: string, userId: string): Promise<SavedFilter | undefined>;
  createSavedFilter(filter: InsertSavedFilter): Promise<SavedFilter>;
  updateSavedFilter(id: string, userId: string, filter: Partial<InsertSavedFilter>): Promise<SavedFilter | undefined>;
  deleteSavedFilter(id: string, userId: string): Promise<boolean>;

  // Selection Contexts (for bulk operations)
  getSelectionContext(id: string, userId: string): Promise<SelectionContext | undefined>;
  createSelectionContext(context: InsertSelectionContext): Promise<SelectionContext>;
  deleteSelectionContext(id: string, userId: string): Promise<boolean>;
  deleteExpiredSelectionContexts(): Promise<number>;

  // Filter Fields Registry
  getFilterFields(category?: string): Promise<any[]>;
  getFilterFieldsByEntity(entity: string): Promise<any[]>;

  // Industry Reference (Standardized Taxonomy)
  getIndustries(activeOnly?: boolean): Promise<IndustryReference[]>;
  searchIndustries(query: string, limit?: number): Promise<IndustryReference[]>;
  getIndustryById(id: string): Promise<IndustryReference | undefined>;

  // Company Size Reference (Standardized Employee Ranges)
  getCompanySizes(activeOnly?: boolean): Promise<CompanySizeReference[]>;
  getCompanySizeByCode(code: string): Promise<CompanySizeReference | undefined>;

  // Revenue Range Reference (Standardized Annual Revenue Brackets)
  getRevenueRanges(activeOnly?: boolean): Promise<RevenueRangeReference[]>;
  getRevenueRangeByLabel(label: string): Promise<RevenueRangeReference | undefined>;

  // Dual-Industry Management (Phase 8)
  updateAccountIndustry(id: string, data: { primary?: string; secondary?: string[]; code?: string }): Promise<Account | undefined>;
  reviewAccountIndustryAI(id: string, userId: string, review: { accept_primary?: string; add_secondary?: string[]; reject?: string[] }): Promise<Account | undefined>;
  getAccountsNeedingReview(limit?: number): Promise<Account[]>;

  // Domain Sets (Phase 21) - Renamed to Accounts List (TAL)
  getDomainSets(userId?: string): Promise<DomainSet[]>;
  getDomainSet(id: string): Promise<DomainSet | undefined>;
  createDomainSet(domainSet: InsertDomainSet): Promise<DomainSet>;
  updateDomainSet(id: string, domainSet: Partial<InsertDomainSet>): Promise<DomainSet | undefined>;
  deleteDomainSet(id: string): Promise<void>;

  // Domain Set Items
  getDomainSetItems(domainSetId: string): Promise<DomainSetItem[]>;
  createDomainSetItem(item: InsertDomainSetItem): Promise<DomainSetItem>;
  createDomainSetItemsBulk(items: InsertDomainSetItem[]): Promise<DomainSetItem[]>;
  updateDomainSetItem(id: string, item: Partial<InsertDomainSetItem>): Promise<DomainSetItem | undefined>;

  // Domain Set Contact Links
  getDomainSetContactLinks(domainSetId: string): Promise<DomainSetContactLink[]>;
  createDomainSetContactLink(link: InsertDomainSetContactLink): Promise<DomainSetContactLink>;
  createDomainSetContactLinksBulk(links: InsertDomainSetContactLink[]): Promise<DomainSetContactLink[]>;

  // Domain Set Operations
  processDomainSetMatching(domainSetId: string): Promise<void>;
  expandDomainSetToContacts(domainSetId: string, filters?: any): Promise<Contact[]>;
  convertDomainSetToList(domainSetId: string, listName: string, userId: string): Promise<List>;

  // Email Infrastructure (Phase 26)
  // Sender Profiles (declared above at lines 122-126)

  // Domain Authentication
  getDomainAuths(): Promise<DomainAuth[]>;
  getDomainAuth(id: number): Promise<DomainAuth | undefined>;
  getDomainAuthByDomain(domain: string): Promise<DomainAuth | undefined>;
  createDomainAuth(domainAuth: InsertDomainAuth): Promise<DomainAuth>;
  updateDomainAuth(id: number, domainAuth: Partial<InsertDomainAuth>): Promise<DomainAuth | undefined>;
  verifyDomainAuth(id: number): Promise<DomainAuth | undefined>;

  // Tracking Domains
  getTrackingDomains(): Promise<TrackingDomain[]>;
  getTrackingDomain(id: number): Promise<TrackingDomain | undefined>;
  createTrackingDomain(trackingDomain: InsertTrackingDomain): Promise<TrackingDomain>;
  updateTrackingDomain(id: number, trackingDomain: Partial<InsertTrackingDomain>): Promise<TrackingDomain | undefined>;
  deleteTrackingDomain(id: number): Promise<void>;

  // IP Pools
  getIpPools(): Promise<IpPool[]>;
  getIpPool(id: number): Promise<IpPool | undefined>;
  createIpPool(ipPool: InsertIpPool): Promise<IpPool>;
  updateIpPool(id: number, ipPool: Partial<InsertIpPool>): Promise<IpPool | undefined>;
  deleteIpPool(id: number): Promise<void>;

  // Send Policies
  getSendPolicies(): Promise<SendPolicy[]>;
  getSendPolicy(id: number): Promise<SendPolicy | undefined>;
  createSendPolicy(sendPolicy: InsertSendPolicy): Promise<SendPolicy>;
  updateSendPolicy(id: number, sendPolicy: Partial<InsertSendPolicy>): Promise<SendPolicy | undefined>;
  deleteSendPolicy(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(
      or(eq(users.username, username), eq(users.email, username))
    );
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updateData: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  // Accounts
  async getAccounts(filters?: FilterGroup): Promise<Account[]> {
    let query = db.select().from(accounts);

    if (filters) {
      const filterCondition = buildFilterQuery(filters, accounts);
      if (filterCondition) {
        query = query.where(filterCondition) as any;
      }
    }

    return await query.orderBy(desc(accounts.createdAt));
  }

  async getAccount(id: string): Promise<Account | undefined> {
    const [account] = await db.select().from(accounts).where(eq(accounts.id, id));
    return account || undefined;
  }

  async getAccountsByIds(ids: string[]): Promise<Account[]> {
    if (ids.length === 0) return [];
    return await db.select().from(accounts).where(inArray(accounts.id, ids));
  }

  async getAccountByDomain(domain: string): Promise<Account | undefined> {
    const [account] = await db.select().from(accounts).where(eq(accounts.domain, domain));
    return account || undefined;
  }

  async createAccount(insertAccount: InsertAccount): Promise<Account> {
    const [account] = await db.insert(accounts).values(insertAccount).returning();
    return account;
  }

  async updateAccount(id: string, updateData: Partial<InsertAccount>): Promise<Account | undefined> {
    const [account] = await db
      .update(accounts)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(accounts.id, id))
      .returning();
    return account || undefined;
  }

  async deleteAccount(id: string): Promise<void> {
    await db.delete(accounts).where(eq(accounts.id, id));
  }

  // Contacts
  async getContacts(filters?: FilterGroup): Promise<Contact[]> {
    let query = db.select().from(contacts);

    if (filters) {
      const filterCondition = buildFilterQuery(filters, contacts);
      if (filterCondition) {
        query = query.where(filterCondition) as any;
      }
    }

    return await query.orderBy(desc(contacts.createdAt));
  }

  async getContact(id: string): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, id));
    return contact || undefined;
  }

  async getContactsByAccountId(accountId: string): Promise<Contact[]> {
    return await db.select().from(contacts).where(eq(contacts.accountId, accountId));
  }

  async createContact(insertContact: InsertContact): Promise<Contact> {
    const [contact] = await db.insert(contacts).values(insertContact).returning();
    return contact;
  }

  async updateContact(id: string, updateData: Partial<InsertContact>): Promise<Contact | undefined> {
    const [contact] = await db
      .update(contacts)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(contacts.id, id))
      .returning();
    return contact || undefined;
  }

  async deleteContact(id: string): Promise<void> {
    await db.delete(contacts).where(eq(contacts.id, id));
  }

  // Custom Field Definitions
  async getCustomFieldDefinitions(entityType?: 'account' | 'contact'): Promise<CustomFieldDefinition[]> {
    if (entityType) {
      const definitions = await db
        .select()
        .from(customFieldDefinitions)
        .where(and(
          eq(customFieldDefinitions.active, true),
          eq(customFieldDefinitions.entityType, entityType)
        ))
        .orderBy(customFieldDefinitions.displayOrder);
      return definitions;
    } else {
      const definitions = await db
        .select()
        .from(customFieldDefinitions)
        .where(eq(customFieldDefinitions.active, true))
        .orderBy(customFieldDefinitions.displayOrder);
      return definitions;
    }
  }

  async getCustomFieldDefinition(id: string): Promise<CustomFieldDefinition | undefined> {
    const [definition] = await db.select().from(customFieldDefinitions).where(eq(customFieldDefinitions.id, id));
    return definition || undefined;
  }

  async createCustomFieldDefinition(insertData: InsertCustomFieldDefinition): Promise<CustomFieldDefinition> {
    const [definition] = await db
      .insert(customFieldDefinitions)
      .values(insertData)
      .returning();
    return definition;
  }

  async updateCustomFieldDefinition(id: string, updateData: Partial<InsertCustomFieldDefinition>): Promise<CustomFieldDefinition | undefined> {
    const [definition] = await db
      .update(customFieldDefinitions)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(customFieldDefinitions.id, id))
      .returning();
    return definition || undefined;
  }

  async deleteCustomFieldDefinition(id: string): Promise<void> {
    // Soft delete by setting active to false
    await db
      .update(customFieldDefinitions)
      .set({ active: false, updatedAt: new Date() })
      .where(eq(customFieldDefinitions.id, id));
  }

  async upsertContact(data: Partial<InsertContact> & { email: string }, options?: {
    sourceSystem?: string,
    sourceRecordId?: string,
    sourceUpdatedAt?: Date,
    actorId?: string
  }): Promise<{ contact: Contact, action: 'created' | 'updated' }> {
    const { normalizeEmail, normalizePhoneE164 } = await import('./normalization.js');

    // Normalize business keys
    const emailNormalized = normalizeEmail(data.email);

    // Deterministic lookup: find by normalized email
    const [existing] = await db
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.emailNormalized, emailNormalized),
          isNull(contacts.deletedAt)
        )
      )
      .limit(1);

    if (existing) {
      // UPDATE: Apply field-level survivorship with audit logging
      const updates: Partial<InsertContact> = {
        emailNormalized,
        sourceSystem: options?.sourceSystem,
        sourceRecordId: options?.sourceRecordId,
        sourceUpdatedAt: options?.sourceUpdatedAt,
        updatedAt: new Date()
      };

      const changeLogs: any[] = [];

      // Survivorship: prefer new if not null, otherwise keep existing
      const fieldsToUpdate = [
        'fullName', 'firstName', 'lastName', 'jobTitle', 'email',
        'directPhone', 'phoneExtension', 'seniorityLevel', 'department',
        'address', 'linkedinUrl', 'consentBasis', 'consentSource', 'accountId'
      ];

      for (const field of fieldsToUpdate) {
        if (data[field as keyof typeof data] !== undefined && data[field as keyof typeof data] !== null) {
          const newValue = data[field as keyof typeof data];
          const oldValue = (existing as any)[field];

          if (newValue !== oldValue) {
            (updates as any)[field] = newValue;

            // Log field change
            changeLogs.push({
              entityType: 'contact',
              entityId: existing.id,
              fieldKey: field,
              oldValue: oldValue,
              newValue: newValue,
              sourceSystem: options?.sourceSystem || null,
              actorId: options?.actorId || null,
              survivorshipPolicy: 'prefer_new_if_not_null'
            });
          }
        }
      }

      // Union for array fields (tags, intentTopics)
      if (data.tags && data.tags.length > 0) {
        const existingTags = existing.tags || [];
        const newTags = Array.from(new Set([...existingTags, ...data.tags]));
        if (JSON.stringify(existingTags.sort()) !== JSON.stringify(newTags.sort())) {
          updates.tags = newTags;
          changeLogs.push({
            entityType: 'contact',
            entityId: existing.id,
            fieldKey: 'tags',
            oldValue: existingTags,
            newValue: newTags,
            sourceSystem: options?.sourceSystem || null,
            actorId: options?.actorId || null,
            survivorshipPolicy: 'union'
          });
        }
      }

      if (data.intentTopics && data.intentTopics.length > 0) {
        const existingTopics = existing.intentTopics || [];
        const newTopics = Array.from(new Set([...existingTopics, ...data.intentTopics]));
        if (JSON.stringify(existingTopics.sort()) !== JSON.stringify(newTopics.sort())) {
          updates.intentTopics = newTopics;
          changeLogs.push({
            entityType: 'contact',
            entityId: existing.id,
            fieldKey: 'intentTopics',
            oldValue: existingTopics,
            newValue: newTopics,
            sourceSystem: options?.sourceSystem || null,
            actorId: options?.actorId || null,
            survivorshipPolicy: 'union'
          });
        }
      }

      // Custom fields: merge
      if (data.customFields) {
        const mergedCustomFields = { ...existing.customFields as any, ...data.customFields as any };
        updates.customFields = mergedCustomFields;
        changeLogs.push({
          entityType: 'contact',
          entityId: existing.id,
          fieldKey: 'customFields',
          oldValue: existing.customFields,
          newValue: mergedCustomFields,
          sourceSystem: options?.sourceSystem || null,
          actorId: options?.actorId || null,
          survivorshipPolicy: 'merge'
        });
      }

      // Normalize phone if provided
      if (data.directPhone) {
        const e164 = normalizePhoneE164(data.directPhone);
        if (e164 && e164 !== existing.directPhoneE164) {
          updates.directPhoneE164 = e164;
          changeLogs.push({
            entityType: 'contact',
            entityId: existing.id,
            fieldKey: 'directPhoneE164',
            oldValue: existing.directPhoneE164,
            newValue: e164,
            sourceSystem: options?.sourceSystem || null,
            actorId: options?.actorId || null,
            survivorshipPolicy: 'prefer_new_normalized'
          });
        }
      }

      // Write change logs if there are any changes
      if (changeLogs.length > 0) {
        await db.insert(fieldChangeLog).values(changeLogs);
      }

      const [updated] = await db
        .update(contacts)
        .set(updates)
        .where(eq(contacts.id, existing.id))
        .returning();

      return { contact: updated, action: 'updated' };
    } else {
      // CREATE: New contact
      // Compute fullName if not provided
      const fullName = data.fullName || 
        (data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : 
         data.firstName || data.lastName || data.email);

      const insertData: InsertContact = {
        ...data,
        fullName,
        emailNormalized,
        sourceSystem: options?.sourceSystem,
        sourceRecordId: options?.sourceRecordId,
        sourceUpdatedAt: options?.sourceUpdatedAt
      } as InsertContact;

      // Normalize phone if provided
      if (data.directPhone) {
        const e164 = normalizePhoneE164(data.directPhone);
        if (e164) {
          insertData.directPhoneE164 = e164;
        }
      }

      const [created] = await db.insert(contacts).values(insertData).returning();
      return { contact: created, action: 'created' };
    }
  }

  async upsertAccount(data: Partial<InsertAccount> & { name: string }, options?: {
    sourceSystem?: string,
    sourceRecordId?: string,
    sourceUpdatedAt?: Date,
    actorId?: string
  }): Promise<{ account: Account, action: 'created' | 'updated' }> {
    const { normalizeDomain, normalizeName, normalizePhoneE164 } = await import('./normalization.js');

    // Normalize business keys
    const nameNormalized = normalizeName(data.name);
    const domainNormalized = data.domain ? normalizeDomain(data.domain) : null;

    // Deterministic lookup: prefer domain, fallback to name+geo
    let existing: Account | undefined;

    if (domainNormalized) {
      [existing] = await db
        .select()
        .from(accounts)
        .where(
          and(
            eq(accounts.domainNormalized, domainNormalized),
            isNull(accounts.deletedAt)
          )
        )
        .limit(1);
    }

    // Fallback: match by name + city + country if no domain match
    if (!existing && data.hqCity && data.hqCountry) {
      [existing] = await db
        .select()
        .from(accounts)
        .where(
          and(
            eq(accounts.nameNormalized, nameNormalized),
            eq(accounts.hqCity, data.hqCity),
            eq(accounts.hqCountry, data.hqCountry),
            isNull(accounts.domainNormalized),
            isNull(accounts.deletedAt)
          )
        )
        .limit(1);
    }

    if (existing) {
      // UPDATE: Apply field-level survivorship with audit logging
      const updates: Partial<InsertAccount> = {
        nameNormalized,
        domainNormalized: domainNormalized || existing.domainNormalized,
        sourceSystem: options?.sourceSystem,
        sourceRecordId: options?.sourceRecordId,
        sourceUpdatedAt: options?.sourceUpdatedAt,
        updatedAt: new Date()
      };

      const changeLogs: any[] = [];

      // Survivorship: prefer new if not null
      const fieldsToUpdate = [
        'name', 'domain', 'industry', 'annualRevenue', 'employeesSizeRange',
        'staffCount', 'description', 'hqAddress', 'hqCity', 'hqState', 'hqCountry',
        'yearFounded', 'sicCode', 'naicsCode', 'linkedinUrl', 'mainPhone',
        'mainPhoneExtension', 'ownerId'
      ];

      for (const field of fieldsToUpdate) {
        if (data[field as keyof typeof data] !== undefined && data[field as keyof typeof data] !== null) {
          const newValue = data[field as keyof typeof data];
          const oldValue = (existing as any)[field];

          if (newValue !== oldValue) {
            (updates as any)[field] = newValue;

            changeLogs.push({
              entityType: 'account',
              entityId: existing.id,
              fieldKey: field,
              oldValue: oldValue,
              newValue: newValue,
              sourceSystem: options?.sourceSystem || null,
              actorId: options?.actorId || null,
              survivorshipPolicy: 'prefer_new_if_not_null'
            });
          }
        }
      }

      // Union for array fields
      if (data.tags && data.tags.length > 0) {
        const existingTags = existing.tags || [];
        const newTags = Array.from(new Set([...existingTags, ...data.tags]));
        if (JSON.stringify(existingTags.sort()) !== JSON.stringify(newTags.sort())) {
          updates.tags = newTags;
          changeLogs.push({
            entityType: 'account',
            entityId: existing.id,
            fieldKey: 'tags',
            oldValue: existingTags,
            newValue: newTags,
            sourceSystem: options?.sourceSystem || null,
            actorId: options?.actorId || null,
            survivorshipPolicy: 'union'
          });
        }
      }

      if (data.intentTopics && data.intentTopics.length > 0) {
        const existingTopics = existing.intentTopics || [];
        const newTopics = Array.from(new Set([...existingTopics, ...data.intentTopics]));
        if (JSON.stringify(existingTopics.sort()) !== JSON.stringify(newTopics.sort())) {
          updates.intentTopics = newTopics;
          changeLogs.push({
            entityType: 'account',
            entityId: existing.id,
            fieldKey: 'intentTopics',
            oldValue: existingTopics,
            newValue: newTopics,
            sourceSystem: options?.sourceSystem || null,
            actorId: options?.actorId || null,
            survivorshipPolicy: 'union'
          });
        }
      }

      if (data.techStack && data.techStack.length > 0) {
        const existingTech = existing.techStack || [];
        const newTech = Array.from(new Set([...existingTech, ...data.techStack]));
        if (JSON.stringify(existingTech.sort()) !== JSON.stringify(newTech.sort())) {
          updates.techStack = newTech;
          changeLogs.push({
            entityType: 'account',
            entityId: existing.id,
            fieldKey: 'techStack',
            oldValue: existingTech,
            newValue: newTech,
            sourceSystem: options?.sourceSystem || null,
            actorId: options?.actorId || null,
            survivorshipPolicy: 'union'
          });
        }
      }

      if (data.linkedinSpecialties && data.linkedinSpecialties.length > 0) {
        const existingSpec = existing.linkedinSpecialties || [];
        const newSpec = Array.from(new Set([...existingSpec, ...data.linkedinSpecialties]));
        if (JSON.stringify(existingSpec.sort()) !== JSON.stringify(newSpec.sort())) {
          updates.linkedinSpecialties = newSpec;
          changeLogs.push({
            entityType: 'account',
            entityId: existing.id,
            fieldKey: 'linkedinSpecialties',
            oldValue: existingSpec,
            newValue: newSpec,
            sourceSystem: options?.sourceSystem || null,
            actorId: options?.actorId || null,
            survivorshipPolicy: 'union'
          });
        }
      }

      // Custom fields: merge
      if (data.customFields) {
        const mergedCustomFields = { ...existing.customFields as any, ...data.customFields as any };
        updates.customFields = mergedCustomFields;
        changeLogs.push({
          entityType: 'account',
          entityId: existing.id,
          fieldKey: 'customFields',
          oldValue: existing.customFields,
          newValue: mergedCustomFields,
          sourceSystem: options?.sourceSystem || null,
          actorId: options?.actorId || null,
          survivorshipPolicy: 'merge'
        });
      }

      // Normalize phone if provided
      if (data.mainPhone) {
        const e164 = normalizePhoneE164(data.mainPhone);
        if (e164 && e164 !== existing.mainPhoneE164) {
          updates.mainPhoneE164 = e164;
          changeLogs.push({
            entityType: 'account',
            entityId: existing.id,
            fieldKey: 'mainPhoneE164',
            oldValue: existing.mainPhoneE164,
            newValue: e164,
            sourceSystem: options?.sourceSystem || null,
            actorId: options?.actorId || null,
            survivorshipPolicy: 'prefer_new_normalized'
          });
        }
      }

      // Write change logs if there are any changes
      if (changeLogs.length > 0) {
        await db.insert(fieldChangeLog).values(changeLogs);
      }

      const [updated] = await db
        .update(accounts)
        .set(updates)
        .where(eq(accounts.id, existing.id))
        .returning();

      return { account: updated, action: 'updated' };
    } else {
      // CREATE: New account
      const insertData: InsertAccount = {
        ...data,
        nameNormalized,
        domainNormalized: domainNormalized || undefined,
        sourceSystem: options?.sourceSystem,
        sourceRecordId: options?.sourceRecordId,
        sourceUpdatedAt: options?.sourceUpdatedAt
      } as InsertAccount;

      // Normalize phone if provided
      if (data.mainPhone) {
        const e164 = normalizePhoneE164(data.mainPhone);
        if (e164) {
          insertData.mainPhoneE164 = e164;
        }
      }

      const [created] = await db.insert(accounts).values(insertData).returning();
      return { account: created, action: 'created' };
    }
  }

  // Campaigns
  async getCampaigns(filters?: any): Promise<Campaign[]> {
    return await db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
  }

  async getCampaign(id: string): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return campaign || undefined;
  }

  async createCampaign(insertCampaign: InsertCampaign): Promise<Campaign> {
    const [campaign] = await db.insert(campaigns).values(insertCampaign).returning();
    return campaign;
  }

  async updateCampaign(id: string, updateData: Partial<InsertCampaign>): Promise<Campaign | undefined> {
    const [campaign] = await db
      .update(campaigns)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(campaigns.id, id))
      .returning();
    return campaign || undefined;
  }

  async deleteCampaign(id: string): Promise<void> {
    await db.delete(campaigns).where(eq(campaigns.id, id));
  }

  // Campaign Audience Snapshots
  async createCampaignAudienceSnapshot(insertSnapshot: InsertCampaignAudienceSnapshot): Promise<CampaignAudienceSnapshot> {
    const [snapshot] = await db.insert(campaignAudienceSnapshots).values(insertSnapshot).returning();
    return snapshot;
  }

  async getCampaignAudienceSnapshots(campaignId: string): Promise<CampaignAudienceSnapshot[]> {
    return await db.select().from(campaignAudienceSnapshots).where(eq(campaignAudienceSnapshots.campaignId, campaignId));
  }

  // Campaign Queue (Account Lead Cap)
  async getCampaignQueue(campaignId: string, status?: string): Promise<any[]> {
    const baseQuery = db
      .select({
        id: campaignQueue.id,
        campaignId: campaignQueue.campaignId,
        contactId: campaignQueue.contactId,
        accountId: campaignQueue.accountId,
        priority: campaignQueue.priority,
        status: campaignQueue.status,
        removedReason: campaignQueue.removedReason,
        queuedAt: campaignQueue.createdAt,
        processedAt: campaignQueue.updatedAt,
        contact: {
          firstName: contacts.firstName,
          lastName: contacts.lastName,
          email: contacts.email,
          phoneNumber: contacts.phoneNumber,
        },
        account: {
          name: accounts.name,
        },
      })
      .from(campaignQueue)
      .leftJoin(contacts, eq(campaignQueue.contactId, contacts.id))
      .leftJoin(accounts, eq(campaignQueue.accountId, accounts.id))
      .where(eq(campaignQueue.campaignId, campaignId));

    if (status) {
      const results = await baseQuery
        .where(and(eq(campaignQueue.campaignId, campaignId), eq(campaignQueue.status, status as any)))
        .orderBy(desc(campaignQueue.priority), campaignQueue.createdAt);
      return results;
    }

    return await baseQuery.orderBy(desc(campaignQueue.priority), campaignQueue.createdAt);
  }

  async enqueueContact(campaignId: string, contactId: string, accountId: string, priority: number = 0): Promise<any> {
    return await db.transaction(async (tx) => {
      const [queueItem] = await tx.insert(campaignQueue).values({
        campaignId,
        contactId,
        accountId,
        priority,
        status: 'queued',
      }).returning();
      
      // Atomic upsert using ON CONFLICT - handles concurrent first-writes
      await tx.insert(campaignAccountStats).values({
        campaignId,
        accountId,
        queuedCount: 1,
        connectedCount: 0,
        positiveDispCount: 0,
      }).onConflictDoUpdate({
        target: [campaignAccountStats.campaignId, campaignAccountStats.accountId],
        set: {
          queuedCount: sql`${campaignAccountStats.queuedCount} + 1`,
        },
      });
      
      return queueItem;
    });
  }

  async updateQueueStatus(id: string, status: string, removedReason?: string, isPositiveDisposition?: boolean): Promise<any> {
    return await db.transaction(async (tx) => {
      const [current] = await tx.select().from(campaignQueue).where(eq(campaignQueue.id, id));
      if (!current) return undefined;

      // Include old status in WHERE to prevent duplicate transitions
      const updated = await tx
        .update(campaignQueue)
        .set({ status: status as any, removedReason, updatedAt: new Date() })
        .where(and(
          eq(campaignQueue.id, id),
          eq(campaignQueue.status, current.status as any)
        ))
        .returning();

      // Only update counters if status actually changed (UPDATE succeeded)
      if (updated.length === 0) {
        // Status already changed by another transaction - no counter adjustments needed
        return current;
      }

      // Build upsert values for atomic counter updates
      const baseValues = {
        campaignId: current.campaignId,
        accountId: current.accountId,
        queuedCount: 0,
        connectedCount: 0,
        positiveDispCount: 0,
      };
      
      const updateSet: any = {};
      
      if (current.status === 'queued' && status !== 'queued') {
        updateSet.queuedCount = sql`GREATEST(0, ${campaignAccountStats.queuedCount} - 1)`;
      }
      
      if (status === 'done' || status === 'in_progress') {
        updateSet.connectedCount = sql`${campaignAccountStats.connectedCount} + 1`;
      }

      if (isPositiveDisposition) {
        updateSet.positiveDispCount = sql`${campaignAccountStats.positiveDispCount} + 1`;
      }

      if (Object.keys(updateSet).length > 0) {
        await tx.insert(campaignAccountStats).values(baseValues).onConflictDoUpdate({
          target: [campaignAccountStats.campaignId, campaignAccountStats.accountId],
          set: updateSet,
        });
      }

      return updated[0];
    });
  }

  async removeFromQueue(campaignId: string, contactId: string, reason: string): Promise<void> {
    await db.transaction(async (tx) => {
      const [current] = await tx.select().from(campaignQueue).where(
        and(
          eq(campaignQueue.campaignId, campaignId),
          eq(campaignQueue.contactId, contactId)
        )
      );

      if (!current) return;

      await tx
        .update(campaignQueue)
        .set({ status: 'removed', removedReason: reason, updatedAt: new Date() })
        .where(and(
          eq(campaignQueue.campaignId, campaignId),
          eq(campaignQueue.contactId, contactId)
        ));

      // Atomic decrement using ON CONFLICT if was queued
      if (current.status === 'queued') {
        await tx.insert(campaignAccountStats).values({
          campaignId,
          accountId: current.accountId,
          queuedCount: 0,
          connectedCount: 0,
          positiveDispCount: 0,
        }).onConflictDoUpdate({
          target: [campaignAccountStats.campaignId, campaignAccountStats.accountId],
          set: {
            queuedCount: sql`GREATEST(0, ${campaignAccountStats.queuedCount} - 1)`,
          },
        });
      }
    });
  }

  async removeFromQueueById(campaignId: string, queueId: string, reason: string): Promise<void> {
    await db.transaction(async (tx) => {
      const [current] = await tx.select().from(campaignQueue).where(
        and(
          eq(campaignQueue.id, queueId),
          eq(campaignQueue.campaignId, campaignId)
        )
      );

      if (!current) {
        throw new Error("Queue item not found or does not belong to this campaign");
      }

      await tx
        .update(campaignQueue)
        .set({ status: 'removed', removedReason: reason, updatedAt: new Date() })
        .where(
          and(
            eq(campaignQueue.id, queueId),
            eq(campaignQueue.campaignId, campaignId)
          )
        );

      // Atomic decrement using ON CONFLICT if was queued
      if (current.status === 'queued') {
        await tx.insert(campaignAccountStats).values({
          campaignId: current.campaignId,
          accountId: current.accountId,
          queuedCount: 0,
          connectedCount: 0,
          positiveDispCount: 0,
        }).onConflictDoUpdate({
          target: [campaignAccountStats.campaignId, campaignAccountStats.accountId],
          set: {
            queuedCount: sql`GREATEST(0, ${campaignAccountStats.queuedCount} - 1)`,
          },
        });
      }
    });
  }

  async getCampaignAccountStats(campaignId: string, accountId?: string): Promise<any[]> {
    const baseQuery = db
      .select({
        accountId: campaignAccountStats.accountId,
        accountName: accounts.name,
        queuedCount: campaignAccountStats.queuedCount,
        connectedCount: campaignAccountStats.connectedCount,
        positiveDispCount: campaignAccountStats.positiveDispCount,
      })
      .from(campaignAccountStats)
      .leftJoin(accounts, eq(campaignAccountStats.accountId, accounts.id))
      .where(eq(campaignAccountStats.campaignId, campaignId));

    if (accountId) {
      return await baseQuery.where(
        and(
          eq(campaignAccountStats.campaignId, campaignId),
          eq(campaignAccountStats.accountId, accountId)
        )
      );
    }
    return await baseQuery;
  }

  async upsertCampaignAccountStats(campaignId: string, accountId: string, updates: any): Promise<any> {
    const existing = await db.select().from(campaignAccountStats).where(
      and(
        eq(campaignAccountStats.campaignId, campaignId),
        eq(campaignAccountStats.accountId, accountId)
      )
    );

    if (existing.length > 0) {
      const current = existing[0];
      const [updated] = await db
        .update(campaignAccountStats)
        .set({
          queuedCount: current.queuedCount + (updates.queuedCount || 0),
          connectedCount: current.connectedCount + (updates.connectedCount || 0),
          positiveDispCount: current.positiveDispCount + (updates.positiveDispCount || 0),
        })
        .where(and(
          eq(campaignAccountStats.campaignId, campaignId),
          eq(campaignAccountStats.accountId, accountId)
        ))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(campaignAccountStats).values({
        campaignId,
        accountId,
        queuedCount: updates.queuedCount || 0,
        connectedCount: updates.connectedCount || 0,
        positiveDispCount: updates.positiveDispCount || 0,
      }).returning();
      return created;
    }
  }

  async enforceAccountCap(campaignId: string): Promise<{ removed: number; accounts: string[] }> {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign || !campaign.accountCapEnabled || !campaign.accountCapValue) {
      return { removed: 0, accounts: [] };
    }

    const { accountCapValue, accountCapMode } = campaign;
    const affectedAccounts: string[] = [];
    let totalRemoved = 0;

    // Get all accounts in this campaign's queue
    const accountsInQueue = await db
      .selectDistinct({ accountId: campaignQueue.accountId })
      .from(campaignQueue)
      .where(and(
        eq(campaignQueue.campaignId, campaignId),
        eq(campaignQueue.status, 'queued')
      ));

    for (const { accountId } of accountsInQueue) {
      let currentCount = 0;
      
      // Determine count based on mode
      if (accountCapMode === 'queue_size') {
        const stats = await this.getCampaignAccountStats(campaignId, accountId);
        currentCount = stats[0]?.queuedCount || 0;
      } else if (accountCapMode === 'connected_calls') {
        const stats = await this.getCampaignAccountStats(campaignId, accountId);
        currentCount = stats[0]?.connectedCount || 0;
      } else if (accountCapMode === 'positive_disp') {
        const stats = await this.getCampaignAccountStats(campaignId, accountId);
        currentCount = stats[0]?.positiveDispCount || 0;
      }

      if (currentCount > accountCapValue) {
        const overflow = currentCount - accountCapValue;
        
        // Remove lowest priority items for this account
        const toRemove = await db
          .select()
          .from(campaignQueue)
          .where(and(
            eq(campaignQueue.campaignId, campaignId),
            eq(campaignQueue.accountId, accountId),
            eq(campaignQueue.status, 'queued')
          ))
          .orderBy(campaignQueue.priority, desc(campaignQueue.createdAt))
          .limit(overflow);

        for (const item of toRemove) {
          await this.updateQueueStatus(item.id, 'removed', 'ACCOUNT_CAP_TRIM');
          totalRemoved++;
        }

        if (toRemove.length > 0) {
          affectedAccounts.push(accountId);
        }
      }
    }

    return { removed: totalRemoved, accounts: affectedAccounts };
  }

  // Agent Queue Assignment
  async getAgents(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, 'agent'));
  }

  async assignQueueToAgents(campaignId: string, agentIds: string[], mode: 'round_robin' | 'weighted' = 'round_robin'): Promise<{ assigned: number }> {
    // Get all unassigned queued items for this campaign
    const queueItems = await db
      .select()
      .from(campaignQueue)
      .where(and(
        eq(campaignQueue.campaignId, campaignId),
        eq(campaignQueue.status, 'queued'),
        isNull(campaignQueue.agentId)
      ))
      .orderBy(desc(campaignQueue.priority), campaignQueue.createdAt);

    if (queueItems.length === 0 || agentIds.length === 0) {
      return { assigned: 0 };
    }

    let assignedCount = 0;

    if (mode === 'round_robin') {
      // Round robin assignment
      for (let i = 0; i < queueItems.length; i++) {
        const agentId = agentIds[i % agentIds.length];
        await db
          .update(campaignQueue)
          .set({ agentId, updatedAt: new Date() })
          .where(eq(campaignQueue.id, queueItems[i].id));
        assignedCount++;
      }
    } else if (mode === 'weighted') {
      // For weighted, distribute evenly (can be enhanced with actual weights later)
      const itemsPerAgent = Math.floor(queueItems.length / agentIds.length);
      let currentIndex = 0;

      for (const agentId of agentIds) {
        const endIndex = Math.min(currentIndex + itemsPerAgent, queueItems.length);
        for (let i = currentIndex; i < endIndex; i++) {
          await db
            .update(campaignQueue)
            .set({ agentId, updatedAt: new Date() })
            .where(eq(campaignQueue.id, queueItems[i].id));
          assignedCount++;
        }
        currentIndex = endIndex;
      }

      // Assign remaining items in round-robin
      for (let i = currentIndex; i < queueItems.length; i++) {
        const agentId = agentIds[(i - currentIndex) % agentIds.length];
        await db
          .update(campaignQueue)
          .set({ agentId, updatedAt: new Date() })
          .where(eq(campaignQueue.id, queueItems[i].id));
        assignedCount++;
      }
    }

    return { assigned: assignedCount };
  }

  async getAgentQueue(agentId: string, campaignId?: string, status?: string): Promise<any[]> {
    let query = db
      .select({
        id: campaignQueue.id,
        campaignId: campaignQueue.campaignId,
        campaignName: campaigns.name,
        contactId: campaignQueue.contactId,
        contactName: sql<string>`COALESCE(${contacts.fullName}, CONCAT(${contacts.firstName}, ' ', ${contacts.lastName}))`.as('contactName'),
        contactEmail: contacts.email,
        contactPhone: contacts.directPhone,
        accountId: campaignQueue.accountId,
        accountName: accounts.name,
        priority: campaignQueue.priority,
        status: campaignQueue.status,
        createdAt: campaignQueue.createdAt,
        updatedAt: campaignQueue.updatedAt,
      })
      .from(campaignQueue)
      .leftJoin(contacts, eq(campaignQueue.contactId, contacts.id))
      .leftJoin(accounts, eq(campaignQueue.accountId, accounts.id))
      .leftJoin(campaigns, eq(campaignQueue.campaignId, campaigns.id))
      .where(eq(campaignQueue.agentId, agentId));

    if (campaignId) {
      query = query.where(eq(campaignQueue.campaignId, campaignId)) as any;
    }

    if (status) {
      query = query.where(eq(campaignQueue.status, status as any)) as any;
    }

    const results = await query.orderBy(desc(campaignQueue.priority), campaignQueue.createdAt);
    return results;
  }

  // Email Templates
  async getEmailTemplates(): Promise<EmailTemplate[]> {
    return await db.select().from(emailTemplates).orderBy(desc(emailTemplates.createdAt));
  }

  async getEmailTemplate(id: string): Promise<EmailTemplate | undefined> {
    const [template] = await db.select().from(emailTemplates).where(eq(emailTemplates.id, id));
    return template || undefined;
  }

  async createEmailTemplate(insertTemplate: InsertEmailTemplate): Promise<EmailTemplate> {
    const [template] = await db.insert(emailTemplates).values(insertTemplate).returning();
    return template;
  }

  async updateEmailTemplate(id: string, updateData: Partial<InsertEmailTemplate>): Promise<EmailTemplate | undefined> {
    const [template] = await db
      .update(emailTemplates)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(emailTemplates.id, id))
      .returning();
    return template || undefined;
  }

  async approveEmailTemplate(id: string, approvedById: string): Promise<EmailTemplate | undefined> {
    const [template] = await db
      .update(emailTemplates)
      .set({
        isApproved: true,
        approvedById,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(emailTemplates.id, id))
      .returning();
    return template || undefined;
  }

  async deleteEmailTemplate(id: string): Promise<void> {
    await db.delete(emailTemplates).where(eq(emailTemplates.id, id));
  }

  // Email Sends
  async getEmailSends(campaignId?: string): Promise<EmailSend[]> {
    if (campaignId) {
      return await db.select().from(emailSends).where(eq(emailSends.campaignId, campaignId));
    }
    return await db.select().from(emailSends).orderBy(desc(emailSends.createdAt));
  }

  async getEmailSend(id: string): Promise<EmailSend | undefined> {
    const [send] = await db.select().from(emailSends).where(eq(emailSends.id, id));
    return send || undefined;
  }

  async createEmailSend(insertSend: InsertEmailSend): Promise<EmailSend> {
    const [send] = await db.insert(emailSends).values(insertSend).returning();
    return send;
  }

  async updateEmailSend(id: string, updateData: Partial<InsertEmailSend>): Promise<EmailSend | undefined> {
    const [send] = await db
      .update(emailSends)
      .set(updateData)
      .where(eq(emailSends.id, id))
      .returning();
    return send || undefined;
  }

  // Email Events
  async createEmailEvent(insertEvent: InsertEmailEvent): Promise<EmailEvent> {
    const [event] = await db.insert(emailEvents).values(insertEvent).returning();
    return event;
  }

  async getEmailEvents(sendId: string): Promise<EmailEvent[]> {
    return await db.select().from(emailEvents).where(eq(emailEvents.sendId, sendId)).orderBy(desc(emailEvents.createdAt));
  }

  // Call Scripts
  async getCallScripts(campaignId?: string): Promise<CallScript[]> {
    if (campaignId) {
      return await db.select().from(callScripts).where(eq(callScripts.campaignId, campaignId));
    }
    return await db.select().from(callScripts).orderBy(desc(callScripts.createdAt));
  }

  async getCallScript(id: string): Promise<CallScript | undefined> {
    const [script] = await db.select().from(callScripts).where(eq(callScripts.id, id));
    return script || undefined;
  }

  async createCallScript(insertScript: InsertCallScript): Promise<CallScript> {
    const [script] = await db.insert(callScripts).values(insertScript).returning();
    return script;
  }

  async updateCallScript(id: string, updateData: Partial<InsertCallScript>): Promise<CallScript | undefined> {
    const [script] = await db
      .update(callScripts)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(callScripts.id, id))
      .returning();
    return script || undefined;
  }

  async deleteCallScript(id: string): Promise<void> {
    await db.delete(callScripts).where(eq(callScripts.id, id));
  }

  // Call Attempts
  async getCallAttempts(campaignId?: string, agentId?: string): Promise<CallAttempt[]> {
    let query = db.select().from(callAttempts);

    if (campaignId && agentId) {
      query = query.where(and(eq(callAttempts.campaignId, campaignId), eq(callAttempts.agentId, agentId)));
    } else if (campaignId) {
      query = query.where(eq(callAttempts.campaignId, campaignId));
    } else if (agentId) {
      query = query.where(eq(callAttempts.agentId, agentId));
    }

    return await query.orderBy(desc(callAttempts.createdAt));
  }

  async getCallAttempt(id: string): Promise<CallAttempt | undefined> {
    const [attempt] = await db.select().from(callAttempts).where(eq(callAttempts.id, id));
    return attempt || undefined;
  }

  async createCallAttempt(insertAttempt: InsertCallAttempt): Promise<CallAttempt> {
    const [attempt] = await db.insert(callAttempts).values(insertAttempt).returning();
    return attempt;
  }

  async updateCallAttempt(id: string, updateData: Partial<InsertCallAttempt>): Promise<CallAttempt | undefined> {
    const [attempt] = await db
      .update(callAttempts)
      .set(updateData)
      .where(eq(callAttempts.id, id))
      .returning();
    return attempt || undefined;
  }

  // Call Events
  async createCallEvent(insertEvent: InsertCallEvent): Promise<CallEvent> {
    const [event] = await db.insert(callEvents).values(insertEvent).returning();
    return event;
  }

  async getCallEvents(attemptId: string): Promise<CallEvent[]> {
    return await db.select().from(callEvents).where(eq(callEvents.attemptId, attemptId)).orderBy(desc(callEvents.createdAt));
  }

  // Softphone Profiles (Phase 27)
  async getSoftphoneProfile(userId: string): Promise<SoftphoneProfile | undefined> {
    const [profile] = await db.select().from(softphoneProfiles).where(eq(softphoneProfiles.userId, userId));
    return profile || undefined;
  }

  async upsertSoftphoneProfile(insertProfile: InsertSoftphoneProfile): Promise<SoftphoneProfile> {
    const [profile] = await db
      .insert(softphoneProfiles)
      .values({ ...insertProfile, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: softphoneProfiles.userId,
        set: {
          micDeviceId: insertProfile.micDeviceId,
          speakerDeviceId: insertProfile.speakerDeviceId,
          lastTestAt: insertProfile.lastTestAt,
          testResultsJson: insertProfile.testResultsJson,
          updatedAt: new Date(),
        },
      })
      .returning();
    return profile;
  }

  // Call Recording Access Logs (Phase 27)
  async createCallRecordingAccessLog(insertLog: InsertCallRecordingAccessLog): Promise<CallRecordingAccessLog> {
    const [log] = await db.insert(callRecordingAccessLogs).values(insertLog).returning();
    return log;
  }

  async getCallRecordingAccessLogs(callAttemptId: string): Promise<CallRecordingAccessLog[]> {
    return await db
      .select()
      .from(callRecordingAccessLogs)
      .where(eq(callRecordingAccessLogs.callAttemptId, callAttemptId))
      .orderBy(desc(callRecordingAccessLogs.createdAt));
  }

  // Campaign Content Links (Resources Centre Integration)
  async getCampaignContentLinks(campaignId: string): Promise<CampaignContentLink[]> {
    return await db
      .select()
      .from(campaignContentLinks)
      .where(eq(campaignContentLinks.campaignId, campaignId))
      .orderBy(desc(campaignContentLinks.createdAt));
  }

  async getCampaignContentLink(id: number): Promise<CampaignContentLink | undefined> {
    const [link] = await db.select().from(campaignContentLinks).where(eq(campaignContentLinks.id, id));
    return link || undefined;
  }

  async createCampaignContentLink(insertLink: InsertCampaignContentLink): Promise<CampaignContentLink> {
    const [link] = await db.insert(campaignContentLinks).values(insertLink).returning();
    return link;
  }

  async deleteCampaignContentLink(id: number): Promise<void> {
    await db.delete(campaignContentLinks).where(eq(campaignContentLinks.id, id));
  }

  // Speakers
  async getSpeakers(): Promise<Speaker[]> {
    return await db.select().from(speakers).orderBy(speakers.name);
  }

  async getSpeaker(id: number): Promise<Speaker | undefined> {
    const [speaker] = await db.select().from(speakers).where(eq(speakers.id, id));
    return speaker || undefined;
  }

  async createSpeaker(insertSpeaker: InsertSpeaker): Promise<Speaker> {
    const [speaker] = await db.insert(speakers).values(insertSpeaker).returning();
    return speaker;
  }

  async updateSpeaker(id: number, updateData: Partial<InsertSpeaker>): Promise<Speaker | undefined> {
    const [speaker] = await db.update(speakers).set({ ...updateData, updatedAt: new Date() }).where(eq(speakers.id, id)).returning();
    return speaker || undefined;
  }

  async deleteSpeaker(id: number): Promise<void> {
    await db.delete(speakers).where(eq(speakers.id, id));
  }

  // Organizers
  async getOrganizers(): Promise<Organizer[]> {
    return await db.select().from(organizers).orderBy(organizers.name);
  }

  async getOrganizer(id: number): Promise<Organizer | undefined> {
    const [organizer] = await db.select().from(organizers).where(eq(organizers.id, id));
    return organizer || undefined;
  }

  async createOrganizer(insertOrganizer: InsertOrganizer): Promise<Organizer> {
    const [organizer] = await db.insert(organizers).values(insertOrganizer).returning();
    return organizer;
  }

  async updateOrganizer(id: number, updateData: Partial<InsertOrganizer>): Promise<Organizer | undefined> {
    const [organizer] = await db.update(organizers).set({ ...updateData, updatedAt: new Date() }).where(eq(organizers.id, id)).returning();
    return organizer || undefined;
  }

  async deleteOrganizer(id: number): Promise<void> {
    await db.delete(organizers).where(eq(organizers.id, id));
  }

  // Sponsors
  async getSponsors(): Promise<Sponsor[]> {
    return await db.select().from(sponsors).orderBy(sponsors.name);
  }

  async getSponsor(id: number): Promise<Sponsor | undefined> {
    const [sponsor] = await db.select().from(sponsors).where(eq(sponsors.id, id));
    return sponsor || undefined;
  }

  async createSponsor(insertSponsor: InsertSponsor): Promise<Sponsor> {
    const [sponsor] = await db.insert(sponsors).values(insertSponsor).returning();
    return sponsor;
  }

  async updateSponsor(id: number, updateData: Partial<InsertSponsor>): Promise<Sponsor | undefined> {
    const [sponsor] = await db.update(sponsors).set({ ...updateData, updatedAt: new Date() }).where(eq(sponsors.id, id)).returning();
    return sponsor || undefined;
  }

  async deleteSponsor(id: number): Promise<void> {
    await db.delete(sponsors).where(eq(sponsors.id, id));
  }

  // Qualification Responses
  async createQualificationResponse(insertResponse: InsertQualificationResponse): Promise<QualificationResponse> {
    const [response] = await db.insert(qualificationResponses).values(insertResponse).returning();
    return response;
  }

  async getQualificationResponses(attemptId?: string, leadId?: string): Promise<QualificationResponse[]> {
    if (attemptId) {
      return await db.select().from(qualificationResponses).where(eq(qualificationResponses.attemptId, attemptId));
    } else if (leadId) {
      return await db.select().from(qualificationResponses).where(eq(qualificationResponses.leadId, leadId));
    }
    return await db.select().from(qualificationResponses).orderBy(desc(qualificationResponses.createdAt));
  }

  // Segments
  async getSegments(filters?: any): Promise<Segment[]> {
    return await db.select().from(segments).orderBy(desc(segments.createdAt));
  }

  async getSegment(id: string): Promise<Segment | undefined> {
    const [segment] = await db.select().from(segments).where(eq(segments.id, id));
    return segment || undefined;
  }

  async getSegmentMembers(segmentId: string): Promise<(Contact | Account)[]> {
    const segment = await this.getSegment(segmentId);
    if (!segment) {
      throw new Error('Segment not found');
    }

    // Build query based on entity type to get ALL matching records
    const table = segment.entityType === 'account' ? accounts : contacts;
    let query = db.select().from(table);

    // Apply filters if criteria exists
    if (segment.definitionJson && (segment.definitionJson as any).conditions?.length > 0) {
      const filterSql = buildFilterQuery(segment.definitionJson as any, table);
      if (filterSql) {
        query = query.where(filterSql);
      }
    }

    // Execute query to get all matching records
    const allRecords = await query;

    if (allRecords.length === 0) {
      return [];
    }

    if (segment.entityType === 'account') {
      return allRecords as Account[];
    } else {
      // For contacts, we already have the full records from the query
      return allRecords as Contact[];
    }
  }

  async createSegment(insertSegment: InsertSegment): Promise<Segment> {
    const [segment] = await db.insert(segments).values(insertSegment).returning();
    return segment;
  }

  async updateSegment(id: string, updateData: Partial<InsertSegment>): Promise<Segment | undefined> {
    const [segment] = await db
      .update(segments)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(segments.id, id))
      .returning();
    return segment || undefined;
  }

  async deleteSegment(id: string): Promise<void> {
    await db.delete(segments).where(eq(segments.id, id));
  }

  async previewSegment(entityType: 'contact' | 'account', criteria: any): Promise<{ count: number; sampleIds: string[] }> {
    // Build query based on entity type
    const table = entityType === 'contact' ? contacts : accounts;

    // Apply filter criteria using SQL builder
    let query = db.select({ id: table.id }).from(table);

    // Apply filters if criteria is a FilterGroup
    if (criteria && criteria.conditions && criteria.conditions.length > 0) {
      const filterSql = buildFilterQuery(criteria, table);
      if (filterSql) {
        query = query.where(filterSql);
      }
    }

    // Execute query to get all matching IDs
    const results = await query;
    const allIds = results.map(r => r.id);

    // Return count and sample IDs (first 100 for list conversion)
    return {
      count: allIds.length,
      sampleIds: allIds.slice(0, 100)
    };
  }

  async convertSegmentToList(segmentId: string, listName: string, listDescription?: string): Promise<List> {
    // Get the segment
    const segment = await this.getSegment(segmentId);
    if (!segment) {
      throw new Error('Segment not found');
    }

    // Preview segment to get ALL matching IDs (not just samples)
    const { sampleIds } = await this.previewSegment(
      segment.entityType || 'contact', 
      segment.definitionJson
    );

    // Create a new list with the segment's record IDs
    const newList: InsertList = {
      name: listName,
      description: listDescription || `Static list created from segment: ${segment.name}`,
      entityType: segment.entityType || 'contact',
      sourceType: 'segment',
      sourceRef: segmentId,
      recordIds: sampleIds,
      ownerId: segment.ownerId,
      tags: segment.tags,
      visibilityScope: segment.visibilityScope || 'private',
    };

    return await this.createList(newList);
  }

  // Lists
  async getLists(filters?: any): Promise<List[]> {
    return await db.select().from(lists).orderBy(desc(lists.createdAt));
  }

  async getList(id: string): Promise<List | undefined> {
    const [list] = await db.select().from(lists).where(eq(lists.id, id));
    return list || undefined;
  }

  async getListById(id: string): Promise<List | undefined> {
    return this.getList(id);
  }

  async getListMembers(listId: string): Promise<(Contact | Account)[]> {
    const list = await this.getList(listId);
    if (!list) {
      throw new Error('List not found');
    }

    if (!list.recordIds || list.recordIds.length === 0) {
      return [];
    }

    if (list.entityType === 'account') {
      const accountsList = await db
        .select()
        .from(accounts)
        .where(inArray(accounts.id, list.recordIds));
      return accountsList;
    } else {
      // For contacts, join with accounts to get account names
      const contactsWithAccounts = await db
        .select({
          id: contacts.id,
          accountId: contacts.accountId,
          fullName: contacts.fullName,
          firstName: contacts.firstName,
          lastName: contacts.lastName,
          jobTitle: contacts.jobTitle,
          email: contacts.email,
          emailNormalized: contacts.emailNormalized,
          emailVerificationStatus: contacts.emailVerificationStatus,
          directPhone: contacts.directPhone,
          directPhoneE164: contacts.directPhoneE164,
          phoneExtension: contacts.phoneExtension,
          phoneVerifiedAt: contacts.phoneVerifiedAt,
          seniorityLevel: contacts.seniorityLevel,
          department: contacts.department,
          address: contacts.address,
          linkedinUrl: contacts.linkedinUrl,
          intentTopics: contacts.intentTopics,
          tags: contacts.tags,
          consentBasis: contacts.consentBasis,
          consentSource: contacts.consentSource,
          consentTimestamp: contacts.consentTimestamp,
          ownerId: contacts.ownerId,
          customFields: contacts.customFields,
          emailStatus: contacts.emailStatus,
          phoneStatus: contacts.phoneStatus,
          sourceSystem: contacts.sourceSystem,
          sourceRecordId: contacts.sourceRecordId,
          sourceUpdatedAt: contacts.sourceUpdatedAt,
          deletedAt: contacts.deletedAt,
          createdAt: contacts.createdAt,
          updatedAt: contacts.updatedAt,
          accountName: accounts.name,
        })
        .from(contacts)
        .leftJoin(accounts, eq(contacts.accountId, accounts.id))
        .where(inArray(contacts.id, list.recordIds));

      // Map back to Contact type with account name embedded
      return contactsWithAccounts.map(c => ({
        ...c,
        // Store account name in a way the frontend can access it
        account: c.accountName ? { name: c.accountName } : undefined
      })) as any;
    }
  }

  async createList(insertList: InsertList): Promise<List> {
    const [list] = await db.insert(lists).values(insertList).returning();
    return list;
  }

  async updateList(id: string, updateData: Partial<InsertList>): Promise<List | undefined> {
    const [list] = await db
      .update(lists)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(lists.id, id))
      .returning();
    return list || undefined;
  }

  async deleteList(id: string): Promise<void> {
    await db.delete(lists).where(eq(lists.id, id));
  }

  async exportList(listId: string, format: 'csv' | 'json'): Promise<{ data: any; filename: string }> {
    // Get the list
    const list = await this.getList(listId);
    if (!list) {
      throw new Error('List not found');
    }

    // If no record IDs, return empty data
    if (!list.recordIds || list.recordIds.length === 0) {
      const timestamp = new Date().toISOString().split('T')[0];
      const sanitizedName = list.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      return {
        data: format === 'csv' ? '' : '[]',
        filename: `${sanitizedName}_${timestamp}.${format}`
      };
    }

    // Get all records based on entity type
    const table = list.entityType === 'contact' ? contacts : accounts;
    const records = await db
      .select()
      .from(table)
      .where(inArray(table.id, list.recordIds));

    const timestamp = new Date().toISOString().split('T')[0];
    const sanitizedName = list.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    if (format === 'csv') {
      // Convert to CSV
      if (records.length === 0) {
        return {
          data: '',
          filename: `${sanitizedName}_${timestamp}.csv`
        };
      }

      const headers = Object.keys(records[0]).join(',');
      const rows = records.map(record => 
        Object.values(record).map(val => 
          typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
        ).join(',')
      );

      return {
        data: [headers, ...rows].join('\n'),
        filename: `${sanitizedName}_${timestamp}.csv`
      };
    } else {
      // Return JSON
      return {
        data: JSON.stringify(records, null, 2),
        filename: `${sanitizedName}_${timestamp}.json`
      };
    }
  }


  // Leads
  async getLeads(filters?: any): Promise<Lead[]> {
    return await db.select().from(leads).orderBy(desc(leads.createdAt));
  }

  async getLead(id: string): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    return lead || undefined;
  }

  async createLead(insertLead: InsertLead): Promise<Lead> {
    const [lead] = await db.insert(leads).values(insertLead).returning();
    return lead;
  }

  async updateLead(id: string, updateData: Partial<InsertLead>): Promise<Lead | undefined> {
    const [lead] = await db
      .update(leads)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(leads.id, id))
      .returning();
    return lead || undefined;
  }

  async approveLead(id: string, approvedById: string): Promise<Lead | undefined> {
    const [lead] = await db
      .update(leads)
      .set({ 
        qaStatus: 'approved', 
        approvedAt: new Date(),
        approvedById,
        updatedAt: new Date()
      })
      .where(eq(leads.id, id))
      .returning();
    return lead || undefined;
  }

  async rejectLead(id: string, reason: string): Promise<Lead | undefined> {
    const [lead] = await db
      .update(leads)
      .set({ 
        qaStatus: 'rejected', 
        rejectedReason: reason,
        updatedAt: new Date()
      })
      .where(eq(leads.id, id))
      .returning();
    return lead || undefined;
  }

  // Suppressions
  async getEmailSuppressions(): Promise<SuppressionEmail[]> {
    return await db.select().from(suppressionEmails).orderBy(desc(suppressionEmails.createdAt));
  }

  async addEmailSuppression(insertSuppression: InsertSuppressionEmail): Promise<SuppressionEmail> {
    const [suppression] = await db.insert(suppressionEmails).values(insertSuppression).returning();
    return suppression;
  }

  async deleteEmailSuppression(id: number): Promise<void> {
    await db.delete(suppressionEmails).where(eq(suppressionEmails.id, id));
  }

  async isEmailSuppressed(email: string): Promise<boolean> {
    const [result] = await db
      .select()
      .from(suppressionEmails)
      .where(eq(suppressionEmails.email, email.toLowerCase()))
      .limit(1);
    return !!result;
  }

  async getPhoneSuppressions(): Promise<SuppressionPhone[]>{
    return await db.select().from(suppressionPhones).orderBy(desc(suppressionPhones.createdAt));
  }

  async addPhoneSuppression(insertSuppression: InsertSuppressionPhone): Promise<SuppressionPhone> {
    const [suppression] = await db.insert(suppressionPhones).values(insertSuppression).returning();
    return suppression;
  }

  async deletePhoneSuppression(id: number): Promise<void> {
    await db.delete(suppressionPhones).where(eq(suppressionPhones.id, id));
  }

  async isPhoneSuppressed(phoneE164: string): Promise<boolean> {
    const [result] = await db
      .select()
      .from(suppressionPhones)
      .where(eq(suppressionPhones.phoneE164, phoneE164))
      .limit(1);
    return !!result;
  }

  // Campaign Orders
  async getCampaignOrders(filters?: any): Promise<CampaignOrder[]> {
    return await db.select().from(campaignOrders).orderBy(desc(campaignOrders.createdAt));
  }

  async getCampaignOrder(id: string): Promise<CampaignOrder | undefined> {
    const [order] = await db.select().from(campaignOrders).where(eq(campaignOrders.id, id));
    return order || undefined;
  }

  async createCampaignOrder(insertOrder: InsertCampaignOrder): Promise<CampaignOrder> {
    const [order] = await db.insert(campaignOrders).values(insertOrder).returning();
    return order;
  }

  async updateCampaignOrder(id: string, updateData: Partial<InsertCampaignOrder>): Promise<CampaignOrder | undefined> {
    const [order] = await db
      .update(campaignOrders)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(campaignOrders.id, id))
      .returning();
    return order || undefined;
  }

  // Order Campaign Links (Bridge Model)
  async getOrderCampaignLinks(orderId: string): Promise<OrderCampaignLink[]> {
    return await db
      .select()
      .from(orderCampaignLinks)
      .where(eq(orderCampaignLinks.orderId, orderId))
      .orderBy(desc(orderCampaignLinks.linkedAt));
  }

  async createOrderCampaignLink(insertLink: InsertOrderCampaignLink): Promise<OrderCampaignLink> {
    const [link] = await db.insert(orderCampaignLinks).values(insertLink).returning();
    return link;
  }

  async deleteOrderCampaignLink(id: string): Promise<void> {
    await db.delete(orderCampaignLinks).where(eq(orderCampaignLinks.id, id));
  }

  // Bulk Imports
  async getBulkImports(): Promise<BulkImport[]> {
    return await db.select().from(bulkImports).orderBy(desc(bulkImports.createdAt));
  }

  async createBulkImport(insertBulkImport: InsertBulkImport): Promise<BulkImport> {
    const [bulkImport] = await db.insert(bulkImports).values(insertBulkImport).returning();
    return bulkImport;
  }

  async getBulkImport(id: string): Promise<BulkImport | undefined> {
    const [bulkImport] = await db.select().from(bulkImports).where(eq(bulkImports.id, id));
    return bulkImport || undefined;
  }

  async updateBulkImport(id: string, updateData: Partial<InsertBulkImport>): Promise<BulkImport | undefined> {
    const [bulkImport] = await db
      .update(bulkImports)
      .set(updateData)
      .where(eq(bulkImports.id, id))
      .returning();
    return bulkImport || undefined;
  }

  // Email Messages
  async createEmailMessage(insertMessage: InsertEmailMessage): Promise<EmailMessage> {
    const [message] = await db.insert(emailMessages).values(insertMessage).returning();
    return message;
  }

  async getEmailMessagesByCampaign(campaignId: string): Promise<EmailMessage[]> {
    return await db
      .select()
      .from(emailMessages)
      .where(eq(emailMessages.campaignId, campaignId))
      .orderBy(desc(emailMessages.createdAt));
  }

  // Calls
  async createCall(insertCall: InsertCall): Promise<Call> {
    const [call] = await db.insert(calls).values(insertCall).returning();
    return call;
  }

  async getCallsByCampaign(campaignId: string): Promise<Call[]> {
    return await db
      .select()
      .from(calls)
      .where(eq(calls.campaignId, campaignId))
      .orderBy(desc(calls.createdAt));
  }

  // Audit Logs
  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db.insert(auditLogs).values(insertLog).returning();
    return log;
  }

  async getAuditLogs(filters?: any): Promise<AuditLog[]> {
    return await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(100);
  }

  // Saved Filters
  async getSavedFilters(userId: string, entityType?: string): Promise<SavedFilter[]> {
    let query = db.select().from(savedFilters).where(eq(savedFilters.userId, userId));

    if (entityType) {
      return await query.where(
        and(
          eq(savedFilters.userId, userId),
          eq(savedFilters.entityType, entityType)
        )
      ).orderBy(desc(savedFilters.createdAt));
    }

    return await query.orderBy(desc(savedFilters.createdAt));
  }

  async getSavedFilter(id: string, userId: string): Promise<SavedFilter | undefined> {
    const [filter] = await db
      .select()
      .from(savedFilters)
      .where(and(eq(savedFilters.id, id), eq(savedFilters.userId, userId)));
    return filter || undefined;
  }

  async createSavedFilter(insertFilter: InsertSavedFilter): Promise<SavedFilter> {
    const [filter] = await db.insert(savedFilters).values(insertFilter).returning();
    return filter;
  }

  async updateSavedFilter(id: string, userId: string, updateData: Partial<InsertSavedFilter>): Promise<SavedFilter | undefined> {
    const [filter] = await db
      .update(savedFilters)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(eq(savedFilters.id, id), eq(savedFilters.userId, userId)))
      .returning();
    return filter || undefined;
  }

  async deleteSavedFilter(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(savedFilters)
      .where(and(eq(savedFilters.id, id), eq(savedFilters.userId, userId)));
    return result.rowCount > 0;
  }

  // Selection Contexts (for bulk operations)
  async getSelectionContext(id: string, userId: string): Promise<SelectionContext | undefined> {
    const now = new Date();
    const [context] = await db
      .select()
      .from(selectionContexts)
      .where(and(
        eq(selectionContexts.id, id),
        eq(selectionContexts.userId, userId),
        sql`${selectionContexts.expiresAt} > ${now}` // Only return non-expired contexts
      ));
    return context || undefined;
  }

  async createSelectionContext(insertContext: InsertSelectionContext): Promise<SelectionContext> {
    const [context] = await db.insert(selectionContexts).values(insertContext).returning();
    return context;
  }

  async deleteSelectionContext(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(selectionContexts)
      .where(and(eq(selectionContexts.id, id), eq(selectionContexts.userId, userId)));
    return result.rowCount > 0;
  }

  async deleteExpiredSelectionContexts(): Promise<number> {
    const now = new Date();
    const result = await db
      .delete(selectionContexts)
      .where(sql`${selectionContexts.expiresAt} < ${now}`);
    return result.rowCount;
  }

  // Filter Fields Registry
  async getFilterFields(category?: string): Promise<FilterField[]> {
    let query = db
      .select()
      .from(filterFieldRegistry)
      .where(eq(filterFieldRegistry.visibleInFilters, true))
      .orderBy(filterFieldRegistry.category, filterFieldRegistry.sortOrder);

    if (category) {
      query = query.where(
        and(
          eq(filterFieldRegistry.visibleInFilters, true),
          eq(filterFieldRegistry.category, category)
        )
      ) as any;
    }

    return await query;
  }

  async getFilterFieldsByEntity(entity: string): Promise<FilterField[]> {
    return await db
      .select()
      .from(filterFieldRegistry)
      .where(
        and(
          eq(filterFieldRegistry.entity, entity),
          eq(filterFieldRegistry.visibleInFilters, true)
        )
      )
      .orderBy(filterFieldRegistry.sortOrder);
  }

  // Industry Reference (Standardized Taxonomy)
  async getIndustries(activeOnly: boolean = true): Promise<IndustryReference[]> {
    let query = db
      .select()
      .from(industryReference)
      .orderBy(industryReference.name);

    if (activeOnly) {
      query = query.where(eq(industryReference.isActive, true)) as any;
    }

    return await query;
  }

  async searchIndustries(query: string, limit: number = 50): Promise<IndustryReference[]> {
    return await db
      .select()
      .from(industryReference)
      .where(
        and(
          eq(industryReference.isActive, true),
          or(
            like(industryReference.name, `%${query}%`),
            sql`${query} = ANY(${industryReference.synonyms})`
          )
        )
      )
      .orderBy(industryReference.name)
      .limit(limit);
  }

  async getIndustryById(id: string): Promise<IndustryReference | undefined> {
    const [industry] = await db
      .select()
      .from(industryReference)
      .where(eq(industryReference.id, id));
    return industry || undefined;
  }

  // Company Size Reference (Standardized Employee Ranges)
  async getCompanySizes(activeOnly: boolean = true): Promise<CompanySizeReference[]> {
    let query = db
      .select()
      .from(companySizeReference)
      .orderBy(companySizeReference.sortOrder);

    if (activeOnly) {
      query = query.where(eq(companySizeReference.isActive, true)) as any;
    }

    return await query;
  }

  async getCompanySizeByCode(code: string): Promise<CompanySizeReference | undefined> {
    const [size] = await db
      .select()
      .from(companySizeReference)
      .where(eq(companySizeReference.code, code));
    return size || undefined;
  }

  // Revenue Range Reference (Standardized Annual Revenue Brackets)
  async getRevenueRanges(activeOnly: boolean = true): Promise<RevenueRangeReference[]> {
    let query = db
      .select()
      .from(revenueRangeReference)
      .orderBy(revenueRangeReference.sortOrder);

    if (activeOnly) {
      query = query.where(eq(revenueRangeReference.isActive, true)) as any;
    }

    return await query;
  }

  async getRevenueRangeByLabel(label: string): Promise<RevenueRangeReference | undefined> {
    const [range] = await db
      .select()
      .from(revenueRangeReference)
      .where(eq(revenueRangeReference.label, label));
    return range || undefined;
  }

  // Dual-Industry Management (Phase 8)
  async updateAccountIndustry(
    id: string, 
    data: { primary?: string; secondary?: string[]; code?: string }
  ): Promise<Account | undefined> {
    const updateData: any = { updatedAt: new Date() };

    if (data.primary !== undefined) {
      updateData.industryStandardized = data.primary;
    }
    if (data.secondary !== undefined) {
      updateData.industrySecondary = data.secondary;
    }
    if (data.code !== undefined) {
      updateData.industryCode = data.code;
    }

    const [account] = await db
      .update(accounts)
      .set(updateData)
      .where(eq(accounts.id, id))
      .returning();

    return account || undefined;
  }

  async reviewAccountIndustryAI(
    id: string, 
    userId: string, 
    review: { accept_primary?: string; add_secondary?: string[]; reject?: string[] }
  ): Promise<Account | undefined> {
    const account = await this.getAccount(id);
    if (!account) return undefined;

    const updateData: any = {
      industryAiReviewedBy: userId,
      industryAiReviewedAt: new Date(),
      updatedAt: new Date(),
    };

    // Handle accept_primary - replaces primary industry
    if (review.accept_primary) {
      updateData.industryStandardized = review.accept_primary;
    }

    // Handle add_secondary - appends to secondary industries array
    if (review.add_secondary && review.add_secondary.length > 0) {
      const currentSecondary = account.industrySecondary || [];
      updateData.industrySecondary = [
        ...currentSecondary,
        ...review.add_secondary.filter(s => !currentSecondary.includes(s))
      ];
    }

    // Determine AI status based on review actions
    if (review.accept_primary && !review.add_secondary?.length && !review.reject?.length) {
      updateData.industryAiStatus = 'accepted';
    } else if (review.reject && review.reject.length > 0 && !review.accept_primary && !review.add_secondary?.length) {
      updateData.industryAiStatus = 'rejected';
    } else if ((review.accept_primary || review.add_secondary?.length) && review.reject?.length) {
      updateData.industryAiStatus = 'partial';
    } else if (review.accept_primary || review.add_secondary?.length) {
      updateData.industryAiStatus = 'accepted';
    }

    // Clear AI suggestions after review
    updateData.industryAiCandidates = null;

    const [updated] = await db
      .update(accounts)
      .set(updateData)
      .where(eq(accounts.id, id))
      .returning();

    return updated || undefined;
  }

  async getAccountsNeedingReview(limit: number = 50): Promise<Account[]> {
    return await db
      .select()
      .from(accounts)
      .where(
        and(
          eq(accounts.industryAiStatus, 'pending'),
          sql`${accounts.industryAiConfidence}::float >= 0.5`,
          sql`${accounts.deletedAt} IS NULL`
        )
      )
      .orderBy(sql`${accounts.industryAiConfidence}::float DESC`)
      .limit(limit);
  }

  // Domain Sets (Phase 21) - Renamed to Accounts List (TAL)
  async getDomainSets(userId?: string): Promise<DomainSet[]> {
    let query = db.select().from(domainSets);

    if (userId) {
      query = query.where(eq(domainSets.ownerId, userId)) as any;
    }

    return await query.orderBy(desc(domainSets.createdAt));
  }

  async getDomainSet(id: string): Promise<DomainSet | undefined> {
    const [domainSet] = await db.select().from(domainSets).where(eq(domainSets.id, id));
    return domainSet || undefined;
  }

  async createDomainSet(insertDomainSet: InsertDomainSet): Promise<DomainSet> {
    const [domainSet] = await db.insert(domainSets).values(insertDomainSet).returning();
    return domainSet;
  }

  async updateDomainSet(id: string, updateData: Partial<InsertDomainSet>): Promise<DomainSet | undefined> {
    const [domainSet] = await db
      .update(domainSets)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(domainSets.id, id))
      .returning();
    return domainSet || undefined;
  }

  async deleteDomainSet(id: string): Promise<void> {
    await db.delete(domainSets).where(eq(domainSets.id, id));
  }

  // Domain Set Items
  async getDomainSetItems(domainSetId: string): Promise<DomainSetItem[]> {
    return await db
      .select()
      .from(domainSetItems)
      .where(eq(domainSetItems.domainSetId, domainSetId))
      .orderBy(domainSetItems.createdAt);
  }

  async createDomainSetItem(item: InsertDomainSetItem): Promise<DomainSetItem> {
    const [created] = await db.insert(domainSetItems).values(item).returning();
    return created;
  }

  async createDomainSetItemsBulk(items: InsertDomainSetItem[]): Promise<DomainSetItem[]> {
    if (items.length === 0) return [];
    return await db.insert(domainSetItems).values(items).returning();
  }

  async updateDomainSetItem(id: string, updateData: Partial<InsertDomainSetItem>): Promise<DomainSetItem | undefined> {
    const [item] = await db
      .update(domainSetItems)
      .set(updateData)
      .where(eq(domainSetItems.id, id))
      .returning();
    return item || undefined;
  }

  // Domain Set Contact Links
  async getDomainSetContactLinks(domainSetId: string): Promise<DomainSetContactLink[]> {
    return await db
      .select()
      .from(domainSetContactLinks)
      .where(eq(domainSetContactLinks.domainSetId, domainSetId))
      .orderBy(domainSetContactLinks.createdAt);
  }

  async createDomainSetContactLink(link: InsertDomainSetContactLink): Promise<DomainSetContactLink> {
    const [created] = await db.insert(domainSetContactLinks).values(link).returning();
    return created;
  }

  async createDomainSetContactLinksBulk(links: InsertDomainSetContactLink[]): Promise<DomainSetContactLink[]> {
    if (links.length === 0) return [];
    return await db.insert(domainSetContactLinks).values(links).returning();
  }

  // Domain Set Operations
  async processDomainSetMatching(domainSetId: string): Promise<void> {
    // Import domain utils
    const { normalizeDomain, getMatchTypeAndConfidence, extractCompanyNameFromDomain } = await import('@shared/domain-utils');

    // Get the domain set
    const domainSet = await this.getDomainSet(domainSetId);
    if (!domainSet) throw new Error('Domain set not found');

    // Get all items for this set
    const items = await this.getDomainSetItems(domainSetId);

    // Get all accounts for matching
    const allAccounts = await db.select().from(accounts);

    let matchedAccounts = 0;
    let matchedContacts = 0;
    let unknownDomains = 0;

    // Process each domain item
    for (const item of items) {
      const normalizedDomain = normalizeDomain(item.domain);

      // Try to find exact match first
      const exactMatch = allAccounts.find(acc => 
        acc.domain && normalizeDomain(acc.domain) === normalizedDomain
      );

      if (exactMatch) {
        // Exact match found
        await this.updateDomainSetItem(item.id, {
          normalizedDomain,
          accountId: exactMatch.id,
          matchType: 'exact',
          matchConfidence: '1.00',
        });
        matchedAccounts++;

        // Count contacts for this account
        const accountContacts = await this.getContactsByAccountId(exactMatch.id);
        await this.updateDomainSetItem(item.id, {
          matchedContactsCount: accountContacts.length,
        });
        matchedContacts += accountContacts.length;
      } else {
        // Try fuzzy matching
        let bestMatch: { account: typeof allAccounts[0]; confidence: number } | null = null;

        for (const account of allAccounts) {
          if (!account.domain) continue;

          const matchResult = getMatchTypeAndConfidence(
            item.domain,
            account.domain,
            account.name
          );

          if (matchResult.matchType === 'fuzzy' && 
              (!bestMatch || matchResult.confidence > bestMatch.confidence)) {
            bestMatch = { account, confidence: matchResult.confidence };
          }
        }

        if (bestMatch) {
          // Fuzzy match found
          await this.updateDomainSetItem(item.id, {
            normalizedDomain,
            accountId: bestMatch.account.id,
            matchType: 'fuzzy',
            matchConfidence: bestMatch.confidence.toFixed(2),
          });
          matchedAccounts++;

          // Count contacts
          const accountContacts = await this.getContactsByAccountId(bestMatch.account.id);
          await this.updateDomainSetItem(item.id, {
            matchedContactsCount: accountContacts.length,
          });
          matchedContacts += accountContacts.length;
        } else {
          // No match found
          await this.updateDomainSetItem(item.id, {
            normalizedDomain,
            matchType: 'none',
            matchConfidence: '0.00',
          });
          unknownDomains++;
        }
      }
    }

    // Update domain set stats
    await this.updateDomainSet(domainSetId, {
      matchedAccounts,
      matchedContacts,
      unknownDomains,
      status: 'completed',
    });
  }

  async expandDomainSetToContacts(domainSetId: string, filters?: any): Promise<Contact[]> {
    // Get all items with matched accounts
    const items = await this.getDomainSetItems(domainSetId);
    const accountIds = items
      .filter(item => item.accountId)
      .map(item => item.accountId as string);

    if (accountIds.length === 0) return [];

    // Get all contacts for these accounts
    let contacts: Contact[] = [];
    for (const accountId of accountIds) {
      const accountContacts = await this.getContactsByAccountId(accountId);
      contacts.push(...accountContacts);
    }

    // Apply additional filters if provided (title, seniority, etc.)
    // This is a simplified version - full implementation would use FilterGroup

    return contacts;
  }

  async convertDomainSetToList(domainSetId: string, listName: string, userId: string): Promise<List> {
    // Get all contacts from the domain set
    const contacts = await this.expandDomainSetToContacts(domainSetId);
    const contactIds = contacts.map(c => c.id);

    // Create a new list
    const list = await this.createList({
      name: listName,
      description: `Generated from domain set`,
      entityType: 'contact',
      sourceType: 'manual_upload',
      sourceRef: domainSetId,
      recordIds: contactIds,
      ownerId: userId,
      tags: ['domain-set'],
      visibilityScope: 'private',
    });

    return list;
  }

  // ==================== CONTENT STUDIO ====================

  async getContentAssets(): Promise<ContentAsset[]> {
    return await db.select().from(contentAssets).orderBy(contentAssets.updatedAt);
  }

  async getContentAsset(id: string): Promise<ContentAsset | null> {
    const result = await db.select().from(contentAssets).where(eq(contentAssets.id, id));
    return result[0] || null;
  }

  async createContentAsset(data: InsertContentAsset): Promise<ContentAsset> {
    const result = await db.insert(contentAssets).values(data).returning();
    return result[0];
  }

  async updateContentAsset(id: string, data: Partial<InsertContentAsset>): Promise<ContentAsset | null> {
    const result = await db.update(contentAssets)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(contentAssets.id, id))
      .returning();
    return result[0] || null;
  }

  async deleteContentAsset(id: string): Promise<boolean> {
    const result = await db.delete(contentAssets).where(eq(contentAssets.id, id)).returning();
    return result.length > 0;
  }

  // ==================== SOCIAL POSTS ====================

  async getSocialPosts(): Promise<SocialPost[]> {
    return await db.select().from(socialPosts).orderBy(socialPosts.createdAt);
  }

  async getSocialPost(id: string): Promise<SocialPost | null> {
    const result = await db.select().from(socialPosts).where(eq(socialPosts.id, id));
    return result[0] || null;
  }

  async createSocialPost(data: InsertSocialPost): Promise<SocialPost> {
    const result = await db.insert(socialPosts).values(data).returning();
    return result[0];
  }

  async updateSocialPost(id: string, data: Partial<InsertSocialPost>): Promise<SocialPost | null> {
    const result = await db.update(socialPosts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(socialPosts.id, id))
      .returning();
    return result[0] || null;
  }

  async deleteSocialPost(id: string): Promise<boolean> {
    const result = await db.delete(socialPosts).where(eq(socialPosts.id, id)).returning();
    return result.length > 0;
  }

  // ==================== AI CONTENT GENERATION ====================

  async createAIContentGeneration(data: InsertAIContentGeneration): Promise<AIContentGeneration> {
    const result = await db.insert(aiContentGenerations).values(data).returning();
    return result[0];
  }

  async getAIContentGenerations(userId?: string): Promise<AIContentGeneration[]> {
    if (userId) {
      return await db.select().from(aiContentGenerations)
        .where(eq(aiContentGenerations.userId, userId))
        .orderBy(aiContentGenerations.createdAt);
    }
    return await db.select().from(aiContentGenerations).orderBy(aiContentGenerations.createdAt);
  }

  // ==================== CONTENT PUSH TRACKING ====================

  async createContentPush(data: InsertContentAssetPush): Promise<ContentAssetPush> {
    const result = await db.insert(contentAssetPushes).values(data).returning();
    return result[0];
  }

  async getContentPushes(assetId: string): Promise<ContentAssetPush[]> {
    return await db.select().from(contentAssetPushes)
      .where(eq(contentAssetPushes.assetId, assetId))
      .orderBy(contentAssetPushes.createdAt);
  }

  async getContentPush(id: string): Promise<ContentAssetPush | null> {
    const result = await db.select().from(contentAssetPushes)
      .where(eq(contentAssetPushes.id, id));
    return result[0] || null;
  }

  async updateContentPush(id: string, data: Partial<InsertContentAssetPush>): Promise<ContentAssetPush | null> {
    const result = await db.update(contentAssetPushes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(contentAssetPushes.id, id))
      .returning();
    return result[0] || null;
  }

  async getLatestContentPush(assetId: string): Promise<ContentAssetPush | null> {
    const result = await db.select().from(contentAssetPushes)
      .where(eq(contentAssetPushes.assetId, assetId))
      .orderBy(desc(contentAssetPushes.createdAt))
      .limit(1);
    return result[0] || null;
  }

  // ==================== EVENTS ====================

  async getEvents(): Promise<Event[]> {
    return await db.select().from(events).orderBy(desc(events.createdAt));
  }

  async getEvent(id: string): Promise<Event | null> {
    const result = await db.select().from(events).where(eq(events.id, id));
    return result[0] || null;
  }

  async getEventBySlug(slug: string): Promise<Event | null> {
    const result = await db.select().from(events).where(eq(events.slug, slug));
    return result[0] || null;
  }

  async createEvent(data: InsertEvent): Promise<Event> {
    const result = await db.insert(events).values(data).returning();
    return result[0];
  }

  async updateEvent(id: string, data: Partial<InsertEvent>): Promise<Event | null> {
    const result = await db.update(events)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(events.id, id))
      .returning();
    return result[0] || null;
  }

  async deleteEvent(id: string): Promise<boolean> {
    const result = await db.delete(events).where(eq(events.id, id)).returning();
    return result.length > 0;
  }

  // ==================== RESOURCES ====================

  async getResources(): Promise<Resource[]> {
    return await db.select().from(resources).orderBy(desc(resources.createdAt));
  }

  async getResource(id: string): Promise<Resource | null> {
    const result = await db.select().from(resources).where(eq(resources.id, id));
    return result[0] || null;
  }

  async getResourceBySlug(slug: string): Promise<Resource | null> {
    const result = await db.select().from(resources).where(eq(resources.slug, slug));
    return result[0] || null;
  }

  async createResource(data: InsertResource): Promise<Resource> {
    const result = await db.insert(resources).values(data).returning();
    return result[0];
  }

  async updateResource(id: string, data: Partial<InsertResource>): Promise<Resource | null> {
    const result = await db.update(resources)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(resources.id, id))
      .returning();
    return result[0] || null;
  }

  async deleteResource(id: string): Promise<boolean> {
    const result = await db.delete(resources).where(eq(resources.id, id)).returning();
    return result.length > 0;
  }

  // ==================== NEWS ====================

  async getNews(): Promise<News[]> {
    return await db.select().from(news).orderBy(desc(news.createdAt));
  }

  async getNewsItem(id: string): Promise<News | null> {
    const result = await db.select().from(news).where(eq(news.id, id));
    return result[0] || null;
  }

  async getNewsBySlug(slug: string): Promise<News | null> {
    const result = await db.select().from(news).where(eq(news.slug, slug));
    return result[0] || null;
  }

  async createNews(data: InsertNews): Promise<News> {
    const result = await db.insert(news).values(data).returning();
    return result[0];
  }

  async updateNews(id: string, data: Partial<InsertNews>): Promise<News | null> {
    const result = await db.update(news)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(news.id, id))
      .returning();
    return result[0] || null;
  }

  async deleteNews(id: string): Promise<boolean> {
    const result = await db.delete(news).where(eq(news.id, id)).returning();
    return result.length > 0;
  }

  // ==================== EMAIL INFRASTRUCTURE (Phase 26) ====================

  // Sender Profiles
  async getSenderProfiles(): Promise<SenderProfile[]> {
    return await db.select().from(senderProfiles).orderBy(desc(senderProfiles.createdAt));
  }

  async getSenderProfile(id: string): Promise<SenderProfile | undefined> {
    const [profile] = await db.select().from(senderProfiles).where(eq(senderProfiles.id, id));
    return profile || undefined;
  }

  async createSenderProfile(profile: InsertSenderProfile): Promise<SenderProfile> {
    const [result] = await db.insert(senderProfiles).values(profile).returning();
    return result;
  }

  async updateSenderProfile(id: string, profile: Partial<InsertSenderProfile>): Promise<SenderProfile | undefined> {
    const [result] = await db.update(senderProfiles)
      .set({ ...profile, updatedAt: new Date() })
      .where(eq(senderProfiles.id, id))
      .returning();
    return result || undefined;
  }

  async deleteSenderProfile(id: string): Promise<void> {
    await db.delete(senderProfiles).where(eq(senderProfiles.id, id));
  }

  // Domain Authentication
  async getDomainAuths(): Promise<DomainAuth[]> {
    return await db.select().from(domainAuth).orderBy(desc(domainAuth.createdAt));
  }

  async getDomainAuth(id: number): Promise<DomainAuth | undefined> {
    const [result] = await db.select().from(domainAuth).where(eq(domainAuth.id, id));
    return result || undefined;
  }

  async getDomainAuthByDomain(domain: string): Promise<DomainAuth | undefined> {
    const [result] = await db.select().from(domainAuth).where(eq(domainAuth.domain, domain));
    return result || undefined;
  }

  async createDomainAuth(data: InsertDomainAuth): Promise<DomainAuth> {
    const [result] = await db.insert(domainAuth).values(data).returning();
    return result;
  }

  async updateDomainAuth(id: number, data: Partial<InsertDomainAuth>): Promise<DomainAuth | undefined> {
    const [result] = await db.update(domainAuth)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(domainAuth.id, id))
      .returning();
    return result || undefined;
  }

  async verifyDomainAuth(id: number): Promise<DomainAuth | undefined> {
    // Placeholder for DNS verification logic
    // In production, this would call DNS verification APIs
    const [result] = await db.update(domainAuth)
      .set({ 
        lastCheckedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(domainAuth.id, id))
      .returning();
    return result || undefined;
  }

  // Tracking Domains
  async getTrackingDomains(): Promise<TrackingDomain[]> {
    return await db.select().from(trackingDomains).orderBy(desc(trackingDomains.createdAt));
  }

  async getTrackingDomain(id: number): Promise<TrackingDomain | undefined> {
    const [result] = await db.select().from(trackingDomains).where(eq(trackingDomains.id, id));
    return result || undefined;
  }

  async createTrackingDomain(data: InsertTrackingDomain): Promise<TrackingDomain> {
    const [result] = await db.insert(trackingDomains).values(data).returning();
    return result;
  }

  async updateTrackingDomain(id: number, data: Partial<InsertTrackingDomain>): Promise<TrackingDomain | undefined> {
    const [result] = await db.update(trackingDomains)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(trackingDomains.id, id))
      .returning();
    return result || undefined;
  }

  async deleteTrackingDomain(id: number): Promise<void> {
    await db.delete(trackingDomains).where(eq(trackingDomains.id, id));
  }

  // IP Pools
  async getIpPools(): Promise<IpPool[]> {
    return await db.select().from(ipPools).orderBy(desc(ipPools.createdAt));
  }

  async getIpPool(id: number): Promise<IpPool | undefined> {
    const [result] = await db.select().from(ipPools).where(eq(ipPools.id, id));
    return result || undefined;
  }

  async createIpPool(data: InsertIpPool): Promise<IpPool> {
    const [result] = await db.insert(ipPools).values(data).returning();
    return result;
  }

  async updateIpPool(id: number, data: Partial<InsertIpPool>): Promise<IpPool | undefined> {
    const [result] = await db.update(ipPools)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(ipPools.id, id))
      .returning();
    return result || undefined;
  }

  async deleteIpPool(id: number): Promise<void> {
    await db.delete(ipPools).where(eq(ipPools.id, id));
  }

  // Send Policies
  async getSendPolicies(): Promise<SendPolicy[]> {
    return await db.select().from(sendPolicies).orderBy(desc(sendPolicies.createdAt));
  }

  async getSendPolicy(id: number): Promise<SendPolicy | undefined> {
    const [result] = await db.select().from(sendPolicies).where(eq(sendPolicies.id, id));
    return result || undefined;
  }

  async createSendPolicy(data: InsertSendPolicy): Promise<SendPolicy> {
    const [result] = await db.insert(sendPolicies).values(data).returning();
    return result;
  }

  async updateSendPolicy(id: number, data: Partial<InsertSendPolicy>): Promise<SendPolicy | undefined> {
    const [result] = await db.update(sendPolicies)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(sendPolicies.id, id))
      .returning();
    return result || undefined;
  }

  async deleteSendPolicy(id: number): Promise<void> {
    await db.delete(sendPolicies).where(eq(sendPolicies.id, id));
  }
}

export const storage = new DatabaseStorage();