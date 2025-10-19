/**
 * Filter Options API Routes
 * 
 * Provides endpoints for fetching filter option data with support for:
 * - Pagination
 * - Search/type-ahead
 * - Scoped dependencies (Country → State → City)
 * - Caching headers for performance
 */

import { Router, Request, Response } from "express";
import { db } from "../db";
import { 
  industryReference,
  companySizeReference,
  revenueRangeReference,
  seniorityLevelReference,
  jobFunctionReference,
  departmentReference,
  technologyReference,
  countryReference,
  stateReference,
  cityReference,
  users
} from "@shared/schema";
import { eq, ilike, inArray, and, desc, asc } from "drizzle-orm";

const router = Router();

/**
 * GET /api/filters/options/industries
 * 
 * Fetch industry options from actual account data
 */
router.get('/industries', async (req: Request, res: Response) => {
  try {
    const { query = '' } = req.query;
    const { sql } = await import('drizzle-orm');
    
    // Build SQL query with parameters
    let sqlQuery;
    if (query && typeof query === 'string' && query.trim()) {
      sqlQuery = sql`
        SELECT DISTINCT industry_standardized as industry
        FROM accounts
        WHERE industry_standardized IS NOT NULL
          AND industry_standardized != ''
          AND industry_standardized ILIKE ${`%${query.trim()}%`}
        ORDER BY industry_standardized ASC
        LIMIT 100
      `;
    } else {
      sqlQuery = sql`
        SELECT DISTINCT industry_standardized as industry
        FROM accounts
        WHERE industry_standardized IS NOT NULL
          AND industry_standardized != ''
        ORDER BY industry_standardized ASC
        LIMIT 100
      `;
    }
    
    const results = await db.execute<{ industry: string }>(sqlQuery);
    
    // Format results
    const formatted = results.rows
      .filter(r => r.industry)
      .map(r => ({ id: r.industry, name: r.industry }));
    
    const cacheMaxAge = query ? 300 : 900;
    res.set('Cache-Control', `public, max-age=${cacheMaxAge}`);
    
    res.json({ data: formatted });
  } catch (error) {
    console.error('Error fetching industries:', error);
    res.status(500).json({ error: 'Failed to fetch industries' });
  }
});

/**
 * GET /api/filters/options/company-sizes
 * 
 * Fetch company size options from actual account data
 */
router.get('/company-sizes', async (req: Request, res: Response) => {
  try {
    const { sql } = await import('drizzle-orm');
    
    // Use text cast in SELECT to avoid enum validation issues
    const sqlQuery = sql`
      SELECT DISTINCT 
        CASE 
          WHEN employees_size_range IS NOT NULL THEN employees_size_range::text 
          ELSE NULL 
        END as size_range
      FROM accounts
      WHERE employees_size_range IS NOT NULL
      ORDER BY size_range ASC
      LIMIT 100
    `;
    
    const results = await db.execute<{ size_range: string | null }>(sqlQuery);
    
    // Format results - filter out empty strings and null values
    const formatted = results.rows
      .filter(r => r.size_range && r.size_range.trim() !== '')
      .map(r => ({ id: r.size_range!, name: r.size_range! }));
    
    res.set('Cache-Control', 'public, max-age=900');
    res.json({ data: formatted });
  } catch (error) {
    console.error('Error fetching company sizes:', error);
    res.status(500).json({ error: 'Failed to fetch company sizes' });
  }
});

/**
 * GET /api/filters/options/company-revenue
 * 
 * Fetch company revenue options from actual account data
 */
router.get('/company-revenue', async (req: Request, res: Response) => {
  try {
    const { sql } = await import('drizzle-orm');
    
    const sqlQuery = sql`
      SELECT DISTINCT annual_revenue as revenue
      FROM accounts
      WHERE annual_revenue IS NOT NULL
        AND annual_revenue != ''
      ORDER BY annual_revenue ASC
      LIMIT 100
    `;
    
    const results = await db.execute<{ revenue: string }>(sqlQuery);
    
    // Format results
    const formatted = results.rows
      .filter(r => r.revenue)
      .map(r => ({ id: r.revenue, name: r.revenue }));
    
    res.set('Cache-Control', 'public, max-age=900');
    res.json({ data: formatted });
  } catch (error) {
    console.error('Error fetching revenue ranges:', error);
    res.status(500).json({ error: 'Failed to fetch revenue ranges' });
  }
});

/**
 * GET /api/filters/options/seniority-levels
 * 
 * Fetch seniority level options with optional search
 */
