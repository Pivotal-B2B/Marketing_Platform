
import { Router, Request, Response } from "express";
import { db } from "../db";
import { 
  callSessions, 
  campaigns, 
  users, 
  leads,
  contacts,
  accounts
} from "@shared/schema";
import { eq, and, gte, lte, inArray, sql, desc } from "drizzle-orm";
import { requireAuth, requireRole } from "../auth";

const router = Router();

/**
 * GET /api/reports/calls/global
 * 
 * Global dashboard call statistics across all campaigns
 */
router.get('/global', requireAuth, async (req: Request, res: Response) => {
  try {
    const { from, to, campaignId } = req.query;
    
    // Build conditions
    const conditions: any[] = [];
    
    if (from) {
      conditions.push(gte(callSessions.startTime, new Date(from as string)));
    }
    if (to) {
      conditions.push(lte(callSessions.startTime, new Date(to as string)));
    }
    if (campaignId) {
      conditions.push(eq(callSessions.campaignId, campaignId as string));
    }
    
    // Get call stats by disposition
    const dispositionStats = await db
      .select({
        disposition: callSessions.disposition,
        count: sql<number>`COUNT(*)::int`,
        totalDuration: sql<number>`SUM(COALESCE(${callSessions.duration}, 0))::int`,
      })
      .from(callSessions)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(callSessions.disposition);
    
    // Get QA stats
    const qaStats = await db
      .select({
        qaStatus: leads.qaStatus,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(leads)
      .innerJoin(callSessions, eq(leads.callSessionId, callSessions.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(leads.qaStatus);
    
    // Get campaign breakdown
    const campaignBreakdown = await db
      .select({
        campaignId: campaigns.id,
        campaignName: campaigns.name,
        totalCalls: sql<number>`COUNT(${callSessions.id})::int`,
        qualified: sql<number>`COUNT(CASE WHEN ${callSessions.disposition} = 'qualified' THEN 1 END)::int`,
        notInterested: sql<number>`COUNT(CASE WHEN ${callSessions.disposition} = 'not_interested' THEN 1 END)::int`,
        voicemail: sql<number>`COUNT(CASE WHEN ${callSessions.disposition} = 'voicemail' THEN 1 END)::int`,
        noAnswer: sql<number>`COUNT(CASE WHEN ${callSessions.disposition} = 'no_answer' THEN 1 END)::int`,
        dncRequest: sql<number>`COUNT(CASE WHEN ${callSessions.disposition} = 'dnc_request' THEN 1 END)::int`,
        avgDuration: sql<number>`AVG(COALESCE(${callSessions.duration}, 0))::int`,
      })
      .from(callSessions)
      .innerJoin(campaigns, eq(callSessions.campaignId, campaigns.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(campaigns.id, campaigns.name);
    
    // Get agent performance
    const agentStats = await db
      .select({
        agentId: callSessions.agentId,
        agentName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
        totalCalls: sql<number>`COUNT(${callSessions.id})::int`,
        qualified: sql<number>`COUNT(CASE WHEN ${callSessions.disposition} = 'qualified' THEN 1 END)::int`,
        avgDuration: sql<number>`AVG(COALESCE(${callSessions.duration}, 0))::int`,
      })
      .from(callSessions)
      .innerJoin(users, eq(callSessions.agentId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(callSessions.agentId, users.firstName, users.lastName);
    
    // Calculate totals
    const totalCalls = dispositionStats.reduce((sum, stat) => sum + stat.count, 0);
    const totalDuration = dispositionStats.reduce((sum, stat) => sum + stat.totalDuration, 0);
    
    res.json({
      summary: {
        totalCalls,
        totalDuration,
        avgDuration: totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0,
      },
      dispositions: dispositionStats,
      qaStats,
      campaignBreakdown,
      agentStats,
    });
  } catch (error) {
    console.error('Error fetching global call reports:', error);
    res.status(500).json({ error: 'Failed to fetch global call reports' });
  }
});

/**
 * GET /api/reports/calls/campaign/:campaignId
 * 
 * Campaign-level call statistics
 */
router.get('/campaign/:campaignId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const { from, to } = req.query;
    
    // Build conditions
    const conditions: any[] = [eq(callSessions.campaignId, campaignId)];
    
    if (from) {
      conditions.push(gte(callSessions.startTime, new Date(from as string)));
    }
    if (to) {
      conditions.push(lte(callSessions.startTime, new Date(to as string)));
    }
    
    // Get campaign info
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, campaignId));
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    // Get disposition breakdown
    const dispositionStats = await db
      .select({
        disposition: callSessions.disposition,
        count: sql<number>`COUNT(*)::int`,
        totalDuration: sql<number>`SUM(COALESCE(${callSessions.duration}, 0))::int`,
        avgDuration: sql<number>`AVG(COALESCE(${callSessions.duration}, 0))::int`,
      })
      .from(callSessions)
      .where(and(...conditions))
      .groupBy(callSessions.disposition);
    
    // Get QA breakdown
    const qaStats = await db
      .select({
        qaStatus: leads.qaStatus,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(leads)
      .innerJoin(callSessions, eq(leads.callSessionId, callSessions.id))
      .where(and(...conditions))
      .groupBy(leads.qaStatus);
    
    // Get agent performance for this campaign
    const agentStats = await db
      .select({
        agentId: callSessions.agentId,
        agentName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
        totalCalls: sql<number>`COUNT(${callSessions.id})::int`,
        qualified: sql<number>`COUNT(CASE WHEN ${callSessions.disposition} = 'qualified' THEN 1 END)::int`,
        notInterested: sql<number>`COUNT(CASE WHEN ${callSessions.disposition} = 'not_interested' THEN 1 END)::int`,
        voicemail: sql<number>`COUNT(CASE WHEN ${callSessions.disposition} = 'voicemail' THEN 1 END)::int`,
        dnc: sql<number>`COUNT(CASE WHEN ${callSessions.disposition} = 'dnc_request' THEN 1 END)::int`,
        avgDuration: sql<number>`AVG(COALESCE(${callSessions.duration}, 0))::int`,
        qaApproved: sql<number>`COUNT(CASE WHEN ${leads.qaStatus} = 'approved' THEN 1 END)::int`,
        qaRejected: sql<number>`COUNT(CASE WHEN ${leads.qaStatus} = 'rejected' THEN 1 END)::int`,
      })
      .from(callSessions)
      .leftJoin(leads, eq(callSessions.id, leads.callSessionId))
      .innerJoin(users, eq(callSessions.agentId, users.id))
      .where(and(...conditions))
      .groupBy(callSessions.agentId, users.firstName, users.lastName);
    
    // Get hourly distribution
    const hourlyStats = await db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM ${callSessions.startTime})::int`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(callSessions)
      .where(and(...conditions))
      .groupBy(sql`EXTRACT(HOUR FROM ${callSessions.startTime})`);
    
    // Calculate totals
    const totalCalls = dispositionStats.reduce((sum, stat) => sum + stat.count, 0);
    const totalDuration = dispositionStats.reduce((sum, stat) => sum + stat.totalDuration, 0);
    
    res.json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        type: campaign.type,
        status: campaign.status,
      },
      summary: {
        totalCalls,
        totalDuration,
        avgDuration: totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0,
      },
      dispositions: dispositionStats,
      qaStats,
      agentStats,
      hourlyDistribution: hourlyStats,
    });
  } catch (error) {
    console.error('Error fetching campaign call reports:', error);
    res.status(500).json({ error: 'Failed to fetch campaign call reports' });
  }
});

/**
 * GET /api/reports/calls/agent/:agentId
 * 
 * Agent-level call statistics
 */
router.get('/agent/:agentId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const { from, to, campaignId } = req.query;
    const user = (req as any).user;
    
    // Security: Agents can only see their own stats unless admin
    if (user.role !== 'admin' && user.id !== agentId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Build conditions
    const conditions: any[] = [eq(callSessions.agentId, agentId)];
    
    if (from) {
      conditions.push(gte(callSessions.startTime, new Date(from as string)));
    }
    if (to) {
      conditions.push(lte(callSessions.startTime, new Date(to as string)));
    }
    if (campaignId) {
      conditions.push(eq(callSessions.campaignId, campaignId as string));
    }
    
    // Get agent info
    const [agent] = await db
      .select()
      .from(users)
      .where(eq(users.id, agentId));
    
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // Get disposition breakdown
    const dispositionStats = await db
      .select({
        disposition: callSessions.disposition,
        count: sql<number>`COUNT(*)::int`,
        totalDuration: sql<number>`SUM(COALESCE(${callSessions.duration}, 0))::int`,
        avgDuration: sql<number>`AVG(COALESCE(${callSessions.duration}, 0))::int`,
      })
      .from(callSessions)
      .where(and(...conditions))
      .groupBy(callSessions.disposition);
    
    // Get QA breakdown
    const qaStats = await db
      .select({
        qaStatus: leads.qaStatus,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(leads)
      .innerJoin(callSessions, eq(leads.callSessionId, callSessions.id))
      .where(and(...conditions))
      .groupBy(leads.qaStatus);
    
    // Get campaign breakdown for this agent
    const campaignStats = await db
      .select({
        campaignId: campaigns.id,
        campaignName: campaigns.name,
        totalCalls: sql<number>`COUNT(${callSessions.id})::int`,
        qualified: sql<number>`COUNT(CASE WHEN ${callSessions.disposition} = 'qualified' THEN 1 END)::int`,
        avgDuration: sql<number>`AVG(COALESCE(${callSessions.duration}, 0))::int`,
      })
      .from(callSessions)
      .innerJoin(campaigns, eq(callSessions.campaignId, campaigns.id))
      .where(and(...conditions))
      .groupBy(campaigns.id, campaigns.name);
    
    // Get daily stats for trend
    const dailyStats = await db
      .select({
        date: sql<string>`DATE(${callSessions.startTime})`,
        count: sql<number>`COUNT(*)::int`,
        qualified: sql<number>`COUNT(CASE WHEN ${callSessions.disposition} = 'qualified' THEN 1 END)::int`,
      })
      .from(callSessions)
      .where(and(...conditions))
      .groupBy(sql`DATE(${callSessions.startTime})`)
      .orderBy(sql`DATE(${callSessions.startTime})`);
    
    // Calculate totals
    const totalCalls = dispositionStats.reduce((sum, stat) => sum + stat.count, 0);
    const totalDuration = dispositionStats.reduce((sum, stat) => sum + stat.totalDuration, 0);
    const qualifiedCount = dispositionStats.find(s => s.disposition === 'qualified')?.count || 0;
    
    res.json({
      agent: {
        id: agent.id,
        name: `${agent.firstName} ${agent.lastName}`,
        email: agent.email,
      },
      summary: {
        totalCalls,
        totalDuration,
        avgDuration: totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0,
        qualificationRate: totalCalls > 0 ? Math.round((qualifiedCount / totalCalls) * 100) : 0,
      },
      dispositions: dispositionStats,
      qaStats,
      campaignStats,
      dailyTrend: dailyStats,
    });
  } catch (error) {
    console.error('Error fetching agent call reports:', error);
    res.status(500).json({ error: 'Failed to fetch agent call reports' });
  }
});

/**
 * GET /api/reports/calls/details
 * 
 * Get detailed call list with filters
 */
router.get('/details', requireAuth, async (req: Request, res: Response) => {
  try {
    const { 
      from, 
      to, 
      campaignId, 
      agentId, 
      disposition,
      qaStatus,
      page = '1',
      limit = '50'
    } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;
    
    // Build conditions
    const conditions: any[] = [];
    
    if (from) {
      conditions.push(gte(callSessions.startTime, new Date(from as string)));
    }
    if (to) {
      conditions.push(lte(callSessions.startTime, new Date(to as string)));
    }
    if (campaignId) {
      conditions.push(eq(callSessions.campaignId, campaignId as string));
    }
    if (agentId) {
      conditions.push(eq(callSessions.agentId, agentId as string));
    }
    if (disposition) {
      conditions.push(eq(callSessions.disposition, disposition as any));
    }
    
    // Get calls with related data
    const calls = await db
      .select({
        id: callSessions.id,
        campaignId: callSessions.campaignId,
        campaignName: campaigns.name,
        agentId: callSessions.agentId,
        agentName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
        contactId: callSessions.contactId,
        contactName: contacts.fullName,
        accountName: accounts.name,
        disposition: callSessions.disposition,
        duration: callSessions.duration,
        startTime: callSessions.startTime,
        endTime: callSessions.endTime,
        recordingUrl: callSessions.recordingUrl,
        qaStatus: leads.qaStatus,
        qaScore: leads.qaScore,
        notes: callSessions.notes,
      })
      .from(callSessions)
      .leftJoin(campaigns, eq(callSessions.campaignId, campaigns.id))
      .leftJoin(users, eq(callSessions.agentId, users.id))
      .leftJoin(contacts, eq(callSessions.contactId, contacts.id))
      .leftJoin(accounts, eq(contacts.accountId, accounts.id))
      .leftJoin(leads, eq(callSessions.id, leads.callSessionId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(callSessions.startTime))
      .limit(limitNum)
      .offset(offset);
    
    // Get total count
    const [countResult] = await db
      .select({
        count: sql<number>`COUNT(*)::int`,
      })
      .from(callSessions)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    
    res.json({
      calls,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: countResult.count,
        totalPages: Math.ceil(countResult.count / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching call details:', error);
    res.status(500).json({ error: 'Failed to fetch call details' });
  }
});

export default router;
