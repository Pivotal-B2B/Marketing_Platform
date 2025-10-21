import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle, Mail, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

export default function VerificationConsolePage() {
  const { campaignId } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [currentContactId, setCurrentContactId] = useState<string | null>(null);

  const { data: campaign } = useQuery({
    queryKey: ["/api/verification-campaigns", campaignId],
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/verification-campaigns", campaignId, "stats"],
    refetchInterval: 10000,
  });

  const { data: queue, isLoading: queueLoading } = useQuery({
    queryKey: ["/api/verification-campaigns", campaignId, "queue"],
    enabled: !currentContactId,
  });

  const { data: contact } = useQuery({
    queryKey: ["/api/verification-contacts", currentContactId],
    enabled: !!currentContactId,
  });

  const { data: accountCap } = useQuery({
    queryKey: ["/api/verification-campaigns", campaignId, "accounts", (contact as any)?.account_name, "cap"],
    enabled: !!currentContactId && !!(contact as any)?.account_name,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", `/api/verification-contacts/${currentContactId}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Contact updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/verification-contacts", currentContactId] });
      queryClient.invalidateQueries({ queryKey: ["/api/verification-campaigns", campaignId, "stats"] });
    },
  });

  const elvMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/verification-contacts/${currentContactId}/email/verify`, undefined);
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Email validated",
        description: `Status: ${data.emailStatus}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/verification-contacts", currentContactId] });
    },
    onError: (error: any) => {
      toast({
        title: "Validation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const loadNextContact = () => {
    if ((queue as any)?.data && (queue as any).data.length > 0) {
      setCurrentContactId((queue as any).data[0].id);
    }
  };

  const handleSaveAndNext = async () => {
    await updateMutation.mutateAsync({
      verificationStatus: "Validated",
    });
    setCurrentContactId(null);
    queryClient.invalidateQueries({ queryKey: ["/api/verification-campaigns", campaignId, "queue"] });
  };

  const okRate = stats ? (Number((stats as any).ok_email_count) / Math.max(1, Number((stats as any).validated_count))) : 0;
  const deliverability = stats ? 1 - (Number((stats as any).invalid_email_count) / Math.max(1, Number((stats as any).validated_count))) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/verification/campaigns")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">
              {(campaign as any)?.name || "Verification Console"}
            </h1>
            <p className="text-muted-foreground mt-1" data-testid="text-page-description">
              Data verification and enrichment workstation
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Eligible</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-eligible-count">
              {(stats as any)?.eligible_count || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Validated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-validated-count">
              {(stats as any)?.validated_count || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">OK Email Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold" data-testid="text-ok-rate">
                {(okRate * 100).toFixed(1)}%
              </div>
              <Progress value={okRate * 100} className="h-2" />
              <div className="text-xs text-muted-foreground">
                Target: {Number((campaign as any)?.okRateTarget || 0.95) * 100}%
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Deliverability</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold" data-testid="text-deliverability-rate">
                {(deliverability * 100).toFixed(1)}%
              </div>
              <Progress value={deliverability * 100} className="h-2" />
              <div className="text-xs text-muted-foreground">
                Target: {Number((campaign as any)?.deliverabilityTarget || 0.97) * 100}%
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold" data-testid="text-submission-count">
                {(stats as any)?.submission_count || 0}
              </div>
              <Progress
                value={(Number((stats as any)?.submission_count || 0) / ((campaign as any)?.monthlyTarget || 1000)) * 100}
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">
                of {(campaign as any)?.monthlyTarget || 0} target
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {!currentContactId ? (
        <Card>
          <CardHeader>
            <CardTitle>Verification Queue</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {queueLoading ? "Loading..." : `${(queue as any)?.total || 0} contacts ready for verification`}
            </p>
          </CardHeader>
          <CardContent>
            {queueLoading ? (
              <div className="text-muted-foreground" data-testid="text-loading">Loading queue...</div>
            ) : (queue as any)?.data && (queue as any).data.length > 0 ? (
              <div className="border rounded-md">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 text-sm font-medium">Name</th>
                      <th className="text-left p-3 text-sm font-medium">Company</th>
                      <th className="text-left p-3 text-sm font-medium">Email Status</th>
                      <th className="text-left p-3 text-sm font-medium">Country</th>
                      <th className="text-left p-3 text-sm font-medium">Source</th>
                      <th className="text-right p-3 text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(queue as any).data.map((contact: any, index: number) => (
                      <tr
                        key={contact.id}
                        className="border-b last:border-0 hover-elevate cursor-pointer"
                        onClick={() => setCurrentContactId(contact.id)}
                        data-testid={`row-contact-${index}`}
                      >
                        <td className="p-3 text-sm font-medium" data-testid={`text-name-${index}`}>
                          {contact.full_name || contact.fullName}
                        </td>
                        <td className="p-3 text-sm text-muted-foreground" data-testid={`text-company-${index}`}>
                          {contact.account_name || "-"}
                        </td>
                        <td className="p-3" data-testid={`badge-email-${index}`}>
                          <Badge
                            variant={
                              contact.email_status === "ok" || contact.emailStatus === "ok"
                                ? "default"
                                : contact.email_status === "invalid" || contact.emailStatus === "invalid"
                                ? "destructive"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {contact.email_status || contact.emailStatus || "unknown"}
                          </Badge>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground" data-testid={`text-country-${index}`}>
                          {contact.contact_country || contact.contactCountry || "-"}
                        </td>
                        <td className="p-3" data-testid={`badge-source-${index}`}>
                          <Badge variant="outline" className="text-xs">
                            {contact.source_type || contact.sourceType}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentContactId(contact.id);
                            }}
                            data-testid={`button-view-${index}`}
                          >
                            View Details
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground" data-testid="text-queue-empty">
                <div className="text-lg font-medium mb-2">Queue is empty</div>
                <p className="text-sm">No contacts available for verification.</p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="verify" className="space-y-4">
          <TabsList>
            <TabsTrigger value="verify" data-testid="tab-verify">Verify</TabsTrigger>
            <TabsTrigger value="company" data-testid="tab-company">Company</TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">History</TabsTrigger>
            <TabsTrigger value="qa" data-testid="tab-qa">QA</TabsTrigger>
          </TabsList>

          <TabsContent value="verify" className="space-y-4">
            {(contact as any)?.account_name && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Account Lead Cap</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {(contact as any)?.account_name}
                      </span>
                      <span className="text-sm font-medium" data-testid="text-account-cap">
                        {(accountCap as any)?.submitted || 0} / {(campaign as any)?.leadCapPerAccount || 10}
                      </span>
                    </div>
                    <Progress
                      value={((accountCap as any)?.submitted || 0) / ((campaign as any)?.leadCapPerAccount || 10) * 100}
                      className="h-2"
                      data-testid="progress-account-cap"
                    />
                    {((accountCap as any)?.submitted || 0) >= ((campaign as any)?.leadCapPerAccount || 10) && (
                      <p className="text-xs text-destructive" data-testid="text-cap-reached">
                        Cap reached - cannot submit more leads for this account
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle>Contact Details</CardTitle>
                <div className="flex gap-2">
                  <Badge variant={(contact as any)?.eligibilityStatus === 'Eligible' ? 'default' : 'secondary'}>
                    {(contact as any)?.eligibilityStatus}
                  </Badge>
                  {(contact as any)?.suppressed && <Badge variant="destructive">Suppressed</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Full Name</Label>
                    <Input value={(contact as any)?.fullName || ""} readOnly data-testid="input-full-name" />
                  </div>
                  <div>
                    <Label>Title</Label>
                    <Input value={(contact as any)?.title || ""} readOnly data-testid="input-title" />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <div className="flex gap-2">
                      <Input value={(contact as any)?.email || ""} readOnly data-testid="input-email" />
                      {(contact as any)?.emailStatus && (
                        <Badge
                          variant={
                            (contact as any).emailStatus === 'ok'
                              ? 'default'
                              : (contact as any).emailStatus === 'invalid'
                              ? 'destructive'
                              : 'secondary'
                          }
                          data-testid="badge-email-status"
                        >
                          {(contact as any).emailStatus === 'ok' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {(contact as any).emailStatus === 'invalid' && <XCircle className="h-3 w-3 mr-1" />}
                          {(contact as any).emailStatus === 'risky' && <AlertCircle className="h-3 w-3 mr-1" />}
                          {(contact as any).emailStatus}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input value={(contact as any)?.phone || ""} readOnly data-testid="input-phone" />
                  </div>
                  <div>
                    <Label>LinkedIn URL</Label>
                    <Input value={(contact as any)?.linkedinUrl || ""} readOnly data-testid="input-linkedin" />
                  </div>
                  <div>
                    <Label>Country</Label>
                    <Input value={(contact as any)?.contactCountry || ""} readOnly data-testid="input-country" />
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={() => elvMutation.mutate()}
                    disabled={elvMutation.isPending || (contact as any)?.suppressed || (contact as any)?.emailStatus === 'ok'}
                    data-testid="button-validate-email"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    {elvMutation.isPending ? "Validating..." : "Validate Email"}
                  </Button>
                  <div className="flex-1" />
                  <Button
                    variant="outline"
                    onClick={() => setCurrentContactId(null)}
                    data-testid="button-skip"
                  >
                    Skip
                  </Button>
                  <Button onClick={handleSaveAndNext} data-testid="button-save-next">
                    Save & Next
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="company">
            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Company Name</Label>
                    <Input value={(contact as any)?.account_name || ""} readOnly data-testid="input-company-name" />
                  </div>
                  <div>
                    <Label>HQ City</Label>
                    <Input value={(contact as any)?.hq_city || ""} readOnly data-testid="input-hq-city" />
                  </div>
                  <div>
                    <Label>HQ Country</Label>
                    <Input value={(contact as any)?.hq_country || ""} readOnly data-testid="input-hq-country" />
                  </div>
                  <div>
                    <Label>Domain</Label>
                    <Input value={(contact as any)?.domain || ""} readOnly data-testid="input-domain" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Verification History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Source Type:</span>{" "}
                    <span data-testid="text-source-type">{(contact as any)?.sourceType}</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Verification Status:</span>{" "}
                    <span data-testid="text-verification-status">{(contact as any)?.verificationStatus}</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">QA Status:</span>{" "}
                    <span data-testid="text-qa-status">{(contact as any)?.qaStatus}</span>
                  </div>
                  {(contact as any)?.cavId && (
                    <div className="text-sm">
                      <span className="font-medium">CAV ID:</span>{" "}
                      <span data-testid="text-cav-id">{(contact as any).cavId}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="qa">
            <Card>
              <CardHeader>
                <CardTitle>Quality Assurance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Current QA Status:</p>
                  <Badge data-testid="badge-qa-status">{(contact as any)?.qaStatus || "Unreviewed"}</Badge>
                </div>
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      await apiRequest("POST", `/api/verification-contacts/${currentContactId}/qa`, { action: "flag" });
                      queryClient.invalidateQueries({ queryKey: ["/api/verification-contacts", currentContactId] });
                    }}
                    data-testid="button-flag"
                  >
                    Flag for Review
                  </Button>
                  <Button
                    variant="default"
                    onClick={async () => {
                      await apiRequest("POST", `/api/verification-contacts/${currentContactId}/qa`, { resolution: "Passed" });
                      queryClient.invalidateQueries({ queryKey: ["/api/verification-contacts", currentContactId] });
                    }}
                    data-testid="button-approve"
                  >
                    Approve
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
