import type { Express } from "express";
import { eq, and, inArray, isNotNull, sql, desc } from "drizzle-orm";
import { storage } from "./storage";
import { comparePassword, generateToken, requireAuth, requireRole, hashPassword } from "./auth";
import webhooksRouter from "./routes/webhooks";
import dvRouter from "./routes/dv-routes";
import queueRouter from "./routes/queue-routes";
import filterOptionsRouter from "./routes/filter-options-routes";
import { z } from "zod";
import { db } from "./db";
import { customFieldDefinitions, accounts as accountsTable, contacts as contactsTable, domainSetItems, users, campaignAgentAssignments, campaignQueue, agentQueue, campaigns, contacts, accounts } from "@shared/schema";
import {
  insertAccountSchema,
  insertContactSchema,
  insertCustomFieldDefinitionSchema,
  updateCustomFieldDefinitionSchema,
  insertCampaignSchema,
  insertLeadSchema,
  insertCallSchema,
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
  insertSipTrunkConfigSchema,
  insertAgentStatusSchema,
  insertAutoDialerQueueSchema,
  insertContentAssetSchema,
  insertSocialPostSchema,
  insertAIContentGenerationSchema,
  insertEventSchema,
  insertResourceSchema,
  insertNewsSchema,
  insertActivityLogSchema,
  insertSpeakerSchema,
  insertOrganizerSchema,
  insertSponsorSchema
} from "@shared/schema";
import { normalizePhoneE164 } from "./normalization"; // Import normalization utility
import type { FilterValues } from "@shared/filterConfig";
import type { FilterGroup, FilterCondition } from "@shared/filter-types";

// Helper to convert new FilterValues format to legacy FilterGroup format
function convertFilterValuesToFilterGroup(filterValues: FilterValues): FilterGroup | undefined {
  const conditions: FilterCondition[] = [];

  // Map filter fields to database columns and operators
  const fieldMapping: Record<string, { column: string; operator: string }> = {
    industries: { column: 'account.industry', operator: 'in' },
    companySizes: { column: 'account.companySize', operator: 'in' },
    companyRevenue: { column: 'account.revenue', operator: 'in' },
    seniorityLevels: { column: 'contact.seniorityLevel', operator: 'in' },
    jobFunctions: { column: 'contact.jobFunction', operator: 'in' },
    departments: { column: 'contact.department', operator: 'in' },
    technologies: { column: 'account.technologies', operator: 'arrayContains' },
    countries: { column: 'account.country', operator: 'in' },
    states: { column: 'account.state', operator: 'in' },
    cities: { column: 'account.city', operator: 'in' },
    accountOwners: { column: 'account.ownerId', operator: 'in' }
  };

  // Process each filter value
  Object.entries(filterValues).forEach(([key, value]) => {
    if (!value) return;

    // Handle array filters (multi-select and typeahead)
    if (Array.isArray(value) && value.length > 0) {
      const mapping = fieldMapping[key];
      if (mapping) {
        conditions.push({
          field: mapping.column,
          operator: mapping.operator as any,
          value: value
        });
      }
    }
    // Handle date range filters
    else if (typeof value === 'object' && ('from' in value || 'to' in value)) {
      const dateRange = value as { from?: string; to?: string };
      if (dateRange.from) {
        conditions.push({
          field: key,
          operator: 'gte',
          value: dateRange.from
        });
      }
      if (dateRange.to) {
        conditions.push({
          field: key,
          operator: 'lte',
          value: dateRange.to
        });
      }
    }
    // Handle text search
    else if (typeof value === 'string' && value.trim()) {
      conditions.push({
        field: key,
        operator: 'contains',
        value: value.trim()
      });
    }
  });

  if (conditions.length === 0) {
    return undefined;
  }

  return {
    combinator: 'and',
    conditions
  };
}

