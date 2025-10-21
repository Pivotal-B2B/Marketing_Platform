import { Router } from "express";
import { db } from "../db";
import { verificationSuppressionList, insertVerificationSuppressionListSchema } from "@shared/schema";
import { eq, or, sql } from "drizzle-orm";
import { z } from "zod";
import { addToSuppressionList } from "../lib/verification-suppression";
import Papa from "papaparse";

const router = Router();

interface SuppressionCSVRow {
  email?: string;
  cavId?: string;
  cavUserId?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  companyKey?: string;
}

router.get("/api/verification-campaigns/:campaignId/suppression", async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    const items = await db
      .select()
      .from(verificationSuppressionList)
      .where(
        or(
          eq(verificationSuppressionList.campaignId, campaignId),
          sql`${verificationSuppressionList.campaignId} IS NULL`
        )
      );
    
    res.json(items);
  } catch (error) {
    console.error("Error fetching suppression list:", error);
    res.status(500).json({ error: "Failed to fetch suppression list" });
  }
});

router.post("/api/verification-campaigns/:campaignId/suppression", async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { entries } = req.body;
    
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: "entries must be a non-empty array" });
    }
    
    await addToSuppressionList(campaignId, entries);
    
    res.status(201).json({ added: entries.length });
  } catch (error) {
    console.error("Error adding to suppression list:", error);
    res.status(500).json({ error: "Failed to add to suppression list" });
  }
});

router.post("/api/verification-suppression/global", async (req, res) => {
  try {
    const { entries } = req.body;
    
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: "entries must be a non-empty array" });
    }
    
    await addToSuppressionList(null, entries);
    
    res.status(201).json({ added: entries.length });
  } catch (error) {
    console.error("Error adding to global suppression list:", error);
    res.status(500).json({ error: "Failed to add to global suppression list" });
  }
});

router.post("/api/verification-campaigns/:campaignId/suppression/upload", async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { csvData } = req.body;

    if (!csvData) {
      return res.status(400).json({ error: "csvData is required" });
    }

    // Try parsing with different delimiters
    let parseResult: Papa.ParseResult<SuppressionCSVRow> | null = null;
    const delimiters = [',', '\t', '|', ';'];
    
    for (const delimiter of delimiters) {
      const result = Papa.parse<SuppressionCSVRow>(csvData, {
        header: true,
        skipEmptyLines: true,
        delimiter: delimiter,
        transformHeader: (header) => {
          const normalized = header.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
          
          const mappings: Record<string, string> = {
            'email': 'email',
            'emailaddress': 'email',
            'mail': 'email',
            'cavid': 'cavId',
            'cavuserid': 'cavUserId',
            'firstname': 'firstName',
            'lastname': 'lastName',
            'companyname': 'companyName',
            'company': 'companyName',
            'account': 'companyName',
            'accountname': 'companyName',
          };

          return mappings[normalized] || normalized;
        },
      });
      
      // Check if this delimiter worked (has data and minimal errors)
      if (result.data && result.data.length > 0 && result.errors.length === 0) {
        parseResult = result;
        break;
      }
    }

    if (!parseResult || parseResult.data.length === 0) {
      console.error("CSV parsing failed - could not detect delimiter");
      return res.status(400).json({
        error: "CSV parsing failed",
        details: "Could not detect delimiter. Please ensure your CSV uses comma, tab, pipe, or semicolon as delimiter.",
      });
    }

    if (parseResult.errors.length > 0) {
      console.error("CSV parsing errors:", parseResult.errors);
      return res.status(400).json({
        error: "CSV parsing failed",
        details: parseResult.errors,
      });
    }

    const rows = parseResult.data;
    const results = {
      total: rows.length,
      added: 0,
      skipped: 0,
      errors: [] as string[],
    };

    const entries = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      try {
        const hasStrongId = row.email || row.cavId || row.cavUserId;
        const hasFullNameCompany = row.firstName && row.lastName && row.companyName;
        
        if (!hasStrongId && !hasFullNameCompany) {
          results.skipped++;
          results.errors.push(`Row ${i + 1}: Must have email, CAV ID, CAV User ID, or complete Name+Company`);
          continue;
        }

        const entry = {
          email: row.email?.toLowerCase().trim() || undefined,
          cavId: row.cavId?.trim() || undefined,
          cavUserId: row.cavUserId?.trim() || undefined,
          firstName: row.firstName?.trim() || undefined,
          lastName: row.lastName?.trim() || undefined,
          companyKey: row.companyName?.toLowerCase().trim().replace(/\s+/g, ' ') || undefined,
        };

        entries.push(entry);
        results.added++;
      } catch (error: any) {
        results.skipped++;
        results.errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }

    if (entries.length > 0) {
      await addToSuppressionList(campaignId, entries);
    }

    res.json(results);
  } catch (error) {
    console.error("Error uploading suppression file:", error);
    res.status(500).json({ error: "Failed to upload suppression file" });
  }
});

