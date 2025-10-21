import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle, Mail, BarChart3, Filter, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

export default function VerificationConsolePage() {
  const { campaignId } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [currentContactId, setCurrentContactId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<{ id: string; name: string; accountId?: string; accountName?: string } | null>(null);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleteReason, setBulkDeleteReason] = useState("");
  const [filters, setFilters] = useState({
    contactSearch: "",
    companySearch: "",
    sourceType: "",
  });

  const updateFilters = (newFilters: typeof filters) => {
    setFilters(newFilters);
    setSelectedContactIds(new Set<string>());
  };

  const { data: campaign } = useQuery({
    queryKey: ["/api/verification-campaigns", campaignId],
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/verification-campaigns", campaignId, "stats"],
    refetchInterval: 10000,
  });

  const { data: queue, isLoading: queueLoading } = useQuery({
    queryKey: ["/api/verification-campaigns", campaignId, "queue", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.contactSearch) params.append("contactSearch", filters.contactSearch);
      if (filters.companySearch) params.append("companySearch", filters.companySearch);
      if (filters.sourceType) params.append("sourceType", filters.sourceType);
      
      const url = `/api/verification-campaigns/${campaignId}/queue?${params.toString()}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch queue");
      return res.json();
    },
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

  const { data: associatedContacts = [] } = useQuery<any[]>({
    queryKey: ["/api/verification-contacts/account", (contact as any)?.account_id, { campaignId }],
    enabled: !!currentContactId && !!(contact as any)?.account_id && !!campaignId,
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
      const res = await apiRequest("POST", `/api/verification-contacts/${currentContactId}/validate-email`, undefined);
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

  const deleteMutation = useMutation({
    mutationFn: async (contactId: string) => {
      const res = await apiRequest("DELETE", `/api/verification-contacts/${contactId}`, undefined);
      return res.json();
    },
    onSuccess: (_, contactId) => {
      toast({
        title: "Contact deleted",
        description: "Contact has been removed from the queue",
      });
      setCurrentContactId(null);
      setDeleteDialogOpen(false);
      setContactToDelete(null);
      
      queryClient.removeQueries({ queryKey: ["/api/verification-contacts", contactId] });
      queryClient.invalidateQueries({ queryKey: ["/api/verification-campaigns", campaignId, "queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/verification-campaigns", campaignId, "stats"] });
      
      if (contactToDelete?.accountId) {
        queryClient.invalidateQueries({ 
          queryKey: ["/api/verification-contacts/account", contactToDelete.accountId, { campaignId }] 
        });
      }
      if (contactToDelete?.accountName) {
        queryClient.invalidateQueries({ 
          queryKey: ["/api/verification-campaigns", campaignId, "accounts", contactToDelete.accountName, "cap"] 
        });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete contact",
        variant: "destructive",
      });
      setDeleteDialogOpen(false);
      setContactToDelete(null);
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async ({ contactIds, reason }: { contactIds: string[]; reason?: string }) => {
      const res = await apiRequest("POST", `/api/verification-campaigns/${campaignId}/contacts/bulk-delete`, { 
        contactIds, 
        reason 
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Bulk delete successful",
        description: `${data.deletedCount} contact(s) have been deleted`,
      });
      setSelectedContactIds(new Set());
      setBulkDeleteDialogOpen(false);
      setBulkDeleteReason("");
      
      queryClient.invalidateQueries({ queryKey: ["/api/verification-campaigns", campaignId, "queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/verification-campaigns", campaignId, "stats"] });
    },
    onError: (error: any) => {
      toast({
        title: "Bulk delete failed",
        description: error.message || "Failed to delete contacts",
        variant: "destructive",
      });
    },
  });

  const loadNextContact = () => {
    if ((queue as any)?.data && (queue as any).data.length > 0) {
      setCurrentContactId((queue as any).data[0].id);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && (queue as any)?.data) {
      const allIds = new Set<string>((queue as any).data.map((c: any) => c.id as string));
      setSelectedContactIds(allIds);
    } else {
      setSelectedContactIds(new Set<string>());
    }
  };

  const handleSelectContact = (contactId: string, checked: boolean) => {
    const newSelection = new Set(selectedContactIds);
    if (checked) {
      newSelection.add(contactId);
    } else {
      newSelection.delete(contactId);
    }
    setSelectedContactIds(newSelection);
  };

  const handleBulkDelete = () => {
    if (selectedContactIds.size === 0) return;
    setBulkDeleteDialogOpen(true);
  };

  const confirmBulkDelete = () => {
    if (selectedContactIds.size === 0) return;
    bulkDeleteMutation.mutate({ 
      contactIds: Array.from(selectedContactIds), 
      reason: bulkDeleteReason || "Bulk delete via console" 
    });
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
            <CardTitle className="text-sm font-medium">Eligible (Total)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-eligible-count">
              {(stats as any)?.eligible_count || 0}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              <span className="text-green-600">✓ {(stats as any)?.eligible_unsuppressed_count || 0} Active</span>
              {" • "}
              <span className="text-destructive">✗ {(stats as any)?.eligible_suppressed_count || 0} Suppressed</span>
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Verification Queue</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {queueLoading ? "Loading..." : `${(queue as any)?.total || 0} contacts ready for verification`}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                data-testid="button-toggle-filters"
              >
                <Filter className="h-4 w-4 mr-2" />
                {showFilters ? "Hide" : "Show"} Filters
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showFilters && (
              <div className="mb-4 p-4 border rounded-md bg-muted/50 space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label className="text-xs">Contact Search</Label>
                    <Input
                      placeholder="Name or email..."
                      value={filters.contactSearch}
                      onChange={(e) => updateFilters({ ...filters, contactSearch: e.target.value })}
                      data-testid="input-contact-search"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Company Search</Label>
                    <Input
                      placeholder="Company name..."
                      value={filters.companySearch}
                      onChange={(e) => updateFilters({ ...filters, companySearch: e.target.value })}
                      data-testid="input-company-search"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Source Type</Label>
                    <Select
                      value={filters.sourceType || "all"}
                      onValueChange={(value) => updateFilters({ ...filters, sourceType: value === "all" ? "" : value })}
                    >
                      <SelectTrigger data-testid="select-source-type">
                        <SelectValue placeholder="All sources" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All sources</SelectItem>
                        <SelectItem value="Client_Provided">Client Provided</SelectItem>
                        <SelectItem value="New_Sourced">New Sourced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {(filters.contactSearch || filters.companySearch || filters.sourceType)
                      ? "Filters active"
                      : "No filters applied"}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      updateFilters({ contactSearch: "", companySearch: "", sourceType: "" });
                    }}
                    data-testid="button-clear-filters"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear All
                  </Button>
                </div>
              </div>
            )}
            {selectedContactIds.size > 0 && (
              <div className="mb-4 p-3 border rounded-md bg-primary/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="default" className="px-3 py-1">
                    {selectedContactIds.size} selected
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedContactIds(new Set())}
                    disabled={bulkDeleteMutation.isPending}
                    data-testid="button-clear-selection"
                  >
                    Clear Selection
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleBulkDelete}
                  disabled={bulkDeleteMutation.isPending}
                  data-testid="button-bulk-delete"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {bulkDeleteMutation.isPending ? "Deleting..." : `Delete Selected (${selectedContactIds.size})`}
                </Button>
              </div>
            )}
            {queueLoading ? (
              <div className="text-muted-foreground" data-testid="text-loading">Loading queue...</div>
            ) : (queue as any)?.data && (queue as any).data.length > 0 ? (
              <div className="border rounded-md">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="w-12 p-3">
                        <Checkbox
                          checked={selectedContactIds.size === (queue as any).data.length && (queue as any).data.length > 0}
                          onCheckedChange={handleSelectAll}
                          data-testid="checkbox-select-all"
                        />
                      </th>
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
                        <td className="w-12 p-3" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedContactIds.has(contact.id)}
                            onCheckedChange={(checked) => handleSelectContact(contact.id, !!checked)}
                            data-testid={`checkbox-select-${index}`}
                          />
                        </td>
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
                          <div className="flex gap-2 justify-end">
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
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                setContactToDelete({
                                  id: contact.id,
                                  name: contact.full_name || contact.fullName || "this contact",
                                  accountId: contact.account_id || contact.accountId,
                                  accountName: contact.account_name || contact.accountName,
                                });
                                setDeleteDialogOpen(true);
                              }}
                              disabled={deleteMutation.isPending}
                              data-testid={`button-delete-${index}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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
        <div className="space-y-4">
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
              <CardTitle>Contact & Company Information</CardTitle>
              <div className="flex gap-2">
                <Badge variant={((contact as any)?.eligibility_status || (contact as any)?.eligibilityStatus) === 'Eligible' ? 'default' : 'secondary'}>
                  {(contact as any)?.eligibility_status || (contact as any)?.eligibilityStatus}
                </Badge>
                {(contact as any)?.suppressed && <Badge variant="destructive">Suppressed</Badge>}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold mb-3">Contact Details</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Full Name</Label>
                    <Input value={(contact as any)?.full_name || (contact as any)?.fullName || ""} readOnly data-testid="input-full-name" />
                  </div>
                  <div>
                    <Label>Title</Label>
                    <Input value={(contact as any)?.title || ""} readOnly data-testid="input-title" />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <div className="flex gap-2">
                      <Input value={(contact as any)?.email || ""} readOnly data-testid="input-email" />
                      {((contact as any)?.email_status || (contact as any)?.emailStatus) && (
                        <Badge
                          variant={
                            ((contact as any).email_status || (contact as any).emailStatus) === 'ok'
                              ? 'default'
                              : ((contact as any).email_status || (contact as any).emailStatus) === 'invalid'
                              ? 'destructive'
                              : 'secondary'
                          }
                          data-testid="badge-email-status"
                        >
                          {((contact as any).email_status || (contact as any).emailStatus) === 'ok' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {((contact as any).email_status || (contact as any).emailStatus) === 'invalid' && <XCircle className="h-3 w-3 mr-1" />}
                          {((contact as any).email_status || (contact as any).emailStatus) === 'risky' && <AlertCircle className="h-3 w-3 mr-1" />}
                          {(contact as any).email_status || (contact as any).emailStatus}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input value={(contact as any)?.phone || ""} readOnly data-testid="input-phone" />
                  </div>
                  <div>
                    <Label>Mobile</Label>
                    <Input value={(contact as any)?.mobile || ""} readOnly data-testid="input-mobile" />
                  </div>
                  <div>
                    <Label>LinkedIn URL</Label>
                    <Input value={(contact as any)?.linkedin_url || (contact as any)?.linkedinUrl || ""} readOnly data-testid="input-linkedin" />
                  </div>
                  <div>
                    <Label>City</Label>
                    <Input value={(contact as any)?.contact_city || (contact as any)?.contactCity || ""} readOnly data-testid="input-city" />
                  </div>
                  <div>
                    <Label>State</Label>
                    <Input value={(contact as any)?.contact_state || (contact as any)?.contactState || ""} readOnly data-testid="input-state" />
                  </div>
                  <div>
                    <Label>Country</Label>
                    <Input value={(contact as any)?.contact_country || (contact as any)?.contactCountry || ""} readOnly data-testid="input-country" />
                  </div>
                  <div>
                    <Label>Postal Code</Label>
                    <Input value={(contact as any)?.contact_postal || (contact as any)?.contactPostal || ""} readOnly data-testid="input-postal" />
                  </div>
                  <div>
                    <Label>CAV ID</Label>
                    <Input value={(contact as any)?.cav_id || (contact as any)?.cavId || ""} readOnly data-testid="input-cav-id" />
                  </div>
                  <div>
                    <Label>CAV User ID</Label>
                    <Input value={(contact as any)?.cav_user_id || (contact as any)?.cavUserId || ""} readOnly data-testid="input-cav-user-id" />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold mb-3">Company Information</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Company Name</Label>
                    <Input value={(contact as any)?.account_name || ""} readOnly data-testid="input-company-name" />
                  </div>
                  <div>
                    <Label>HQ City</Label>
                    <Input value={(contact as any)?.hq_city || ""} readOnly data-testid="input-hq-city" />
                  </div>
                  <div>
                    <Label>HQ State</Label>
                    <Input value={(contact as any)?.hq_state || ""} readOnly data-testid="input-hq-state" />
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
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold mb-3">Status & Metadata</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Source Type</Label>
                    <Input value={(contact as any)?.source_type || (contact as any)?.sourceType || ""} readOnly data-testid="input-source-type" />
                  </div>
                  <div>
                    <Label>Verification Status</Label>
                    <Input value={(contact as any)?.verification_status || (contact as any)?.verificationStatus || ""} readOnly data-testid="input-verification-status" />
                  </div>
                  <div>
                    <Label>QA Status</Label>
                    <Input value={(contact as any)?.qa_status || (contact as any)?.qaStatus || ""} readOnly data-testid="input-qa-status" />
                  </div>
                </div>
              </div>

              {(contact as any)?.suppressed && (
                <div className="p-3 bg-destructive/10 border border-destructive rounded-md">
                  <p className="text-sm text-destructive font-semibold">
                    ⚠️ This contact is suppressed and cannot be processed
                  </p>
                </div>
              )}

              {(contact as any)?.eligibility_status !== 'Eligible' && !(contact as any)?.suppressed && (
                <div className="p-3 bg-muted border rounded-md">
                  <p className="text-sm text-muted-foreground">
                    ℹ️ Not eligible: {(contact as any)?.eligibility_reason || 'Out of scope'}
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  onClick={() => elvMutation.mutate()}
                  disabled={
                    elvMutation.isPending ||
                    (contact as any)?.eligibility_status !== 'Eligible' ||
                    (contact as any)?.verification_status !== 'Validated' ||
                    (contact as any)?.suppressed === true ||
                    !(contact as any)?.email ||
                    ((contact as any)?.email_status || (contact as any)?.emailStatus) === 'ok'
                  }
                  data-testid="button-validate-email"
                  title={
                    (contact as any)?.suppressed
                      ? "Contact is suppressed"
                      : (contact as any)?.eligibility_status !== 'Eligible'
                      ? "Contact must be Eligible"
                      : (contact as any)?.verification_status !== 'Validated'
                      ? "Contact must be Validated first"
                      : !(contact as any)?.email
                      ? "No email address"
                      : ""
                  }
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {elvMutation.isPending ? "Validating..." : "Validate Email"}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setContactToDelete({
                      id: currentContactId!,
                      name: (contact as any)?.full_name || (contact as any)?.fullName || "this contact",
                      accountId: (contact as any)?.account_id || (contact as any)?.accountId,
                      accountName: (contact as any)?.account_name || (contact as any)?.accountName,
                    });
                    setDeleteDialogOpen(true);
                  }}
                  disabled={deleteMutation.isPending}
                  data-testid="button-delete-contact"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
                <div className="flex-1" />
                <Button
                  variant="outline"
                  onClick={() => setCurrentContactId(null)}
                  data-testid="button-skip"
                  disabled={(contact as any)?.suppressed}
                >
                  Skip
                </Button>
                <Button 
                  onClick={handleSaveAndNext} 
                  data-testid="button-save-next"
                  disabled={(contact as any)?.suppressed || (contact as any)?.eligibility_status !== 'Eligible'}
                >
                  Save & Next
                </Button>
              </div>
            </CardContent>
          </Card>

          {(contact as any)?.account_id && (
            <Card>
              <CardHeader>
                <CardTitle>Associated Contacts from {(contact as any)?.account_name}</CardTitle>
              </CardHeader>
              <CardContent>
                {associatedContacts.length > 0 ? (
                  <div className="space-y-2">
                    {associatedContacts.map((assocContact: any, index: number) => (
                      <div
                        key={assocContact.id}
                        className={`p-3 border rounded-md flex items-center justify-between ${
                          assocContact.id === currentContactId ? 'bg-accent' : 'hover-elevate'
                        }`}
                        data-testid={`contact-card-${index}`}
                      >
                        <div className="flex-1 grid grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm font-medium">{assocContact.full_name || assocContact.fullName}</p>
                            <p className="text-xs text-muted-foreground">{assocContact.title || "-"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Email</p>
                            <p className="text-sm">{assocContact.email || "-"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Phone</p>
                            <p className="text-sm">{assocContact.phone || assocContact.mobile || "-"}</p>
                          </div>
                          <div>
                            <Badge variant="outline" className="text-xs">
                              {assocContact.verification_status || assocContact.verificationStatus}
                            </Badge>
                          </div>
                        </div>
                        {assocContact.id !== currentContactId && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setCurrentContactId(assocContact.id)}
                            data-testid={`button-view-contact-${index}`}
                          >
                            View
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No other contacts found for this company.</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {contactToDelete?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (contactToDelete) {
                  deleteMutation.mutate(contactToDelete.id);
                }
              }}
              disabled={deleteMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bulk Delete Contacts</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to delete {selectedContactIds.size} contact(s). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="bulk-delete-reason">Reason (optional)</Label>
            <Input
              id="bulk-delete-reason"
              placeholder="e.g., Duplicate records, Invalid data..."
              value={bulkDeleteReason}
              onChange={(e) => setBulkDeleteReason(e.target.value)}
              data-testid="input-bulk-delete-reason"
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-bulk-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              disabled={bulkDeleteMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-confirm-bulk-delete"
            >
              {bulkDeleteMutation.isPending ? "Deleting..." : `Delete ${selectedContactIds.size} Contact(s)`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