router.get('/seniority-levels', async (req: Request, res: Response) => {
  try {
    const { query = '' } = req.query;
    
    let conditions = [eq(seniorityLevelReference.isActive, true)];
    
    if (query && typeof query === 'string' && query.trim()) {
      conditions.push(ilike(seniorityLevelReference.name, `%${query.trim()}%`));
    }
    
    const results = await db
      .select({
        id: seniorityLevelReference.id,
        name: seniorityLevelReference.name,
        description: seniorityLevelReference.description
      })
      .from(seniorityLevelReference)
      .where(and(...conditions))
      .orderBy(asc(seniorityLevelReference.sortOrder));
    
    const cacheMaxAge = query ? 300 : 900;
    res.set('Cache-Control', `public, max-age=${cacheMaxAge}`);
    
    res.json({ data: results });
  } catch (error) {
    console.error('Error fetching seniority levels:', error);
    res.status(500).json({ error: 'Failed to fetch seniority levels' });
  }
});

/**
 * GET /api/filters/options/job-functions
 * 
 * Fetch job function options with optional search
 */
router.get('/job-functions', async (req: Request, res: Response) => {
  try {
    const { query = '' } = req.query;
    
    let conditions = [eq(jobFunctionReference.isActive, true)];
    
    if (query && typeof query === 'string' && query.trim()) {
      conditions.push(ilike(jobFunctionReference.name, `%${query.trim()}%`));
    }
    
    const results = await db
      .select({
        id: jobFunctionReference.id,
        name: jobFunctionReference.name,
        description: jobFunctionReference.description
      })
      .from(jobFunctionReference)
      .where(and(...conditions))
      .orderBy(asc(jobFunctionReference.sortOrder));
    
    const cacheMaxAge = query ? 300 : 900;
    res.set('Cache-Control', `public, max-age=${cacheMaxAge}`);
    
    res.json({ data: results });
  } catch (error) {
    console.error('Error fetching job functions:', error);
    res.status(500).json({ error: 'Failed to fetch job functions' });
  }
});

/**
 * GET /api/filters/options/departments
 * 
 * Fetch department options with optional search
 */
