import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Building2, 
  UserPlus, 
  ArrowLeft,
  Globe,
  Users,
  DollarSign,
  MapPin,
  Sparkles,
  CheckCircle2,
  XCircle,
  Tag,
  Activity,
  FileText,
  Briefcase,
  TrendingUp,
  Shield,
  List
} from "lucide-react";
import type { Account, Contact } from "@shared/schema";
import { HeaderActionBar } from "@/components/shared/header-action-bar";
import { SectionCard } from "@/components/shared/section-card";

export default function AccountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [selectedPrimary, setSelectedPrimary] = useState<string | null>(null);
  const [selectedSecondary, setSelectedSecondary] = useState<string[]>([]);
  const [selectedReject, setSelectedReject] = useState<string[]>([]);

  const { data: account, isLoading: accountLoading } = useQuery<Account>({
    queryKey: [`/api/accounts/${id}`],
  });

  const { data: contacts = [], isLoading: contactsLoading } = useQuery<Contact[]>({
    queryKey: [`/api/accounts/${id}/contacts`],
    enabled: !!id,
  });

  const reviewAIMutation = useMutation({
    mutationFn: async (reviewData: { accept_primary?: string; add_secondary?: string[]; reject?: string[] }) => {
      const response = await apiRequest('POST', `/api/accounts/${id}/industry/ai-review`, reviewData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/accounts/${id}`] });
      setSelectedPrimary(null);
      setSelectedSecondary([]);
      setSelectedReject([]);
      toast({
        title: "Success",
        description: "AI suggestions reviewed successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  if (accountLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="border-b p-6">
          <Skeleton className="h-12 w-full" />
        </div>
        <div className="flex-1 p-6 space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Account not found</p>
        <Button variant="outline" onClick={() => setLocation('/accounts')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Accounts
        </Button>
      </div>
    );
  }

  const initials = account.name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const headerActions = [
    {
      type: "linkedin" as const,
      value: account.linkedinUrl || undefined,
      label: "View LinkedIn Profile",
    },
    {
      type: "website" as const,
      value: account.domain || undefined,
      label: "Visit Website",
    },
    {
      type: "call" as const,
      value: account.mainPhone ?? undefined,
      label: "Call Main Number",
    },
    {
      type: "email" as const,
      value: account.domain ? `info@${account.domain}` : undefined,
      label: "Send Email",
    },
    {
      type: "copy" as const,
      value: account.domain || undefined,
      label: "Copy Domain",
    },
  ];

  const badges = [
    account.industryStandardized && {
      label: account.industryStandardized,
      variant: "default" as const,
    },
  ].filter(Boolean) as Array<{ label: string; variant?: any; className?: string }>;

  return (
    <div className="h-full flex flex-col">
      {/* Header Action Bar */}
      <HeaderActionBar
        avatarFallback={initials}
        title={account.name}
        subtitle={account.domain}
        badges={badges as any}
        actions={headerActions}
        loading={accountLoading}
        rightContent={
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setLocation('/accounts')}
            data-testid="button-back-accounts"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        }
      />

      {/* Main Content - Two Column Layout */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Primary Content (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Overview Section */}
            <SectionCard
              title="Overview"
              icon={Building2}
              action={
                <Button variant="outline" size="sm">
                  Edit Details
                </Button>
              }
            >
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Industry</p>
                  <p className="font-medium">{account.industryStandardized || "-"}</p>
                  {account.industrySecondary && account.industrySecondary.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {account.industrySecondary.map((ind, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {ind}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Employee Size</p>
                  <p className="font-medium flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    {account.employeesSizeRange || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Annual Revenue</p>
                  <p className="font-medium flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    {account.annualRevenue || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Headquarters</p>
                  <p className="font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    {[account.hqCity, account.hqState, account.hqCountry]
                      .filter(Boolean)
                      .join(", ") || "-"}
                  </p>
                </div>
              </div>

              {account.techStack && account.techStack.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Technologies Installed</p>
                  <div className="flex flex-wrap gap-2">
                    {account.techStack.map((tech, idx) => (
                      <Badge key={idx} variant="secondary">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {account.intentTopics && account.intentTopics.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Intent Signals</p>
                  <div className="flex flex-wrap gap-2">
                    {account.intentTopics.map((topic, idx) => (
                      <Badge key={idx} className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </SectionCard>

            {/* Related Contacts */}
            <SectionCard
              title="Contacts"
              icon={Users}
              description={`${contacts.length} contact${contacts.length !== 1 ? 's' : ''} at this account`}
              action={
                <Button size="sm" data-testid="button-add-contact">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Contact
                </Button>
              }
            >
              {contactsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : contacts.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contacts.map((contact) => {
                        const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
                        const initials = `${contact.firstName?.[0] || ''}${contact.lastName?.[0] || ''}`.toUpperCase();
                        return (
                          <TableRow 
                            key={contact.id} 
                            className="hover-elevate cursor-pointer"
                            onClick={() => setLocation(`/contacts/${contact.id}`)}
                            data-testid={`row-contact-${contact.id}`}
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback>{initials}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{fullName || "No name"}</span>
                              </div>
                            </TableCell>
                            <TableCell>{contact.jobTitle || "-"}</TableCell>
                            <TableCell className="font-mono text-sm">{contact.email}</TableCell>
                            <TableCell className="font-mono text-sm">{contact.directPhone || "-"}</TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLocation(`/contacts/${contact.id}`);
                                }}
                                data-testid={`button-view-contact-${contact.id}`}
                              >
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No contacts linked to this account</p>
                  <Button size="sm" className="mt-4" data-testid="button-add-first-contact">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add First Contact
                  </Button>
                </div>
              )}
            </SectionCard>

            {/* AI Enrichment Section */}
            {account.industryAiCandidates && Array.isArray(account.industryAiCandidates) && account.industryAiCandidates.length > 0 && (
              <SectionCard
                title="AI Industry Suggestions"
                icon={Sparkles}
                description="Review AI-suggested industry classifications"
              >
                <div className="space-y-4">
                  {account.industryAiCandidates.map((candidate: any, idx: number) => {
                    const candidateName = candidate.name || candidate;
                    const score = candidate.score || 0;
                    const isPrimary = selectedPrimary === candidateName;
                    const isSecondary = selectedSecondary.includes(candidateName);
                    const isRejected = selectedReject.includes(candidateName);
                    
                    return (
                      <div key={idx} className="flex items-center justify-between p-4 border rounded-lg hover-elevate">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h4 className="font-medium">{candidateName}</h4>
                            <Badge variant="secondary">
                              {Math.round(score * 100)}% confidence
                            </Badge>
                          </div>
                          <div className="mt-2 flex gap-4">
                            <button
                              onClick={() => {
                                setSelectedPrimary(isPrimary ? null : candidateName);
                                if (isSecondary) setSelectedSecondary(prev => prev.filter(s => s !== candidateName));
                                if (isRejected) setSelectedReject(prev => prev.filter(s => s !== candidateName));
                              }}
                              className={`text-sm flex items-center gap-1 ${isPrimary ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                              data-testid={`button-set-primary-${idx}`}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              Set as Primary
                            </button>
                            <button
                              onClick={() => {
                                if (isSecondary) {
                                  setSelectedSecondary(prev => prev.filter(s => s !== candidateName));
                                } else {
                                  setSelectedSecondary(prev => [...prev, candidateName]);
                                  if (isPrimary) setSelectedPrimary(null);
                                  if (isRejected) setSelectedReject(prev => prev.filter(s => s !== candidateName));
                                }
                              }}
                              className={`text-sm flex items-center gap-1 ${isSecondary ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                              data-testid={`button-add-secondary-${idx}`}
                            >
                              <Tag className="h-4 w-4" />
                              {isSecondary ? 'Remove from' : 'Add to'} Secondary
                            </button>
                            <button
                              onClick={() => {
                                if (isRejected) {
                                  setSelectedReject(prev => prev.filter(s => s !== candidateName));
                                } else {
                                  setSelectedReject(prev => [...prev, candidateName]);
                                  if (isPrimary) setSelectedPrimary(null);
                                  if (isSecondary) setSelectedSecondary(prev => prev.filter(s => s !== candidateName));
                                }
                              }}
                              className={`text-sm flex items-center gap-1 ${isRejected ? 'text-destructive font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                              data-testid={`button-reject-${idx}`}
                            >
                              <XCircle className="h-4 w-4" />
                              {isRejected ? 'Undo' : 'Reject'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end gap-3 pt-4 mt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedPrimary(null);
                      setSelectedSecondary([]);
                      setSelectedReject([]);
                    }}
                    data-testid="button-clear-ai-review"
                  >
                    Clear Selection
                  </Button>
                  <Button
                    onClick={() => {
                      const reviewData: any = {};
                      if (selectedPrimary) reviewData.accept_primary = selectedPrimary;
                      if (selectedSecondary.length > 0) reviewData.add_secondary = selectedSecondary;
                      if (selectedReject.length > 0) reviewData.reject = selectedReject;
                      
                      if (!selectedPrimary && selectedSecondary.length === 0 && selectedReject.length === 0) {
                        toast({
                          variant: "destructive",
                          title: "No Action Selected",
                          description: "Please select at least one action before submitting",
                        });
                        return;
                      }
                      
                      reviewAIMutation.mutate(reviewData);
                    }}
                    disabled={reviewAIMutation.isPending}
                    data-testid="button-submit-ai-review"
                  >
                    Submit Review
                  </Button>
                </div>
              </SectionCard>
            )}

            {/* Activity Timeline */}
            <SectionCard
              title="Activity Timeline"
              icon={Activity}
              description="Recent interactions and events"
            >
              <div className="py-8 text-center">
                <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Activity tracking coming soon</p>
              </div>
            </SectionCard>
          </div>

          {/* Right Column - Contextual Actions & Info (1/3) */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <SectionCard title="Quick Actions" icon={Briefcase}>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Add to Campaign
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <List className="mr-2 h-4 w-4" />
                  Add to List
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <FileText className="mr-2 h-4 w-4" />
                  Create Note
                </Button>
              </div>
            </SectionCard>

            {/* Compliance & Health */}
            <SectionCard title="Compliance & Health" icon={Shield}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">DNC Contacts</span>
                  <Badge variant="outline">0</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Unsubscribed</span>
                  <Badge variant="outline">0</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Bounce Risk</span>
                  <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                    Low
                  </Badge>
                </div>
              </div>
            </SectionCard>

            {/* Account Summary */}
            <SectionCard title="Account Summary" icon={TrendingUp}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Contacts</span>
                  <span className="text-sm font-medium">{contacts.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Domain</span>
                  <span className="text-sm font-mono">{account.domain || "-"}</span>
                </div>
                {account.employeesSizeRange && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Size Range</span>
                    <span className="text-sm font-medium">{account.employeesSizeRange}</span>
                  </div>
                )}
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}
