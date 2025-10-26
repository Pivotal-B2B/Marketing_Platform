import { Router } from "express";
import { db } from "../db";
import { exportTemplates, insertExportTemplateSchema } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import type { Request, Response } from "express";

const router = Router();

// Get all export templates
router.get("/", async (req: Request, res: Response) => {
  try {
    const { type } = req.query;
    
    let templates;
    if (type && typeof type === 'string') {
      templates = await db
        .select()
        .from(exportTemplates)
        .where(eq(exportTemplates.templateType, type))
        .orderBy(desc(exportTemplates.createdAt));
    } else {
      templates = await db
        .select()
        .from(exportTemplates)
        .orderBy(desc(exportTemplates.createdAt));
    }
    
    res.json(templates);
  } catch (error) {
    console.error("Error fetching export templates:", error);
    res.status(500).json({ error: "Failed to fetch export templates" });
  }
});

// Get single export template
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const template = await db
      .select()
      .from(exportTemplates)
      .where(eq(exportTemplates.id, id))
      .limit(1);
    
    if (!template.length) {
      return res.status(404).json({ error: "Template not found" });
    }
    
    res.json(template[0]);
  } catch (error) {
    console.error("Error fetching export template:", error);
    res.status(500).json({ error: "Failed to fetch export template" });
  }
});

// Create export template
router.post("/", async (req: Request, res: Response) => {
  try {
    const validatedData = insertExportTemplateSchema.parse({
      ...req.body,
      createdBy: req.user?.userId || null,
    });
    
    const [template] = await db
      .insert(exportTemplates)
      .values(validatedData as any)
      .returning();
    
    res.status(201).json(template);
  } catch (error) {
    console.error("Error creating export template:", error);
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Failed to create export template" });
    }
  }
});

// Update export template
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Verify template exists
    const existing = await db
      .select()
      .from(exportTemplates)
      .where(eq(exportTemplates.id, id))
      .limit(1);
    
    if (!existing.length) {
      return res.status(404).json({ error: "Template not found" });
    }
    
    const validatedData = insertExportTemplateSchema.partial().parse(req.body);
    
    const [updated] = await db
      .update(exportTemplates)
      .set({
        ...validatedData as any,
        updatedAt: new Date(),
      })
      .where(eq(exportTemplates.id, id))
      .returning();
    
    res.json(updated);
  } catch (error) {
    console.error("Error updating export template:", error);
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Failed to update export template" });
    }
  }
});

// Delete export template
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const deleted = await db
      .delete(exportTemplates)
      .where(eq(exportTemplates.id, id))
      .returning();
    
    if (!deleted.length) {
      return res.status(404).json({ error: "Template not found" });
    }
    
    res.json({ success: true, message: "Template deleted" });
  } catch (error) {
    console.error("Error deleting export template:", error);
    res.status(500).json({ error: "Failed to delete export template" });
  }
});

// Get available fields for smart export template
router.get("/fields/smart-export", async (req: Request, res: Response) => {
  try {
    // Define all available fields for smart export (matches contactToFieldMap in apply-export-template.ts)
    const availableFields = [
      // Contact basic fields
      { key: "id", label: "Contact ID", category: "Contact" },
      { key: "full_name", label: "Full Name", category: "Contact" },
      { key: "first_name", label: "First Name", category: "Contact" },
      { key: "last_name", label: "Last Name", category: "Contact" },
      { key: "title", label: "Job Title", category: "Contact" },
      { key: "email", label: "Email", category: "Contact" },
      { key: "linkedin_url", label: "LinkedIn URL", category: "Contact" },
      { key: "cav_id", label: "CAV ID", category: "Contact" },
      { key: "cav_user_id", label: "CAV User ID", category: "Contact" },
      
      // Smart selection fields
      { key: "best_phone", label: "Best Phone", category: "Smart Selection" },
      { key: "best_phone_source", label: "Best Phone Source", category: "Smart Selection" },
      { key: "best_address_line1", label: "Best Address Line 1", category: "Smart Selection" },
      { key: "best_address_line2", label: "Best Address Line 2", category: "Smart Selection" },
      { key: "best_address_line3", label: "Best Address Line 3", category: "Smart Selection" },
      { key: "best_city", label: "Best City", category: "Smart Selection" },
      { key: "best_state", label: "Best State/Province", category: "Smart Selection" },
      { key: "best_country", label: "Best Country", category: "Smart Selection" },
      { key: "best_postal", label: "Best Postal Code", category: "Smart Selection" },
      { key: "best_address_source", label: "Best Address Source", category: "Smart Selection" },
      
      // Company fields
      { key: "account_name", label: "Company Name", category: "Company" },
      { key: "account_domain", label: "Company Domain", category: "Company" },
      { key: "account_website", label: "Company Website", category: "Company" },
      { key: "account_industry", label: "Industry", category: "Company" },
      { key: "account_revenue", label: "Revenue", category: "Company" },
      { key: "account_employee_count", label: "Employee Count", category: "Company" },
      
      // Status fields
      { key: "eligibility_status", label: "Eligibility Status", category: "Status" },
      { key: "verification_status", label: "Verification Status", category: "Status" },
      { key: "email_status", label: "Email Status", category: "Status" },
      { key: "qa_status", label: "QA Status", category: "Status" },
      { key: "suppressed", label: "Suppressed (Yes/No)", category: "Status" },
      
      // Original phone/address fields
      { key: "mobile", label: "Mobile Phone (Original)", category: "Contact - Original" },
      { key: "phone", label: "Phone (Original)", category: "Contact - Original" },
      { key: "contact_address1", label: "Contact Address 1 (Original)", category: "Contact - Original" },
      { key: "contact_city", label: "Contact City (Original)", category: "Contact - Original" },
      { key: "contact_state", label: "Contact State (Original)", category: "Contact - Original" },
      { key: "contact_country", label: "Contact Country (Original)", category: "Contact - Original" },
      { key: "contact_postal", label: "Contact Postal (Original)", category: "Contact - Original" },
      
      // Timestamps
      { key: "created_at", label: "Created At", category: "Metadata" },
      { key: "updated_at", label: "Updated At", category: "Metadata" },
    ];
    
    res.json(availableFields);
  } catch (error) {
    console.error("Error fetching available fields:", error);
    res.status(500).json({ error: "Failed to fetch available fields" });
  }
});

export default router;