export function registerRoutes(app: Express) {
  // ==================== AUTH ====================

  // ==================== USERS (Admin Only) ====================

  // Get all users or find by email
  app.get("/api/users", requireAuth, async (req, res) => {
    try {
      const { email } = req.query;

      if (email) {
        // Find user by email
        const user = await db.select().from(users).where(eq(users.email, email as string)).limit(1);
        if (user.length === 0) {
          return res.status(404).json({ message: "User not found" });
        }
        const { password, ...userWithoutPassword } = user[0];
        return res.json(userWithoutPassword);
      }

      // Admin only for listing all users
      const userRoles = req.user?.roles || [req.user?.role]; // Support both new and legacy format
      if (!userRoles.includes('admin')) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const allUsers = await storage.getUsers();
      // Return sanitized user data (exclude password) and include roles
      const sanitizedUsersWithRoles = await Promise.all(
        allUsers.map(async (user) => {
          const { password, ...userWithoutPassword } = user;
          const roles = await storage.getUserRoles(user.id);
          return { ...userWithoutPassword, roles };
        })
      );
      res.json(sanitizedUsersWithRoles);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
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

  // ==================== USER ROLES (Admin Only) ====================

  // Get roles for a specific user
  app.get("/api/users/:userId/roles", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { userId } = req.params;
      const roles = await storage.getUserRoles(userId);
      res.json({ roles });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update all roles for a user (bulk update)
  app.put("/api/users/:userId/roles", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { userId } = req.params;
      const { roles } = req.body;

      if (!Array.isArray(roles)) {
        return res.status(400).json({ message: "Roles must be an array" });
      }

      await storage.updateUserRoles(userId, roles, req.user!.userId);
      res.json({ message: "Roles updated successfully", roles });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Assign a single role to a user
  app.post("/api/users/:userId/roles", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      if (!role) {
        return res.status(400).json({ message: "Role is required" });
      }

      await storage.assignUserRole(userId, role, req.user!.userId);
      const roles = await storage.getUserRoles(userId);
      res.json({ message: "Role assigned successfully", roles });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Remove a role from a user
  app.delete("/api/users/:userId/roles/:role", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { userId, role } = req.params;
      await storage.removeUserRole(userId, role);
      const roles = await storage.getUserRoles(userId);
      res.json({ message: "Role removed successfully", roles });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Migrate existing users to multi-role system (one-time migration)
  app.post("/api/users/migrate-roles", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const allUsers = await storage.getUsers();
      let migrated = 0;
      let skipped = 0;

      for (const user of allUsers) {
        const existingRoles = await storage.getUserRoles(user.id);

        // Only migrate if user has no roles in the junction table
        if (existingRoles.length === 0) {
          await storage.assignUserRole(user.id, user.role, req.user!.userId);
          migrated++;
        } else {
          skipped++;
        }
      }

      res.json({
        message: "Migration completed successfully",
        migrated,
        skipped,
        total: allUsers.length
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== AUTH ====================

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      console.log('[LOGIN DEBUG] Received username:', username);

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }

      const user = await storage.getUserByUsername(username);
      console.log('[LOGIN DEBUG] User found:', user ? 'YES' : 'NO');
      console.log('[LOGIN DEBUG] User details:', user ? { id: user.id, username: user.username, email: user.email } : null);

      if (!user) {
        console.log('[LOGIN DEBUG] User not found, returning 401');
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Verify password
      console.log('[LOGIN DEBUG] Comparing password...');
      const isValid = await comparePassword(password, user.password);
      console.log('[LOGIN DEBUG] Password valid:', isValid);
      if (!isValid) {
        console.log('[LOGIN DEBUG] Invalid password, returning 401');
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Fetch user roles (multi-role support)
      let userRoles = await storage.getUserRoles(user.id);

      // Bootstrap check: If user has no roles and no admin users exist in the system,
      // automatically assign admin role to this user (first user setup)
      if (userRoles.length === 0) {
        const allUsersWithRoles = await storage.getAllUsersWithRoles();
        const hasAdmin = allUsersWithRoles.some(u => u.roles.includes('admin'));

        if (!hasAdmin) {
          // This is the first user - give them admin role
          await storage.assignUserRole(user.id, 'admin', user.id);
          userRoles = ['admin'];
        } else {
          // Use legacy role as fallback - ensure it's always in an array
          userRoles = [user.role || 'agent'];
        }
      }

      // Ensure userRoles is always an array
      if (!Array.isArray(userRoles)) {
        userRoles = [userRoles];
      }

      // Generate JWT token with roles
      const token = generateToken(user, userRoles);

      // Return token and user info without password, including roles
      const { password: _, ...userWithoutPassword } = user;
      res.json({
        token,
        user: { ...userWithoutPassword, roles: userRoles }
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
      const userId = req.user!.userId;
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
      
      // Support new FilterValues format
      if (req.query.filterValues) {
        try {
          const filterValues = JSON.parse(req.query.filterValues as string);
          // Convert FilterValues to FilterGroup format for backward compatibility
          filters = convertFilterValuesToFilterGroup(filterValues);
        } catch (e) {
          return res.status(400).json({ message: "Invalid filterValues format" });
        }
      }
      // Fallback to legacy filter format
      else if (req.query.filters) {
        try {
          filters = JSON.parse(req.query.filters as string);
        } catch (e) {
          return res.status(400).json({ message: "Invalid filters format" });
        }
      }
      
      const contacts = await storage.getContacts(filters);
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching contacts:", error);
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

      // Step 1: Collect all unique domains and normalize them
      const domainMap = new Map<string, any>();
      records.forEach(record => {
        if (record.account?.domain) {
          const normalizedDomain = record.account.domain.trim().toLowerCase();
          if (!domainMap.has(normalizedDomain)) {
            domainMap.set(normalizedDomain, { ...record.account, domain: normalizedDomain });
          }
        }
      });

      // Step 2: Fetch all existing accounts by domains in one query
      const domains = Array.from(domainMap.keys());
      const existingAccounts = await storage.getAccountsByDomains(domains);
      const accountsByDomain = new Map(existingAccounts.map(acc => [acc.domain!, acc]));

      // Step 3: Create new accounts in bulk for domains that don't exist
      const newAccountsToCreate: any[] = [];
      for (const [domain, accountData] of domainMap) {
        if (!accountsByDomain.has(domain) && (accountData.name || accountData.domain)) {
          try {
            const validatedAccount = insertAccountSchema.parse(accountData);
            newAccountsToCreate.push(validatedAccount);
          } catch (error) {
            // Skip invalid account data
          }
        }
      }

      let newAccounts: any[] = [];
      if (newAccountsToCreate.length > 0) {
        newAccounts = await storage.createAccountsBulk(newAccountsToCreate);
        newAccounts.forEach(acc => accountsByDomain.set(acc.domain!, acc));
      }

      // Step 4: Collect all emails and phones for bulk suppression checks
      const emails = records.map(r => r.contact?.email).filter(Boolean);
      const phones = records.map(r => r.contact?.directPhone || r.contact?.mobilePhone).filter(Boolean)
        .map(phone => normalizePhoneE164(phone)).filter(Boolean);

      const suppressedEmails = await storage.checkEmailSuppressionBulk(emails);
      const suppressedPhones = await storage.checkPhoneSuppressionBulk(phones as string[]);

      // Step 5: Validate and prepare contacts for bulk insert
      const contactsToCreate: any[] = [];
      const recordIndexMap = new Map<number, number>(); // maps contact array index to original record index

      for (let i = 0; i < records.length; i++) {
        try {
          const { contact: contactData, account: accountData } = records[i];

          // Validate contact data
          const validatedContact = insertContactSchema.parse(contactData);

          // Normalize phone numbers
          if (validatedContact.directPhone) {
            const normalized = normalizePhoneE164(validatedContact.directPhone, validatedContact.country || undefined);
            validatedContact.directPhoneE164 = normalized;
          }
          if (validatedContact.mobilePhone) {
            const normalized = normalizePhoneE164(validatedContact.mobilePhone, validatedContact.country || undefined);
            validatedContact.mobilePhoneE164 = normalized;
          }

          // Check email suppression
          if (suppressedEmails.has(validatedContact.email.toLowerCase())) {
            results.failed++;
            results.errors.push({ index: i, error: "Email is on suppression list" });
            continue;
          }

          // Check phone suppression if provided
          if (validatedContact.directPhoneE164 && suppressedPhones.has(validatedContact.directPhoneE164)) {
            results.failed++;
            results.errors.push({ index: i, error: "Phone is on DNC list" });
            continue;
          }

          // Link contact to account if domain exists
          if (accountData?.domain) {
            const normalizedDomain = accountData.domain.trim().toLowerCase();
            const account = accountsByDomain.get(normalizedDomain);
            if (account) {
              validatedContact.accountId = account.id;
            }
          }

          recordIndexMap.set(contactsToCreate.length, i);
          contactsToCreate.push(validatedContact);
        } catch (error) {
          results.failed++;
          results.errors.push({
            index: i,
            error: error instanceof Error ? error.message : "Unknown error"
          });
        }
      }

      // Step 6: Create all contacts in bulk
      if (contactsToCreate.length > 0) {
        try {
          await storage.createContactsBulk(contactsToCreate);
          results.success = contactsToCreate.length;
        } catch (error) {
          // If bulk insert fails, fall back to individual inserts to identify specific failures
          for (let i = 0; i < contactsToCreate.length; i++) {
            try {
              await storage.createContact(contactsToCreate[i]);
              results.success++;
            } catch (err) {
              results.failed++;
              const originalIndex = recordIndexMap.get(i) || i;
              results.errors.push({
                index: originalIndex,
                error: err instanceof Error ? err.message : "Unknown error"
              });
            }
          }
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

      // Normalize phone numbers
      if (validatedContact.directPhone) {
        const normalized = normalizePhoneE164(validatedContact.directPhone, validatedContact.country || undefined);
        validatedContact.directPhoneE164 = normalized;
      }
      if (validatedContact.mobilePhone) {
        const normalized = normalizePhoneE164(validatedContact.mobilePhone, validatedContact.country || undefined);
        validatedContact.mobilePhoneE164 = normalized;
      }

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

  // Create contact
  app.post('/api/contacts', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send('Unauthorized');
    }

    try {
      const contactData = insertContactSchema.parse(req.body);

      // Normalize phone numbers
      if (contactData.directPhone) {
        const normalized = normalizePhoneE164(contactData.directPhone, contactData.country || undefined);
        contactData.directPhoneE164 = normalized;
      }
      if (contactData.mobilePhone) {
        const normalized = normalizePhoneE164(contactData.mobilePhone, contactData.country || undefined);
        contactData.mobilePhoneE164 = normalized;
      }

      // Check email suppression
      if (await storage.isEmailSuppressed(contactData.email)) {
        return res.status(400).json({ message: "Email is on suppression list" });
      }

      // Check phone suppression if provided
      if (contactData.directPhoneE164 && await storage.isPhoneSuppressed(contactData.directPhoneE164)) {
        return res.status(400).json({ message: "Phone is on DNC list" });
      }

      const newContact = await storage.createContact(contactData);
      res.json(newContact);
    } catch (error: any) {
      console.error('Error creating contact:', error);
      res.status(400).send(error.message);
    }
  });

  // Update contact
  app.patch('/api/contacts/:id', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send('Unauthorized');
    }

    try {
      const { id } = req.params;
      const updateData = req.body;

      // Normalize phone numbers if provided
      if (updateData.directPhone) {
        const contact = await storage.getContact(id);
        const normalized = normalizePhoneE164(updateData.directPhone, contact?.country || undefined);
        updateData.directPhoneE164 = normalized;
      }
      if (updateData.mobilePhone) {
        const contact = await storage.getContact(id);
        const normalized = normalizePhoneE164(updateData.mobilePhone, contact?.country || undefined);
        updateData.mobilePhoneE164 = normalized;
      }

      const updatedContact = await storage.updateContact(id, updateData);
      if (!updatedContact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      res.json(updatedContact);
    } catch (error: any) {
      console.error('Error updating contact:', error);
      res.status(400).send(error.message);
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

  // Get all custom field definitions
  app.get('/api/custom-fields', async (req, res) => {
    try {
      const fields = await db.select()
        .from(customFieldDefinitions)
        .where(eq(customFieldDefinitions.active, true))
        .orderBy(customFieldDefinitions.displayOrder);

      res.json(fields);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create custom field definition
  app.post('/api/custom-fields', async (req, res) => {
    try {
      const data = insertCustomFieldDefinitionSchema.parse(req.body);

      // Check if field key already exists for this entity type
      const existing = await db.select()
        .from(customFieldDefinitions)
        .where(
          and(
            eq(customFieldDefinitions.entityType, data.entityType),
            eq(customFieldDefinitions.fieldKey, data.fieldKey)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        return res.status(400).json({ error: 'Field key already exists for this entity type' });
      }

      const [field] = await db.insert(customFieldDefinitions)
        .values({
          ...data,
          createdBy: req.user?.userId,
        })
        .returning();

      res.json(field);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update custom field definition
  app.patch('/api/custom-fields/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const data = updateCustomFieldDefinitionSchema.parse(req.body);

      const [field] = await db.update(customFieldDefinitions)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(customFieldDefinitions.id, id))
        .returning();

      if (!field) {
        return res.status(404).json({ error: 'Custom field not found' });
      }

      res.json(field);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Delete (deactivate) custom field definition
  app.delete('/api/custom-fields/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const [field] = await db.update(customFieldDefinitions)
        .set({
          active: false,
          updatedAt: new Date(),
        })
        .where(eq(customFieldDefinitions.id, id))
        .returning();

      if (!field) {
        return res.status(404).json({ error: 'Custom field not found' });
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
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

      // Normalize phone numbers
      if (contactData.directPhone) {
        const normalized = normalizePhoneE164(contactData.directPhone, contactData.country || undefined);
        contactData.directPhoneE164 = normalized;
      }
      if (contactData.mobilePhone) {
        const normalized = normalizePhoneE164(contactData.mobilePhone, contactData.country || undefined);
        contactData.mobilePhoneE164 = normalized;
      }

      // Check phone suppression if provided
      if (contactData.directPhoneE164 && await storage.isPhoneSuppressed(contactData.directPhoneE164)) {
        return res.status(400).json({ message: "Phone is on DNC list" });
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
          actorId: req.user!.userId
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

      // Normalize phone number
      if (accountData.mainPhone) {
        const normalized = normalizePhoneE164(accountData.mainPhone, accountData.hqCountry || undefined);
        accountData.mainPhoneE164 = normalized;
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
          actorId: req.user!.userId
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

  // Get membership info for a contact or account
  app.get("/api/:entityType/:id/membership", requireAuth, async (req, res) => {
    try {
      const { entityType, id } = req.params;

      if (entityType !== 'contacts' && entityType !== 'accounts') {
        return res.status(400).json({ message: "Invalid entity type" });
      }

      const normalizedEntityType = entityType === 'contacts' ? 'contact' : 'account';

      // Get all lists for this entity type that contain this ID
      const allLists = await storage.getLists();
      const listsContainingEntity = allLists.filter(list =>
        list.entityType === normalizedEntityType &&
        list.recordIds &&
        list.recordIds.includes(id)
      );

      // Get all segments for this entity type
      const allSegments = await storage.getSegments();
      const relevantSegments = allSegments.filter(seg =>
        seg.entityType === normalizedEntityType &&
        seg.isActive
      );

      // Check which segments this entity matches
      const segmentsContainingEntity = [];
      for (const segment of relevantSegments) {
        if (segment.definitionJson) {
          const preview = await storage.previewSegment(
            normalizedEntityType,
            segment.definitionJson
          );
          if (preview.sampleIds.includes(id)) {
            segmentsContainingEntity.push({
              id: segment.id,
              name: segment.name,
              isActive: segment.isActive || false
            });
          }
        }
      }

      res.json({
        lists: listsContainingEntity.map(list => ({
          id: list.id,
          name: list.name,
          sourceType: list.sourceType || 'manual_upload'
        })),
        segments: segmentsContainingEntity
      });
    } catch (error) {
      console.error('Get membership error:', error);
      res.status(500).json({ message: "Failed to fetch membership info" });
    }
  });

  app.post("/api/segments", requireAuth, requireRole('admin', 'campaign_manager', 'data_ops'), async (req, res) => {
    try {
      const validated = insertSegmentSchema.parse(req.body);
      const segment = await storage.createSegment(validated);

      // Calculate and update record count
      if (segment.definitionJson) {
        const preview = await storage.previewSegment(
          segment.entityType || 'contact',
          segment.definitionJson
        );
        await storage.updateSegment(segment.id, {
          recordCountCache: preview.count,
          lastRefreshedAt: new Date()
        });
        segment.recordCountCache = preview.count;
        segment.lastRefreshedAt = new Date();
      }

      res.status(201).json(segment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create segment" });
    }
  });

  // Added endpoint to get segment members
  app.get("/api/segments/:id/members", requireAuth, async (req, res) => {
    try {
      const members = await storage.getSegmentMembers(req.params.id);
      res.json(members);
    } catch (error) {
      console.error('Get segment members error:', error);
      res.status(500).json({ message: "Failed to get segment members" });
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

  // Added endpoint to get a specific list by ID
  app.get("/api/lists/:id", requireAuth, async (req, res) => {
    try {
      const list = await storage.getListById(req.params.id);
      if (!list) {
        return res.status(404).json({ message: "List not found" });
      }
      res.json(list);
    } catch (error) {
      console.error('Get list error:', error);
      res.status(500).json({ message: "Failed to get list" });
    }
  });

  // Added endpoint to get list members
  app.get("/api/lists/:id/members", requireAuth, async (req, res) => {
    try {
      const members = await storage.getListMembers(req.params.id);
      res.json(members);
    } catch (error) {
      console.error('Get list members error:', error);
      res.status(500).json({ message: "Failed to get list members" });
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
      console.error('Delete list error:', error);
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
      const existingIds = list.recordIds || [];
      const updatedIds = Array.from(new Set([...existingIds, ...contactIds]));
      const updated = await storage.updateList(req.params.id, { recordIds: updatedIds });

      res.json(updated);
    } catch (error) {
      console.error('Add contacts to list error:', error);
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
      const existingIds = list.recordIds || [];
      const updatedIds = Array.from(new Set([...existingIds, ...accountIds]));
      const updated = await storage.updateList(req.params.id, { recordIds: updatedIds });

      res.json(updated);
    } catch (error) {
      console.error('Add accounts to list error:', error);
      res.status(500).json({ message: "Failed to add accounts to list" });
    }
  });

  app.post("/api/lists/:id/export", requireAuth, requireRole('admin', 'campaign_manager', 'quality_analyst'), async (req, res) => {
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

      // Create domain item
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

      // Batch fetch account names for efficiency (deduplicate accountIds)
      const accountIds = [...new Set(items
        .map(item => item.accountId)
        .filter((id): id is string => id !== null && id !== undefined))];

      const accountMap = new Map<string, string>();
      if (accountIds.length > 0) {
        const accounts = await db
          .select({ id: accountsTable.id, name: accountsTable.name })
          .from(accountsTable)
          .where(inArray(accountsTable.id, accountIds));

        accounts.forEach(acc => accountMap.set(acc.id, acc.name));
      }

      // Enrich items with account names from the batch fetch
      const enrichedItems = items.map(item => ({
        ...item,
        accountName: item.accountId ? (accountMap.get(item.accountId) || null) : null
      }));

      res.json(enrichedItems);
    } catch (error) {
      console.error('Get domain set items error:', error);
      res.status(500).json({ message: "Failed to get domain set items" });
    }
  });

  // Get accounts matched by a domain set
  app.get('/api/domain-sets/:id/accounts', requireAuth, async (req, res) => {
    try {
      const domainSetId = req.params.id;

      // Get all domain set items with matched accounts
      const matchedItems = await db
        .selectDistinct({ accountId: domainSetItems.accountId })
        .from(domainSetItems)
        .where(
          and(
            eq(domainSetItems.domainSetId, domainSetId),
            isNotNull(domainSetItems.accountId)
          )
        );

      if (matchedItems.length === 0) {
        return res.json([]);
      }

      // Extract account IDs (already filtered for non-null by query)
      const accountIds = matchedItems
        .map(item => item.accountId)
        .filter((id): id is string => id !== null && id !== undefined);

      if (accountIds.length === 0) {
        return res.json([]);
      }

      // Get the actual account records
      const accounts = await db
        .select()
        .from(accountsTable)
        .where(inArray(accountsTable.id, accountIds));

      res.json(accounts);
    } catch (error: any) {
      console.error('Error fetching domain set accounts:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get contacts matched by a domain set
  app.get('/api/domain-sets/:id/contacts', requireAuth, async (req, res) => {
    try {
      const domainSetId = req.params.id;

      // Get all accounts that were matched by this domain set
      const matchedAccountIds = await db
        .selectDistinct({ accountId: domainSetItems.accountId })
        .from(domainSetItems)
        .where(
          and(
            eq(domainSetItems.domainSetId, domainSetId),
            isNotNull(domainSetItems.accountId)
          )
        );

      if (matchedAccountIds.length === 0) {
        return res.json([]);
      }

      // Extract account IDs (already filtered for non-null by query)
      const accountIds = matchedAccountIds
        .map(m => m.accountId)
        .filter((id): id is string => id !== null && id !== undefined);

      if (accountIds.length === 0) {
        return res.json([]);
      }

      // Get all contacts from those accounts
      const contacts = await db
        .select()
        .from(contactsTable)
        .where(inArray(contactsTable.accountId, accountIds));

      res.json(contacts);
    } catch (error: any) {
      console.error('Error fetching domain set contacts:', error);
      res.status(500).json({ error: error.message });
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
      const typeFilter = req.query.type as string | undefined;
      let campaigns = await storage.getCampaigns();

      // Filter by type if specified
      if (typeFilter) {
        campaigns = campaigns.filter(c => c.type === typeFilter);
      }

      res.json(campaigns);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  // Get campaigns assigned to the current agent (or all campaigns for admin)
  // MUST come BEFORE /api/campaigns/:id to avoid route collision
  app.get("/api/campaigns/agent-assignments", requireAuth, async (req, res) => {
    try {
      const agentId = req.user?.userId;
      if (!agentId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Check if user is admin
      const userRoles = req.user?.roles || [req.user?.role];
      const isAdmin = userRoles.includes('admin') || userRoles.includes('campaign_manager');

      console.log(`[AGENT ASSIGNMENTS] User ${agentId} - isAdmin: ${isAdmin}, roles:`, userRoles);

      if (isAdmin) {
        // Admins see all call campaigns (active or not)
        const allCampaigns = await db
          .select({
            campaignId: campaigns.id,
            campaignName: campaigns.name,
            dialMode: campaigns.dialMode,
          })
          .from(campaigns)
          .where(eq(campaigns.type, 'call'));
        
        console.log(`[AGENT ASSIGNMENTS] Admin user ${agentId} - found ${allCampaigns.length} call campaigns:`, allCampaigns.map(c => ({ id: c.campaignId, name: c.campaignName, dialMode: c.dialMode })));
        
        return res.status(200).json(allCampaigns);
      }
      
      // Agents see only their assigned campaigns
      const assignments = await db
        .select({
          campaignId: campaignAgentAssignments.campaignId,
          campaignName: campaigns.name,
          dialMode: campaigns.dialMode,
        })
        .from(campaignAgentAssignments)
        .innerJoin(campaigns, eq(campaignAgentAssignments.campaignId, campaigns.id))
        .where(
          and(
            eq(campaignAgentAssignments.agentId, agentId),
            eq(campaignAgentAssignments.isActive, true)
          )
        );
      
      console.log(`[AGENT ASSIGNMENTS] Agent user ${agentId} - returning ${assignments.length} assigned campaigns`);
      
      return res.status(200).json(assignments);
    } catch (error) {
      console.error('[AGENT ASSIGNMENTS] Error:', error);
      return res.status(500).json({ message: "Failed to fetch agent assignments" });
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
      const { assignedAgents, ...campaignData } = req.body;
      const campaign = await storage.createCampaign(campaignData);

      // If agents are assigned, store them in campaign metadata or separate table
      if (assignedAgents && Array.isArray(assignedAgents) && assignedAgents.length > 0) {
        await storage.updateCampaign(campaign.id, {
          metadata: { ...campaign.metadata, assignedAgents }
        });
      }

      // Auto-populate queue from audience if defined
      if (campaign.audienceRefs && campaign.type === 'call') {
        const audienceRefs = campaign.audienceRefs as any;
        let contacts: any[] = [];

        // Resolve contacts from filterGroup (Advanced Filters)
        if (audienceRefs.filterGroup) {
          console.log(`[Campaign Creation] Resolving contacts from filterGroup for campaign ${campaign.id}`);
          const filterContacts = await storage.getContacts(audienceRefs.filterGroup);
          contacts.push(...filterContacts);
          console.log(`[Campaign Creation] Found ${filterContacts.length} contacts from filterGroup`);
        }

        // Resolve contacts from segments
        if (audienceRefs.selectedSegments && Array.isArray(audienceRefs.selectedSegments)) {
          for (const segmentId of audienceRefs.selectedSegments) {
            const segment = await storage.getSegment(segmentId);
            if (segment && segment.definitionJson) {
              const segmentContacts = await storage.getContacts(segment.definitionJson as any);
              contacts.push(...segmentContacts);
            }
          }
        }

        // Resolve contacts from lists (with batching for large lists)
        if (audienceRefs.selectedLists && Array.isArray(audienceRefs.selectedLists)) {
          for (const listId of audienceRefs.selectedLists) {
            const list = await storage.getList(listId);
            if (list && list.recordIds && list.recordIds.length > 0) {
              // Batch large lists to avoid SQL query limits
              const batchSize = 1000;
              for (let i = 0; i < list.recordIds.length; i += batchSize) {
                const batch = list.recordIds.slice(i, i + batchSize);
                const listContacts = await storage.getContactsByIds(batch);
                contacts.push(...listContacts);
              }
            }
          }
        }

        // Remove duplicates and filter valid contacts
        const uniqueContacts = Array.from(
          new Map(contacts.map(c => [c.id, c])).values()
        );
        const validContacts = uniqueContacts.filter(c => c.accountId);

        // Enqueue all valid contacts (skip if already in queue)
        let enqueuedCount = 0;
        for (const contact of validContacts) {
          try {
            await storage.enqueueContact(
              campaign.id,
              contact.id,
              contact.accountId!,
              0
            );
            enqueuedCount++;
          } catch (error) {
            // Skip contacts that can't be enqueued (e.g., already in queue)
          }
        }

        console.log(`[Campaign Creation] Auto-populated ${enqueuedCount} contacts to queue for campaign ${campaign.id}`);
      }

      res.status(201).json(campaign);
    } catch (error) {
      console.error('Campaign creation error:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create campaign" });
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

  // ==================== CAMPAIGN AGENT ASSIGNMENTS ====================

  // List all agents with their current assignment status
  app.get("/api/agents", requireAuth, async (req, res) => {
    try {
      const agents = await storage.listAgents();
      res.json(agents);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch agents" });
    }
  });

  // Assign agents to a campaign (with automatic reassignment)
  app.post("/api/campaigns/:id/agents", requireAuth, requireRole('admin', 'campaign_manager'), async (req, res) => {
    try {
      const { agentIds } = req.body;

      if (!Array.isArray(agentIds) || agentIds.length === 0) {
        return res.status(400).json({ message: "agentIds array is required" });
      }

      const userId = req.user!.userId;

      // Release agents from their current campaigns first
      for (const agentId of agentIds) {
        const existingAssignments = await db
          .select()
          .from(campaignAgentAssignments)
          .where(
            and(
              eq(campaignAgentAssignments.agentId, agentId),
              eq(campaignAgentAssignments.isActive, true)
            )
          );

        for (const assignment of existingAssignments) {
          if (assignment.campaignId !== req.params.id) {
            await storage.releaseAgentAssignment(assignment.campaignId, agentId);
          }
        }
      }

      // Now assign agents to the new campaign
      await storage.assignAgentsToCampaign(req.params.id, agentIds, userId);

      // Automatically populate queue from campaign audience if not already populated
      const campaign = await storage.getCampaign(req.params.id);
      if (campaign && campaign.audienceRefs) {
        const audienceRefs = campaign.audienceRefs as any;
        let contacts: any[] = [];

        // Resolve contacts from segments
        if (audienceRefs.segments && Array.isArray(audienceRefs.segments)) {
          for (const segmentId of audienceRefs.segments) {
            const segment = await storage.getSegment(segmentId);
            if (segment && segment.definitionJson) {
              const segmentContacts = await storage.getContacts(segment.definitionJson as any);
              contacts.push(...segmentContacts);
            }
          }
        }

        // Resolve contacts from lists (with batching for large lists)
        if (audienceRefs.lists && Array.isArray(audienceRefs.lists)) {
          for (const listId of audienceRefs.lists) {
            const list = await storage.getList(listId);
            if (list && list.recordIds && list.recordIds.length > 0) {
              // Batch large lists to avoid SQL query limits
              const batchSize = 1000;
              for (let i = 0; i < list.recordIds.length; i += batchSize) {
                const batch = list.recordIds.slice(i, i + batchSize);
                const listContacts = await storage.getContactsByIds(batch);
                contacts.push(...listContacts);
              }
            }
          }
        }

        // Remove duplicates and filter valid contacts
        const uniqueContacts = Array.from(
          new Map(contacts.map(c => [c.id, c])).values()
        );
        const validContacts = uniqueContacts.filter(c => c.accountId);

        // DUAL QUEUE STRATEGY: Different behavior for manual vs power dial
        if (campaign.dialMode === 'manual') {
          // MANUAL DIAL: Populate agent_queue with ALL campaign contacts for each agent
          // Build all queue items for bulk insert (much faster than individual inserts)
          const queueItems: any[] = [];
          const now = new Date();
          
          for (const agentId of agentIds) {
            for (const contact of validContacts) {
              queueItems.push({
                id: sql`gen_random_uuid()`,
                agentId,
                campaignId: req.params.id,
                contactId: contact.id,
                accountId: contact.accountId!,
                queueState: 'queued',
                priority: 0,
                createdAt: now,
                updatedAt: now,
              });
            }
          }

          // Bulk insert in batches - simplified without conflict handling for now
          let totalAdded = 0;
          const insertBatchSize = 500; // Smaller batches for stability
          
          // Clear existing queue items for these agents first
          for (const agentId of agentIds) {
            await db.delete(agentQueue).where(
              and(
                eq(agentQueue.agentId, agentId),
                eq(agentQueue.campaignId, req.params.id)
              )
            );
          }
          
          for (let i = 0; i < queueItems.length; i += insertBatchSize) {
            const batch = queueItems.slice(i, i + insertBatchSize);
            try {
              const result = await db.insert(agentQueue).values(batch).returning({ id: agentQueue.id });
              totalAdded += result.length;
              console.log(`[Manual Queue] Batch ${Math.floor(i / insertBatchSize) + 1}: ${result.length} items inserted`);
            } catch (error) {
              console.error(`Error inserting batch ${Math.floor(i / insertBatchSize) + 1}:`, error);
            }
          }

          res.status(201).json({
            message: "Agents assigned to manual dial campaign. All campaign contacts added to each agent's queue.",
            agentsAssigned: agentIds.length,
            contactsPerAgent: validContacts.length,
            totalQueueItemsCreated: totalAdded,
            mode: 'manual'
          });
        } else {
          // POWER DIAL: Populate campaign_queue and assign to agents via round-robin
          let enqueuedCount = 0;
          for (const contact of validContacts) {
            try {
              await storage.enqueueContact(
                req.params.id,
                contact.id,
                contact.accountId!,
                0
              );
              enqueuedCount++;
            } catch (error) {
              // Skip contacts that can't be enqueued (e.g., already in queue)
            }
          }

          // Assign queue items to the newly assigned agents
          const assignResult = await storage.assignQueueToAgents(req.params.id, agentIds, 'round_robin');

          res.status(201).json({
            message: "Agents assigned to power dial campaign and queue populated successfully",
            queueItemsAssigned: assignResult.assigned,
            contactsEnqueued: enqueuedCount,
            totalContactsProcessed: validContacts.length,
            mode: 'power'
          });
        }
      } else {
        // No audience defined, just assign agents
        const assignResult = await storage.assignQueueToAgents(req.params.id, agentIds, 'round_robin');
        res.status(201).json({
          message: "Agents assigned successfully",
          queueItemsAssigned: assignResult.assigned,
          note: "Campaign has no audience defined. Please configure audience first."
        });
      }
    } catch (error) {
      console.error('Agent assignment error:', error);
      res.status(400).json({
        message: error instanceof Error ? error.message : "Failed to assign agents"
      });
    }
  });

  // Get agents assigned to a campaign
  app.get("/api/campaigns/:id/agents", requireAuth, async (req, res) => {
    try {
      console.log(`[GET CAMPAIGN AGENTS] Fetching agents for campaign ${req.params.id}`);
      const agents = await storage.getCampaignAgents(req.params.id);
      console.log(`[GET CAMPAIGN AGENTS] Returning ${agents.length} agents:`, agents.map(a => ({
        id: a.agentId,
        name: a.agent?.firstName + ' ' + a.agent?.lastName
      })));
      res.json(agents);
    } catch (error) {
      console.error('[GET CAMPAIGN AGENTS] Error:', error);
      res.status(500).json({ message: "Failed to fetch campaign agents" });
    }
  });

  // Release an agent from a campaign
  app.delete("/api/campaigns/:id/agents/:agentId", requireAuth, requireRole('admin', 'campaign_manager'), async (req, res) => {
    try {
      await storage.releaseAgentAssignment(req.params.id, req.params.agentId);
      res.json({ message: "Agent released successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to release agent" });
    }
  });

  // ==================== CAMPAIGN QUEUE (ACCOUNT LEAD CAP) ====================

  app.get("/api/campaigns/:id/queue", requireAuth, async (req, res) => {
    try {
      const { status } = req.query;
      const queue = await storage.getCampaignQueue(
        req.params.id,
        status as string | undefined
      );
      res.json(queue);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch campaign queue" });
    }
  });

  app.post("/api/campaigns/:id/queue/enqueue", requireAuth, requireRole('admin', 'campaign_manager'), async (req, res) => {
    try {
      const { contactId, accountId, priority = 0 } = req.body;

      if (!contactId || !accountId) {
        return res.status(400).json({ message: "contactId and accountId required" });
      }

      const queueItem = await storage.enqueueContact(
        req.params.id,
        contactId,
        accountId,
        priority
      );
      res.status(201).json(queueItem);
    } catch (error) {
      res.status(500).json({ message: "Failed to enqueue contact" });
    }
  });

  // Populate queue from campaign audience (segments/lists)
  app.post("/api/campaigns/:id/queue/populate", requireAuth, requireRole('admin', 'campaign_manager', 'agent'), async (req, res) => {
    try {
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      // Get audience refs from campaign
      const audienceRefs = campaign.audienceRefs as any;
      if (!audienceRefs) {
        return res.status(400).json({ message: "Campaign has no audience defined" });
      }

      let contacts: any[] = [];

      // Resolve contacts from segments
      if (audienceRefs.segments && Array.isArray(audienceRefs.segments)) {
        for (const segmentId of audienceRefs.segments) {
          const segment = await storage.getSegment(segmentId);
          if (segment && segment.definitionJson) {
            const segmentContacts = await storage.getContacts(segment.definitionJson as any);
            contacts.push(...segmentContacts);
          }
        }
      }

      // Resolve contacts from lists
      if (audienceRefs.lists && Array.isArray(audienceRefs.lists)) {
        for (const listId of audienceRefs.lists) {
          const list = await storage.getList(listId);
          if (list && list.recordIds) {
            const listContacts = await storage.getContactsByIds(list.recordIds);
            contacts.push(...listContacts);
          }
        }
      }

      // Remove duplicates
      const uniqueContacts = Array.from(
        new Map(contacts.map(c => [c.id, c])).values()
      );

      if (uniqueContacts.length === 0) {
        return res.status(400).json({ message: "No contacts found in campaign audience" });
      }

      // Filter out contacts without accountId
      const validContacts = uniqueContacts.filter(c => c.accountId);
      const skippedCount = uniqueContacts.length - validContacts.length;

      if (validContacts.length === 0) {
        return res.status(400).json({
          message: "No contacts with account IDs found. All contacts must be associated with an account."
        });
      }

      // Enqueue all valid contacts
      const enqueued = [];
      let alreadyQueued = 0;
      for (const contact of validContacts) {
        try {
          const queueItem = await storage.enqueueContact(
            req.params.id,
            contact.id,
            contact.accountId!,
            0 // default priority
          );
          enqueued.push(queueItem);
        } catch (error) {
          // Count contacts already in queue
          alreadyQueued++;
        }
      }

      // Get agents assigned to this campaign
      const campaignAgents = await storage.getCampaignAgents(req.params.id);
      const agentIds = campaignAgents.map(a => a.agentId);

      // Automatically assign queue items to agents if agents are assigned
      let assignResult = { assigned: 0 };
      if (agentIds.length > 0 && enqueued.length > 0) {
        assignResult = await storage.assignQueueToAgents(req.params.id, agentIds, 'round_robin');
      }

      res.json({
        message: `Successfully enqueued ${enqueued.length} contacts${skippedCount > 0 ? ` (${skippedCount} skipped without account)` : ''}${alreadyQueued > 0 ? ` (${alreadyQueued} already in queue)` : ''}`,
        enqueuedCount: enqueued.length,
        totalContacts: uniqueContacts.length,
        skippedCount,
        alreadyQueued,
        queueItemsAssigned: assignResult.assigned,
      });
    } catch (error) {
      console.error('Queue population error:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to populate queue"
      });
    }
  });

  app.patch("/api/campaigns/queue/:queueId/status", requireAuth, requireRole('admin', 'campaign_manager'), async (req, res) => {
    try {
      const { status, removedReason, isPositiveDisposition } = req.body;

      if (!status) {
        return res.status(400).json({ message: "status required" });
      }

      const updated = await storage.updateQueueStatus(
        req.params.queueId,
        status,
        removedReason,
        isPositiveDisposition
      );

      if (!updated) {
        return res.status(404).json({ message: "Queue item not found or status already changed" });
      }

      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update queue status" });
    }
  });

  app.delete("/api/campaigns/:id/queue/:queueId", requireAuth, requireRole('admin', 'campaign_manager'), async (req, res) => {
    try {
      const { reason = "Manual removal" } = req.body;

      await storage.removeFromQueueById(req.params.id, req.params.queueId, reason);
      res.status(204).send();
    } catch (error: any) {
      if (error?.message?.includes("not found") || error?.message?.includes("does not belong")) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to remove from queue" });
    }
  });

  // ==================== DUAL-DIALER (MANUAL & POWER) ====================

  // Set campaign dial mode
  app.post("/api/campaigns/:id/dial-mode", requireAuth, requireRole('admin', 'campaign_manager'), async (req, res) => {
    try {
      const { dialMode } = req.body;
      
      if (!['manual', 'power'].includes(dialMode)) {
        return res.status(400).json({ message: "Invalid dial mode. Must be 'manual' or 'power'" });
      }

      const campaign = await storage.updateCampaign(req.params.id, { dialMode });
      
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      res.json(campaign);
    } catch (error) {
      res.status(500).json({ message: "Failed to update dial mode" });
    }
  });

  // Add contacts to manual queue (with filters)
  app.post("/api/campaigns/:id/manual/queue/add", requireAuth, requireRole('admin', 'campaign_manager', 'agent'), async (req, res) => {
    try {
      const { agentId, filters, contactIds, limit = 100 } = req.body;

      if (!agentId) {
        return res.status(400).json({ message: "agentId is required" });
      }

      // Use ManualQueueService
      const { ManualQueueService } = await import('./services/manual-queue');
      const manualQueueService = new ManualQueueService();

      let actualFilters: any;
      
      if (contactIds && Array.isArray(contactIds) && contactIds.length > 0) {
        // Convert contact IDs to a filter
        actualFilters = {
          contactIds,
          industries: [],
          regions: [],
          accountTypes: []
        };
      } else if (filters) {
        // Use provided filters directly
        actualFilters = filters;
      } else {
        return res.status(400).json({ message: "Either contactIds or filters must be provided" });
      }

      const result = await manualQueueService.addContactsToAgentQueue(
        agentId,
        req.params.id,
        actualFilters,
        limit
      );

      console.log('[Manual Queue API] Result to send:', JSON.stringify(result));
      res.json(result);
    } catch (error) {
      console.error('Manual queue add error:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to add to manual queue" });
    }
  });

  // Configure power dial settings (AMD + voicemail)
  app.post("/api/campaigns/:id/power/settings", requireAuth, requireRole('admin', 'campaign_manager'), async (req, res) => {
    try {
      const powerSettings = req.body;

      const campaign = await storage.updateCampaign(req.params.id, {
        powerSettings: powerSettings
      } as any);

      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      res.json(campaign);
    } catch (error) {
      res.status(500).json({ message: "Failed to update power settings" });
    }
  });

  // Get manual queue for agent
  app.get("/api/campaigns/:id/manual/queue/:agentId", requireAuth, async (req, res) => {
    try {
      const { ManualQueueService } = await import('./services/manual-queue');
      const manualQueueService = new ManualQueueService();

      const queue = await manualQueueService.getAgentQueue(req.params.id, req.params.agentId);
      res.json(queue);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch manual queue" });
    }
  });

  // Pull next contact from manual queue
  app.post("/api/campaigns/:id/manual/queue/pull", requireAuth, requireRole('agent', 'admin', 'campaign_manager'), async (req, res) => {
    try {
      const { agentId } = req.body;

      if (!agentId) {
        return res.status(400).json({ message: "agentId is required" });
      }

      const { ManualQueueService } = await import('./services/manual-queue');
      const manualQueueService = new ManualQueueService();

      const contact = await manualQueueService.pullNextContact(req.params.id, agentId);
      
      if (!contact) {
        return res.status(404).json({ message: "No contacts available in queue" });
      }

      res.json(contact);
    } catch (error) {
      console.error('Manual queue pull error:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to pull contact from queue" });
    }
  });

  // Process AMD webhook from Telnyx
  app.post("/api/telephony/events/amd", requireAuth, async (req, res) => {
    try {
      const { callAttemptId, result, confidence } = req.body;

      if (!callAttemptId || !result) {
        return res.status(400).json({ message: "callAttemptId and result are required" });
      }

      const { powerDialerEngine } = await import('./services/auto-dialer');

      await powerDialerEngine.processAMDResult(callAttemptId, {
        result,
        confidence: confidence || 0.0
      });

      res.json({ message: "AMD result processed successfully" });
    } catch (error) {
      console.error('AMD processing error:', error);
      res.status(500).json({ message: "Failed to process AMD result" });
    }
  });

  // Get pacing metrics for campaign
  app.get("/api/campaigns/:id/pacing-metrics", requireAuth, async (req, res) => {
    try {
      const { powerDialerEngine } = await import('./services/auto-dialer');
      
      const metrics = powerDialerEngine.getPacingMetrics(req.params.id);
      
      if (!metrics) {
        return res.json({
          callsInitiated: 0,
          callsAnswered: 0,
          callsAbandoned: 0,
          abandonRate: 0,
          targetAbandonRate: 0.03,
          currentDialRatio: 1.0
        });
      }

      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pacing metrics" });
    }
  });

  app.get("/api/campaigns/:id/account-stats", requireAuth, async (req, res) => {
    try {
      const { accountId } = req.query;
      const stats = await storage.getCampaignAccountStats(
        req.params.id,
        accountId as string | undefined
      );
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch account stats" });
    }
  });

  app.post("/api/campaigns/:id/enforce-cap", requireAuth, requireRole('admin', 'campaign_manager'), async (req, res) => {
    try {
      const result = await storage.enforceAccountCap(req.params.id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to enforce account cap" });
    }
  });

  // ==================== AGENT ASSIGNMENT & QUEUE ====================

  // Get all agents
  app.get("/api/agents", requireAuth, async (req, res) => {
    try {
      const agents = await storage.getAgents();
      res.json(agents);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch agents" });
    }
  });

  // Assign or re-assign queue items to agents
  app.post("/api/campaigns/:id/queue/assign", requireAuth, requireRole('admin', 'campaign_manager'), async (req, res) => {
    try {
      const { agentIds, mode = 'round_robin', reassignAll = false } = req.body;

      if (!agentIds || !Array.isArray(agentIds) || agentIds.length === 0) {
        return res.status(400).json({ message: "agentIds array is required" });
      }

      // If reassignAll is true, first clear all agent assignments for this campaign
      if (reassignAll) {
        await db
          .update(campaignQueue)
          .set({ agentId: null, updatedAt: new Date() })
          .where(
            and(
              eq(campaignQueue.campaignId, req.params.id),
              eq(campaignQueue.status, 'queued')
            )
          );
      }

      const result = await storage.assignQueueToAgents(req.params.id, agentIds, mode);
      res.json({
        ...result,
        message: reassignAll
          ? `Re-assigned all queue items to ${agentIds.length} agent(s)`
          : `Assigned unassigned queue items to ${agentIds.length} agent(s)`
      });
    } catch (error) {
      console.error('Queue assignment error:', error);
      res.status(500).json({ message: "Failed to assign queue to agents" });
    }
  });

  // Get queue for logged-in agent (mode-aware: campaign_queue for power, agent_queue for manual)
  app.get("/api/agents/me/queue", requireAuth, requireRole('agent'), async (req, res) => {
    try {
      const agentId = req.user?.userId;
      if (!agentId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { campaignId, status } = req.query;
      
      console.log(`[AGENT QUEUE] Fetching queue for agent ${agentId}, campaign: ${campaignId}, status: ${status}`);
      
      // If campaignId is specified, check dial mode to determine which queue to use
      if (campaignId) {
        const campaign = await storage.getCampaign(campaignId as string);
        
        if (!campaign) {
          return res.status(404).json({ message: "Campaign not found" });
        }

        console.log(`[AGENT QUEUE] Campaign ${campaignId} dial mode: ${campaign.dialMode}`);
        
        if (campaign?.dialMode === 'manual') {
          // Manual dial: query agent_queue (manual pull queue)
          const manualQueue = await db
            .select({
              id: agentQueue.id,
              campaignId: agentQueue.campaignId,
              campaignName: campaigns.name,
              contactId: agentQueue.contactId,
              contactName: sql<string>`COALESCE(${contacts.fullName}, CONCAT(${contacts.firstName}, ' ', ${contacts.lastName}))`.as('contactName'),
              contactEmail: contacts.email,
              contactPhone: contacts.directPhone,
              accountId: agentQueue.accountId,
              accountName: accounts.name,
              priority: agentQueue.priority,
              status: agentQueue.queueState,
              createdAt: agentQueue.createdAt,
              updatedAt: agentQueue.updatedAt,
            })
            .from(agentQueue)
            .leftJoin(contacts, eq(agentQueue.contactId, contacts.id))
            .leftJoin(accounts, eq(agentQueue.accountId, accounts.id))
            .leftJoin(campaigns, eq(agentQueue.campaignId, campaigns.id))
            .where(
              and(
                eq(agentQueue.agentId, agentId),
                eq(agentQueue.campaignId, campaignId as string),
                status ? eq(agentQueue.queueState, status as any) : eq(agentQueue.queueState, 'queued')
              )
            )
            .orderBy(desc(agentQueue.priority), agentQueue.createdAt);
          
          console.log(`[AGENT QUEUE] Manual queue returned ${manualQueue.length} items`);
          return res.json(manualQueue);
        } else if (campaign?.dialMode === 'power') {
          // Power dial: query campaign_queue (auto-assigned queue)
          const powerQueue = await db
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
            .where(
              and(
                eq(campaignQueue.agentId, agentId),
                eq(campaignQueue.campaignId, campaignId as string),
                status ? eq(campaignQueue.status, status as any) : eq(campaignQueue.status, 'queued')
              )
            )
            .orderBy(desc(campaignQueue.priority), campaignQueue.createdAt);
          
          console.log(`[AGENT QUEUE] Power queue returned ${powerQueue.length} items`);
          return res.json(powerQueue);
        }
      }
      
      // Fallback: no campaign specified, return empty array
      console.log(`[AGENT QUEUE] No campaign specified, returning empty array`);
      res.json([]);
    } catch (error) {
      console.error('Agent queue fetch error:', error);
      res.status(500).json({ message: "Failed to fetch agent queue" });
    }
  });

  // ==================== CALL DISPOSITIONS ====================

  // Create call disposition (agent saves disposition after call)
  app.post("/api/calls/disposition", requireAuth, async (req, res) => {
    try {
      const agentId = req.user?.userId;
      if (!agentId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      console.log('[DISPOSITION] Received disposition request:', {
        disposition: req.body.disposition,
        contactId: req.body.contactId,
        campaignId: req.body.campaignId,
        queueItemId: req.body.queueItemId
      });

      // Check if user is admin
      const userRoles = req.user?.roles || [req.user?.role];
      const isAdmin = userRoles.includes('admin');

      // STRICT: Verify queue item ownership before allowing disposition (unless admin)
      if (req.body.queueItemId) {
        const queueItem = await storage.getQueueItemById(req.body.queueItemId);
        if (!queueItem) {
          return res.status(404).json({ message: "Queue item not found" });
        }

        // STRICT: Only allow disposition if the queue item is assigned to this agent (or admin)
        if (!isAdmin && queueItem.agentId !== agentId) {
          return res.status(403).json({ message: "You can only create dispositions for queue items assigned to you" });
        }
      }

      const validated = insertCallSchema.parse({
        ...req.body,
        agentId, // Ensure agentId matches the logged-in user
      });

      const call = await storage.createCallDisposition(validated);
      
      // SHARED QUEUE: Remove contact from ALL agents' queues after disposition
      if (req.body.contactId && req.body.campaignId) {
        try {
          console.log(`[DISPOSITION] Removing contact ${req.body.contactId} from ALL agents' queues in campaign ${req.body.campaignId}`);
          
          // Remove from ALL agents' queues (contact is now "claimed" by the agent who disposed it)
          const removed = await db.delete(agentQueue)
            .where(
              and(
                eq(agentQueue.contactId, req.body.contactId),
                eq(agentQueue.campaignId, req.body.campaignId)
              )
            )
            .returning({ agentId: agentQueue.agentId, queueState: agentQueue.queueState });
          
          if (removed.length > 0) {
            console.log(`[DISPOSITION] Removed contact from ${removed.length} agents' queues:`, removed.map(r => `${r.agentId} (${r.queueState})`));
          }
        } catch (error) {
          console.error('[DISPOSITION] Error removing contact from queues:', error);
          // Don't fail the disposition if this fails
        }
      }
      
      res.status(201).json(call);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error('[DISPOSITION ERROR]', error);
      console.error('[DISPOSITION ERROR] Stack:', error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({ message: "Failed to create call disposition", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Get calls for a specific queue item
  app.get("/api/calls/queue/:queueItemId", requireAuth, async (req, res) => {
    try {
      const agentId = req.user?.userId;
      if (!agentId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Check if user is admin
      const userRoles = req.user?.roles || [req.user?.role];
      const isAdmin = userRoles.includes('admin');

      // STRICT: Verify queue item ownership (unless admin)
      const queueItem = await storage.getQueueItemById(req.params.queueItemId);
      if (!queueItem) {
        return res.status(404).json({ message: "Queue item not found" });
      }

      if (!isAdmin && queueItem.agentId !== agentId) {
        return res.status(403).json({ message: "You can only view calls for queue items assigned to you" });
      }

      const calls = await storage.getCallsByQueueItem(req.params.queueItemId);
      res.json(calls);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch calls" });
    }
  });

  // Get call history for a contact
  app.get("/api/calls/contact/:contactId", requireAuth, async (req, res) => {
    try {
      const calls = await storage.getCallsByContact(req.params.contactId);
      res.json(calls);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch call history" });
    }
  });

  // ==================== SIP TRUNK CONFIGURATION ====================

  // Get all SIP trunk configurations
  app.get("/api/sip-trunks", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const configs = await storage.getSipTrunkConfigs();
      res.json(configs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch SIP trunk configurations" });
    }
  });

  // Get default SIP trunk config (for agents)
  app.get("/api/sip-trunks/default", requireAuth, async (req, res) => {
    try {
      const config = await storage.getDefaultSipTrunkConfig();
      if (!config) {
        // If no default is set, try to get any active trunk
        const allConfigs = await storage.getSipTrunkConfigs();
        const activeConfig = allConfigs.find(c => c.isActive);

        if (!activeConfig) {
          return res.status(404).json({ message: "No default SIP trunk configured" });
        }

        // Use the first active trunk as fallback
        const secureConfig = {
          ...activeConfig,
          sipUsername: process.env.TELNYX_SIP_USERNAME || activeConfig.sipUsername,
          sipPassword: process.env.TELNYX_SIP_PASSWORD || activeConfig.sipPassword,
        };

        return res.json(secureConfig);
      }

      // Override credentials with secure environment variables
      const secureConfig = {
        ...config,
        sipUsername: process.env.TELNYX_SIP_USERNAME || config.sipUsername,
        sipPassword: process.env.TELNYX_SIP_PASSWORD || config.sipPassword,
      };

      res.json(secureConfig);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch default SIP trunk" });
    }
  });

  // Get specific SIP trunk config
  app.get("/api/sip-trunks/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const config = await storage.getSipTrunkConfig(req.params.id);
      if (!config) {
        return res.status(404).json({ message: "SIP trunk configuration not found" });
      }
      res.json(config);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch SIP trunk configuration" });
    }
  });

  // Create SIP trunk config
  app.post("/api/sip-trunks", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const validated = insertSipTrunkConfigSchema.parse(req.body);
      const config = await storage.createSipTrunkConfig({
        ...validated,
        createdById: req.user?.userId,
      });
      res.status(201).json(config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create SIP trunk configuration" });
    }
  });

  // Update SIP trunk config
  app.patch("/api/sip-trunks/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const config = await storage.updateSipTrunkConfig(req.params.id, req.body);
      if (!config) {
        return res.status(404).json({ message: "SIP trunk configuration not found" });
      }
      res.json(config);
    } catch (error) {
      res.status(500).json({ message: "Failed to update SIP trunk configuration" });
    }
  });

  // Delete SIP trunk config
  app.delete("/api/sip-trunks/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      await storage.deleteSipTrunkConfig(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete SIP trunk configuration" });
    }
  });

  // Set default SIP trunk
  app.post("/api/sip-trunks/:id/set-default", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      await storage.setDefaultSipTrunk(req.params.id);
      res.json({ message: "Default SIP trunk updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to set default SIP trunk" });
    }
  });

  // ==================== AGENT STATUS (AUTO-DIALER) ====================

  // Get agent status for a specific agent or current user
  app.get("/api/agent-status/:agentId?", requireAuth, async (req, res) => {
    try {
      const agentId = req.params.agentId || req.user?.userId;
      if (!agentId) {
        return res.status(400).json({ message: "Agent ID required" });
      }
      const status = await storage.getAgentStatus(agentId);
      if (!status) {
        return res.status(404).json({ message: "Agent status not found" });
      }
      res.json(status);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch agent status" });
    }
  });

  // Get all agent statuses (optionally filtered by campaign)
  app.get("/api/agent-statuses", requireAuth, requireRole('admin', 'campaign_manager'), async (req, res) => {
    try {
      const campaignId = req.query.campaignId as string | undefined;
      const statuses = await storage.getAllAgentStatuses(campaignId);
      res.json(statuses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch agent statuses" });
    }
  });

  // Get available agents (optionally filtered by campaign)
  app.get("/api/agent-statuses/available", requireAuth, requireRole('admin', 'campaign_manager'), async (req, res) => {
    try {
      const campaignId = req.query.campaignId as string | undefined;
      const agents = await storage.getAvailableAgents(campaignId);
      res.json(agents);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch available agents" });
    }
  });

  // Update agent status (for the current user or specified agent)
  app.patch("/api/agent-status/:agentId?", requireAuth, async (req, res) => {
    try {
      const agentId = req.params.agentId || req.user?.userId;
      if (!agentId) {
        return res.status(400).json({ message: "Agent ID required" });
      }

      // Agents can only update their own status unless they're admin
      const userRoles = req.user?.roles || [];
      if (agentId !== req.user?.userId && !userRoles.includes('admin')) {
        return res.status(403).json({ message: "Not authorized to update other agent statuses" });
      }

      const validated = insertAgentStatusSchema.partial().parse(req.body);
      const status = await storage.updateAgentStatus(agentId, validated);
      if (!status) {
        // If status doesn't exist, create it
        const newStatus = await storage.upsertAgentStatus({
          agentId,
          ...validated,
        } as any);
        return res.status(201).json(newStatus);
      }
      res.json(status);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update agent status" });
    }
  });

  // Upsert agent status (create or update)
  app.post("/api/agent-status", requireAuth, async (req, res) => {
    try {
      const agentId = req.user?.userId;
      if (!agentId) {
        return res.status(400).json({ message: "Agent ID required" });
      }

      const validated = insertAgentStatusSchema.parse({
        ...req.body,
        agentId,
      });
      const status = await storage.upsertAgentStatus(validated);
      res.status(201).json(status);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to upsert agent status" });
    }
  });

  // ==================== AUTO-DIALER QUEUE ====================

  // Get auto-dialer queue for a campaign
  app.get("/api/auto-dialer-queue/:campaignId", requireAuth, requireRole('admin', 'campaign_manager'), async (req, res) => {
    try {
      const queue = await storage.getAutoDialerQueue(req.params.campaignId);
      if (!queue) {
        return res.status(404).json({ message: "Auto-dialer queue not found" });
      }
      res.json(queue);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch auto-dialer queue" });
    }
  });

  // Get all auto-dialer queues
  app.get("/api/auto-dialer-queues", requireAuth, requireRole('admin', 'campaign_manager'), async (req, res) => {
    try {
      const activeOnly = req.query.activeOnly === 'true';
      const queues = await storage.getAllAutoDialerQueues(activeOnly);
      res.json(queues);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch auto-dialer queues" });
    }
  });

  // Get all agent statuses
  app.get("/api/agent-statuses", requireAuth, requireRole('admin', 'campaign_manager', 'agent'), async (req, res) => {
    try {
      const { agentStatus } = await import('@shared/schema');
      const statuses = await db.select().from(agentStatus);
      res.json(statuses);
    } catch (error) {
      console.error('Failed to fetch agent statuses:', error);
      res.status(500).json({ message: "Failed to fetch agent statuses" });
    }
  });

  // Create auto-dialer queue
  app.post("/api/auto-dialer-queue", requireAuth, requireRole('admin', 'campaign_manager'), async (req, res) => {
    try {
      const validated = insertAutoDialerQueueSchema.parse(req.body);
      const queue = await storage.createAutoDialerQueue(validated);
      res.status(201).json(queue);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create auto-dialer queue" });
    }
  });

  // Update auto-dialer queue
  app.patch("/api/auto-dialer-queue/:campaignId", requireAuth, requireRole('admin', 'campaign_manager'), async (req, res) => {
    try {
      const queue = await storage.updateAutoDialerQueue(req.params.campaignId, req.body);
      if (!queue) {
        return res.status(404).json({ message: "Auto-dialer queue not found" });
      }
      res.json(queue);
    } catch (error) {
      res.status(500).json({ message: "Failed to update auto-dialer queue" });
    }
  });

  // Toggle auto-dialer queue (start/stop)
  app.post("/api/auto-dialer-queue/:campaignId/toggle", requireAuth, requireRole('admin', 'campaign_manager'), async (req, res) => {
    try {
      const { isActive } = req.body;
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ message: "isActive must be a boolean" });
      }
      const queue = await storage.toggleAutoDialerQueue(req.params.campaignId, isActive);
      if (!queue) {
        return res.status(404).json({ message: "Auto-dialer queue not found" });
      }
      res.json(queue);
    } catch (error) {
      res.status(500).json({ message: "Failed to toggle auto-dialer queue" });
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
      let filters = undefined;
      if (req.query.filters) {
        try {
          filters = JSON.parse(req.query.filters as string);
        } catch (e) {
          return res.status(400).json({ message: "Invalid filters format" });
        }
      }
      const leads = await storage.getLeads(filters);
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

      const activeCampaigns = campaigns.filter(c => c.status === 'active');
      const emailCampaigns = activeCampaigns.filter(c => c.type === 'email').length;
      const callCampaigns = activeCampaigns.filter(c => c.type === 'call').length;

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
      console.error("Dashboard stats error:", error);
      res.status(500).json({
        message: "Failed to fetch dashboard stats",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ==================== SAVED FILTERS ====================

  app.get("/api/saved-filters", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const entityType = req.query.entityType as string | undefined;
      const filters = await storage.getSavedFilters(userId, entityType);
      res.json(filters);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch saved filters" });
    }
  });

  app.post("/api/saved-filters", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.userId;
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
      const userId = req.user!.userId;
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
      const userId = req.user!.userId;
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

  // Get filter fields by entity type (contact or account)
  app.get("/api/filters/fields/entity/:entity", async (req, res) => {
    try {
      const entity = req.params.entity;
      const includeRelated = req.query.includeRelated === 'true';

      if (!['contact', 'account'].includes(entity)) {
        return res.status(400).json({ message: "Invalid entity type. Must be 'contact' or 'account'" });
      }

      let fields = await storage.getFilterFieldsByEntity(entity);

      // If includeRelated is true and entity is contact, also include account fields
      if (includeRelated && entity === 'contact') {
        const accountFields = await storage.getFilterFieldsByEntity('account');
        fields = [...fields, ...accountFields];
      }

      // Map fields to the expected format with operators array parsed
      const mappedFields = fields.map(field => ({
        key: field.key,
        label: field.label,
        type: field.type,
        operators: Array.isArray(field.operators) ? field.operators : [],
        category: field.category
      }));

      // Group by category for easier UI consumption (same format as /api/filters/fields)
      const grouped = mappedFields.reduce((acc: any, field) => {
        if (!acc[field.category]) {
          acc[field.category] = [];
        }
        acc[field.category].push(field);
        return acc;
      }, {});

      res.json({
        fields: mappedFields,
        grouped,
        categories: Object.keys(grouped)
      });
    } catch (error) {
      console.error('Error fetching filter fields:', error);
      res.status(500).json({ message: "Failed to fetch filter fields for entity" });
    }
  });

  // Get count of records matching filter criteria
  app.post("/api/filters/count/:entity", async (req, res) => {
    try {
      const entity = req.params.entity;
      const { filterGroup } = req.body;

      if (!['contact', 'account'].includes(entity)) {
        return res.status(400).json({ message: "Invalid entity type. Must be 'contact' or 'account'" });
      }

      let count = 0;
      if (entity === 'contact') {
        const contacts = await storage.getContacts(filterGroup);
        count = contacts.length;
      } else if (entity === 'account') {
        const accounts = await storage.getAccounts(filterGroup);
        count = accounts.length;
      }

      res.json({ count });
    } catch (error) {
      console.error('Error getting filter count:', error);
      res.status(500).json({ message: "Failed to get filter count" });
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
      const userId = req.user!.userId;

      // Opportunistic cleanup of expired contexts
      await storage.deleteExpiredSelectionContexts().catch(() => { });

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
      const userId = req.user!.userId;

      // Opportunistic cleanup of expired contexts
      await storage.deleteExpiredSelectionContexts().catch(() => { });

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
      const userId = req.user!.userId;
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
      const userId = req.user!.userId;
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
      const userId = req.user!.userId;
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
      const userId = req.user!.userId;
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
      const userId = req.user!.userId;
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
      const userId = req.user!.userId;
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
      const userId = req.user!.userId;
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
      const userId = req.user!.userId;
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
      const userId = req.user!.userId;
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

  // ==================== TELNYX WEBHOOKS ====================
  // Telnyx webhook endpoint for call events (used for Telephony Credential configuration)
  app.post("/api/telnyx/webhook", async (req, res) => {
    try {
      console.log("Telnyx webhook received:", JSON.stringify(req.body, null, 2));

      // Acknowledge receipt immediately
      res.status(200).json({ received: true });

      // Process webhook event types
      const eventType = req.body?.data?.event_type;

      if (eventType) {
        console.log(`Telnyx event type: ${eventType}`);

        // Handle specific event types as needed
        switch (eventType) {
          case 'call.initiated':
          case 'call.answered':
          case 'call.hangup':
            console.log(`Call event: ${eventType}`, req.body?.data);
            break;
          default:
            console.log(`Unhandled Telnyx event: ${eventType}`);
        }
      }
    } catch (error: any) {
      console.error("Telnyx webhook error:", error.message);
      res.status(500).json({ error: "Webhook processing failed" });
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
      const userId = (req.user as any).userId;

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

  // ==================== ANALYTICS ====================

  app.get("/api/analytics/engagement", requireAuth, async (req, res) => {
    try {
      const { from, to, campaign } = req.query;

      // This is a comprehensive analytics aggregation
      // You'll want to optimize this with materialized views in production

      const analytics = {
        email: {
          total: 0,
          sent: 0,
          delivered: 0,
          opened: 0,
          clicked: 0,
          bounced: 0,
        },
        calls: {
          total: 0,
          attempted: 0,
          connected: 0,
          qualified: 0,
          avgDuration: 0,
        },
        leads: {
          total: 0,
          qualified: 0,
          approved: 0,
          pending: 0,
          rejected: 0,
        },
        timeline: [],
        channelBreakdown: [
          { name: 'Email', value: 0 },
          { name: 'Phone', value: 0 },
          { name: 'Other', value: 0 },
        ],
        dispositions: [],
        campaignLeads: {},
      };

      // Aggregate email stats
      const emailCampaigns = await storage.getCampaigns();
      analytics.email.total = emailCampaigns.filter(c => c.type === 'email').length;

      // Aggregate call stats
      const callCampaigns = emailCampaigns.filter(c => c.type === 'call');
      analytics.calls.total = callCampaigns.length;

      // Aggregate leads
      const allLeads = await storage.getLeads();
      analytics.leads.total = allLeads.length;
      analytics.leads.approved = allLeads.filter(l => l.qaStatus === 'approved').length;
      analytics.leads.pending = allLeads.filter(l => l.qaStatus === 'new' || l.qaStatus === 'under_review').length;
      analytics.leads.rejected = allLeads.filter(l => l.qaStatus === 'rejected').length;

      // Channel breakdown
      analytics.channelBreakdown = [
        { name: 'Email', value: emailCampaigns.filter(c => c.type === 'email').length },
        { name: 'Phone', value: callCampaigns.length },
      ];

      // Campaign leads mapping
      for (const campaign of emailCampaigns) {
        const campaignLeads = allLeads.filter(l => l.campaignId === campaign.id);
        analytics.campaignLeads[campaign.id] = campaignLeads.length;
      }

      res.json(analytics);
    } catch (error) {
      console.error('Analytics error:', error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // ==================== AI-POWERED QA SYSTEM ====================

  // Trigger transcription for a lead (async - returns immediately)
  app.post("/api/leads/:id/transcribe", requireAuth, async (req, res) => {
    try {
      const { transcribeLeadCall } = await import('./services/assemblyai-transcription');
      const { leads } = await import('@shared/schema');
      
      // Update status to pending
      await db.update(leads)
        .set({ transcriptionStatus: 'pending' })
        .where(eq(leads.id, req.params.id));
      
      // Start transcription in background (don't wait)
      transcribeLeadCall(req.params.id).catch(err => {
        console.error('Background transcription error:', err);
      });
      
      // Return immediately
      res.status(202).json({ message: "Transcription started - check status later" });
    } catch (error) {
      console.error('Transcription error:', error);
      res.status(500).json({ message: "Failed to start transcription" });
    }
  });

  // Analyze lead with AI
  app.post("/api/leads/:id/analyze", requireAuth, async (req, res) => {
    try {
      const { analyzeLeadQualification } = await import('./services/ai-qa-analyzer');
      const analysis = await analyzeLeadQualification(req.params.id);
      
      if (analysis) {
        res.json(analysis);
      } else {
        res.status(400).json({ message: "Analysis failed - check transcript availability" });
      }
    } catch (error) {
      console.error('AI analysis error:', error);
      res.status(500).json({ message: "Failed to analyze lead" });
    }
  });

  // Enrich account data with AI
  app.post("/api/accounts/:id/enrich", requireAuth, async (req, res) => {
    try {
      const { enrichAccountData } = await import('./services/ai-account-enrichment');
      const enrichmentResult = await enrichAccountData(req.params.id);
      
      if (enrichmentResult) {
        res.json(enrichmentResult);
      } else {
        res.status(400).json({ message: "Enrichment failed" });
      }
    } catch (error) {
      console.error('Account enrichment error:', error);
      res.status(500).json({ message: "Failed to enrich account" });
    }
  });

  // Verify account against client criteria
  app.post("/api/accounts/:id/verify", requireAuth, async (req, res) => {
    try {
      const { verifyAccountAgainstCriteria } = await import('./services/ai-account-enrichment');
      const { client_criteria } = req.body;
      
      const verification = await verifyAccountAgainstCriteria(req.params.id, client_criteria);
      res.json(verification);
    } catch (error) {
      console.error('Account verification error:', error);
      res.status(500).json({ message: "Failed to verify account" });
    }
  });

  // Batch enrich accounts for a campaign
  app.post("/api/campaigns/:id/enrich-accounts", requireAuth, async (req, res) => {
    try {
      const { enrichCampaignAccounts } = await import('./services/ai-account-enrichment');
      
      // Start enrichment in background (don't wait)
      enrichCampaignAccounts(req.params.id).catch(err => {
        console.error('Background enrichment error:', err);
      });
      
      res.json({ message: "Account enrichment started in background" });
    } catch (error) {
      console.error('Campaign enrichment error:', error);
      res.status(500).json({ message: "Failed to start account enrichment" });
    }
  });

  // Update campaign QA parameters
  app.patch("/api/campaigns/:id/qa-parameters", requireAuth, async (req, res) => {
    try {
      const { qaParameters, clientSubmissionConfig } = req.body;
      
      await storage.updateCampaign(req.params.id, {
        qaParameters,
        clientSubmissionConfig,
      });
      
      res.json({ message: "QA parameters updated successfully" });
    } catch (error) {
      console.error('QA parameters update error:', error);
      res.status(500).json({ message: "Failed to update QA parameters" });
    }
  });

  // Submit lead to client
  app.post("/api/leads/:id/submit-to-client", requireAuth, async (req, res) => {
    try {
      const { leads } = await import('@shared/schema');
      
      // Get lead and campaign
      const [lead] = await db.select().from(leads).where(eq(leads.id, req.params.id)).limit(1);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      if (!lead.campaignId) {
        return res.status(400).json({ message: "Lead has no associated campaign" });
      }

      const campaign = await storage.getCampaign(lead.campaignId);
      if (!campaign?.clientSubmissionConfig) {
        return res.status(400).json({ message: "Campaign has no client submission configuration" });
      }

      const submissionConfig = campaign.clientSubmissionConfig as any;
      
      // Get contact and account data
      const [contact] = lead.contactId ? await db.select().from(contactsTable).where(eq(contactsTable.id, lead.contactId)).limit(1) : [null];
      const [account] = contact?.accountId ? await db.select().from(accountsTable).where(eq(accountsTable.id, contact.accountId)).limit(1) : [null];

      // Prepare submission data
      const submissionData: any = {};
      
      if (submissionConfig.fieldMappings) {
        for (const [clientField, crmField] of Object.entries(submissionConfig.fieldMappings)) {
          if (crmField === 'contact.email') submissionData[clientField] = contact?.email;
          else if (crmField === 'contact.fullName') submissionData[clientField] = contact?.fullName;
          else if (crmField === 'contact.phone') submissionData[clientField] = contact?.directPhone;
          else if (crmField === 'account.name') submissionData[clientField] = account?.name;
          else if (crmField === 'account.domain') submissionData[clientField] = account?.domain;
          // Add more mappings as needed
        }
      }

      // Submit to client endpoint
      const response = await fetch(submissionConfig.endpoint, {
        method: submissionConfig.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(submissionConfig.headers || {}),
        },
        body: JSON.stringify(submissionData),
      });

      const responseData = await response.json();

      // Update lead with submission status
      await db.update(leads)
        .set({
          submittedToClient: true,
          submittedAt: new Date(),
          submissionResponse: responseData,
        })
        .where(eq(leads.id, req.params.id));

      res.json({
        success: response.ok,
        response: responseData,
      });
    } catch (error) {
      console.error('Client submission error:', error);
      res.status(500).json({ message: "Failed to submit lead to client" });
    }
  });

  // ==================== ACTIVITY LOGS ====================

  // Get activity logs for an entity
  app.get("/api/activity-log/:entityType/:entityId", requireAuth, async (req: Request, res: Response) => {
    try {
      const { entityType, entityId } = req.params;
      const limitParam = req.query.limit as string | undefined;
      
      // Validate params
      const paramsSchema = z.object({
        entityType: z.enum(['contact', 'account', 'campaign', 'call_job', 'call_session', 'lead', 'user', 'email_message']),
        entityId: z.string().uuid(),
        limit: z.number().int().min(1).max(100).optional().default(50),
      });

      const validatedParams = paramsSchema.parse({
        entityType,
        entityId,
        limit: limitParam ? parseInt(limitParam) : 50,
      });
      
      const logs = await storage.getActivityLogs(
        validatedParams.entityType,
        validatedParams.entityId,
        validatedParams.limit
      );
      res.json(logs);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid parameters", errors: error.errors });
      }
      console.error('Error fetching activity logs:', error);
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });

  // Create activity log (for manual logging)
  app.post("/api/activity-log", requireAuth, async (req: Request, res: Response) => {
    try {
      const validatedData = insertActivityLogSchema.omit({ createdBy: true }).parse(req.body);
      
      const log = await storage.createActivityLog({
        ...validatedData,
        createdBy: req.user!.userId, // Always use authenticated user - cannot be spoofed
      });
      res.json(log);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid activity log data", errors: error.errors });
      }
      console.error('Error creating activity log:', error);
      res.status(500).json({ message: "Failed to create activity log" });
    }
  });

  // ==================== WEBHOOKS ====================

  app.use("/api/webhooks", webhooksRouter);

  // ==================== DATA VERIFICATION ====================

  app.use("/api/dv", dvRouter);

  // ==================== QUEUE MANAGEMENT ====================

  app.use("/api", queueRouter);

  // ==================== FILTER OPTIONS ====================

  app.use("/api/filters/options", filterOptionsRouter);
}