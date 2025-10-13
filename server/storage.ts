// Storage layer - referenced from blueprint:javascript_database
import { eq, and, or, like, desc, sql, inArray, isNull } from "drizzle-orm";
import { db } from "./db";
import { buildFilterQuery, buildSuppressionFilter } from "./filter-builder";
import type { FilterGroup } from "@shared/filter-types";
import {
  users, accounts, contacts, campaigns, segments, lists, domainSets,
  leads, emailMessages, calls, suppressionEmails, suppressionPhones,
  campaignOrders, orderCampaignLinks, bulkImports, auditLogs, savedFilters,
  selectionContexts, filterFieldRegistry, fieldChangeLog, industryReference,
  companySizeReference, revenueRangeReference,
  campaignAudienceSnapshots, senderProfiles, emailTemplates, emailSends, emailEvents,
  callScripts, callAttempts, callEvents, qualificationResponses,
  type User, type InsertUser,
  type Account, type InsertAccount,
  type Contact, type InsertContact,
  type Campaign, type InsertCampaign,
  type Segment, type InsertSegment,
  type List, type InsertList,
  type DomainSet, type InsertDomainSet,
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
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Accounts
  getAccounts(filters?: FilterGroup): Promise<Account[]>;
  getAccount(id: string): Promise<Account | undefined>;
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
  
  // Campaigns
  getCampaigns(filters?: any): Promise<Campaign[]>;
  getCampaign(id: string): Promise<Campaign | undefined>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: string, campaign: Partial<InsertCampaign>): Promise<Campaign | undefined>;
  deleteCampaign(id: string): Promise<void>;
  
  // Campaign Audience Snapshots
  createCampaignAudienceSnapshot(snapshot: InsertCampaignAudienceSnapshot): Promise<CampaignAudienceSnapshot>;
  getCampaignAudienceSnapshots(campaignId: string): Promise<CampaignAudienceSnapshot[]>;
  
  // Sender Profiles
  getSenderProfiles(): Promise<SenderProfile[]>;
  getSenderProfile(id: string): Promise<SenderProfile | undefined>;
  createSenderProfile(profile: InsertSenderProfile): Promise<SenderProfile>;
  updateSenderProfile(id: string, profile: Partial<InsertSenderProfile>): Promise<SenderProfile | undefined>;
  deleteSenderProfile(id: string): Promise<void>;
  
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
  
  // Qualification Responses
  createQualificationResponse(response: InsertQualificationResponse): Promise<QualificationResponse>;
  getQualificationResponses(attemptId?: string, leadId?: string): Promise<QualificationResponse[]>;
  
  // Segments
  getSegments(filters?: any): Promise<Segment[]>;
  getSegment(id: string): Promise<Segment | undefined>;
  createSegment(segment: InsertSegment): Promise<Segment>;
  updateSegment(id: string, segment: Partial<InsertSegment>): Promise<Segment | undefined>;
  deleteSegment(id: string): Promise<void>;
  previewSegment(entityType: 'contact' | 'account', criteria: any): Promise<{ count: number; sampleIds: string[] }>;
  convertSegmentToList(segmentId: string, listName: string, listDescription?: string): Promise<List>;
  
  // Lists
  getLists(filters?: any): Promise<List[]>;
  getList(id: string): Promise<List | undefined>;
  createList(list: InsertList): Promise<List>;
  updateList(id: string, list: Partial<InsertList>): Promise<List | undefined>;
  deleteList(id: string): Promise<void>;
  exportList(listId: string, format: 'csv' | 'json'): Promise<{ data: any; filename: string }>;
  
  // Domain Sets
  getDomainSets(filters?: any): Promise<DomainSet[]>;
  getDomainSet(id: string): Promise<DomainSet | undefined>;
  createDomainSet(domainSet: InsertDomainSet): Promise<DomainSet>;
  updateDomainSet(id: string, domainSet: Partial<InsertDomainSet>): Promise<DomainSet | undefined>;
  deleteDomainSet(id: string): Promise<void>;
  
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
  
  // Domain Sets (Phase 21)
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
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
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

  // Sender Profiles
  async getSenderProfiles(): Promise<SenderProfile[]> {
    return await db.select().from(senderProfiles).where(eq(senderProfiles.isActive, true));
  }

  async getSenderProfile(id: string): Promise<SenderProfile | undefined> {
    const [profile] = await db.select().from(senderProfiles).where(eq(senderProfiles.id, id));
    return profile || undefined;
  }

  async createSenderProfile(insertProfile: InsertSenderProfile): Promise<SenderProfile> {
    const [profile] = await db.insert(senderProfiles).values(insertProfile).returning();
    return profile;
  }

  async updateSenderProfile(id: string, updateData: Partial<InsertSenderProfile>): Promise<SenderProfile | undefined> {
    const [profile] = await db
      .update(senderProfiles)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(senderProfiles.id, id))
      .returning();
    return profile || undefined;
  }

  async deleteSenderProfile(id: string): Promise<void> {
    await db.delete(senderProfiles).where(eq(senderProfiles.id, id));
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

  // Domain Sets
  async getDomainSets(filters?: any): Promise<DomainSet[]> {
    return await db.select().from(domainSets).orderBy(desc(domainSets.createdAt));
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

  async getPhoneSuppressions(): Promise<SuppressionPhone[]> {
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
}

export const storage = new DatabaseStorage();
