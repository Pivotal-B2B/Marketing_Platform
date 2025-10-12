// Storage layer - referenced from blueprint:javascript_database
import { eq, and, or, like, desc, sql, inArray } from "drizzle-orm";
import { db } from "./db";
import {
  users, accounts, contacts, campaigns, segments, lists, domainSets,
  leads, emailMessages, calls, suppressionEmails, suppressionPhones,
  campaignOrders, orderCampaignLinks, bulkImports, auditLogs,
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
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Accounts
  getAccounts(filters?: any): Promise<Account[]>;
  getAccount(id: string): Promise<Account | undefined>;
  createAccount(account: InsertAccount): Promise<Account>;
  updateAccount(id: string, account: Partial<InsertAccount>): Promise<Account | undefined>;
  deleteAccount(id: string): Promise<void>;
  
  // Contacts
  getContacts(filters?: any): Promise<Contact[]>;
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
  
  // Segments
  getSegments(filters?: any): Promise<Segment[]>;
  getSegment(id: string): Promise<Segment | undefined>;
  createSegment(segment: InsertSegment): Promise<Segment>;
  updateSegment(id: string, segment: Partial<InsertSegment>): Promise<Segment | undefined>;
  deleteSegment(id: string): Promise<void>;
  
  // Lists
  getLists(filters?: any): Promise<List[]>;
  getList(id: string): Promise<List | undefined>;
  createList(list: InsertList): Promise<List>;
  updateList(id: string, list: Partial<InsertList>): Promise<List | undefined>;
  deleteList(id: string): Promise<void>;
  
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
  async getAccounts(filters?: any): Promise<Account[]> {
    return await db.select().from(accounts).orderBy(desc(accounts.createdAt));
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
  async getContacts(filters?: any): Promise<Contact[]> {
    return await db.select().from(contacts).orderBy(desc(contacts.createdAt));
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
}

export const storage = new DatabaseStorage();