router.post("/api/verification-suppression/global/upload", async (req, res) => {
  try {
    const { csvData } = req.body;

    if (!csvData) {
      return res.status(400).json({ error: "csvData is required" });
    }

    // Try parsing with different delimiters
    let parseResult: Papa.ParseResult<SuppressionCSVRow> | null = null;
    const delimiters = [',', '\t', '|', ';'];
    
    for (const delimiter of delimiters) {
      const result = Papa.parse<SuppressionCSVRow>(csvData, {
        header: true,
        skipEmptyLines: true,
        delimiter: delimiter,
        transformHeader: (header) => {
          const normalized = header.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
          
          const mappings: Record<string, string> = {
            'email': 'email',
            'emailaddress': 'email',
            'mail': 'email',
            'cavid': 'cavId',
            'cavuserid': 'cavUserId',
            'firstname': 'firstName',
            'lastname': 'lastName',
            'companyname': 'companyName',
            'company': 'companyName',
            'account': 'companyName',
            'accountname': 'companyName',
          };

          return mappings[normalized] || normalized;
        },
      });
      
      // Check if this delimiter worked (has data and minimal errors)
      if (result.data && result.data.length > 0 && result.errors.length === 0) {
        parseResult = result;
        break;
      }
    }

    if (!parseResult || parseResult.data.length === 0) {
      console.error("CSV parsing failed - could not detect delimiter");
      return res.status(400).json({
        error: "CSV parsing failed",
        details: "Could not detect delimiter. Please ensure your CSV uses comma, tab, pipe, or semicolon as delimiter.",
      });
    }

    if (parseResult.errors.length > 0) {
      console.error("CSV parsing errors:", parseResult.errors);
      return res.status(400).json({
        error: "CSV parsing failed",
        details: parseResult.errors,
      });
    }

    const rows = parseResult.data;
    const results = {
      total: rows.length,
      added: 0,
      skipped: 0,
      errors: [] as string[],
    };

    const entries = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      try {
        const hasStrongId = row.email || row.cavId || row.cavUserId;
        const hasFullNameCompany = row.firstName && row.lastName && row.companyName;
        
        if (!hasStrongId && !hasFullNameCompany) {
          results.skipped++;
          results.errors.push(`Row ${i + 1}: Must have email, CAV ID, CAV User ID, or complete Name+Company`);
          continue;
        }

        const entry = {
          email: row.email?.toLowerCase().trim() || undefined,
          cavId: row.cavId?.trim() || undefined,
          cavUserId: row.cavUserId?.trim() || undefined,
          firstName: row.firstName?.trim() || undefined,
          lastName: row.lastName?.trim() || undefined,
          companyKey: row.companyName?.toLowerCase().trim().replace(/\s+/g, ' ') || undefined,
        };

        entries.push(entry);
        results.added++;
      } catch (error: any) {
        results.skipped++;
        results.errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }

    if (entries.length > 0) {
      await addToSuppressionList(null, entries);
    }

    res.json(results);
  } catch (error) {
    console.error("Error uploading global suppression file:", error);
    res.status(500).json({ error: "Failed to upload global suppression file" });
  }
});

export default router;
