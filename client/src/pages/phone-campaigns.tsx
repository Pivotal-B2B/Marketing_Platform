import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Phone, Plus, Search, Play, Pause, BarChart, UserPlus, Users, CheckCircle2, AlertCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

// Define Campaign type for clarity, assuming it has an 'id' property
interface Campaign {
  id: number;
  name: string;
  status: string;
  callScript?: string;
  totalCalls?: number;
  connected?: number;
  qualified?: number;
  dncRequests?: number;
  metadata?: any;
}

export default function PhoneCampaignsPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { token } = useAuth();

  const [showPopulateDialog, setShowPopulateDialog] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);

  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns", { type: "call" }],
    queryFn: async () => {
      const response = await fetch("/api/campaigns?type=call", {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login';
          throw new Error("Authentication required");
        }
        throw new Error("Failed to fetch campaigns");
      }
      const data = await response.json();
      console.log('Phone campaigns data:', data);
      return data;
    },
    enabled: !!token,
  });

  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ["/api/agents"],
    queryFn: async () => {
      const response = await fetch("/api/agents", {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch agents");
      }
      return response.json();
    },
    enabled: !!token && showPopulateDialog,
  });

  const launchMutation = useMutation({
    mutationFn: async (campaignId: number) => {
      return apiRequest("PATCH", `/api/campaigns/${campaignId}`, { status: "active" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: "Campaign Launched",
        description: "Your dialer campaign is now active. Agents can start calling.",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/campaigns/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", { type: "phone" }] });
      toast({
        title: "Campaign Deleted",
        description: "Phone campaign has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete campaign",
        variant: "destructive",
      });
    },
  });

  const assignAgentsMutation = useMutation({
    mutationFn: async ({ campaignId, agentIds }: { campaignId: string; agentIds: string[] }) => {
      return await apiRequest('POST', `/api/campaigns/${campaignId}/agents`, { agentIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      toast({
        title: "Agents Assigned",
        description: "Agents have been assigned to the campaign successfully.",
      });
      setShowPopulateDialog(false);
      setSelectedCampaign(null);
      setSelectedAgentIds([]);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign agents",
        variant: "destructive",
      });
    },
  });

  const populateQueueMutation = useMutation({
    mutationFn: async ({ campaignId }: { campaignId: string }) => {
      return await apiRequest('POST', `/api/campaigns/${campaignId}/queue/populate`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: "Queue Populated",
        description: "Campaign queue has been populated from audience.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to populate queue",
        variant: "destructive",
      });
    },
  });

  const handleAssignAgents = () => {
    if (!selectedCampaign) return;

    if (selectedAgentIds.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one agent",
        variant: "destructive",
      });
      return;
    }

    assignAgentsMutation.mutate({
      campaignId: selectedCampaign.id.toString(),
      agentIds: selectedAgentIds
    });
  };

  const handlePopulateQueue = () => {
    if (!selectedCampaign) return;

    populateQueueMutation.mutate({
      campaignId: selectedCampaign.id.toString()
    });
  };

  const toggleAgentSelection = (agentId: string) => {
    setSelectedAgentIds(prev => 
      prev.includes(agentId)
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      active: "default",
      draft: "secondary",
      completed: "outline",
      paused: "outline",
    };
    return <Badge variant={variants[status] || "outline"} data-testid={`badge-status-${status}`}>{status}</Badge>;
  };

  const filteredCampaigns = campaigns?.filter((campaign: any) =>
    campaign.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-phone-campaigns">Pipeline Dialer</h1>
          <p className="text-muted-foreground mt-1">
            Create, manage, and track your outbound dialing campaigns
          </p>
        </div>
        <Button onClick={() => setLocation("/campaigns/phone/create")} data-testid="button-create-phone-campaign">
          <Plus className="mr-2 h-4 w-4" />
          Create Campaign
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search dialer campaigns..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-campaigns"
          />
        </div>
      </div>

      {/* Campaign List */}
      {campaignsLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : filteredCampaigns && filteredCampaigns.length > 0 ? (
        <div className="grid gap-4">
          {filteredCampaigns.map((campaign) => (
            <Card key={campaign.id} className="hover-elevate" data-testid={`card-campaign-${campaign.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Phone className="h-5 w-5 text-primary" />
                      <CardTitle data-testid={`text-campaign-name-${campaign.id}`}>{campaign.name}</CardTitle>
                      {getStatusBadge(campaign.status)}
                    </div>
                    {campaign.callScript && (
                      <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-campaign-script-${campaign.id}`}>
                        {campaign.callScript.substring(0, 100)}...
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {campaign.status === "draft" && (
                      <Button
                        size="sm"
                        onClick={() => launchMutation.mutate(campaign.id)}
                        disabled={launchMutation.isPending}
                        data-testid={`button-launch-campaign-${campaign.id}`}
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Launch
                      </Button>
                    )}
                    {campaign.status === "active" && (
                      <Button
                        size="sm"
                        variant="outline"
                        data-testid={`button-pause-campaign-${campaign.id}`}
                      >
                        <Pause className="mr-2 h-4 w-4" />
                        Pause
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setLocation(`/campaigns/phone/${campaign.id}`)}
                      data-testid={`button-view-campaign-${campaign.id}`}
                    >
                      <BarChart className="mr-2 h-4 w-4" />
                      View Stats
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLocation(`/campaigns/phone/${campaign.id}/queue`)}
                        data-testid={`button-view-queue-${campaign.id}`}
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Queue
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedCampaign(campaign);
                          setShowPopulateDialog(true);
                        }}
                        data-testid={`button-populate-${campaign.id}`}
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add to Queue
                      </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total Calls</p>
                      <p className="text-lg font-semibold">{campaign.totalCalls || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Connected</p>
                      <p className="text-lg font-semibold">
                        {campaign.connected || 0} ({campaign.totalCalls ? Math.round((campaign.connected / campaign.totalCalls) * 100) : 0}%)
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Qualified</p>
                      <p className="text-lg font-semibold">
                        {campaign.qualified || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">DNC Requests</p>
                      <p className="text-lg font-semibold text-red-500">
                        {campaign.dncRequests || 0}
                      </p>
                    </div>
                  </div>
                  {campaign.metadata?.assignedAgents && campaign.metadata.assignedAgents.length > 0 && (
                    <div className="pt-3 border-t">
                      <p className="text-xs text-muted-foreground mb-2">Assigned Agents</p>
                      <div className="flex gap-1 flex-wrap">
                        {campaign.metadata.assignedAgents.map((agentId: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            Agent {idx + 1}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Phone className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Dialer Campaigns</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "No campaigns match your search" : "Get started by creating your first dialer campaign"}
            </p>
            <Button onClick={() => setLocation("/campaigns/phone/create")}>
              <Plus className="mr-2 h-4 w-4" />
              Create Dialer Campaign
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Assign Agents Dialog */}
      <Dialog open={showPopulateDialog} onOpenChange={setShowPopulateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign Agents to Campaign</DialogTitle>
            <DialogDescription>
              Select agents to assign to this campaign. Each agent can only be assigned to one active campaign at a time.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Available Agents</Label>
              {agentsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : agents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No agents available</p>
              ) : (
                <div className="border rounded-md divide-y max-h-64 overflow-y-auto" data-testid="agents-list">
                  {agents.map((agent: any) => (
                    <div
                      key={agent.id}
                      className="flex items-center gap-3 p-3 hover-elevate"
                      data-testid={`agent-item-${agent.id}`}
                    >
                      <Checkbox
                        id={`agent-${agent.id}`}
                        checked={selectedAgentIds.includes(agent.id)}
                        onCheckedChange={() => toggleAgentSelection(agent.id)}
                        disabled={!!agent.currentAssignment}
                        data-testid={`checkbox-agent-${agent.id}`}
                      />
                      <div className="flex-1">
                        <Label
                          htmlFor={`agent-${agent.id}`}
                          className="font-medium cursor-pointer"
                        >
                          {agent.firstName} {agent.lastName} ({agent.username})
                        </Label>
                        {agent.currentAssignment && (
                          <div className="flex items-center gap-1 mt-1">
                            <AlertCircle className="h-3 w-3 text-amber-500" />
                            <span className="text-xs text-muted-foreground">
                              Assigned to: {agent.currentAssignment.campaignName}
                            </span>
                          </div>
                        )}
                      </div>
                      {selectedAgentIds.includes(agent.id) && (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Selected: {selectedAgentIds.length} agent{selectedAgentIds.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowPopulateDialog(false)} data-testid="button-cancel">
              Cancel
            </Button>
            <Button
              onClick={handleAssignAgents}
              disabled={assignAgentsMutation.isPending || selectedAgentIds.length === 0}
              data-testid="button-assign-agents"
            >
              {assignAgentsMutation.isPending ? "Assigning..." : "Assign Agents"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}