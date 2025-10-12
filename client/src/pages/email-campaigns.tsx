import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Mail, Play, Pause, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Progress } from "@/components/ui/progress";

export default function EmailCampaignsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const campaigns = [
    {
      id: "1",
      name: "Q2 Product Launch - Enterprise",
      status: "active",
      subject: "Introducing our new enterprise features",
      sent: 4523,
      delivered: 4498,
      opened: 1876,
      clicked: 432,
      target: 5000
    },
    {
      id: "2",
      name: "Webinar Invitation - AI Trends",
      status: "scheduled",
      subject: "Join us for an exclusive webinar on AI trends",
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      target: 2500
    },
    {
      id: "3",
      name: "Follow-up Campaign - Demo Requests",
      status: "completed",
      subject: "Thank you for requesting a demo",
      sent: 189,
      delivered: 187,
      opened: 124,
      clicked: 78,
      target: 189
    },
  ];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      active: "default",
      scheduled: "secondary",
      completed: "outline",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Campaigns</h1>
          <p className="text-muted-foreground mt-1">
            Create, manage, and track your email marketing campaigns
          </p>
        </div>
        <Button data-testid="button-create-email-campaign">
          <Plus className="mr-2 h-4 w-4" />
          Create Campaign
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search campaigns..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-campaigns"
          />
        </div>
      </div>

      {campaigns.length > 0 ? (
        <div className="grid gap-4">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="hover-elevate" data-testid={`card-campaign-${campaign.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle>{campaign.name}</CardTitle>
                      {getStatusBadge(campaign.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Subject: {campaign.subject}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {campaign.status === "active" && (
                      <Button variant="outline" size="sm" data-testid={`button-pause-campaign-${campaign.id}`}>
                        <Pause className="mr-2 h-4 w-4" />
                        Pause
                      </Button>
                    )}
                    {campaign.status === "scheduled" && (
                      <Button size="sm" data-testid={`button-launch-campaign-${campaign.id}`}>
                        <Play className="mr-2 h-4 w-4" />
                        Launch Now
                      </Button>
                    )}
                    <Button variant="outline" size="sm" data-testid={`button-view-stats-${campaign.id}`}>
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Stats
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {campaign.status === "active" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{campaign.sent} / {campaign.target}</span>
                      </div>
                      <Progress value={(campaign.sent / campaign.target) * 100} />
                    </div>
                  )}

                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <div className="text-2xl font-bold" data-testid={`campaign-sent-${campaign.id}`}>
                        {campaign.sent.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Sent</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-chart-2" data-testid={`campaign-delivered-${campaign.id}`}>
                        {campaign.delivered.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Delivered</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-chart-1" data-testid={`campaign-opened-${campaign.id}`}>
                        {campaign.opened.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Opened ({campaign.delivered > 0 ? Math.round((campaign.opened / campaign.delivered) * 100) : 0}%)
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-chart-4" data-testid={`campaign-clicked-${campaign.id}`}>
                        {campaign.clicked.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Clicked ({campaign.opened > 0 ? Math.round((campaign.clicked / campaign.opened) * 100) : 0}%)
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Mail}
          title="No email campaigns yet"
          description="Create your first email campaign with our wizard to start engaging your audience."
          actionLabel="Create Campaign"
          onAction={() => {}}
        />
      )}
    </div>
  );
}
