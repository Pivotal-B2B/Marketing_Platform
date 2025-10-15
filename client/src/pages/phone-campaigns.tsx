import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Phone, Plus, Search, Play, Pause, BarChart, UserPlus, Users } from "lucide-react";
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
}

export default function PhoneCampaignsPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { token } = useAuth();

  const [showPopulateDialog, setShowPopulateDialog] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [contactCount, setContactCount] = useState<string>("10");
  const [agentEmails, setAgentEmails] = useState<string>("");

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
      return await apiRequest({ url: `/api/campaigns/${id}`, method: 'DELETE' });
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

  const populateQueueMutation = useMutation({
    mutationFn: async ({ campaignId, contactIds, agentIds }: any) => {
      return await apiRequest({
        url: `/api/campaigns/${campaignId}/queue/populate`,
        method: 'POST',
        data: { contactIds, agentIds, priority: 1 }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: "Queue Populated",
        description: "Contacts have been assigned to agents successfully.",
      });
      setShowPopulateDialog(false);
      setSelectedCampaign(null);
      setContactCount("10");
      setAgentEmails("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to populate queue",
        variant: "destructive",
      });
    },
  });

  const handlePopulateQueue = async () => {
    if (!selectedCampaign) return;

    try {
      // Get sample contacts (in production, this would be filtered by campaign audience)
      const contactsRes = await apiRequest({
        url: `/api/contacts?limit=${contactCount}`,
        method: 'GET'
      });
      const contacts = contactsRes.contacts || [];
      const contactIds = contacts.map((c: any) => c.id);

      // Parse agent emails
      const agentEmailList = agentEmails.split(',').map(e => e.trim()).filter(e => e);

      if (agentEmailList.length === 0) {
        toast({
          title: "Error",
          description: "Please enter at least one agent email",
          variant: "destructive",
        });
        return;
      }

      // Get agent IDs from emails
      const agentIds: string[] = [];
      for (const email of agentEmailList) {
        const userRes = await apiRequest({
          url: `/api/users?email=${email}`,
          method: 'GET'
        });
        if (userRes && userRes.id) {
          agentIds.push(userRes.id);
        }
      }

      if (agentIds.length === 0) {
        toast({
          title: "Error",
          description: "No valid agents found with those emails",
          variant: "destructive",
        });
        return;
      }

      populateQueueMutation.mutate({
        campaignId: selectedCampaign.id,
        contactIds,
        agentIds
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch contacts",
        variant: "destructive",
      });
    }
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
        <Button onClick={() => setLocation("/campaigns/telemarketing/create")} data-testid="button-create-phone-campaign">
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
            <Button onClick={() => setLocation("/campaigns/telemarketing/create")}>
              <Plus className="mr-2 h-4 w-4" />
              Create Dialer Campaign
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Populate Queue Dialog */}
      <Dialog open={showPopulateDialog} onOpenChange={setShowPopulateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Contacts to Agent Queue</DialogTitle>
            <DialogDescription>
              Assign contacts from this campaign to agents for calling
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="contact-count">Number of Contacts</Label>
              <Input
                id="contact-count"
                type="number"
                value={contactCount}
                onChange={(e) => setContactCount(e.target.value)}
                placeholder="10"
                min="1"
              />
              <p className="text-xs text-muted-foreground">
                How many contacts to add to the queue
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="agent-emails">Agent Emails (comma-separated)</Label>
              <Input
                id="agent-emails"
                value={agentEmails}
                onChange={(e) => setAgentEmails(e.target.value)}
                placeholder="agent1@example.com, agent2@example.com"
              />
              <p className="text-xs text-muted-foreground">
                Contacts will be distributed round-robin across these agents
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPopulateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handlePopulateQueue}
              disabled={populateQueueMutation.isPending}
            >
              {populateQueueMutation.isPending ? "Adding..." : "Add to Queue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}