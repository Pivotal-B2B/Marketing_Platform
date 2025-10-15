import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, Plus, BarChart, Settings, Play, Pause, StopCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

export default function CampaignsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [, setLocation] = useLocation();
  const { getToken } = useAuth(); // Use the getToken function from useAuth

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["/api/campaigns"],
    queryFn: async () => {
      const token = getToken(); // Retrieve token using getToken
      const response = await fetch("/api/campaigns", {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });
      if (!response.ok) throw new Error("Failed to fetch campaigns");
      return response.json();
    },
  });

  // Mock data for demonstration
  const mockCampaigns = [
    {
      id: "1",
      name: "Q4 Product Launch - Email",
      type: "email",
      status: "active",
      sent: 15420,
      opened: 4326,
      clicked: 892,
      startDate: "2025-10-01",
    },
    {
      id: "2",
      name: "Enterprise Outreach - Phone",
      type: "telemarketing",
      status: "active",
      calls: 342,
      connected: 128,
      qualified: 42,
      startDate: "2025-10-05",
    },
    {
      id: "3",
      name: "Newsletter October - Email",
      type: "email",
      status: "completed",
      sent: 8920,
      opened: 2456,
      clicked: 534,
      startDate: "2025-10-10",
    },
  ];

  const filteredCampaigns = activeTab === "all" 
    ? mockCampaigns 
    : mockCampaigns.filter(c => c.type === activeTab);

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
            <div className="text-2xl font-bold">{mockCampaigns.length}</div>
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
              {mockCampaigns.filter(c => c.type === "email").length}
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
              {mockCampaigns.filter(c => c.type === "telemarketing").length}
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
                          <Button
                            size="sm"
                            variant="ghost"
                            data-testid={`button-pause-${campaign.id}`}
                          >
                            {campaign.status === "active" ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
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
    </div>
  );
}