import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, CheckCircle, XCircle, Clock, Download, Loader2, Phone, Play, Eye, User } from "lucide-react";
import { FilterBuilder } from "@/components/filter-builder";
import type { FilterGroup } from "@shared/filter-types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type { LeadWithAccount } from "@shared/schema";

export default function LeadsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingLeadId, setRejectingLeadId] = useState<string | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadWithAccount | null>(null);
  const [filterGroup, setFilterGroup] = useState<FilterGroup | undefined>(undefined);
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: leads = [], isLoading } = useQuery<LeadWithAccount[]>({
    queryKey: ['/api/leads'],
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }
      return await apiRequest('POST', `/api/leads/${id}/approve`, { approvedById: user.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads'], refetchType: 'active' });
      toast({
        title: "Success",
        description: "Lead approved successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve lead",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return await apiRequest('POST', `/api/leads/${id}/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads'], refetchType: 'active' });
      setRejectDialogOpen(false);
      setRejectReason("");
      setRejectingLeadId(null);
      toast({
        title: "Success",
        description: "Lead rejected",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject lead",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; label: string }> = {
      new: { variant: "secondary", label: "New" },
      under_review: { variant: "default", label: "Under Review" },
      approved: { variant: "outline", label: "Approved" },
      rejected: { variant: "destructive", label: "Rejected" },
      published: { variant: "outline", label: "Published" },
    };
    const { variant, label } = config[status] || config.new;
    return <Badge variant={variant} data-testid={`badge-status-${status}`}>{label}</Badge>;
  };

  const toggleLead = (id: string) => {
    setSelectedLeads(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBulkApprove = async () => {
    for (const id of selectedLeads) {
      await approveMutation.mutateAsync(id);
    }
    setSelectedLeads([]);
  };

  const handleReject = (id: string) => {
    setRejectingLeadId(id);
    setRejectDialogOpen(true);
  };

  const pendingLeads = leads.filter(l => l.qaStatus === 'new' || l.qaStatus === 'under_review');
  const approvedLeads = leads.filter(l => l.qaStatus === 'approved' || l.qaStatus === 'published');
  const rejectedLeads = leads.filter(l => l.qaStatus === 'rejected');

  const renderLeadsTable = (leadsData: LeadWithAccount[], showCheckbox = false, showActions = false) => {
    if (isLoading) {
      return (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                {showCheckbox && <TableHead className="w-[50px]"></TableHead>}
                <TableHead>Contact</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                {showActions && <TableHead className="w-[200px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3].map((i) => (
                <TableRow key={i}>
                  {showCheckbox && <TableCell><Skeleton className="h-4 w-4" /></TableCell>}
                  <TableCell><Skeleton className="h-10 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  {showActions && <TableCell><Skeleton className="h-8 w-32" /></TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      );
    }

    if (leadsData.length === 0) {
      return (
        <EmptyState
          icon={Clock}
          title="No leads found"
          description="Leads will appear here once they're submitted for review."
        />
      );
    }

    return (
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {showCheckbox && (
                <TableHead className="w-[50px]">
                  <Checkbox 
                    checked={selectedLeads.length === leadsData.length && leadsData.length > 0}
                    onCheckedChange={(checked) => {
                      setSelectedLeads(checked ? leadsData.map(l => l.id) : []);
                    }}
                    data-testid="checkbox-select-all"
                  />
                </TableHead>
              )}
              <TableHead>Contact</TableHead>
              <TableHead>Campaign</TableHead>
              <TableHead>Agent / Caller</TableHead>
              <TableHead>Call Recording</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              {showActions && <TableHead className="w-[200px]">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {leadsData.map((lead) => {
              const initials = lead.contactName?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
              
              return (
                <TableRow key={lead.id} data-testid={`row-lead-${lead.id}`}>
                  {showCheckbox && (
                    <TableCell>
                      <Checkbox
                        checked={selectedLeads.includes(lead.id)}
                        onCheckedChange={() => toggleLead(lead.id)}
                        data-testid={`checkbox-lead-${lead.id}`}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium" data-testid={`text-contact-name-${lead.id}`}>
                          {lead.contactName || 'Unknown'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {lead.accountName || 'No company'}
                        </div>
                        <div className="text-sm text-muted-foreground font-mono">
                          {lead.contactEmail || 'No email'}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell data-testid={`text-campaign-${lead.id}`}>
                    {lead.campaignId || '-'}
                  </TableCell>
                  <TableCell>
                    {lead.agentFirstName || lead.agentLastName ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {`${lead.agentFirstName?.[0] || ''}${lead.agentLastName?.[0] || ''}`.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-sm">
                          <div className="font-medium" data-testid={`text-agent-name-${lead.id}`}>
                            {`${lead.agentFirstName || ''} ${lead.agentLastName || ''}`.trim()}
                          </div>
                          {lead.agentEmail && (
                            <div className="text-xs text-muted-foreground font-mono">
                              {lead.agentEmail}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {lead.recordingUrl ? (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => window.open(lead.recordingUrl!, '_blank')}
                          data-testid={`button-play-recording-${lead.id}`}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        {lead.callDuration && (
                          <span className="text-sm text-muted-foreground font-mono">
                            {Math.floor(lead.callDuration / 60)}:{(lead.callDuration % 60).toString().padStart(2, '0')}
                          </span>
                        )}
                        <Badge variant="outline" className="text-xs">
                          <Phone className="mr-1 h-3 w-3" />
                          Call
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(lead.qaStatus)}</TableCell>
                  <TableCell className="text-muted-foreground" data-testid={`text-submitted-${lead.id}`}>
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </TableCell>
                  {showActions && (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedLead(lead);
                            setDetailDialogOpen(true);
                          }}
                          data-testid={`button-view-details-${lead.id}`}
                        >
                          <Eye className="mr-1 h-4 w-4" />
                          Details
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => approveMutation.mutate(lead.id)}
                          disabled={approveMutation.isPending}
                          data-testid={`button-approve-${lead.id}`}
                        >
                          <CheckCircle className="mr-1 h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(lead.id)}
                          disabled={rejectMutation.isPending}
                          data-testid={`button-reject-${lead.id}`}
                        >
                          <XCircle className="mr-1 h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-leads-qa">Leads & QA</h1>
          <p className="text-muted-foreground mt-1">
            Review, approve, and manage qualified leads
          </p>
        </div>
        <Button data-testid="button-download-approved">
          <Download className="mr-2 h-4 w-4" />
          Download Approved
        </Button>
      </div>

      <Tabs defaultValue="review" className="w-full">
        <TabsList>
          <TabsTrigger value="review" data-testid="tab-review">
            <Clock className="mr-2 h-4 w-4" />
            Pending Review ({pendingLeads.length})
          </TabsTrigger>
          <TabsTrigger value="approved" data-testid="tab-approved">
            <CheckCircle className="mr-2 h-4 w-4" />
            Approved ({approvedLeads.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" data-testid="tab-rejected">
            <XCircle className="mr-2 h-4 w-4" />
            Rejected ({rejectedLeads.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="review" className="space-y-4 mt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search leads..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search-leads"
                />
              </div>
              <FilterBuilder
                entityType="contact"
                onApplyFilter={setFilterGroup}
                initialFilter={filterGroup}
              />
            </div>
            {selectedLeads.length > 0 && (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleBulkApprove}
                  disabled={approveMutation.isPending}
                  data-testid="button-bulk-approve"
                >
                  {approveMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  )}
                  Approve ({selectedLeads.length})
                </Button>
              </div>
            )}
          </div>

          {renderLeadsTable(pendingLeads, true, true)}
        </TabsContent>

        <TabsContent value="approved" className="mt-6">
          {renderLeadsTable(approvedLeads)}
        </TabsContent>

        <TabsContent value="rejected" className="mt-6">
          {renderLeadsTable(rejectedLeads)}
        </TabsContent>
      </Tabs>

      {/* Lead Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-lead-detail">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Lead Details: {selectedLead?.contactName}
            </DialogTitle>
            <DialogDescription>
              Review complete lead information, QA checklist, and AI analysis
            </DialogDescription>
          </DialogHeader>

          {selectedLead && (
            <div className="space-y-6">
              {/* Contact & Agent Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Contact Information</h3>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-muted-foreground">Name:</span> {selectedLead.contactName}</div>
                    <div><span className="text-muted-foreground">Email:</span> {selectedLead.contactEmail}</div>
                    <div><span className="text-muted-foreground">Company:</span> {selectedLead.accountName || '-'}</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Agent / Caller</h3>
                  {selectedLead.agentFirstName || selectedLead.agentLastName ? (
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {`${selectedLead.agentFirstName?.[0] || ''}${selectedLead.agentLastName?.[0] || ''}`.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{`${selectedLead.agentFirstName || ''} ${selectedLead.agentLastName || ''}`.trim()}</div>
                        <div className="text-xs text-muted-foreground font-mono">{selectedLead.agentEmail}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">No agent assigned</div>
                  )}
                </div>
              </div>

              {/* Call Recording & Duration */}
              {selectedLead.recordingUrl && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Call Recording</h3>
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      onClick={() => window.open(selectedLead.recordingUrl!, '_blank')}
                      data-testid="button-play-recording-detail"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Play Recording
                    </Button>
                    {selectedLead.callDuration && (
                      <span className="text-sm text-muted-foreground">
                        Duration: {Math.floor(selectedLead.callDuration / 60)}:{(selectedLead.callDuration % 60).toString().padStart(2, '0')}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* AI Analysis */}
              {(selectedLead.aiScore || selectedLead.aiQualificationStatus) && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">AI Analysis</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedLead.aiScore && (
                      <div>
                        <span className="text-muted-foreground text-sm">AI Score:</span>
                        <div className="text-2xl font-bold text-primary">{selectedLead.aiScore}/100</div>
                      </div>
                    )}
                    {selectedLead.aiQualificationStatus && (
                      <div>
                        <span className="text-muted-foreground text-sm">AI Status:</span>
                        <Badge className="mt-1">{selectedLead.aiQualificationStatus}</Badge>
                      </div>
                    )}
                  </div>
                  {selectedLead.aiAnalysis && typeof selectedLead.aiAnalysis === 'object' && (
                    <div className="mt-2 p-3 bg-muted rounded-md">
                      <pre className="text-xs overflow-auto">{JSON.stringify(selectedLead.aiAnalysis, null, 2)}</pre>
                    </div>
                  )}
                </div>
              )}

              {/* Transcript */}
              {selectedLead.transcript && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Call Transcript</h3>
                  <div className="p-3 bg-muted rounded-md max-h-40 overflow-y-auto">
                    <p className="text-sm whitespace-pre-wrap">{selectedLead.transcript}</p>
                  </div>
                </div>
              )}

              {/* QA Checklist */}
              {selectedLead.checklistJson && typeof selectedLead.checklistJson === 'object' && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">QA Checklist</h3>
                  <div className="space-y-2">
                    {Object.entries(selectedLead.checklistJson as Record<string, any>).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2">
                        <Checkbox
                          checked={!!value}
                          disabled
                          data-testid={`checkbox-qa-${key}`}
                        />
                        <span className="text-sm">{key}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedLead.notes && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Agent Notes</h3>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm whitespace-pre-wrap">{selectedLead.notes}</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => setDetailDialogOpen(false)}
                  data-testid="button-close-detail"
                >
                  Close
                </Button>
                {selectedLead.qaStatus === 'new' && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        handleReject(selectedLead.id);
                        setDetailDialogOpen(false);
                      }}
                      data-testid="button-reject-from-detail"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                    <Button
                      onClick={() => {
                        approveMutation.mutate(selectedLead.id);
                        setDetailDialogOpen(false);
                      }}
                      disabled={approveMutation.isPending}
                      data-testid="button-approve-from-detail"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve Lead
                    </Button>
                  </>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent data-testid="dialog-reject-lead">
          <DialogHeader>
            <DialogTitle>Reject Lead</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this lead
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter rejection reason..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
            data-testid="textarea-reject-reason"
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectReason("");
                setRejectingLeadId(null);
              }}
              data-testid="button-cancel-reject"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (rejectingLeadId && rejectReason.trim()) {
                  rejectMutation.mutate({ id: rejectingLeadId, reason: rejectReason });
                }
              }}
              disabled={!rejectReason.trim() || rejectMutation.isPending}
              variant="destructive"
              data-testid="button-confirm-reject"
            >
              {rejectMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Reject Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
