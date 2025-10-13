import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  Pencil, 
  Trash2, 
  UserPlus, 
  Download, 
  ArrowLeft,
  GitMerge,
  Globe,
  Users,
  DollarSign,
  MapPin,
  Linkedin,
  Tag,
  Sparkles,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { Account, Contact } from "@shared/schema";

export default function AccountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // AI Industry Review state
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

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('DELETE', `/api/accounts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      toast({
        title: "Success",
        description: "Account deleted successfully",
      });
      setLocation('/accounts');
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
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
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
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

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setLocation('/accounts')}
              data-testid="button-back-accounts"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Building2 className="h-8 w-8 text-primary" />
                {account.name}
              </h1>
              <p className="text-muted-foreground mt-1">
                {account.domain && (
                  <span className="inline-flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    {account.domain}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" data-testid="button-edit-account">
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button variant="outline" data-testid="button-merge-account">
              <GitMerge className="mr-2 h-4 w-4" />
              Merge
            </Button>
            <Button variant="outline" data-testid="button-export-account">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button 
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              data-testid="button-delete-account"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Tabs Section */}
        <div className="flex-1 overflow-auto">
          <Tabs defaultValue="overview" className="h-full flex flex-col">
            <div className="border-b px-6">
              <TabsList className="bg-transparent h-12">
                <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
                <TabsTrigger value="contacts" data-testid="tab-contacts">
                  Contacts ({contacts.length})
                </TabsTrigger>
                <TabsTrigger value="ai-enrichment" data-testid="tab-ai-enrichment">
                  AI Enrichment
                  {account.industryAiStatus === 'pending' && (
                    <Badge variant="secondary" className="ml-2">New</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="activity" data-testid="tab-activity">Activity</TabsTrigger>
                <TabsTrigger value="notes" data-testid="tab-notes">Notes</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-auto p-6">
              <TabsContent value="overview" className="mt-0 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Account Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Primary Industry</p>
                        <p className="font-medium">{account.industryStandardized || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Domain</p>
                        <p className="font-mono text-sm">{account.domain || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Employee Size</p>
                        <p className="font-medium">{account.employeesSizeRange || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Annual Revenue</p>
                        <p className="font-medium">{account.annualRevenue || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Location</p>
                        <p className="font-medium">
                          {[account.hqCity, account.hqState, account.hqCountry].filter(Boolean).join(", ") || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">LinkedIn</p>
                        {account.linkedinUrl ? (
                          <a href={account.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">
                            View Profile
                          </a>
                        ) : (
                          <p className="font-medium">-</p>
                        )}
                      </div>
                    </div>

                    {account.industrySecondary && account.industrySecondary.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Secondary Industries</p>
                        <div className="flex flex-wrap gap-2">
                          {account.industrySecondary.map((industry, idx) => (
                            <Badge key={idx} variant="outline">{industry}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {account.techStack && account.techStack.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Tech Stack</p>
                        <div className="flex flex-wrap gap-2">
                          {account.techStack.map((tech, idx) => (
                            <Badge key={idx} variant="secondary">{tech}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {account.intentTopics && account.intentTopics.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Intent Topics</p>
                        <div className="flex flex-wrap gap-2">
                          {account.intentTopics.map((topic, idx) => (
                            <Badge key={idx} variant="outline">{topic}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="contacts" className="mt-0 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Related Contacts</h3>
                  <Button size="sm" data-testid="button-add-contact">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add Contact
                  </Button>
                </div>

                {contactsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : contacts.length > 0 ? (
                  <div className="border rounded-lg">
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
                  <Card>
                    <CardContent className="py-8 text-center">
                      <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">No contacts linked to this account</p>
                      <Button size="sm" className="mt-4" data-testid="button-add-first-contact">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Add First Contact
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="ai-enrichment" className="mt-0 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      AI Industry Suggestions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {account.industryAiCandidates && typeof account.industryAiCandidates === 'object' && Array.isArray(account.industryAiCandidates) && account.industryAiCandidates.length > 0 ? (
                      <div className="space-y-6">
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

                        <div className="flex justify-end gap-3 pt-4 border-t">
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
                      </div>
                    ) : (
                      <div className="py-8 text-center">
                        <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">No AI industry suggestions available</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          {account.industryAiStatus === 'accepted' 
                            ? 'AI suggestions have been reviewed and accepted' 
                            : account.industryAiStatus === 'rejected'
                            ? 'AI suggestions have been reviewed and rejected'
                            : 'AI enrichment will run automatically when data is updated'}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activity" className="mt-0">
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">Activity tracking coming soon</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notes" className="mt-0">
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">Notes feature coming soon</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Side Panel */}
        <div className="w-80 border-l overflow-auto p-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-4">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{contacts.length}</p>
                  <p className="text-sm text-muted-foreground">Contacts</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{account.annualRevenue || "N/A"}</p>
                  <p className="text-sm text-muted-foreground">Revenue</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {[account.hqCity, account.hqState].filter(Boolean).join(", ") || "N/A"}
                  </p>
                  <p className="text-sm text-muted-foreground">Location</p>
                </div>
              </div>
            </div>
          </div>

          {account.tags && account.tags.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {account.tags.map((tag, idx) => (
                  <Badge key={idx} variant="secondary">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Account Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{account.createdAt ? new Date(account.createdAt).toLocaleDateString() : "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span>{account.updatedAt ? new Date(account.updatedAt).toLocaleDateString() : "N/A"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
