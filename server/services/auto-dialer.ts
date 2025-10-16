import { storage } from "../storage";
import type { AgentStatus, Campaign } from "@shared/schema";
import { isWithinBusinessHours, type BusinessHoursConfig } from "../utils/business-hours";

interface DialerConfig {
  pollingIntervalMs: number;
  maxRetries: number;
  retryDelayMs: number;
}

const DEFAULT_CONFIG: DialerConfig = {
  pollingIntervalMs: 2000, // Check every 2 seconds
  maxRetries: 3,
  retryDelayMs: 5000,
};

export class AutoDialerService {
  private isRunning: boolean = false;
  private pollingInterval: NodeJS.Timeout | null = null;
  private config: DialerConfig;

  constructor(config: Partial<DialerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start the auto-dialer service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log("[AutoDialer] Service already running");
      return;
    }

    this.isRunning = true;
    console.log("[AutoDialer] Service started");

    // Start polling for active campaigns
    this.pollingInterval = setInterval(async () => {
      await this.processActiveQueues();
    }, this.config.pollingIntervalMs);

    // Run immediately on start
    await this.processActiveQueues();
  }

  /**
   * Stop the auto-dialer service
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    console.log("[AutoDialer] Service stopped");
  }

  /**
   * Process all active auto-dialer queues
   */
  private async processActiveQueues(): Promise<void> {
    try {
      // Get all active auto-dialer queues
      const queues = await storage.getAllAutoDialerQueues(true);

      for (const queue of queues) {
        await this.processQueue(queue.campaignId);
      }
    } catch (error) {
      console.error("[AutoDialer] Error processing queues:", error);
    }
  }

  /**
   * Process a single campaign queue
   */
  private async processQueue(campaignId: string): Promise<void> {
    try {
      // Get campaign details
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign || campaign.type !== 'call') {
        return;
      }

      // Get auto-dialer queue settings
      const queue = await storage.getAutoDialerQueue(campaignId);
      if (!queue || !queue.isActive) {
        return;
      }

      // Get available agents for this campaign
      const availableAgents = await this.getAvailableAgents(campaignId);
      
      if (availableAgents.length === 0) {
        return; // No agents available
      }

      // Calculate how many calls to make (progressive: 1 call per agent)
      const callsToMake = this.calculateCallsToMake(availableAgents.length, queue);

      // Get contacts from campaign queue
      const contacts = await this.getNextContacts(campaignId, callsToMake);

      if (contacts.length === 0) {
        console.log(`[AutoDialer] No contacts in queue for campaign ${campaignId}`);
        return;
      }

      // Distribute calls to agents
      await this.distributeCallsToAgents(contacts, availableAgents, campaign, queue);

    } catch (error) {
      console.error(`[AutoDialer] Error processing campaign ${campaignId}:`, error);
    }
  }

  /**
   * Get available agents for a campaign
   */
  private async getAvailableAgents(campaignId: string): Promise<AgentStatus[]> {
    // Get all available agents (status = 'available')
    const allAvailable = await storage.getAvailableAgents();
    
    // Filter agents assigned to this campaign
    const campaignAgentAssignments = await storage.getCampaignAgentAssignments(campaignId);
    const assignedAgentIds = new Set(campaignAgentAssignments.map(a => a.agentId));
    
    // Return only agents assigned to this campaign
    return allAvailable.filter(agent => assignedAgentIds.has(agent.agentId));
  }

  /**
   * Calculate how many calls to make based on dialing mode
   */
  private calculateCallsToMake(availableAgentCount: number, queue: any): number {
    const { dialingMode, dialRatio, maxConcurrentCalls } = queue;

    if (dialingMode === 'progressive') {
      // Progressive: 1 call per available agent
      return Math.min(availableAgentCount, maxConcurrentCalls || availableAgentCount);
    } else if (dialingMode === 'predictive') {
      // Predictive: use dial ratio (e.g., 1.5 calls per agent)
      const predictiveCalls = Math.floor(availableAgentCount * (dialRatio || 1.0));
      return Math.min(predictiveCalls, maxConcurrentCalls || predictiveCalls);
    } else if (dialingMode === 'preview') {
      // Preview: manual dialing, no auto-dial
      return 0;
    }

    return availableAgentCount;
  }

  /**
   * Get next contacts to dial from campaign queue
   */
  private async getNextContacts(campaignId: string, limit: number): Promise<any[]> {
    try {
      // Get pending queue items
      const queueItems = await storage.getCampaignQueue(campaignId, 'pending');
      
      // Sort by priority (higher priority first) and enqueued time (FIFO)
      const sortedItems = queueItems
        .sort((a, b) => {
          // First sort by priority (descending)
          if (b.priority !== a.priority) {
            return (b.priority || 0) - (a.priority || 0);
          }
          // Then by enqueued time (ascending - FIFO)
          return new Date(a.enqueuedAt).getTime() - new Date(b.enqueuedAt).getTime();
        })
        .slice(0, limit);

      return sortedItems;
    } catch (error) {
      console.error(`[AutoDialer] Error fetching contacts for campaign ${campaignId}:`, error);
      return [];
    }
  }

  /**
   * Distribute calls to available agents
   */
  private async distributeCallsToAgents(
    contacts: any[],
    agents: AgentStatus[],
    campaign: Campaign,
    queue: any
  ): Promise<void> {
    // Sort agents by longest idle (least recently ended call)
    const sortedAgents = [...agents].sort((a, b) => {
      const aTime = a.lastCallEndedAt ? new Date(a.lastCallEndedAt).getTime() : 0;
      const bTime = b.lastCallEndedAt ? new Date(b.lastCallEndedAt).getTime() : 0;
      return aTime - bTime; // Oldest first
    });

    for (let i = 0; i < Math.min(contacts.length, sortedAgents.length); i++) {
      const contact = contacts[i];
      const agent = sortedAgents[i];

      try {
        // Check business hours if enabled
        if (campaign.businessHoursConfig) {
          const config = campaign.businessHoursConfig as BusinessHoursConfig;
          
          // Get full contact details for timezone detection
          const fullContact = await storage.getContact(contact.contactId);
          
          const contactTimezoneInfo = fullContact ? {
            timezone: fullContact.timezone,
            city: fullContact.city,
            state: fullContact.state,
            country: fullContact.country,
          } : undefined;

          const canCall = isWithinBusinessHours(config, contactTimezoneInfo);
          
          if (!canCall) {
            console.log(`[AutoDialer] Contact ${contact.contactId} is outside business hours, skipping`);
            // Don't mark as removed - will be retried in next cycle
            continue;
          }
        }

        // Check DNC if enabled
        if (queue.checkDnc) {
          const isDnc = await this.checkDnc(contact.phone);
          if (isDnc) {
            console.log(`[AutoDialer] Contact ${contact.contactId} is on DNC list, skipping`);
            await storage.updateQueueStatus(contact.id, 'removed', 'DNC');
            continue;
          }
        }

        // Initiate call
        await this.initiateCall(contact, agent, campaign, queue);

      } catch (error) {
        console.error(`[AutoDialer] Error initiating call for contact ${contact.contactId}:`, error);
      }
    }
  }

  /**
   * Check if number is on Do Not Call list
   */
  private async checkDnc(phone: string | null): Promise<boolean> {
    if (!phone) return true; // No phone number = skip

    try {
      const results = await storage.checkPhoneSuppressionBulk([phone]);
      return results.size > 0;
    } catch (error) {
      console.error(`[AutoDialer] Error checking DNC for ${phone}:`, error);
      return false; // Default to allow on error
    }
  }

  /**
   * Initiate a call to a contact and assign to an agent
   */
  private async initiateCall(
    queueItem: any,
    agent: AgentStatus,
    campaign: Campaign,
    queue: any
  ): Promise<void> {
    try {
      console.log(`[AutoDialer] Initiating call: Contact ${queueItem.contactId} → Agent ${agent.agentId}`);

      // Update queue status to 'calling'
      await storage.updateQueueStatus(queueItem.id, 'calling');

      // Update agent status to 'busy'
      await storage.updateAgentStatus(agent.agentId, {
        status: 'busy',
        campaignId: campaign.id,
      });

      // Create call attempt record
      const callAttempt = await storage.createCallAttempt({
        contactId: queueItem.contactId,
        agentId: agent.agentId,
        campaignId: campaign.id,
        startedAt: new Date(),
      });

      // Log call event
      await storage.createCallEvent({
        attemptId: callAttempt.id,
        type: 'dial_started',
        metadata: {
          queueItemId: queueItem.id,
          contactId: queueItem.contactId,
          agentId: agent.agentId,
          phone: queueItem.phone,
        },
      });

      // Log activity for contact
      await storage.createActivityLog({
        entityType: 'contact',
        entityId: queueItem.contactId,
        eventType: 'call_started',
        title: `Call initiated`,
        description: `Agent started call attempt`,
        metadata: {
          campaignId: campaign.id,
          campaignName: campaign.name,
          agentId: agent.agentId,
          attemptId: callAttempt.id,
          phone: queueItem.phone,
        },
        createdBy: agent.agentId,
      });

      // TODO: Integrate with Telnyx Call Control API to actually place the call
      // This will be implemented in the next phase using WebRTC bridge or Call Control API
      console.log(`[AutoDialer] Call attempt created: ${callAttempt.id}`);

    } catch (error) {
      console.error(`[AutoDialer] Error initiating call:`, error);
      
      // Rollback agent status on error
      await storage.updateAgentStatus(agent.agentId, {
        status: 'available',
      });
      
      // Rollback queue status
      await storage.updateQueueStatus(queueItem.id, 'pending');
    }
  }

  /**
   * Handle call answer event (triggered by external webhook/event)
   */
  async handleCallAnswered(callAttemptId: string, telnyxCallId: string): Promise<void> {
    try {
      const attempt = await storage.getCallAttempt(callAttemptId);
      if (!attempt) {
        console.error(`[AutoDialer] Call attempt not found: ${callAttemptId}`);
        return;
      }

      // Update call attempt
      await storage.updateCallAttempt(callAttemptId, {
        disposition: 'connected',
      });

      // Log event
      await storage.createCallEvent({
        attemptId: callAttemptId,
        type: 'call_answered',
        metadata: { telnyxCallId },
      });

      console.log(`[AutoDialer] Call answered: ${callAttemptId}`);
    } catch (error) {
      console.error(`[AutoDialer] Error handling call answered:`, error);
    }
  }

  /**
   * Handle call ended event (triggered by external webhook/event)
   */
  async handleCallEnded(callAttemptId: string, disposition?: string, duration?: number): Promise<void> {
    try {
      const attempt = await storage.getCallAttempt(callAttemptId);
      if (!attempt) {
        console.error(`[AutoDialer] Call attempt not found: ${callAttemptId}`);
        return;
      }

      // Get campaign details for activity log
      const campaign = await storage.getCampaign(attempt.campaignId);

      // Update call attempt
      await storage.updateCallAttempt(callAttemptId, {
        endedAt: new Date(),
        duration,
        disposition: disposition as any, // Cast to enum type
      });

      // Auto-create Lead for qualified dispositions
      if (disposition === 'qualified') {
        console.log(`[AutoDialer] Creating lead for qualified disposition: ${callAttemptId}`);
        const lead = await storage.createLeadFromCallAttempt(callAttemptId);
        if (lead) {
          console.log(`[AutoDialer] ✅ Lead created: ${lead.id} for contact ${lead.contactName}`);
        } else {
          console.warn(`[AutoDialer] ⚠️ Failed to create lead for call attempt ${callAttemptId}`);
        }
      }

      // Update agent status to 'after_call_work'
      await storage.updateAgentStatus(attempt.agentId, {
        status: 'after_call_work',
        lastCallEndedAt: new Date(),
        totalCallsToday: (attempt as any).totalCallsToday ? (attempt as any).totalCallsToday + 1 : 1,
        totalTalkTimeToday: duration || 0,
      });

      // Log event
      await storage.createCallEvent({
        attemptId: callAttemptId,
        type: 'call_ended',
        metadata: { disposition, duration },
      });

      // Log activity for contact
      await storage.createActivityLog({
        entityType: 'contact',
        entityId: attempt.contactId,
        eventType: 'call_ended',
        title: `Call ended: ${disposition || 'no-answer'}`,
        description: `Call concluded with ${disposition || 'no-answer'} disposition${duration ? ` after ${Math.round(duration)}s` : ''}`,
        metadata: {
          campaignId: attempt.campaignId,
          campaignName: campaign?.name || 'Unknown Campaign',
          agentId: attempt.agentId,
          attemptId: callAttemptId,
          disposition,
          duration,
        },
        createdBy: attempt.agentId,
      });

      console.log(`[AutoDialer] Call ended: ${callAttemptId} - ${disposition}`);
    } catch (error) {
      console.error(`[AutoDialer] Error handling call ended:`, error);
    }
  }

  /**
   * Complete after-call work and return agent to available
   */
  async completeAfterCallWork(agentId: string): Promise<void> {
    try {
      await storage.updateAgentStatus(agentId, {
        status: 'available',
      });
      console.log(`[AutoDialer] Agent ${agentId} completed after-call work`);
    } catch (error) {
      console.error(`[AutoDialer] Error completing after-call work:`, error);
    }
  }
}

// Export singleton instance
export const autoDialerService = new AutoDialerService();
