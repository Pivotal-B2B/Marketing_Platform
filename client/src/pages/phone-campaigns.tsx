
import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Phone, Plus, Search, Play, Pause, BarChart } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function PhoneCampaignsPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery({
    queryKey: ["/api/campaigns", { type: "telemarketing" }],
    queryFn: async () => {
      const response = await fetch("/api/campaigns?type=telemarketing", {
        credentials: 'include',
      });
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login';
          throw new Error("Authentication required");
        }
        throw new Error("Failed to fetch campaigns");
      }
      return response.json();
    },
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
      ) : filteredCampaigns.length > 0 ? (
        <div className="grid gap-4">
          {filteredCampaigns.map((campaign: any) => (
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
                  </div>
                </div>
              </CardHeader>
              <CardContent>
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
    </div>
  );
}
