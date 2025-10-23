import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, Plus, BarChart, Settings, Play, Pause, Edit, Trash2, MoreVertical } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function CampaignsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [, setLocation] = useLocation();
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<any>(null);

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["/api/campaigns"],
    queryFn: async () => {
      const token = getToken();
      const response = await fetch("/api/campaigns", {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });
      if (!response.ok) throw new Error("Failed to fetch campaigns");
      return response.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (campaignId: number) => {
      const response = await apiRequest("DELETE", `/api/campaigns/${campaignId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete campaign");
      }
      // DELETE returns 204 No Content, so don't try to parse JSON
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: "Campaign deleted",
        description: "The campaign has been successfully deleted.",
      });
      setDeleteDialogOpen(false);
      setCampaignToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDeleteClick = (campaign: any) => {
    setCampaignToDelete(campaign);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (campaignToDelete) {
      deleteMutation.mutate(campaignToDelete.id);
    }
  };

  const handleEditClick = (campaign: any) => {
    setLocation(`/campaigns/${campaign.type}/edit/${campaign.id}`);
  };

  const filteredCampaigns = activeTab === "all" 
    ? campaigns 
    : campaigns.filter((c: any) => c.type === activeTab);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "paused":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "completed":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "draft":
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
            All Campaigns
          </h1>
          <p className="text-muted-foreground">
            Manage email and telemarketing campaigns
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" data-testid="button-reports">
            <BarChart className="mr-2 h-4 w-4" />
            Reports
          </Button>
          <Button variant="outline" data-testid="button-settings">
            <Settings className="mr-2 h-4 w-4" />
            Configuration
          </Button>
        </div>
      </div>

      {/* Campaign Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaigns.length}</div>
            <p className="text-xs text-muted-foreground">
              All active and completed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Email Campaigns</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaigns.filter((c: any) => c.type === "email").length}
            </div>
            <p className="text-xs text-muted-foreground">
              Active email campaigns
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Phone Campaigns</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaigns.filter((c: any) => c.type === "telemarketing").length}
            </div>
            <p className="text-xs text-muted-foreground">
              Active phone campaigns
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Performance</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">28%</div>
            <p className="text-xs text-muted-foreground">
              Open/Connect rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Campaign List */}
      <Card>
        <CardHeader>
          <CardTitle>Campaigns</CardTitle>
          <CardDescription>View and manage all campaign activities</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="all" data-testid="tab-all-campaigns">
                  All Campaigns
                </TabsTrigger>
                <TabsTrigger value="email" data-testid="tab-email-campaigns">
                  <Mail className="mr-2 h-4 w-4" />
                  Email
                </TabsTrigger>
                <TabsTrigger value="telemarketing" data-testid="tab-phone-campaigns">
                  <Phone className="mr-2 h-4 w-4" />
                  Phone
                </TabsTrigger>
              </TabsList>
              <div className="flex gap-2">
                <Button 
                  onClick={() => setLocation("/campaigns/email/create")}
                  data-testid="button-new-email-campaign"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  New Email Campaign
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setLocation("/campaigns/telemarketing/create")}
                  data-testid="button-new-phone-campaign"
                >
                  <Phone className="mr-2 h-4 w-4" />
                  New Phone Campaign
                </Button>
              </div>
            </div>

            <TabsContent value={activeTab} className="space-y-4">
              {filteredCampaigns.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No campaigns found
                </div>
              ) : (
                filteredCampaigns.map((campaign) => (
                  <Card key={campaign.id} data-testid={`campaign-card-${campaign.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {campaign.type === "email" ? (
                            <Mail className="h-5 w-5 text-primary" />
                          ) : (
                            <Phone className="h-5 w-5 text-primary" />
                          )}
                          <div>
                            <CardTitle className="text-lg">{campaign.name}</CardTitle>
                            <CardDescription>
                              Started {new Date(campaign.startDate).toLocaleDateString()}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(campaign.status)}>
                            {campaign.status}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                data-testid={`button-actions-${campaign.id}`}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleEditClick(campaign)}
                                data-testid={`button-edit-${campaign.id}`}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Campaign
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteClick(campaign)}
                                className="text-red-600 dark:text-red-400"
                                data-testid={`button-delete-${campaign.id}`}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Campaign
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        {campaign.type === "email" ? (
                          <>
                            <div>
                              <p className="text-muted-foreground">Sent</p>
                              <p className="text-lg font-semibold">{campaign.sent?.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Opened</p>
                              <p className="text-lg font-semibold">
                                {campaign.opened?.toLocaleString()} (
                                {campaign.sent && campaign.opened
                                  ? Math.round((campaign.opened / campaign.sent) * 100)
                                  : 0}
                                %)
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Clicked</p>
                              <p className="text-lg font-semibold">
                                {campaign.clicked?.toLocaleString()} (
                                {campaign.sent && campaign.clicked
                                  ? Math.round((campaign.clicked / campaign.sent) * 100)
                                  : 0}
                                %)
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <p className="text-muted-foreground">Calls</p>
                              <p className="text-lg font-semibold">{campaign.calls?.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Connected</p>
                              <p className="text-lg font-semibold">
                                {campaign.connected?.toLocaleString()} (
                                {campaign.calls && campaign.connected
                                  ? Math.round((campaign.connected / campaign.calls) * 100)
                                  : 0}
                                %)
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Qualified</p>
                              <p className="text-lg font-semibold">
                                {campaign.qualified?.toLocaleString()} (
                                {campaign.calls && campaign.qualified
                                  ? Math.round((campaign.qualified / campaign.calls) * 100)
                                  : 0}
                                %)
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-campaign">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{campaignToDelete?.name}"? This action cannot be undone.
              All campaign data including results and analytics will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Campaign"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}