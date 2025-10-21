import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Mail,
  ShieldX,
  Clock,
  BarChart3,
  TrendingUp,
  Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Contact {
  id: string;
  fullName: string;
  email: string | null;
  title: string | null;
  accountName: string | null;
  verificationStatus: string;
  emailStatus: string;
  suppressed: boolean;
  eligibilityStatus: string;
  eligibilityReason: string | null;
}

export default function VerificationCampaignStatsPage() {
  const { campaignId } = useParams();
  const [, navigate] = useLocation();
  const [detailDialog, setDetailDialog] = useState<{
    open: boolean;
    title: string;
    filter: string;
  }>({ open: false, title: "", filter: "" });

  const { data: campaign } = useQuery({
    queryKey: ["/api/verification-campaigns", campaignId],
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/verification-campaigns", campaignId, "stats"],
    refetchInterval: 10000,
  });

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/verification-campaigns", campaignId, "all-contacts", detailDialog.filter],
    queryFn: async () => {
      if (!detailDialog.open || !detailDialog.filter) return [];
      
      const res = await fetch(
        `/api/verification-campaigns/${campaignId}/contacts?filter=${detailDialog.filter}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
          credentials: "include",
        }
      );
      if (!res.ok) throw new Error("Failed to fetch contacts");
      return res.json();
    },
    enabled: detailDialog.open && !!detailDialog.filter,
  });

  const openDetail = (title: string, filter: string) => {
    setDetailDialog({ open: true, title, filter });
  };

  const closeDetail = () => {
    setDetailDialog({ open: false, title: "", filter: "" });
  };

  if (!campaign || !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading campaign stats...</div>
      </div>
    );
  }

  const okRate = stats.validatedCount > 0
    ? ((stats.okEmailCount / stats.validatedCount) * 100).toFixed(1)
    : "0";
  
  const deliverabilityRate = stats.validatedCount > 0
    ? ((stats.okEmailCount / stats.validatedCount) * 100).toFixed(1)
    : "0";
  
  const suppressionRate = stats.totalContacts > 0
    ? ((stats.suppressedCount / stats.totalContacts) * 100).toFixed(1)
    : "0";

  const targetOkRate = (campaign as any).okRateTarget || 95;
  const targetDeliverability = (campaign as any).deliverabilityTarget || 97;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/verification")}
                data-testid="button-back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-semibold" data-testid="text-campaign-name">
                  {campaign.name} - Campaign Statistics
                </h1>
                <p className="text-sm text-muted-foreground">
                  Real-time analytics and metrics
                </p>
              </div>
            </div>
            <Button
              onClick={() => navigate(`/verification/${campaignId}/console`)}
              data-testid="button-console"
            >
              Open Console
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Contacts */}
          <Card
            className="hover-elevate active-elevate-2 cursor-pointer"
            onClick={() => openDetail("All Contacts", "all")}
            data-testid="card-total-contacts"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalContacts}</div>
              <p className="text-xs text-muted-foreground mt-1">
                All uploaded contacts
              </p>
            </CardContent>
          </Card>

          {/* Eligible */}
          <Card
            className="hover-elevate active-elevate-2 cursor-pointer"
            onClick={() => openDetail("Eligible Contacts", "eligible")}
            data-testid="card-eligible"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Eligible</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.eligibleCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Meet campaign criteria
              </p>
            </CardContent>
          </Card>

          {/* Suppressed */}
          <Card
            className="hover-elevate active-elevate-2 cursor-pointer"
            onClick={() => openDetail("Suppressed Contacts", "suppressed")}
            data-testid="card-suppressed"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Suppressed</CardTitle>
              <ShieldX className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.suppressedCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {suppressionRate}% of total
              </p>
            </CardContent>
          </Card>

          {/* Submitted */}
          <Card
            className="hover-elevate active-elevate-2 cursor-pointer"
            onClick={() => openDetail("Submitted Leads", "submitted")}
            data-testid="card-submitted"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Submitted</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.submittedCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Delivered to client
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Email Validation Section */}
        <Card data-testid="card-email-validation">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Validation Results
            </CardTitle>
            <CardDescription>
              Manual EmailListVerify validation with quality metrics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Validation Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card
                className="hover-elevate active-elevate-2 cursor-pointer"
                onClick={() => openDetail("Validated Contacts", "validated")}
                data-testid="card-validated"
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Validated</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.validatedCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Manually validated
                  </p>
                </CardContent>
              </Card>

              <Card
                className="hover-elevate active-elevate-2 cursor-pointer"
                onClick={() => openDetail("OK Emails", "ok_email")}
                data-testid="card-ok-email"
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">OK Emails</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats.okEmailCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Valid + Accept All
                  </p>
                </CardContent>
              </Card>

              <Card
                className="hover-elevate active-elevate-2 cursor-pointer"
                onClick={() => openDetail("Invalid Emails", "invalid_email")}
                data-testid="card-invalid-email"
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Invalid</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{stats.invalidEmailCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Failed validation
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quality Metrics */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">OK Email Rate</span>
                  <span className="text-sm font-semibold">{okRate}%</span>
                </div>
                <Progress
                  value={parseFloat(okRate)}
                  className="h-2"
                  data-testid="progress-ok-rate"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Target: {targetOkRate}% (
                  {parseFloat(okRate) >= targetOkRate ? (
                    <span className="text-green-600">✓ Met</span>
                  ) : (
                    <span className="text-red-600">Below target</span>
                  )}
                  )
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Deliverability Rate</span>
                  <span className="text-sm font-semibold">{deliverabilityRate}%</span>
                </div>
                <Progress
                  value={parseFloat(deliverabilityRate)}
                  className="h-2"
                  data-testid="progress-deliverability"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Target: {targetDeliverability}% (
                  {parseFloat(deliverabilityRate) >= targetDeliverability ? (
                    <span className="text-green-600">✓ Met</span>
                  ) : (
                    <span className="text-red-600">Below target</span>
                  )}
                  )
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pipeline Status */}
        <Card data-testid="card-pipeline">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Verification Pipeline
            </CardTitle>
            <CardDescription>
              Contact flow through verification stages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Total Uploaded</span>
                <Badge variant="secondary">{stats.totalContacts}</Badge>
              </div>
              <div className="flex items-center justify-between pl-4 border-l-2">
                <span className="text-sm">Eligible (not suppressed)</span>
                <Badge variant="secondary">{stats.eligibleCount}</Badge>
              </div>
              <div className="flex items-center justify-between pl-8 border-l-2">
                <span className="text-sm">Validated</span>
                <Badge variant="secondary">{stats.validatedCount}</Badge>
              </div>
              <div className="flex items-center justify-between pl-12 border-l-2">
                <span className="text-sm">OK Emails</span>
                <Badge className="bg-green-600">{stats.okEmailCount}</Badge>
              </div>
              <div className="flex items-center justify-between pl-16 border-l-2 border-blue-500">
                <span className="text-sm font-semibold">Submitted to Client</span>
                <Badge className="bg-blue-600">{stats.submittedCount}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailDialog.open} onOpenChange={(open) => !open && closeDetail()}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{detailDialog.title}</DialogTitle>
            <DialogDescription>
              {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-2">
              {contacts.map((contact) => (
                <Card key={contact.id} className="hover-elevate" data-testid={`contact-${contact.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="font-semibold">{contact.fullName}</div>
                        <div className="text-sm text-muted-foreground">{contact.email}</div>
                        <div className="text-sm text-muted-foreground">{contact.title}</div>
                        <div className="text-xs text-muted-foreground">{contact.accountName}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {contact.suppressed && (
                          <Badge variant="destructive">Suppressed</Badge>
                        )}
                        <Badge variant={contact.eligibilityStatus === 'Eligible' ? 'default' : 'secondary'}>
                          {contact.eligibilityStatus}
                        </Badge>
                        {contact.verificationStatus !== 'Pending' && (
                          <Badge variant={contact.verificationStatus === 'Validated' ? 'default' : 'secondary'}>
                            {contact.verificationStatus}
                          </Badge>
                        )}
                        {contact.emailStatus && contact.emailStatus !== 'unknown' && (
                          <Badge
                            variant={contact.emailStatus === 'ok' ? 'default' : 'destructive'}
                            className={contact.emailStatus === 'ok' ? 'bg-green-600' : ''}
                          >
                            {contact.emailStatus}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {contacts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No contacts found
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