router.get('/departments', async (req: Request, res: Response) => {
  try {
    const { query = '' } = req.query;
    
    let conditions = [eq(departmentReference.isActive, true)];
    
    if (query && typeof query === 'string' && query.trim()) {
      conditions.push(ilike(departmentReference.name, `%${query.trim()}%`));
    }
    
    const results = await db
      .select({
        id: departmentReference.id,
        name: departmentReference.name,
        description: departmentReference.description
      })
      .from(departmentReference)
      .where(and(...conditions))
      .orderBy(asc(departmentReference.sortOrder));
    
    const cacheMaxAge = query ? 300 : 900;
    res.set('Cache-Control', `public, max-age=${cacheMaxAge}`);
    
    res.json({ data: results });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

/**
 * GET /api/filters/options/technologies
 * 
 * Fetch technology options with optional search and category
 */
router.get('/technologies', async (req: Request, res: Response) => {
  try {
    const { query = '', category = '', page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;
    
    let conditions = [eq(technologyReference.isActive, true)];
    
    if (query && typeof query === 'string' && query.trim()) {
      conditions.push(ilike(technologyReference.name, `%${query.trim()}%`));
    }
    
    if (category && typeof category === 'string' && category.trim()) {
      conditions.push(eq(technologyReference.category, category.trim()));
    }
    
    const results = await db
      .select({
        id: technologyReference.id,
        name: technologyReference.name,
        category: technologyReference.category
      })
      .from(technologyReference)
      .where(and(...conditions))
      .orderBy(asc(technologyReference.name))
      .limit(limitNum)
      .offset(offset);
    
    const cacheMaxAge = query || category ? 300 : 900;
    res.set('Cache-Control', `public, max-age=${cacheMaxAge}`);
    
    res.json({
      data: results,
      pagination: {
        page: pageNum,
        limit: limitNum,
        hasMore: results.length === limitNum
      }
    });
  } catch (error) {
    console.error('Error fetching technologies:', error);
    res.status(500).json({ error: 'Failed to fetch technologies' });
  }
});

/**
 * GET /api/filters/options/countries
 * 
 * Fetch country options with optional search (type-ahead)
 */
router.get('/countries', async (req: Request, res: Response) => {
  try {
    const { query = '' } = req.query;
    
    let conditions = [eq(countryReference.isActive, true)];
    
    if (query && typeof query === 'string' && query.trim()) {
      conditions.push(ilike(countryReference.name, `%${query.trim()}%`));
    }
    
    const results = await db
      .select({
        id: countryReference.id,
        name: countryReference.name,
        code: countryReference.code
      })
      .from(countryReference)
      .where(and(...conditions))
      .orderBy(asc(countryReference.sortOrder))
      .limit(50);
    
    const cacheMaxAge = query ? 300 : 900;
    res.set('Cache-Control', `public, max-age=${cacheMaxAge}`);
    
    res.json({ data: results });
  } catch (error) {
    console.error('Error fetching countries:', error);
    res.status(500).json({ error: 'Failed to fetch countries' });
  }
});

/**
 * GET /api/filters/options/states
 * 
 * Fetch state options with scoping by countries and optional search (type-ahead)
 * Query params: countries (comma-separated IDs), query (search term)
 */
router.get('/states', async (req: Request, res: Response) => {
  try {
    const { countries = '', query = '' } = req.query;
    
    let conditions = [eq(stateReference.isActive, true)];
    
    // Scope by countries if provided
    if (countries && typeof countries === 'string' && countries.trim()) {
      const countryIds = countries.split(',').map(id => id.trim()).filter(Boolean);
      if (countryIds.length > 0) {
        conditions.push(inArray(stateReference.countryId, countryIds));
      }
    }
    
    // Search by name
    if (query && typeof query === 'string' && query.trim()) {
      conditions.push(ilike(stateReference.name, `%${query.trim()}%`));
    }
    
    const results = await db
      .select({
        id: stateReference.id,
        name: stateReference.name,
        code: stateReference.code,
        countryId: stateReference.countryId
      })
      .from(stateReference)
      .where(and(...conditions))
      .orderBy(asc(stateReference.sortOrder))
      .limit(50);
    
    const cacheMaxAge = countries || query ? 300 : 900;
    res.set('Cache-Control', `public, max-age=${cacheMaxAge}`);
    
    res.json({ data: results });
  } catch (error) {
    console.error('Error fetching states:', error);
    res.status(500).json({ error: 'Failed to fetch states' });
  }
});

/**
 * GET /api/filters/options/cities
 * 
 * Fetch city options with scoping by countries/states and optional search (type-ahead)
 * Query params: countries (comma-separated IDs), states (comma-separated IDs), query (search term)
 */
router.get('/cities', async (req: Request, res: Response) => {
  try {
    const { countries = '', states = '', query = '', page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;
    
    let conditions = [eq(cityReference.isActive, true)];
    
    // Scope by countries if provided
    if (countries && typeof countries === 'string' && countries.trim()) {
      const countryIds = countries.split(',').map(id => id.trim()).filter(Boolean);
      if (countryIds.length > 0) {
        conditions.push(inArray(cityReference.countryId, countryIds));
      }
    }
    
    // Scope by states if provided (takes precedence over countries for filtering)
    if (states && typeof states === 'string' && states.trim()) {
      const stateIds = states.split(',').map(id => id.trim()).filter(Boolean);
      if (stateIds.length > 0) {
        conditions.push(inArray(cityReference.stateId, stateIds));
      }
    }
    
    // Search by name
    if (query && typeof query === 'string' && query.trim()) {
      conditions.push(ilike(cityReference.name, `%${query.trim()}%`));
    }
    
    const results = await db
      .select({
        id: cityReference.id,
        name: cityReference.name,
        stateId: cityReference.stateId,
        countryId: cityReference.countryId
      })
      .from(cityReference)
      .where(and(...conditions))
      .orderBy(asc(cityReference.sortOrder))
      .limit(limitNum)
      .offset(offset);
    
    const cacheMaxAge = countries || states || query ? 300 : 900;
    res.set('Cache-Control', `public, max-age=${cacheMaxAge}`);
    
    res.json({
      data: results,
      pagination: {
        page: pageNum,
        limit: limitNum,
        hasMore: results.length === limitNum
      }
    });
  } catch (error) {
    console.error('Error fetching cities:', error);
    res.status(500).json({ error: 'Failed to fetch cities' });
  }
});

/**
 * GET /api/filters/options/users
 * 
 * Fetch user options (for Account Owner filter)
 * Query params: role (optional filter by role)
 */
router.get('/users', async (req: Request, res: Response) => {
  try {
    const { role = '' } = req.query;
    
    // Optional: filter by role if provided
    // Note: This would require joining with userRoles table
    // For now, we'll return all users
    
    const rawResults = await db
      .select({
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email
      })
      .from(users)
      .orderBy(asc(users.username))
      .limit(100);
    
    // Transform results to include full name
    const results = rawResults.map(user => ({
      id: user.id,
      username: user.username,
      fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
      email: user.email
    }));
    
    // Cache for 5 minutes (user data changes occasionally)
    res.set('Cache-Control', 'public, max-age=300');
    
    res.json({ data: results });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

export default router;
