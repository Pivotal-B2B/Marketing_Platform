import type { Express } from "express";
import { eq } from "drizzle-orm";
import { storage } from "./storage";
import { comparePassword, generateToken, requireAuth, requireRole, hashPassword } from "./auth";
import webhooksRouter from "./routes/webhooks";
import { z } from "zod";
import { 
  insertAccountSchema, 
  insertContactSchema,
  insertCustomFieldDefinitionSchema,
  updateCustomFieldDefinitionSchema,
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
  insertUserSchema,
  insertSavedFilterSchema,
  insertSelectionContextSchema,
  updateAccountIndustrySchema,
  reviewAccountIndustryAISchema,
  insertSenderProfileSchema,
  insertEmailTemplateSchema,
  insertCallScriptSchema,
  insertEmailSendSchema,
  insertCallAttemptSchema,
  insertSoftphoneProfileSchema,
  insertCallRecordingAccessLogSchema,
  insertContentAssetSchema,
  insertSocialPostSchema,
  insertAIContentGenerationSchema,
  insertEventSchema,
  insertResourceSchema,
  insertNewsSchema,
  insertSpeakerSchema,
  insertOrganizerSchema,
  insertSponsorSchema
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

  app.post("/api/auth/change-password", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current and new password required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters" });
      }

      // Get user from database
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify current password
      const isValid = await comparePassword(currentPassword, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      // Hash new password and update
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUser(userId, { password: hashedPassword });

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // ==================== ACCOUNTS ====================
  
  app.get("/api/accounts", requireAuth, async (req, res) => {
    try {
      let filters = undefined;
      if (req.query.filters) {
        try {
          filters = JSON.parse(req.query.filters as string);
        } catch (e) {
          return res.status(400).json({ message: "Invalid filters format" });
        }
      }
      const accounts = await storage.getAccounts(filters);
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

  // Dual-Industry Management (Phase 8)
  app.patch("/api/accounts/:id/industry", requireAuth, requireRole('admin', 'data_ops', 'campaign_manager'), async (req, res) => {
    try {
      const validatedData = updateAccountIndustrySchema.parse(req.body);
      const account = await storage.updateAccountIndustry(req.params.id, validatedData);
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }
      res.json(account);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update account industry" });
    }
  });
  
  app.post("/api/accounts/:id/industry/ai-review", requireAuth, requireRole('admin', 'data_ops', 'campaign_manager'), async (req, res) => {
    try {
      const userId = req.user!.id;
      const validatedReview = reviewAccountIndustryAISchema.parse(req.body);
      const account = await storage.reviewAccountIndustryAI(req.params.id, userId, validatedReview);
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }
      res.json(account);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to review AI suggestions" });
    }
  });
  
  app.get("/api/accounts/ai-review/pending", requireAuth, requireRole('admin', 'data_ops', 'campaign_manager'), async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const accounts = await storage.getAccountsNeedingReview(limit);
      res.json(accounts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch accounts needing review" });
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
      let filters = undefined;
      if (req.query.filters) {
        try {
          filters = JSON.parse(req.query.filters as string);
        } catch (e) {
          return res.status(400).json({ message: "Invalid filters format" });
        }
      }
      const contacts = await storage.getContacts(filters);
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

  // Batch import: Process multiple contacts with accounts in one request (for large file optimization)
  app.post("/api/contacts/batch-import", requireAuth, requireRole('admin', 'data_ops'), async (req, res) => {
    try {
      const { records } = req.body; // Array of { contact, account } objects
      
      if (!Array.isArray(records)) {
        return res.status(400).json({ message: "Records must be an array" });
      }

      const results = {
        success: 0,
        failed: 0,
        errors: [] as Array<{ index: number; error: string }>,
      };

      for (let i = 0; i < records.length; i++) {
        try {
          const { contact: contactData, account: accountData } = records[i];

          // Validate contact data
          const validatedContact = insertContactSchema.parse(contactData);
          
          // Check email suppression
          if (await storage.isEmailSuppressed(validatedContact.email)) {
            results.failed++;
            results.errors.push({ index: i, error: "Email is on suppression list" });
            continue;
          }
          
          // Check phone suppression if provided
          if (validatedContact.directPhoneE164 && await storage.isPhoneSuppressed(validatedContact.directPhoneE164)) {
            results.failed++;
            results.errors.push({ index: i, error: "Phone is on DNC list" });
            continue;
          }

          let account;
          
          // Normalize domain (trim and lowercase) to prevent duplicates from casing
          if (accountData.domain) {
            accountData.domain = accountData.domain.trim().toLowerCase();
          }
          
          // Try to find existing account by domain first
          if (accountData.domain) {
            account = await storage.getAccountByDomain(accountData.domain);
          }
          
          // If not found and we have account data, create new account
          if (!account && (accountData.name || accountData.domain)) {
            const validatedAccount = insertAccountSchema.parse(accountData);
            account = await storage.createAccount(validatedAccount);
          }
          
          // Link contact to account if found/created
          if (account) {
            validatedContact.accountId = account.id;
          }
          
          // Create contact
          await storage.createContact(validatedContact);
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push({ 
            index: i, 
            error: error instanceof Error ? error.message : "Unknown error" 
          });
        }
      }

      res.status(200).json(results);
    } catch (error) {
      console.error("Batch import error:", error);
      res.status(500).json({ message: "Failed to process batch import" });
    }
  });

  // Unified import: Contact + Account in one request
  app.post("/api/contacts/import-with-account", requireAuth, requireRole('admin', 'data_ops'), async (req, res) => {
    try {
      const { contact: contactData, account: accountData } = req.body;

      // Validate contact data
      const validatedContact = insertContactSchema.parse(contactData);
      
      // Check email suppression
      if (await storage.isEmailSuppressed(validatedContact.email)) {
        return res.status(400).json({ message: "Email is on suppression list" });
      }
      
      // Check phone suppression if provided
      if (validatedContact.directPhoneE164 && await storage.isPhoneSuppressed(validatedContact.directPhoneE164)) {
        return res.status(400).json({ message: "Phone is on DNC list" });
      }

      let account;
      let accountCreated = false;
      
      // Normalize domain (trim and lowercase) to prevent duplicates from casing
      if (accountData.domain) {
        accountData.domain = accountData.domain.trim().toLowerCase();
      }
      
      // Try to find existing account by domain first
      if (accountData.domain) {
        account = await storage.getAccountByDomain(accountData.domain);
      }
      
      // If not found and we have account data, create new account
      if (!account && (accountData.name || accountData.domain)) {
        const validatedAccount = insertAccountSchema.parse(accountData);
        account = await storage.createAccount(validatedAccount);
        accountCreated = true;
      }
      
      // Link contact to account if found/created
      if (account) {
        validatedContact.accountId = account.id;
      }
      
      // Create contact
      const contact = await storage.createContact(validatedContact);
      
      res.status(201).json({
        contact,
        account,
        accountCreated,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Unified import error:", error);
      res.status(500).json({ message: "Failed to import contact with account" });
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

  // ==================== CUSTOM FIELD DEFINITIONS ====================
  
  app.get("/api/custom-field-definitions", requireAuth, async (req, res) => {
    try {
      const entityType = req.query.entityType as 'account' | 'contact' | undefined;
      const definitions = await storage.getCustomFieldDefinitions(entityType);
      res.json(definitions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch custom field definitions" });
    }
  });

  app.get("/api/custom-field-definitions/:id", requireAuth, async (req, res) => {
    try {
      const definition = await storage.getCustomFieldDefinition(req.params.id);
      if (!definition) {
        return res.status(404).json({ message: "Custom field definition not found" });
      }
      res.json(definition);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch custom field definition" });
    }
  });

  app.post("/api/custom-field-definitions", requireAuth, requireRole('admin', 'data_ops'), async (req, res) => {
    try {
      const validated = insertCustomFieldDefinitionSchema.parse(req.body);
      const definition = await storage.createCustomFieldDefinition(validated);
      res.status(201).json(definition);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create custom field definition" });
    }
  });

  app.patch("/api/custom-field-definitions/:id", requireAuth, requireRole('admin', 'data_ops'), async (req, res) => {
    try {
      const validated = updateCustomFieldDefinitionSchema.parse(req.body);
      const definition = await storage.updateCustomFieldDefinition(req.params.id, validated);
      if (!definition) {
        return res.status(404).json({ message: "Custom field definition not found" });
      }
      res.json(definition);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update custom field definition" });
    }
  });

  app.delete("/api/custom-field-definitions/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      await storage.deleteCustomFieldDefinition(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete custom field definition" });
    }
  });

  // Auto-linking endpoints
  app.get("/api/accounts/:id/contacts", requireAuth, async (req, res) => {
    try {
      const contacts = await storage.getContactsByAccountId(req.params.id);
      res.json(contacts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch account contacts" });
    }
  });

  app.post("/api/contacts/auto-link", requireAuth, requireRole('admin', 'data_ops'), async (req, res) => {
    try {
      // Get all contacts without account_id
      const contacts = await storage.getContacts();
      const unlinkedContacts = contacts.filter(c => !c.accountId);
      
      let linkedCount = 0;
      let failedCount = 0;

      for (const contact of unlinkedContacts) {
        try {
          // Extract domain from email
          const emailDomain = contact.email.split('@')[1]?.toLowerCase();
          if (!emailDomain) continue;

          // Find matching account by domain
          const accounts = await storage.getAccounts();
          const matchingAccount = accounts.find(a => 
            a.domain?.toLowerCase() === emailDomain
          );

          if (matchingAccount) {
            await storage.updateContact(contact.id, { accountId: matchingAccount.id });
            linkedCount++;
          }
        } catch (err) {
          failedCount++;
        }
      }

      res.json({
        message: "Auto-linking complete",
        totalProcessed: unlinkedContacts.length,
        linked: linkedCount,
        failed: failedCount
      });
    } catch (error) {
      res.status(500).json({ message: "Auto-linking failed" });
    }
  });

  app.post("/api/contacts/:id/link-account", requireAuth, requireRole('admin', 'data_ops'), async (req, res) => {
    try {
      const { accountId } = req.body;
      if (!accountId) {
        return res.status(400).json({ message: "accountId is required" });
      }

      const contact = await storage.updateContact(req.params.id, { accountId });
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }

      res.json(contact);
    } catch (error) {
      res.status(500).json({ message: "Failed to link contact to account" });
    }
  });

  // Upsert endpoints for deduplication
  app.post("/api/contacts:upsert", requireAuth, requireRole('admin', 'data_ops'), async (req, res) => {
    try {
      const { email, title, sourceSystem, sourceRecordId, sourceUpdatedAt, ...contactData } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required for upsert" });
      }
      
      // Check email suppression
      if (await storage.isEmailSuppressed(email)) {
        return res.status(400).json({ message: "Email is on suppression list" });
      }
      
      // Map 'title' to 'jobTitle' for database compatibility
      if (title !== undefined) {
        contactData.jobTitle = title;
      }
      
      const result = await storage.upsertContact(
        { email, ...contactData },
        {
          sourceSystem,
          sourceRecordId,
          sourceUpdatedAt: sourceUpdatedAt ? new Date(sourceUpdatedAt) : undefined,
          actorId: req.user!.id
        }
      );
      
      res.status(result.action === 'created' ? 201 : 200).json({
        entity: result.contact,
        action: result.action
      });
    } catch (error) {
      console.error('Upsert contact error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to upsert contact", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/api/accounts:upsert", requireAuth, requireRole('admin', 'data_ops'), async (req, res) => {
    try {
      const { name, revenue, sourceSystem, sourceRecordId, sourceUpdatedAt, ...accountData } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: "Name is required for upsert" });
      }
      
      // Map 'revenue' to 'annualRevenue' for database compatibility
      if (revenue !== undefined) {
        accountData.annualRevenue = revenue;
      }
      
      const result = await storage.upsertAccount(
        { name, ...accountData },
        {
          sourceSystem,
          sourceRecordId,
          sourceUpdatedAt: sourceUpdatedAt ? new Date(sourceUpdatedAt) : undefined,
          actorId: req.user!.id
        }
      );
      
      res.status(result.action === 'created' ? 201 : 200).json({
        entity: result.account,
        action: result.action
      });
    } catch (error) {
      console.error('Upsert account error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to upsert account", error: error instanceof Error ? error.message : String(error) });
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

  app.post("/api/segments/preview", requireAuth, async (req, res) => {
    try {
      const { entityType, definitionJson } = req.body;
      if (!entityType || !definitionJson) {
        return res.status(400).json({ message: "Missing entityType or definitionJson" });
      }
      const result = await storage.previewSegment(entityType, definitionJson);
      res.json(result);
    } catch (error) {
      console.error('Segment preview error:', error);
      res.status(500).json({ message: "Failed to preview segment", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/api/segments/:id/convert-to-list", requireAuth, requireRole('admin', 'campaign_manager', 'data_ops'), async (req, res) => {
    try {
      const { name, description } = req.body;
      if (!name) {
        return res.status(400).json({ message: "List name is required" });
      }
      const list = await storage.convertSegmentToList(req.params.id, name, description);
      res.status(201).json(list);
    } catch (error) {
      console.error('Convert segment to list error:', error);
      res.status(500).json({ message: "Failed to convert segment to list", error: error instanceof Error ? error.message : String(error) });
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

  // Add contacts to list
  app.post("/api/lists/:id/contacts", requireAuth, requireRole('admin', 'campaign_manager', 'data_ops'), async (req, res) => {
    try {
      const { contactIds } = req.body;
      if (!Array.isArray(contactIds)) {
        return res.status(400).json({ message: "contactIds must be an array" });
      }

      const list = await storage.getList(req.params.id);
      if (!list) {
        return res.status(404).json({ message: "List not found" });
      }

      if (list.entityType !== 'contact') {
        return res.status(400).json({ message: "This list is not for contacts" });
      }

      // Merge with existing IDs and deduplicate
      const updatedIds = Array.from(new Set([...list.recordIds, ...contactIds]));
      const updated = await storage.updateList(req.params.id, { recordIds: updatedIds });
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to add contacts to list" });
    }
  });

  // Add accounts to list
  app.post("/api/lists/:id/accounts", requireAuth, requireRole('admin', 'campaign_manager', 'data_ops'), async (req, res) => {
    try {
      const { accountIds } = req.body;
      if (!Array.isArray(accountIds)) {
        return res.status(400).json({ message: "accountIds must be an array" });
      }

      const list = await storage.getList(req.params.id);
      if (!list) {
        return res.status(404).json({ message: "List not found" });
      }

      if (list.entityType !== 'account') {
        return res.status(400).json({ message: "This list is not for accounts" });
      }

      // Merge with existing IDs and deduplicate
      const updatedIds = Array.from(new Set([...list.recordIds, ...accountIds]));
      const updated = await storage.updateList(req.params.id, { recordIds: updatedIds });
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to add accounts to list" });
    }
  });

  app.post("/api/lists/:id/export", requireAuth, async (req, res) => {
    try {
      const { format = 'csv' } = req.body;
      if (!['csv', 'json'].includes(format)) {
        return res.status(400).json({ message: "Invalid format. Use 'csv' or 'json'" });
      }
      
      const result = await storage.exportList(req.params.id, format);
      
      // Set appropriate content type and headers
      const contentType = format === 'csv' ? 'text/csv' : 'application/json';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.data);
    } catch (error) {
      console.error('Export list error:', error);
      res.status(500).json({ message: "Failed to export list", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // ==================== DOMAIN SETS (Phase 21) ====================
  
  app.get("/api/domain-sets", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      const domainSets = await storage.getDomainSets(userId);
      res.json(domainSets);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch domain sets" });
    }
  });

  app.get("/api/domain-sets/:id", requireAuth, async (req, res) => {
    try {
      const domainSet = await storage.getDomainSet(req.params.id);
      if (!domainSet) {
        return res.status(404).json({ message: "Domain set not found" });
      }
      res.json(domainSet);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch domain set" });
    }
  });

  app.post("/api/domain-sets", requireAuth, requireRole('admin', 'campaign_manager', 'data_ops'), async (req, res) => {
    try {
      const { parseDomainsFromCSV, deduplicateDomains, normalizeDomain, fixCommonDomainTypos } = await import('@shared/domain-utils');
      const userId = (req as any).user?.id;
      
      const { name, description, csvContent, tags } = req.body;
      
      if (!name || !csvContent) {
        return res.status(400).json({ message: "Name and CSV content are required" });
      }
      
      // Parse domains from CSV
      const parsed = parseDomainsFromCSV(csvContent);
      
      // Fix typos and normalize
      const fixedDomains = parsed.map(p => ({
        ...p,
        domain: fixCommonDomainTypos(p.domain)
      }));
      
      // Deduplicate
      const { unique, duplicates } = deduplicateDomains(fixedDomains.map(p => p.domain));
      
      // Create domain set
      const domainSet = await storage.createDomainSet({
        name,
        description,
        totalUploaded: parsed.length,
        duplicatesRemoved: duplicates.length,
        status: 'processing',
        ownerId: userId,
        tags: tags || [],
      });
      
      // Create domain items
      const items = unique.map(domain => ({
        domainSetId: domainSet.id,
        domain,
        normalizedDomain: normalizeDomain(domain),
      }));
      
      await storage.createDomainSetItemsBulk(items);
      
      // Trigger matching in background (in a real app, this would be a job queue)
      storage.processDomainSetMatching(domainSet.id).catch(console.error);
      
      res.status(201).json(domainSet);
    } catch (error) {
      console.error('Create domain set error:', error);
      res.status(500).json({ message: "Failed to create domain set" });
    }
  });

  app.get("/api/domain-sets/:id/items", requireAuth, async (req, res) => {
    try {
      const items = await storage.getDomainSetItems(req.params.id);
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch domain set items" });
    }
  });

  app.post("/api/domain-sets/:id/process", requireAuth, requireRole('admin', 'campaign_manager', 'data_ops'), async (req, res) => {
    try {
      await storage.processDomainSetMatching(req.params.id);
      const updated = await storage.getDomainSet(req.params.id);
      res.json(updated);
    } catch (error) {
      console.error('Process domain set error:', error);
      res.status(500).json({ message: "Failed to process domain set" });
    }
  });

  app.post("/api/domain-sets/:id/expand", requireAuth, async (req, res) => {
    try {
      const { filters } = req.body;
      const contacts = await storage.expandDomainSetToContacts(req.params.id, filters);
      res.json({ contacts, count: contacts.length });
    } catch (error) {
      console.error('Expand domain set error:', error);
      res.status(500).json({ message: "Failed to expand domain set" });
    }
  });

  app.post("/api/domain-sets/:id/convert-to-list", requireAuth, requireRole('admin', 'campaign_manager', 'data_ops'), async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      const { listName } = req.body;
      
      if (!listName) {
        return res.status(400).json({ message: "List name is required" });
      }
      
      const list = await storage.convertDomainSetToList(req.params.id, listName, userId);
      res.status(201).json(list);
    } catch (error) {
      console.error('Convert domain set to list error:', error);
      res.status(500).json({ message: "Failed to convert domain set to list" });
    }
  });

  app.delete("/api/domain-sets/:id", requireAuth, requireRole('admin', 'data_ops'), async (req, res) => {
    try {
      await storage.deleteDomainSet(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete domain set" });
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

  // ==================== SENDER PROFILES ====================

  app.get("/api/sender-profiles", requireAuth, async (req, res) => {
    try {
      const profiles = await storage.getSenderProfiles();
      res.json(profiles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sender profiles" });
    }
  });

  app.get("/api/sender-profiles/:id", requireAuth, async (req, res) => {
    try {
      const profile = await storage.getSenderProfile(req.params.id);
      if (!profile) {
        return res.status(404).json({ message: "Sender profile not found" });
      }
      res.json(profile);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sender profile" });
    }
  });

  app.post("/api/sender-profiles", requireAuth, requireRole('admin', 'campaign_manager'), async (req, res) => {
    try {
      const validated = insertSenderProfileSchema.parse(req.body);
      const profile = await storage.createSenderProfile(validated);
      res.status(201).json(profile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create sender profile" });
    }
  });

  app.patch("/api/sender-profiles/:id", requireAuth, requireRole('admin', 'campaign_manager'), async (req, res) => {
    try {
      const profile = await storage.updateSenderProfile(req.params.id, req.body);
      if (!profile) {
        return res.status(404).json({ message: "Sender profile not found" });
      }
      res.json(profile);
    } catch (error) {
      res.status(500).json({ message: "Failed to update sender profile" });
    }
  });

  app.delete("/api/sender-profiles/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      await storage.deleteSenderProfile(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete sender profile" });
    }
  });

  // ==================== EMAIL TEMPLATES ====================

  app.get("/api/email-templates", requireAuth, async (req, res) => {
    try {
      const templates = await storage.getEmailTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch email templates" });
    }
  });

  app.get("/api/email-templates/:id", requireAuth, async (req, res) => {
    try {
      const template = await storage.getEmailTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Email template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch email template" });
    }
  });

  app.post("/api/email-templates", requireAuth, requireRole('admin', 'campaign_manager'), async (req, res) => {
    try {
      const validated = insertEmailTemplateSchema.parse(req.body);
      const template = await storage.createEmailTemplate(validated);
      res.status(201).json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create email template" });
    }
  });

  app.patch("/api/email-templates/:id", requireAuth, requireRole('admin', 'campaign_manager'), async (req, res) => {
    try {
      const template = await storage.updateEmailTemplate(req.params.id, req.body);
      if (!template) {
        return res.status(404).json({ message: "Email template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Failed to update email template" });
    }
  });

  app.post("/api/email-templates/:id/approve", requireAuth, requireRole('admin', 'campaign_manager'), async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const template = await storage.approveEmailTemplate(req.params.id, userId);
      if (!template) {
        return res.status(404).json({ message: "Email template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Failed to approve email template" });
    }
  });

  app.delete("/api/email-templates/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      await storage.deleteEmailTemplate(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete email template" });
    }
  });

  // ==================== CALL SCRIPTS ====================

  app.get("/api/call-scripts", requireAuth, async (req, res) => {
    try {
      const campaignId = req.query.campaignId as string | undefined;
      const scripts = await storage.getCallScripts(campaignId);
      res.json(scripts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch call scripts" });
    }
  });

  app.get("/api/call-scripts/:id", requireAuth, async (req, res) => {
    try {
      const script = await storage.getCallScript(req.params.id);
      if (!script) {
        return res.status(404).json({ message: "Call script not found" });
      }
      res.json(script);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch call script" });
    }
  });

  app.post("/api/call-scripts", requireAuth, requireRole('admin', 'campaign_manager'), async (req, res) => {
    try {
      const validated = insertCallScriptSchema.parse(req.body);
      const script = await storage.createCallScript(validated);
      res.status(201).json(script);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create call script" });
    }
  });

  app.patch("/api/call-scripts/:id", requireAuth, requireRole('admin', 'campaign_manager'), async (req, res) => {
    try {
      const script = await storage.updateCallScript(req.params.id, req.body);
      if (!script) {
        return res.status(404).json({ message: "Call script not found" });
      }
      res.json(script);
    } catch (error) {
      res.status(500).json({ message: "Failed to update call script" });
    }
  });

  app.delete("/api/call-scripts/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      await storage.deleteCallScript(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete call script" });
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

  // ==================== SAVED FILTERS ====================
  
  app.get("/api/saved-filters", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const entityType = req.query.entityType as string | undefined;
      const filters = await storage.getSavedFilters(userId, entityType);
      res.json(filters);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch saved filters" });
    }
  });

  app.post("/api/saved-filters", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const validated = insertSavedFilterSchema.parse(req.body);
      const savedFilter = await storage.createSavedFilter({ ...validated, userId });
      res.status(201).json(savedFilter);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create saved filter" });
    }
  });

  app.patch("/api/saved-filters/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const filter = await storage.updateSavedFilter(req.params.id, userId, req.body);
      if (!filter) {
        return res.status(404).json({ message: "Saved filter not found" });
      }
      res.json(filter);
    } catch (error) {
      res.status(500).json({ message: "Failed to update saved filter" });
    }
  });

  app.delete("/api/saved-filters/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const deleted = await storage.deleteSavedFilter(req.params.id, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Saved filter not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete saved filter" });
    }
  });

  // ==================== FILTER FIELDS REGISTRY ====================
  
  // Filter field metadata is public (no auth required) - only exposes schema/configuration
  app.get("/api/filters/fields", async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const fields = await storage.getFilterFields(category);
      
      // Group by category for easier UI consumption
      const grouped = fields.reduce((acc: any, field) => {
        if (!acc[field.category]) {
          acc[field.category] = [];
        }
        acc[field.category].push(field);
        return acc;
      }, {});
      
      res.json({
        fields,
        grouped,
        categories: Object.keys(grouped)
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch filter fields" });
    }
  });

  app.get("/api/filters/fields/entity/:entity", async (req, res) => {
    try {
      // Return all filter fields regardless of entity for maximum flexibility
      const fields = await storage.getFilterFields();
      
      // Group by category for easier UI consumption (same format as /api/filters/fields)
      const grouped = fields.reduce((acc: any, field) => {
        if (!acc[field.category]) {
          acc[field.category] = [];
        }
        acc[field.category].push(field);
        return acc;
      }, {});
      
      res.json({
        fields,
        grouped,
        categories: Object.keys(grouped)
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch filter fields for entity" });
    }
  });

  // ==================== INDUSTRY REFERENCE ====================
  
  // Get all standardized industries
  app.get("/api/industries", async (req, res) => {
    try {
      const industries = await storage.getIndustries();
      res.json(industries);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch industries" });
    }
  });
  
  // Search industries by name (with autocomplete)
  app.get("/api/industries/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      
      if (!query) {
        return res.status(400).json({ message: "Search query 'q' is required" });
      }
      
      const industries = await storage.searchIndustries(query, limit);
      res.json(industries);
    } catch (error) {
      res.status(500).json({ message: "Failed to search industries" });
    }
  });

  // ==================== COMPANY SIZE REFERENCE ====================
  
  // Get all standardized company size ranges (sorted by employee count)
  app.get("/api/company-sizes", async (req, res) => {
    try {
      const sizes = await storage.getCompanySizes();
      res.json(sizes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch company sizes" });
    }
  });
  
  // Get company size by code (A-I)
  app.get("/api/company-sizes/:code", async (req, res) => {
    try {
      const size = await storage.getCompanySizeByCode(req.params.code);
      if (!size) {
        return res.status(404).json({ message: "Company size not found" });
      }
      res.json(size);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch company size" });
    }
  });

  // ==================== REVENUE RANGE REFERENCE ====================
  
  // Get all standardized revenue ranges (sorted by revenue)
  app.get("/api/revenue-ranges", async (req, res) => {
    try {
      const ranges = await storage.getRevenueRanges();
      res.json(ranges);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch revenue ranges" });
    }
  });
  
  // Get revenue range by label
  app.get("/api/revenue-ranges/:label", async (req, res) => {
    try {
      const range = await storage.getRevenueRangeByLabel(decodeURIComponent(req.params.label));
      if (!range) {
        return res.status(404).json({ message: "Revenue range not found" });
      }
      res.json(range);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch revenue range" });
    }
  });

  // ==================== SELECTION CONTEXTS (Bulk Operations) ====================
  
  app.get("/api/selection-contexts/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Opportunistic cleanup of expired contexts
      await storage.deleteExpiredSelectionContexts().catch(() => {});
      
      const context = await storage.getSelectionContext(req.params.id, userId);
      if (!context) {
        return res.status(404).json({ message: "Selection context not found or expired" });
      }
      res.json(context);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch selection context" });
    }
  });

  app.post("/api/selection-contexts", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Opportunistic cleanup of expired contexts
      await storage.deleteExpiredSelectionContexts().catch(() => {});
      
      // Validate client payload (omit server-managed fields)
      const clientSchema = insertSelectionContextSchema.omit({ userId: true, expiresAt: true });
      const validated = clientSchema.parse(req.body);
      
      // Set expiration to 15 minutes from now
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      
      const context = await storage.createSelectionContext({
        ...validated,
        userId,
        expiresAt
      });
      
      res.status(201).json(context);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create selection context" });
    }
  });

  app.delete("/api/selection-contexts/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const deleted = await storage.deleteSelectionContext(req.params.id, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Selection context not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete selection context" });
    }
  });

  // ==================== BULK IMPORTS ====================
  
  app.get("/api/imports", requireAuth, async (req, res) => {
    try {
      const imports = await storage.getBulkImports();
      res.json(imports);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch imports" });
    }
  });

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

  // ==================== CONTENT STUDIO ====================
  
  app.get("/api/content-assets", requireAuth, async (req, res) => {
    try {
      const assets = await storage.getContentAssets();
      res.json(assets);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch content assets" });
    }
  });

  app.post("/api/content-assets", requireAuth, requireRole('admin', 'campaign_manager'), async (req, res) => {
    try {
      const userId = req.user!.userId;
      console.log("Creating content asset for user:", userId);
      console.log("Request body:", JSON.stringify(req.body, null, 2));
      const validated = insertContentAssetSchema.parse(req.body);
      console.log("Validated data:", JSON.stringify(validated, null, 2));
      
      // Clean up validated data - remove undefined values to let DB defaults work
      const cleanData = Object.fromEntries(
        Object.entries(validated).filter(([_, v]) => v !== undefined)
      );
      
      const asset = await storage.createContentAsset({ ...cleanData, ownerId: userId });
      console.log("Asset created:", asset.id);
      res.status(201).json(asset);
    } catch (error) {
      console.error("Error creating content asset:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create content asset", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/content-assets/:id", requireAuth, async (req, res) => {
    try {
      const asset = await storage.getContentAsset(req.params.id);
      if (!asset) {
        return res.status(404).json({ message: "Content asset not found" });
      }
      res.json(asset);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch content asset" });
    }
  });

  app.put("/api/content-assets/:id", requireAuth, async (req, res) => {
    try {
      const asset = await storage.updateContentAsset(req.params.id, req.body);
      if (!asset) {
        return res.status(404).json({ message: "Content asset not found" });
      }
      res.json(asset);
    } catch (error) {
      res.status(500).json({ message: "Failed to update content asset" });
    }
  });

  app.delete("/api/content-assets/:id", requireAuth, requireRole('admin', 'campaign_manager'), async (req, res) => {
    try {
      const deleted = await storage.deleteContentAsset(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Content asset not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete content asset" });
    }
  });

  // ==================== CONTENT PUSH TO RESOURCES CENTER ====================
  
  app.post("/api/content-assets/:id/push", requireAuth, requireRole('admin', 'campaign_manager'), async (req, res) => {
    try {
      const { id } = req.params;
      const { targetUrl } = req.body;
      
      // Get the asset
      const asset = await storage.getContentAsset(id);
      if (!asset) {
        return res.status(404).json({ message: "Content asset not found" });
      }

      // Create push record
      const pushRecord = await storage.createContentPush({
        assetId: id,
        targetUrl: targetUrl || process.env.RESOURCES_CENTER_URL || '',
        status: 'pending',
        attemptCount: 0,
        maxAttempts: 3,
        pushedBy: req.user!.userId,
      });

      // Update push to in_progress
      await storage.updateContentPush(pushRecord.id, { status: 'in_progress', attemptCount: 1 });

      // Attempt push using push service
      const { pushContentToResourcesCenter } = await import('./push-service');
      const result = await pushContentToResourcesCenter(asset, targetUrl);

      if (result.success) {
        // Update push record with success
        await storage.updateContentPush(pushRecord.id, {
          status: 'success',
          externalId: result.externalId,
          responsePayload: result.responsePayload,
        });

        res.json({
          message: "Content pushed successfully",
          pushId: pushRecord.id,
          externalId: result.externalId,
        });
      } else {
        // Update push record with failure
        await storage.updateContentPush(pushRecord.id, {
          status: 'failed',
          errorMessage: result.error,
          responsePayload: result.responsePayload,
        });

        res.status(500).json({
          message: "Push failed",
          error: result.error,
          pushId: pushRecord.id,
        });
      }
    } catch (error) {
      console.error("Error pushing content:", error);
      res.status(500).json({ 
        message: "Failed to push content", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  app.get("/api/content-assets/:id/pushes", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const pushes = await storage.getContentPushes(id);
      res.json(pushes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch push history" });
    }
  });

  app.post("/api/content-pushes/:id/retry", requireAuth, requireRole('admin', 'campaign_manager'), async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get push record
      const pushRecord = await storage.getContentPush(id);
      if (!pushRecord) {
        return res.status(404).json({ message: "Push record not found" });
      }

      // Enforce max attempts limit BEFORE updating or retrying
      if (pushRecord.attemptCount >= pushRecord.maxAttempts) {
        return res.status(400).json({ 
          message: "Max retry attempts reached",
          attemptCount: pushRecord.attemptCount,
          maxAttempts: pushRecord.maxAttempts
        });
      }

      // Get the asset
      const asset = await storage.getContentAsset(pushRecord.assetId);
      if (!asset) {
        return res.status(404).json({ message: "Content asset not found" });
      }

      // Calculate new attempt count and verify it doesn't exceed max
      const newAttemptCount = pushRecord.attemptCount + 1;
      if (newAttemptCount > pushRecord.maxAttempts) {
        return res.status(400).json({ 
          message: "Cannot retry: would exceed max attempts",
          attemptCount: pushRecord.attemptCount,
          maxAttempts: pushRecord.maxAttempts
        });
      }

      // Update attempt count and status atomically
      await storage.updateContentPush(id, { 
        status: 'retrying', 
        attemptCount: newAttemptCount 
      });

      // Retry push
      const { pushContentToResourcesCenter } = await import('./push-service');
      const result = await pushContentToResourcesCenter(asset, pushRecord.targetUrl);

      if (result.success) {
        await storage.updateContentPush(id, {
          status: 'success',
          externalId: result.externalId,
          responsePayload: result.responsePayload,
        });

        res.json({
          message: "Retry successful",
          pushId: id,
          externalId: result.externalId,
        });
      } else {
        await storage.updateContentPush(id, {
          status: 'failed',
          errorMessage: result.error,
          responsePayload: result.responsePayload,
        });

        res.status(500).json({
          message: "Retry failed",
          error: result.error,
          pushId: id,
        });
      }
    } catch (error) {
      console.error("Error retrying push:", error);
      res.status(500).json({ 
        message: "Failed to retry push", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // ==================== SOCIAL MEDIA POSTS ====================
  
  app.get("/api/social-posts", requireAuth, async (req, res) => {
    try {
      const posts = await storage.getSocialPosts();
      res.json(posts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch social posts" });
    }
  });

  app.post("/api/social-posts", requireAuth, requireRole('admin', 'campaign_manager'), async (req, res) => {
    try {
      const userId = req.user!.userId;
      const validated = insertSocialPostSchema.parse(req.body);
      const post = await storage.createSocialPost({ ...validated, ownerId: userId });
      res.status(201).json(post);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create social post" });
    }
  });

  app.get("/api/social-posts/:id", requireAuth, async (req, res) => {
    try {
      const post = await storage.getSocialPost(req.params.id);
      if (!post) {
        return res.status(404).json({ message: "Social post not found" });
      }
      res.json(post);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch social post" });
    }
  });

  // ==================== AI CONTENT GENERATION ====================
  
  app.post("/api/ai-content", requireAuth, requireRole('admin', 'campaign_manager'), async (req, res) => {
    try {
      const userId = req.user!.id;
      const { prompt, contentType, targetAudience, tone, ctaGoal } = req.body;
      
      // TODO: Integrate with OpenAI/Anthropic API for real generation
      // For now, return mock generated content
      const mockContent = `Generated ${contentType} content for ${targetAudience}`;
      
      const generation = await storage.createAIContentGeneration({
        prompt: prompt || "Generate content",
        contentType,
        targetAudience,
        tone,
        ctaGoal,
        generatedContent: mockContent,
        model: "gpt-4",
        tokensUsed: 500,
        userId,
      });
      
      res.status(201).json(generation);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate content" });
    }
  });

  // ==================== EVENTS ====================
  
  app.get("/api/events", requireAuth, async (req, res) => {
    try {
      const events = await storage.getEvents();
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.post("/api/events", requireAuth, requireRole('admin', 'campaign_manager'), async (req, res) => {
    try {
      const userId = req.user!.id;
      const validated = insertEventSchema.parse(req.body);
      const event = await storage.createEvent({ ...validated, createdBy: userId });
      res.status(201).json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  app.get("/api/events/:id", requireAuth, async (req, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  app.put("/api/events/:id", requireAuth, requireRole('admin', 'campaign_manager'), async (req, res) => {
    try {
      const validated = insertEventSchema.partial().parse(req.body);
      const event = await storage.updateEvent(req.params.id, validated);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update event" });
    }
  });

  app.delete("/api/events/:id", requireAuth, requireRole('admin', 'campaign_manager'), async (req, res) => {
    try {
      const deleted = await storage.deleteEvent(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  // ==================== RESOURCES ====================
  
  app.get("/api/resources", requireAuth, async (req, res) => {
    try {
      const resources = await storage.getResources();
      res.json(resources);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch resources" });
    }
  });

  app.post("/api/resources", requireAuth, requireRole('admin', 'campaign_manager'), async (req, res) => {
    try {
      const userId = req.user!.id;
      const validated = insertResourceSchema.parse(req.body);
      const resource = await storage.createResource({ ...validated, createdBy: userId });
      res.status(201).json(resource);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create resource" });
    }
  });

  app.get("/api/resources/:id", requireAuth, async (req, res) => {
    try {
      const resource = await storage.getResource(req.params.id);
      if (!resource) {
        return res.status(404).json({ message: "Resource not found" });
      }
      res.json(resource);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch resource" });
    }
  });

  app.put("/api/resources/:id", requireAuth, requireRole('admin', 'campaign_manager'), async (req, res) => {
    try {
      const validated = insertResourceSchema.partial().parse(req.body);
      const resource = await storage.updateResource(req.params.id, validated);
      if (!resource) {
        return res.status(404).json({ message: "Resource not found" });
      }
      res.json(resource);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update resource" });
    }
  });

  app.delete("/api/resources/:id", requireAuth, requireRole('admin', 'campaign_manager'), async (req, res) => {
    try {
      const deleted = await storage.deleteResource(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Resource not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete resource" });
    }
  });

  // ==================== NEWS ====================
  
  app.get("/api/news", requireAuth, async (req, res) => {
    try {
      const news = await storage.getNews();
      res.json(news);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch news" });
    }
  });

  app.post("/api/news", requireAuth, requireRole('admin', 'campaign_manager'), async (req, res) => {
    try {
      const userId = req.user!.id;
      const validated = insertNewsSchema.parse(req.body);
      const newsItem = await storage.createNews({ ...validated, createdBy: userId });
      res.status(201).json(newsItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create news" });
    }
  });

  app.get("/api/news/:id", requireAuth, async (req, res) => {
    try {
      const newsItem = await storage.getNewsItem(req.params.id);
      if (!newsItem) {
        return res.status(404).json({ message: "News not found" });
      }
      res.json(newsItem);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch news" });
    }
  });

  app.put("/api/news/:id", requireAuth, requireRole('admin', 'campaign_manager'), async (req, res) => {
    try {
      const validated = insertNewsSchema.partial().parse(req.body);
      const newsItem = await storage.updateNews(req.params.id, validated);
      if (!newsItem) {
        return res.status(404).json({ message: "News not found" });
      }
      res.json(newsItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update news" });
    }
  });

  app.delete("/api/news/:id", requireAuth, requireRole('admin', 'campaign_manager'), async (req, res) => {
    try {
      const deleted = await storage.deleteNews(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "News not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete news" });
    }
  });

  // ==================== SPEAKERS, ORGANIZERS, SPONSORS ====================
  
  app.get("/api/speakers", requireAuth, async (req, res) => {
    try {
      const speakers = await storage.getSpeakers();
      res.json(speakers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch speakers" });
    }
  });

  app.post("/api/speakers", requireAuth, requireRole('admin', 'data_ops'), async (req, res) => {
    try {
      const validated = insertSpeakerSchema.parse(req.body);
      const speaker = await storage.createSpeaker(validated);
      res.status(201).json(speaker);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create speaker" });
    }
  });

  app.put("/api/speakers/:id", requireAuth, requireRole('admin', 'data_ops'), async (req, res) => {
    try {
      const validated = insertSpeakerSchema.partial().parse(req.body);
      const speaker = await storage.updateSpeaker(parseInt(req.params.id), validated);
      if (!speaker) {
        return res.status(404).json({ message: "Speaker not found" });
      }
      res.json(speaker);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update speaker" });
    }
  });

  app.delete("/api/speakers/:id", requireAuth, requireRole('admin', 'data_ops'), async (req, res) => {
    try {
      await storage.deleteSpeaker(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete speaker" });
    }
  });

  app.get("/api/organizers", requireAuth, async (req, res) => {
    try {
      const organizers = await storage.getOrganizers();
      res.json(organizers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch organizers" });
    }
  });

  app.post("/api/organizers", requireAuth, requireRole('admin', 'data_ops'), async (req, res) => {
    try {
      const validated = insertOrganizerSchema.parse(req.body);
      const organizer = await storage.createOrganizer(validated);
      res.status(201).json(organizer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create organizer" });
    }
  });

  app.put("/api/organizers/:id", requireAuth, requireRole('admin', 'data_ops'), async (req, res) => {
    try {
      const validated = insertOrganizerSchema.partial().parse(req.body);
      const organizer = await storage.updateOrganizer(parseInt(req.params.id), validated);
      if (!organizer) {
        return res.status(404).json({ message: "Organizer not found" });
      }
      res.json(organizer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update organizer" });
    }
  });

  app.delete("/api/organizers/:id", requireAuth, requireRole('admin', 'data_ops'), async (req, res) => {
    try {
      await storage.deleteOrganizer(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete organizer" });
    }
  });

  app.get("/api/sponsors", requireAuth, async (req, res) => {
    try {
      const sponsors = await storage.getSponsors();
      res.json(sponsors);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sponsors" });
    }
  });

  app.post("/api/sponsors", requireAuth, requireRole('admin', 'data_ops'), async (req, res) => {
    try {
      const validated = insertSponsorSchema.parse(req.body);
      const sponsor = await storage.createSponsor(validated);
      res.status(201).json(sponsor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create sponsor" });
    }
  });

  app.put("/api/sponsors/:id", requireAuth, requireRole('admin', 'data_ops'), async (req, res) => {
    try {
      const validated = insertSponsorSchema.partial().parse(req.body);
      const sponsor = await storage.updateSponsor(parseInt(req.params.id), validated);
      if (!sponsor) {
        return res.status(404).json({ message: "Sponsor not found" });
      }
      res.json(sponsor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update sponsor" });
    }
  });

  app.delete("/api/sponsors/:id", requireAuth, requireRole('admin', 'data_ops'), async (req, res) => {
    try {
      await storage.deleteSponsor(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete sponsor" });
    }
  });

  // ==================== RESOURCES CENTRE SYNC ====================
  
  app.post("/api/sync/resources-centre", requireAuth, requireRole('admin', 'data_ops'), async (req, res) => {
    try {
      const { resourcesCentreSync } = await import("./services/resourcesCentreSync");
      const result = await resourcesCentreSync.syncAll();
      
      if (result.success) {
        res.json({
          message: "Sync completed successfully",
          ...result
        });
      } else {
        res.status(207).json({
          message: "Sync completed with errors",
          ...result
        });
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('environment variable')) {
          return res.status(400).json({ 
            message: "Configuration error", 
            error: error.message 
          });
        }
        if (error.message.includes('API key')) {
          return res.status(401).json({ 
            message: "Authentication failed with Resources Centre", 
            error: error.message 
          });
        }
      }
      res.status(500).json({ 
        message: "Sync failed", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // ==================== EMAIL INFRASTRUCTURE (Phase 26) ====================
  
  // Sender Profiles
  app.get("/api/sender-profiles", requireAuth, async (req, res) => {
    try {
      const profiles = await storage.getSenderProfiles();
      res.json(profiles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sender profiles" });
    }
  });

  app.post("/api/sender-profiles", requireAuth, requireRole('admin', 'campaign_manager'), async (req, res) => {
    try {
      const userId = req.user!.id;
      const validated = insertSenderProfileSchema.parse(req.body);
      const profile = await storage.createSenderProfile({ ...validated, createdBy: userId });
      res.status(201).json(profile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create sender profile" });
    }
  });

  app.get("/api/sender-profiles/:id", requireAuth, async (req, res) => {
    try {
      const profile = await storage.getSenderProfile(req.params.id);
      if (!profile) {
        return res.status(404).json({ message: "Sender profile not found" });
      }
      res.json(profile);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sender profile" });
    }
  });

  app.put("/api/sender-profiles/:id", requireAuth, requireRole('admin', 'campaign_manager'), async (req, res) => {
    try {
      const validated = insertSenderProfileSchema.partial().parse(req.body);
      const profile = await storage.updateSenderProfile(req.params.id, validated);
      if (!profile) {
        return res.status(404).json({ message: "Sender profile not found" });
      }
      res.json(profile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update sender profile" });
    }
  });

  app.delete("/api/sender-profiles/:id", requireAuth, requireRole('admin', 'campaign_manager'), async (req, res) => {
    try {
      await storage.deleteSenderProfile(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete sender profile" });
    }
  });

  // ==================== PHASE 27: TELEPHONY - SOFTPHONE & CALL RECORDING ====================
  
  // Softphone Profile Routes
  app.get("/api/softphone/profile", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const profile = await storage.getSoftphoneProfile(userId);
      if (!profile) {
        return res.status(404).json({ message: "Softphone profile not found" });
      }
      res.json(profile);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch softphone profile" });
    }
  });

  app.put("/api/softphone/profile", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const validated = insertSoftphoneProfileSchema.parse(req.body);
      const profile = await storage.upsertSoftphoneProfile({ ...validated, userId });
      res.json(profile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to save softphone profile" });
    }
  });

  // Call Recording Access Routes
  app.post("/api/calls/:attemptId/recording/access", requireAuth, requireRole('admin', 'qa_specialist'), async (req, res) => {
    try {
      const userId = req.user!.id;
      const { attemptId } = req.params;
      const { action } = req.body; // 'play' or 'download'
      
      if (!action || !['play', 'download'].includes(action)) {
        return res.status(400).json({ message: "Invalid action. Must be 'play' or 'download'" });
      }

      // Get the call attempt to verify it exists
      const attempt = await storage.getCallAttempt(attemptId);
      if (!attempt) {
        return res.status(404).json({ message: "Call attempt not found" });
      }

      // Log the access
      const accessLog = await storage.createCallRecordingAccessLog({
        callAttemptId: attemptId,
        userId,
        action,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      // TODO: Generate signed URL for recording from Telnyx or storage provider
      // For now, return mock URL
      const recordingUrl = `https://recordings.example.com/${attemptId}?token=mock-signed-token`;

      res.json({
        accessLog,
        recordingUrl,
        expiresIn: 3600, // URL expires in 1 hour
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to access recording" });
    }
  });

  app.get("/api/calls/:attemptId/recording/access-logs", requireAuth, requireRole('admin', 'qa_specialist'), async (req, res) => {
    try {
      const { attemptId } = req.params;
      
      // Verify call attempt exists
      const attempt = await storage.getCallAttempt(attemptId);
      if (!attempt) {
        return res.status(404).json({ message: "Call attempt not found" });
      }

      const logs = await storage.getCallRecordingAccessLogs(attemptId);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch access logs" });
    }
  });

  // ==================== WEBHOOKS (Resources Centre Reverse Webhook) ====================
  app.use("/api/webhooks", webhooksRouter);

  // ==================== CAMPAIGN CONTENT LINKS (Resources Centre Integration) ====================
  
  // Get linked content for a campaign
  app.get("/api/campaigns/:campaignId/content-links", requireAuth, async (req, res) => {
    try {
      const { campaignId } = req.params;
      
      // Verify campaign exists
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      const links = await storage.getCampaignContentLinks(campaignId);
      res.json(links);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch content links" });
    }
  });
  
  // Link content to campaign
  app.post("/api/campaigns/:campaignId/content-links", requireAuth, requireRole('admin', 'campaign_manager'), async (req, res) => {
    try {
      const { campaignId } = req.params;
      const userId = (req.user as any).id;
      
      // Verify campaign exists
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      const validated = z.object({
        contentType: z.enum(['event', 'resource']),
        contentId: z.string(),
        contentSlug: z.string(),
        contentTitle: z.string(),
        contentUrl: z.string().url(),
        formId: z.string().optional(),
        metadata: z.any().optional()
      }).parse(req.body);
      
      const link = await storage.createCampaignContentLink({
        campaignId,
        contentType: validated.contentType,
        contentId: validated.contentId,
        contentSlug: validated.contentSlug,
        contentTitle: validated.contentTitle,
        contentUrl: validated.contentUrl,
        formId: validated.formId || null,
        metadata: validated.metadata || null,
        createdBy: userId
      });
      
      res.status(201).json(link);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create content link" });
    }
  });
  
  // Delete content link
  app.delete("/api/campaigns/:campaignId/content-links/:linkId", requireAuth, requireRole('admin', 'campaign_manager'), async (req, res) => {
    try {
      const { linkId } = req.params;
      
      await storage.deleteCampaignContentLink(Number(linkId));
      res.json({ message: "Content link deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete content link" });
    }
  });
  
  // Generate tracking URL for a single contact
  app.post("/api/campaigns/:campaignId/content-links/:linkId/tracking-url", requireAuth, async (req, res) => {
    try {
      const { campaignId, linkId } = req.params;
      
      // Get campaign
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      // Get content link
      const link = await storage.getCampaignContentLink(Number(linkId));
      if (!link) {
        return res.status(404).json({ message: "Content link not found" });
      }
      
      const validated = z.object({
        contactId: z.string().optional(),
        email: z.string().optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        company: z.string().optional(),
        utmSource: z.string().optional(),
        utmMedium: z.string().optional(),
        utmCampaign: z.string().optional()
      }).parse(req.body);
      
      // Import the URL generator
      const { generateTrackingUrl } = await import("./lib/urlGenerator");
      
      const trackingUrl = generateTrackingUrl(link.contentUrl, {
        ...validated,
        campaignId,
        campaignName: campaign.name
      });
      
      res.json({ trackingUrl });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to generate tracking URL" });
    }
  });
  
  // Generate bulk tracking URLs for multiple contacts
  app.post("/api/campaigns/:campaignId/content-links/:linkId/bulk-tracking-urls", requireAuth, async (req, res) => {
    try {
      const { campaignId, linkId } = req.params;
      
      // Get campaign
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      // Get content link
      const link = await storage.getCampaignContentLink(Number(linkId));
      if (!link) {
        return res.status(404).json({ message: "Content link not found" });
      }
      
      const validated = z.object({
        contactIds: z.array(z.string()),
        utmSource: z.string().optional(),
        utmMedium: z.string().optional(),
        utmCampaign: z.string().optional()
      }).parse(req.body);
      
      // Get contacts
      const contacts = await Promise.all(
        validated.contactIds.map(id => storage.getContact(id))
      );
      
      const validContacts = contacts.filter(c => c !== undefined) as any[];
      
      // Import the URL generator
      const { generateBulkTrackingUrls } = await import("./lib/urlGenerator");
      
      const trackingUrls = generateBulkTrackingUrls(
        link.contentUrl,
        validContacts.map(c => ({
          id: c.id,
          email: c.email,
          firstName: c.firstName,
          lastName: c.lastName,
          company: c.company
        })),
        {
          campaignId,
          campaignName: campaign.name,
          utmSource: validated.utmSource,
          utmMedium: validated.utmMedium,
          utmCampaign: validated.utmCampaign
        }
      );
      
      res.json({ trackingUrls });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to generate bulk tracking URLs" });
    }
  });
}
