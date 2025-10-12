import type { Express } from "express";
import { eq } from "drizzle-orm";
import { storage } from "./storage";
import { comparePassword, generateToken, requireAuth, requireRole, hashPassword } from "./auth";
import { z } from "zod";
import { 
  insertAccountSchema, 
  insertContactSchema, 
  insertCampaignSchema,
  insertLeadSchema,
  insertSuppressionEmailSchema,
  insertSuppressionPhoneSchema,
  insertCampaignOrderSchema,
  insertOrderCampaignLinkSchema,
  insertBulkImportSchema,
  insertSegmentSchema,
  insertListSchema,
  insertDomainSetSchema,
  insertUserSchema
} from "@shared/schema";

export function registerRoutes(app: Express) {
  // ==================== AUTH ====================
  
  // ==================== USERS (Admin Only) ====================
  
  app.get("/api/users", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const users = await storage.getUsers();
      // Remove passwords from response
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/users", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const validated = insertUserSchema.parse(req.body);
      
      // Hash password before storing
      const hashedPassword = await hashPassword(validated.password);
      
      const user = await storage.createUser({
        ...validated,
        password: hashedPassword
      });
      
      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });
  
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }

      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Verify password
      const isValid = await comparePassword(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Generate JWT token
      const token = generateToken(user);
      
      // Return token and user info without password
      const { password: _, ...userWithoutPassword } = user;
      res.json({ 
        token, 
        user: userWithoutPassword 
      });
    } catch (error) {
      res.status(500).json({ message: "Login failed" });
    }
  });

  // ==================== ACCOUNTS ====================
  
  app.get("/api/accounts", requireAuth, async (req, res) => {
    try {
      const accounts = await storage.getAccounts();
      res.json(accounts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch accounts" });
    }
  });

  app.get("/api/accounts/:id", requireAuth, async (req, res) => {
    try {
      const account = await storage.getAccount(req.params.id);
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }
      res.json(account);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch account" });
    }
  });

  app.post("/api/accounts", requireAuth, requireRole('admin', 'data_ops'), async (req, res) => {
    try {
      const validated = insertAccountSchema.parse(req.body);
      const account = await storage.createAccount(validated);
      res.status(201).json(account);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  app.patch("/api/accounts/:id", requireAuth, requireRole('admin', 'data_ops'), async (req, res) => {
    try {
      const account = await storage.updateAccount(req.params.id, req.body);
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }
      res.json(account);
    } catch (error) {
      res.status(500).json({ message: "Failed to update account" });
    }
  });

  app.delete("/api/accounts/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      await storage.deleteAccount(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

  // ==================== CONTACTS ====================
  
  app.get("/api/contacts", requireAuth, async (req, res) => {
    try {
      const contacts = await storage.getContacts();
      res.json(contacts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });

  app.get("/api/contacts/:id", requireAuth, async (req, res) => {
    try {
      const contact = await storage.getContact(req.params.id);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      res.json(contact);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch contact" });
    }
  });

  app.post("/api/contacts", requireAuth, requireRole('admin', 'data_ops'), async (req, res) => {
    try {
      const validated = insertContactSchema.parse(req.body);
      
      // Check email suppression
      if (await storage.isEmailSuppressed(validated.email)) {
        return res.status(400).json({ message: "Email is on suppression list" });
      }
      
      // Check phone suppression if provided
      if (validated.directPhoneE164 && await storage.isPhoneSuppressed(validated.directPhoneE164)) {
        return res.status(400).json({ message: "Phone is on DNC list" });
      }
      
      const contact = await storage.createContact(validated);
      res.status(201).json(contact);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create contact" });
    }
  });

  app.patch("/api/contacts/:id", requireAuth, requireRole('admin', 'data_ops'), async (req, res) => {
    try {
      const contact = await storage.updateContact(req.params.id, req.body);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      res.json(contact);
    } catch (error) {
      res.status(500).json({ message: "Failed to update contact" });
    }
  });

  app.delete("/api/contacts/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      await storage.deleteContact(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete contact" });
    }
  });

  // ==================== SEGMENTS ====================
  
  app.get("/api/segments", requireAuth, async (req, res) => {
    try {
      const segments = await storage.getSegments();
      res.json(segments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch segments" });
    }
  });

  app.get("/api/segments/:id", requireAuth, async (req, res) => {
    try {
      const segment = await storage.getSegment(req.params.id);
      if (!segment) {
        return res.status(404).json({ message: "Segment not found" });
      }
      res.json(segment);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch segment" });
    }
  });

  app.post("/api/segments", requireAuth, requireRole('admin', 'campaign_manager', 'data_ops'), async (req, res) => {
    try {
      const validated = insertSegmentSchema.parse(req.body);
      const segment = await storage.createSegment(validated);
      res.status(201).json(segment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create segment" });
    }
  });

  app.delete("/api/segments/:id", requireAuth, requireRole('admin', 'campaign_manager', 'data_ops'), async (req, res) => {
    try {
      await storage.deleteSegment(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete segment" });
    }
  });

  // ==================== LISTS ====================
  
  app.get("/api/lists", requireAuth, async (req, res) => {
    try {
      const lists = await storage.getLists();
      res.json(lists);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch lists" });
    }
  });

  app.post("/api/lists", requireAuth, requireRole('admin', 'campaign_manager', 'data_ops'), async (req, res) => {
    try {
      const validated = insertListSchema.parse(req.body);
      const list = await storage.createList(validated);
      res.status(201).json(list);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create list" });
    }
  });

  app.delete("/api/lists/:id", requireAuth, requireRole('admin', 'campaign_manager', 'data_ops'), async (req, res) => {
    try {
      await storage.deleteList(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete list" });
    }
  });

  // ==================== DOMAIN SETS ====================
  
  app.get("/api/domain-sets", requireAuth, async (req, res) => {
    try {
      const domainSets = await storage.getDomainSets();
      res.json(domainSets);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch domain sets" });
    }
  });

  app.post("/api/domain-sets", requireAuth, requireRole('admin', 'data_ops'), async (req, res) => {
    try {
      const validated = insertDomainSetSchema.parse(req.body);
      const domainSet = await storage.createDomainSet(validated);
      res.status(201).json(domainSet);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create domain set" });
    }
  });

  // ==================== CAMPAIGNS ====================
  
  app.get("/api/campaigns", requireAuth, async (req, res) => {
    try {
      const campaigns = await storage.getCampaigns();
      res.json(campaigns);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  app.get("/api/campaigns/:id", requireAuth, async (req, res) => {
    try {
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch campaign" });
    }
  });

  app.post("/api/campaigns", requireAuth, requireRole('admin', 'campaign_manager'), async (req, res) => {
    try {
      const validated = insertCampaignSchema.parse(req.body);
      const campaign = await storage.createCampaign(validated);
      res.status(201).json(campaign);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create campaign" });
    }
  });

  app.patch("/api/campaigns/:id", requireAuth, requireRole('admin', 'campaign_manager'), async (req, res) => {
    try {
      const campaign = await storage.updateCampaign(req.params.id, req.body);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error) {
      res.status(500).json({ message: "Failed to update campaign" });
    }
  });

  app.post("/api/campaigns/:id/launch", requireAuth, requireRole('admin', 'campaign_manager'), async (req, res) => {
    try {
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      // TODO: Add pre-launch guards (audience validation, suppression checks, etc.)
      
      const updated = await storage.updateCampaign(req.params.id, {
        status: 'active',
        launchedAt: new Date()
      });
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to launch campaign" });
    }
  });

  // ==================== LEADS & QA ====================
  
  app.get("/api/leads", requireAuth, async (req, res) => {
    try {
      const leads = await storage.getLeads();
      res.json(leads);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leads" });
    }
  });

  app.get("/api/leads/:id", requireAuth, async (req, res) => {
    try {
      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      res.json(lead);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch lead" });
    }
  });

  app.post("/api/leads", requireAuth, async (req, res) => {
    try {
      const validated = insertLeadSchema.parse(req.body);
      const lead = await storage.createLead(validated);
      res.status(201).json(lead);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create lead" });
    }
  });

  app.post("/api/leads/:id/approve", requireAuth, requireRole('admin', 'qa_analyst'), async (req, res) => {
    try {
      const { approvedById } = req.body;
      if (!approvedById) {
        return res.status(400).json({ message: "approvedById is required" });
      }

      const lead = await storage.approveLead(req.params.id, approvedById);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      
      res.json(lead);
    } catch (error) {
      res.status(500).json({ message: "Failed to approve lead" });
    }
  });

  app.post("/api/leads/:id/reject", requireAuth, requireRole('admin', 'qa_analyst'), async (req, res) => {
    try {
      const { reason } = req.body;
      if (!reason) {
        return res.status(400).json({ message: "Rejection reason is required" });
      }

      const lead = await storage.rejectLead(req.params.id, reason);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      
      res.json(lead);
    } catch (error) {
      res.status(500).json({ message: "Failed to reject lead" });
    }
  });

  // ==================== SUPPRESSIONS ====================
  
  app.get("/api/suppressions/email", requireAuth, async (req, res) => {
    try {
      const suppressions = await storage.getEmailSuppressions();
      res.json(suppressions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch email suppressions" });
    }
  });

  app.post("/api/suppressions/email", requireAuth, requireRole('admin', 'data_ops'), async (req, res) => {
    try {
      const validated = insertSuppressionEmailSchema.parse(req.body);
      const suppression = await storage.addEmailSuppression(validated);
      res.status(201).json(suppression);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to add email suppression" });
    }
  });

  app.get("/api/suppressions/phone", requireAuth, async (req, res) => {
    try {
      const suppressions = await storage.getPhoneSuppressions();
      res.json(suppressions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch phone suppressions" });
    }
  });

  app.post("/api/suppressions/phone", requireAuth, requireRole('admin', 'data_ops'), async (req, res) => {
    try {
      const validated = insertSuppressionPhoneSchema.parse(req.body);
      const suppression = await storage.addPhoneSuppression(validated);
      res.status(201).json(suppression);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to add phone suppression" });
    }
  });

  app.delete("/api/suppressions/email/:id", requireAuth, requireRole('admin', 'data_ops'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteEmailSuppression(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete email suppression" });
    }
  });

  app.delete("/api/suppressions/phone/:id", requireAuth, requireRole('admin', 'data_ops'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deletePhoneSuppression(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete phone suppression" });
    }
  });

  // ==================== CAMPAIGN ORDERS (Client Portal) ====================
  
  app.get("/api/orders", requireAuth, async (req, res) => {
    try {
      const orders = await storage.getCampaignOrders();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.get("/api/orders/:id", requireAuth, async (req, res) => {
    try {
      const order = await storage.getCampaignOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  app.post("/api/orders", requireAuth, requireRole('admin', 'client_user'), async (req, res) => {
    try {
      const validated = insertCampaignOrderSchema.parse(req.body);
      const order = await storage.createCampaignOrder(validated);
      res.status(201).json(order);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  app.patch("/api/orders/:id", requireAuth, requireRole('admin', 'client_user'), async (req, res) => {
    try {
      const order = await storage.updateCampaignOrder(req.params.id, req.body);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Failed to update order" });
    }
  });

  app.post("/api/orders/:id/submit", requireAuth, requireRole('admin', 'client_user'), async (req, res) => {
    try {
      const order = await storage.updateCampaignOrder(req.params.id, {
        status: 'submitted',
        submittedAt: new Date()
      });
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Failed to submit order" });
    }
  });

  // ==================== ORDER-CAMPAIGN LINKS (Bridge Model) ====================
  
  app.get("/api/orders/:orderId/campaign-links", requireAuth, async (req, res) => {
    try {
      const links = await storage.getOrderCampaignLinks(req.params.orderId);
      res.json(links);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch campaign links" });
    }
  });

  app.post("/api/orders/:orderId/campaign-links", requireAuth, requireRole('admin', 'campaign_manager'), async (req, res) => {
    try {
      const validated = insertOrderCampaignLinkSchema.parse({
        ...req.body,
        orderId: req.params.orderId
      });
      
      const link = await storage.createOrderCampaignLink(validated);
      res.status(201).json(link);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to link campaign" });
    }
  });

  app.delete("/api/orders/:orderId/campaign-links/:linkId", requireAuth, requireRole('admin', 'campaign_manager'), async (req, res) => {
    try {
      await storage.deleteOrderCampaignLink(req.params.linkId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to unlink campaign" });
    }
  });

  // ==================== DASHBOARD STATS ====================
  
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      const [
        accounts,
        contacts,
        campaigns,
        leads
      ] = await Promise.all([
        storage.getAccounts(),
        storage.getContacts(),
        storage.getCampaigns(),
        storage.getLeads()
      ]);

      const activeCampaigns = campaigns.filter(c => c.status === 'active' || c.status === 'launched');
      const emailCampaigns = activeCampaigns.filter(c => c.type === 'email').length;
      const callCampaigns = activeCampaigns.filter(c => c.type === 'telemarketing').length;
      
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);
      
      const leadsThisMonth = leads.filter(l => 
        l.createdAt && new Date(l.createdAt) >= thisMonth
      ).length;

      res.json({
        totalAccounts: accounts.length,
        totalContacts: contacts.length,
        activeCampaigns: activeCampaigns.length,
        activeCampaignsBreakdown: {
          email: emailCampaigns,
          telemarketing: callCampaigns
        },
        leadsThisMonth
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // ==================== BULK IMPORTS ====================
  
  app.post("/api/imports", requireAuth, requireRole('admin', 'data_ops'), async (req, res) => {
    try {
      const validated = insertBulkImportSchema.parse(req.body);
      const bulkImport = await storage.createBulkImport(validated);
      
      // TODO: Queue bulk import job for processing
      
      res.status(201).json(bulkImport);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create import" });
    }
  });

  app.get("/api/imports/:id", requireAuth, async (req, res) => {
    try {
      const bulkImport = await storage.getBulkImport(req.params.id);
      if (!bulkImport) {
        return res.status(404).json({ message: "Import not found" });
      }
      res.json(bulkImport);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch import" });
    }
  });
}
