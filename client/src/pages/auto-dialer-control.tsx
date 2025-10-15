import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Pause, Settings, Users, Phone, Clock, Activity } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { Campaign } from "@shared/schema";
import BusinessHoursConfigComponent, { DEFAULT_BUSINESS_HOURS, type BusinessHoursConfig } from "@/components/business-hours-config";

interface AutoDialerQueue {
  campaignId: string;
  isActive: boolean;
  dialingMode: string;
  maxConcurrentCalls: number;
  dialRatio: number;
  answeringMachineDetection: boolean;
  checkDnc: boolean;
  priorityMode: string;
  pacingStrategy: string;
  targetAgentOccupancy: number;
  metadata: any;
  createdAt: string;
  updatedAt: string;
}

interface AgentStatus {
  agentId: string;
  status: 'available' | 'busy' | 'after_call_work' | 'break' | 'offline';
  campaignId?: string;
  currentCallId?: string;
  lastStatusChangeAt: string;
  lastCallEndedAt?: string;
  totalCallsToday: number;
  totalTalkTimeToday: number;
}

export default function AutoDialerControlPage() {
  const { toast } = useToast();
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);

  // Fetch call campaigns
  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery<Campaign[]>({
    queryKey: ['/api/campaigns'],
  });

  const callCampaigns = campaigns.filter(c => c.type === 'call' && c.status !== 'completed');

  // Fetch auto-dialer queues
  const { data: queues = [], isLoading: queuesLoading } = useQuery<AutoDialerQueue[]>({
    queryKey: ['/api/auto-dialer-queues'],
  });

  // Fetch agent statuses
  const { data: agentStatuses = [], isLoading: agentsLoading } = useQuery<AgentStatus[]>({
    queryKey: ['/api/agent-statuses'],
  });

  // Toggle auto-dialer mutation
  const toggleDialerMutation = useMutation({
    mutationFn: async ({ campaignId, isActive }: { campaignId: string; isActive: boolean }) => {
      // First check if queue exists
      const queue = queues.find(q => q.campaignId === campaignId);
      
      if (!queue) {
        // Create queue with default settings
        await apiRequest('POST', '/api/auto-dialer-queue', {
          campaignId,
          isActive,
          dialingMode: 'progressive',
          maxConcurrentCalls: 10,
          dialRatio: 1.0,
          answeringMachineDetection: false,
          checkDnc: true,
          priorityMode: 'fifo',
          pacingStrategy: 'agent_based',
          targetAgentOccupancy: 0.85,
        });
      } else {
        // Toggle existing queue
        await apiRequest('POST', `/api/auto-dialer-queue/${campaignId}/toggle`, { isActive });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auto-dialer-queues'] });
      toast({
        title: "Auto-Dialer Updated",
        description: "Auto-dialer status has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update auto-dialer",
        variant: "destructive",
      });
    },
  });

  // Update queue settings mutation
  const updateQueueMutation = useMutation({
    mutationFn: async ({ campaignId, settings }: { campaignId: string; settings: Partial<AutoDialerQueue> }) => {
      await apiRequest('PATCH', `/api/auto-dialer-queue/${campaignId}`, settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auto-dialer-queues'] });
      setConfigDialogOpen(false);
      toast({
        title: "Settings Updated",
        description: "Auto-dialer settings have been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  const getCampaignQueue = (campaignId: string) => {
    return queues.find(q => q.campaignId === campaignId);
  };

  const getCampaignAgents = (campaignId: string) => {
    return agentStatuses.filter(a => a.campaignId === campaignId);
  };

  const getAvailableAgents = (campaignId: string) => {
    return agentStatuses.filter(a => a.campaignId === campaignId && a.status === 'available').length;
  };

  const getBusyAgents = (campaignId: string) => {
    return agentStatuses.filter(a => a.campaignId === campaignId && a.status === 'busy').length;
  };

  if (campaignsLoading || queuesLoading || agentsLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Auto-Dialer Control Center</h1>
          <p className="text-muted-foreground mt-1">
            Monitor and control progressive dialing campaigns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Activity className="h-3 w-3" />
            {queues.filter(q => q.isActive).length} Active
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Users className="h-3 w-3" />
            {agentStatuses.filter(a => a.status === 'available').length} Available
          </Badge>
        </div>
      </div>

      {/* Campaign Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {callCampaigns.map((campaign) => {
          const queue = getCampaignQueue(campaign.id);
          const isActive = queue?.isActive || false;
          const availableAgents = getAvailableAgents(campaign.id);
          const busyAgents = getBusyAgents(campaign.id);

          return (
            <Card key={campaign.id} className="hover-elevate">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{campaign.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      Campaign ID: {campaign.id}
                    </CardDescription>
                  </div>
                  <Badge variant={isActive ? "default" : "secondary"}>
                    {isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Agent Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Available</div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {availableAgents}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">On Call</div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {busyAgents}
                    </div>
                  </div>
                </div>

                {/* Dialer Settings Summary */}
                {queue && (
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Mode</span>
                      <span className="font-medium capitalize">{queue.dialingMode}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Max Calls</span>
                      <span className="font-medium">{queue.maxConcurrentCalls}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">DNC Check</span>
                      <Badge variant={queue.checkDnc ? "default" : "secondary"} className="h-5">
                        {queue.checkDnc ? "On" : "Off"}
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Controls */}
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    data-testid={`button-toggle-dialer-${campaign.id}`}
                    size="sm"
                    variant={isActive ? "destructive" : "default"}
                    className="flex-1"
                    onClick={() => toggleDialerMutation.mutate({ campaignId: campaign.id, isActive: !isActive })}
                    disabled={toggleDialerMutation.isPending}
                  >
                    {isActive ? (
                      <>
                        <Pause className="h-4 w-4 mr-2" />
                        Stop Dialing
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Start Dialing
                      </>
                    )}
                  </Button>
                  <Button
                    data-testid={`button-settings-${campaign.id}`}
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedCampaign(campaign);
                      setConfigDialogOpen(true);
                    }}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {callCampaigns.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Phone className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Call Campaigns</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Create a telemarketing campaign to start using the auto-dialer
            </p>
          </CardContent>
        </Card>
      )}

      {/* Configuration Dialog */}
      {selectedCampaign && (
        <AutoDialerConfigDialog
          campaign={selectedCampaign}
          queue={getCampaignQueue(selectedCampaign.id)}
          open={configDialogOpen}
          onOpenChange={setConfigDialogOpen}
          onSave={(settings) => updateQueueMutation.mutate({ 
            campaignId: selectedCampaign.id, 
            settings 
          })}
          isPending={updateQueueMutation.isPending}
        />
      )}
    </div>
  );
}

// Configuration Dialog Component
interface AutoDialerConfigDialogProps {
  campaign: Campaign;
  queue?: AutoDialerQueue;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (settings: Partial<AutoDialerQueue>) => void;
  isPending: boolean;
}

function AutoDialerConfigDialog({
  campaign,
  queue,
  open,
  onOpenChange,
  onSave,
  isPending,
}: AutoDialerConfigDialogProps) {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    dialingMode: queue?.dialingMode || 'progressive',
    maxConcurrentCalls: queue?.maxConcurrentCalls || 10,
    dialRatio: queue?.dialRatio || 1.0,
    answeringMachineDetection: queue?.answeringMachineDetection || false,
    checkDnc: queue?.checkDnc !== undefined ? queue.checkDnc : true,
    priorityMode: queue?.priorityMode || 'fifo',
    pacingStrategy: queue?.pacingStrategy || 'agent_based',
    targetAgentOccupancy: queue?.targetAgentOccupancy || 0.85,
  });

  const [businessHours, setBusinessHours] = useState<BusinessHoursConfig>(
    (campaign.businessHoursConfig as BusinessHoursConfig) || DEFAULT_BUSINESS_HOURS
  );

  // Mutation for updating campaign business hours
  const updateBusinessHoursMutation = useMutation({
    mutationFn: async (config: BusinessHoursConfig) => {
      await apiRequest('PATCH', `/api/campaigns/${campaign.id}`, {
        businessHoursConfig: config,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
      toast({
        title: "Business Hours Updated",
        description: "Business hours configuration has been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update business hours",
        variant: "destructive",
      });
    },
  });

  const handleSaveAll = async () => {
    // Save both auto-dialer settings and business hours
    await onSave(settings);
    await updateBusinessHoursMutation.mutateAsync(businessHours);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Campaign Configuration</DialogTitle>
          <DialogDescription>
            Configure auto-dialer and business hours settings for {campaign.name}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="dialer" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dialer" data-testid="tab-dialer">Auto-Dialer Settings</TabsTrigger>
            <TabsTrigger value="hours" data-testid="tab-business-hours">Business Hours</TabsTrigger>
          </TabsList>

          <TabsContent value="dialer" className="space-y-6 py-4">
          {/* Dialing Mode */}
          <div className="space-y-2">
            <Label>Dialing Mode</Label>
            <Select
              value={settings.dialingMode}
              onValueChange={(value) => setSettings({ ...settings, dialingMode: value })}
            >
              <SelectTrigger data-testid="select-dialing-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="progressive">Progressive (1:1 ratio)</SelectItem>
                <SelectItem value="predictive">Predictive (Uses dial ratio)</SelectItem>
                <SelectItem value="preview">Preview (Manual)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {settings.dialingMode === 'progressive' && "Dials one contact per available agent"}
              {settings.dialingMode === 'predictive' && "Dials multiple contacts based on dial ratio"}
              {settings.dialingMode === 'preview' && "Agents manually trigger each call"}
            </p>
          </div>

          {/* Max Concurrent Calls */}
          <div className="space-y-2">
            <Label htmlFor="maxCalls">Max Concurrent Calls</Label>
            <Input
              data-testid="input-max-calls"
              id="maxCalls"
              type="number"
              min="1"
              max="100"
              value={settings.maxConcurrentCalls}
              onChange={(e) => setSettings({ ...settings, maxConcurrentCalls: parseInt(e.target.value) || 10 })}
            />
          </div>

          {/* Dial Ratio (for predictive mode) */}
          {settings.dialingMode === 'predictive' && (
            <div className="space-y-2">
              <Label htmlFor="dialRatio">Dial Ratio</Label>
              <Input
                data-testid="input-dial-ratio"
                id="dialRatio"
                type="number"
                step="0.1"
                min="1.0"
                max="3.0"
                value={settings.dialRatio}
                onChange={(e) => setSettings({ ...settings, dialRatio: parseFloat(e.target.value) || 1.0 })}
              />
              <p className="text-sm text-muted-foreground">
                Number of calls per available agent (e.g., 1.5 = 3 calls for 2 agents)
              </p>
            </div>
          )}

          {/* Switches */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Answering Machine Detection</Label>
                <p className="text-sm text-muted-foreground">
                  Use AMD to detect voicemail and skip
                </p>
              </div>
              <Switch
                data-testid="switch-amd"
                checked={settings.answeringMachineDetection}
                onCheckedChange={(checked) => setSettings({ ...settings, answeringMachineDetection: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>DNC List Check</Label>
                <p className="text-sm text-muted-foreground">
                  Check contacts against Do Not Call list before dialing
                </p>
              </div>
              <Switch
                data-testid="switch-dnc"
                checked={settings.checkDnc}
                onCheckedChange={(checked) => setSettings({ ...settings, checkDnc: checked })}
              />
            </div>
          </div>

          {/* Priority Mode */}
          <div className="space-y-2">
            <Label>Priority Mode</Label>
            <Select
              value={settings.priorityMode}
              onValueChange={(value) => setSettings({ ...settings, priorityMode: value })}
            >
              <SelectTrigger data-testid="select-priority-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fifo">FIFO (First In, First Out)</SelectItem>
                <SelectItem value="priority">Priority-Based</SelectItem>
                <SelectItem value="lifo">LIFO (Last In, First Out)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Agent Occupancy Target */}
          <div className="space-y-2">
            <Label htmlFor="occupancy">Target Agent Occupancy (%)</Label>
            <Input
              data-testid="input-occupancy"
              id="occupancy"
              type="number"
              min="50"
              max="100"
              value={Math.round(settings.targetAgentOccupancy * 100)}
              onChange={(e) => setSettings({ 
                ...settings, 
                targetAgentOccupancy: (parseInt(e.target.value) || 85) / 100 
              })}
            />
            <p className="text-sm text-muted-foreground">
              Desired percentage of agent talk time (85% recommended)
            </p>
          </div>
          </TabsContent>

          <TabsContent value="hours" className="space-y-6 py-4">
            <BusinessHoursConfigComponent
              value={businessHours}
              onChange={setBusinessHours}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button
            data-testid="button-cancel"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            data-testid="button-save-settings"
            onClick={handleSaveAll}
            disabled={isPending || updateBusinessHoursMutation.isPending}
          >
            {(isPending || updateBusinessHoursMutation.isPending) ? "Saving..." : "Save All Settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
