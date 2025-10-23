import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  ChevronLeft,
  ChevronRight,
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
  List,
  Phone
} from "lucide-react";
import type { Account, Contact } from "@shared/schema";
import { HeaderActionBar } from "@/components/shared/header-action-bar";
import { SectionCard } from "@/components/shared/section-card";
import { ListSegmentMembership } from "@/components/list-segment-membership";
import { ActivityLogTimeline } from "@/components/activity-log-timeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Import Card components
import type { FilterGroup } from "@/types/filters"; // Assuming FilterGroup type is here

export default function AccountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['/api/accounts'],
  });

  const currentIndex = accounts.findIndex(a => a.id === id);
  const prevAccount = currentIndex > 0 ? accounts[currentIndex - 1] : null;
  const nextAccount = currentIndex < accounts.length - 1 ? accounts[currentIndex + 1] : null;

  const [selectedPrimary, setSelectedPrimary] = useState<string | null>(null);
  const [selectedSecondary, setSelectedSecondary] = useState<string[]>([]);
  const [selectedReject, setSelectedReject] = useState<string[]>([]);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    domain: "",
    industryStandardized: "",
    employeesSizeRange: "",
    annualRevenue: "",
    minAnnualRevenue: "",
    maxAnnualRevenue: "",
    minEmployeesSize: "",
    maxEmployeesSize: "",
    hqCity: "",
    hqState: "",
    hqCountry: "",
    mainPhone: "",
    mainPhoneE164: "", // Added for E.164 formatted phone number
    linkedinUrl: "",
    description: "",
    list: "",
    yearFounded: "",
    customFields: "", // JSON string for custom fields
  });

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

  const updateAccountMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('PATCH', `/api/accounts/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/accounts/${id}`] });
      setEditDialogOpen(false);
      toast({
        title: "Success",
        description: "Account updated successfully",
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

  const handleEditClick = () => {
    if (account) {
      setEditForm({
        name: account.name || "",
        domain: account.domain || "",
        industryStandardized: account.industryStandardized || "",
        employeesSizeRange: account.employeesSizeRange || "",
        annualRevenue: account.annualRevenue || "",
        minAnnualRevenue: account.minAnnualRevenue?.toString() || "",
        maxAnnualRevenue: account.maxAnnualRevenue?.toString() || "",
        minEmployeesSize: account.minEmployeesSize?.toString() || "",
        maxEmployeesSize: account.maxEmployeesSize?.toString() || "",
        hqCity: account.hqCity || "",
        hqState: account.hqState || "",
        hqCountry: account.hqCountry || "",
        mainPhone: account.mainPhone || "",
        mainPhoneE164: account.mainPhoneE164 || "", // Populate E.164 format
        linkedinUrl: account.linkedinUrl || "",
        description: account.description || "",
        list: account.list || "",
        yearFounded: account.yearFounded?.toString() || "",
        customFields: account.customFields ? JSON.stringify(account.customFields, null, 2) : "",
      });
      setEditDialogOpen(true);
    }
  };

  const handleSaveEdit = () => {
    const updateData: any = { ...editForm };
    if (editForm.yearFounded) {
      updateData.yearFounded = parseInt(editForm.yearFounded);
    }
    if (editForm.minEmployeesSize) {
      updateData.minEmployeesSize = parseInt(editForm.minEmployeesSize);
    }
    if (editForm.maxEmployeesSize) {
      updateData.maxEmployeesSize = parseInt(editForm.maxEmployeesSize);
    }
    if (editForm.minAnnualRevenue) {
      updateData.minAnnualRevenue = parseFloat(editForm.minAnnualRevenue);
    }
    if (editForm.maxAnnualRevenue) {
      updateData.maxAnnualRevenue = parseFloat(editForm.maxAnnualRevenue);
    }
    // Ensure mainPhone is updated if mainPhoneE164 is changed
    if (editForm.mainPhoneE164 && !editForm.mainPhone) {
        updateData.mainPhone = editForm.mainPhoneE164; // Or handle based on your normalization logic
    }
    // Parse custom fields JSON
    if (editForm.customFields && editForm.customFields.trim()) {
      try {
        updateData.customFields = JSON.parse(editForm.customFields);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Invalid Custom Fields",
          description: "Custom fields must be valid JSON format",
        });
        return;
      }
    } else {
      updateData.customFields = null;
    }
    updateAccountMutation.mutate(updateData);
  };

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
      value: account.mainPhoneE164 ?? undefined, // Use E.164 for click-to-call
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
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => prevAccount && setLocation(`/accounts/${prevAccount.id}`)}
              disabled={!prevAccount}
              data-testid="button-prev-account"
              className="h-9 w-9 rounded-lg border border-border/50 hover:border-border hover:bg-accent/50 disabled:opacity-30"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => nextAccount && setLocation(`/accounts/${nextAccount.id}`)}
              disabled={!nextAccount}
              data-testid="button-next-account"
              className="h-9 w-9 rounded-lg border border-border/50 hover:border-border hover:bg-accent/50 disabled:opacity-30"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
            <div className="w-px h-6 bg-border mx-1" />
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setLocation('/accounts')}
              data-testid="button-back-accounts"
              className="h-9 w-9 rounded-lg border border-border/50 hover:border-border hover:bg-accent/50"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>
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
                <Button variant="outline" size="sm" onClick={handleEditClick}>
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

                {(account.minEmployeesSize || account.maxEmployeesSize) && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Employee Range</p>
                    <p className="font-medium">
                      {account.minEmployeesSize && account.maxEmployeesSize 
                        ? `${account.minEmployeesSize} - ${account.maxEmployeesSize}`
                        : account.minEmployeesSize 
                        ? `${account.minEmployeesSize}+`
                        : `Up to ${account.maxEmployeesSize}`}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Annual Revenue</p>
                  <p className="font-medium flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    {account.annualRevenue || "-"}
                  </p>
                </div>

                {(account.minAnnualRevenue || account.maxAnnualRevenue) && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Revenue Range</p>
                    <p className="font-medium">
                      {account.minAnnualRevenue && account.maxAnnualRevenue 
                        ? `$${account.minAnnualRevenue} - $${account.maxAnnualRevenue}`
                        : account.minAnnualRevenue 
                        ? `$${account.minAnnualRevenue}+`
                        : `Up to $${account.maxAnnualRevenue}`}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-muted-foreground mb-1">HQ City</p>
                  <p className="font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    {account.hqCity || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">HQ State</p>
                  <p className="font-medium">{account.hqState || "-"}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">HQ Postal Code</p>
                  <p className="font-medium">{account.hqPostalCode || "-"}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">HQ Country</p>
                  <p className="font-medium">{account.hqCountry || "-"}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Year Founded</p>
                  <p className="font-medium">{account.yearFounded || "-"}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Main HQ Phone</p>
                  {account.mainPhoneE164 ? (
                    <div className="space-y-1">
                      <a href={`tel:${account.mainPhoneE164}`} className="font-medium font-mono text-primary hover:underline flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {account.mainPhone}
                      </a>
                      {account.mainPhoneExtension && (
                        <p className="text-xs text-muted-foreground pl-5">Ext: {account.mainPhoneExtension}</p>
                      )}
                    </div>
                  ) : (
                    <p className="font-medium">-</p>
                  )}
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">HQ Street Address 1</p>
                  <p className="font-medium">{account.hqStreet1 || "-"}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">HQ Street Address 2</p>
                  <p className="font-medium">{account.hqStreet2 || "-"}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">HQ Street Address 3</p>
                  <p className="font-medium">{account.hqStreet3 || "-"}</p>
                </div>

                {account.list && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">List</p>
                    <Badge variant="secondary">{account.list}</Badge>
                  </div>
                )}

                {account.description && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground mb-1">Description</p>
                    <p className="text-sm">{account.description}</p>
                  </div>
                )}
              </div>

              {/* Full Address String */}
              {account.companyLocation && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-1">Full Address String</p>
                  <p className="font-medium text-sm">{account.companyLocation}</p>
                </div>
              )}

              {/* Custom Fields */}
              {account.customFields && Object.keys(account.customFields).length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium mb-3">Custom Fields</p>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(account.customFields).map(([key, value]) => (
                      <div key={key}>
                        <p className="text-sm text-muted-foreground mb-1 capitalize">
                          {key.replace(/_/g, ' ')}
                        </p>
                        <p className="font-medium text-sm">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                        <TableHead>Direct Work Phone</TableHead>
                        <TableHead>Mobile Direct</TableHead>
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
                            <TableCell className="font-mono text-sm">
                              {contact.directWorkPhoneE164 ? (
                                <a href={`tel:${contact.directWorkPhoneE164}`} className="text-primary hover:underline flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {contact.directWorkPhone}
                                </a>
                              ) : (
                                contact.directWorkPhone || "-"
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {contact.mobileDirectE164 ? (
                                <a href={`tel:${contact.mobileDirectE164}`} className="text-primary hover:underline flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {contact.mobileDirect}
                                </a>
                              ) : (
                                contact.mobileDirect || "-"
                              )}
                            </TableCell>
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

            {/* Custom Fields */}
            {account.customFields && Object.keys(account.customFields).length > 0 && (
              <SectionCard
                title="Custom Fields"
                icon={FileText}
                description="Additional custom data fields"
              >
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Field Name</TableHead>
                        <TableHead>Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(account.customFields as Record<string, any>).map(([key, value]) => (
                        <TableRow key={key} data-testid={`row-custom-field-${key}`}>
                          <TableCell className="font-medium">{key}</TableCell>
                          <TableCell className="font-mono text-sm">{String(value)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </SectionCard>
            )}

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

            {/* Lists & Segments */}
            <SectionCard
              title="Lists & Segments"
              icon={List}
              description="Membership in static lists and dynamic segments"
            >
              <ListSegmentMembership entityType="account" entityId={id || ''} />
            </SectionCard>

            {/* Activity Timeline */}
            <SectionCard
              title="Activity Timeline"
              icon={Activity}
              description="Recent interactions and events"
            >
              <ActivityLogTimeline 
                entityType="account" 
                entityId={id || ''} 
                autoRefresh={true}
                refreshInterval={30000}
              />
            </SectionCard>
          </div>

          {/* Right Column - Contextual Actions & Info (1/3) */}
          <div className="space-y-6">
            {/* Account Summary */}
            <SectionCard title="Account Summary" icon={TrendingUp}>
              <div className="grid gap-4 md:grid-cols-2"> {/* Adjusted grid for better spacing */}
                <Card 
                  className="hover-elevate cursor-pointer transition-all"
                  onClick={() => {
                    // Navigate to contacts page with account name filter
                    const accountFilter: FilterGroup = {
                      logic: 'AND',
                      conditions: [{
                        id: `filter-${Date.now()}`,
                        field: 'accountName',
                        operator: 'equals',
                        value: account.name
                      }]
                    };
                    // Store filter in sessionStorage for contacts page to pick up
                    sessionStorage.setItem('contactsFilter', JSON.stringify(accountFilter));
                    setLocation('/contacts');
                  }}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary" data-testid="text-contacts-count">
                      {contacts?.length || 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Click to view contacts</p>
                  </CardContent>
                </Card>

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

            {/* Quick Actions */}
            <SectionCard title="Quick Actions" icon={Briefcase}>
              <div className="space-y-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-start" size="sm">
                      <TrendingUp className="mr-2 h-4 w-4" />
                      Add to Campaign
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => setLocation('/campaigns')}>
                      Email Campaign
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLocation('/telemarketing')}>
                      Telemarketing Campaign
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  size="sm"
                  onClick={() => {
                    toast({
                      title: "Coming Soon",
                      description: "Add to List functionality will be available soon",
                    });
                  }}
                >
                  <List className="mr-2 h-4 w-4" />
                  Add to List
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  size="sm"
                  onClick={() => {
                    toast({
                      title: "Coming Soon",
                      description: "Notes functionality will be available soon",
                    });
                  }}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Create Note
                </Button>
              </div>
            </SectionCard>

            {/* Data Quality */}
            <SectionCard title="Data Quality" icon={Shield}>
              {(() => {
                // Calculate data completeness for this account
                const keyFields = [
                  'domain', 'industryStandardized', 'employeesSizeRange', 'annualRevenue',
                  'hqCity', 'hqState', 'hqPostalCode', 'hqCountry', 'hqStreet1',
                  'mainPhone', 'yearFounded', 'description', 'linkedinUrl',
                  'companyLocation', 'sicCode', 'naicsCode'
                ];
                
                const populatedFields = keyFields.filter(field => {
                  const value = (account as any)[field];
                  return value !== null && value !== undefined && value !== '';
                });
                
                const missingFields = keyFields.filter(field => {
                  const value = (account as any)[field];
                  return value === null || value === undefined || value === '';
                });
                
                const completeness = Math.round((populatedFields.length / keyFields.length) * 100);
                
                // Determine quality badge
                const getQualityBadge = (score: number) => {
                  if (score >= 80) return { label: 'Excellent', variant: 'default', className: 'bg-green-500/10 text-green-500 border-green-500/20' };
                  if (score >= 60) return { label: 'Good', variant: 'secondary', className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' };
                  if (score >= 40) return { label: 'Fair', variant: 'secondary', className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' };
                  return { label: 'Poor', variant: 'secondary', className: 'bg-red-500/10 text-red-500 border-red-500/20' };
                };
                
                const quality = getQualityBadge(completeness);
                
                // Field name mapping for display
                const fieldLabels: Record<string, string> = {
                  domain: 'Domain',
                  industryStandardized: 'Industry',
                  employeesSizeRange: 'Employee Size',
                  annualRevenue: 'Annual Revenue',
                  hqCity: 'HQ City',
                  hqState: 'HQ State',
                  hqPostalCode: 'Postal Code',
                  hqCountry: 'Country',
                  hqStreet1: 'Street Address',
                  mainPhone: 'Main Phone',
                  yearFounded: 'Year Founded',
                  description: 'Description',
                  linkedinUrl: 'LinkedIn',
                  companyLocation: 'Full Address',
                  sicCode: 'SIC Code',
                  naicsCode: 'NAICS Code'
                };
                
                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Completeness Score</span>
                      <Badge className={quality.className}>
                        {completeness}% - {quality.label}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{populatedFields.length} of {keyFields.length} key fields</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all ${
                            completeness >= 80 ? 'bg-green-500' :
                            completeness >= 60 ? 'bg-blue-500' :
                            completeness >= 40 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${completeness}%` }}
                        />
                      </div>
                    </div>
                    
                    {missingFields.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Missing Fields ({missingFields.length})</p>
                        <div className="flex flex-wrap gap-1">
                          {missingFields.slice(0, 8).map(field => (
                            <Badge key={field} variant="outline" className="text-xs">
                              {fieldLabels[field] || field}
                            </Badge>
                          ))}
                          {missingFields.length > 8 && (
                            <Badge variant="outline" className="text-xs">
                              +{missingFields.length - 8} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
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
          </div>
        </div>
      </div>

      {/* Edit Account Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Account Details</DialogTitle>
            <DialogDescription>Update account information below.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Account Name *</Label>
                <Input
                  id="name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="domain">Domain</Label>
                <Input
                  id="domain"
                  value={editForm.domain}
                  onChange={(e) => setEditForm({ ...editForm, domain: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  value={editForm.industryStandardized}
                  onChange={(e) => setEditForm({ ...editForm, industryStandardized: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employees">Employee Size Range</Label>
                <Input
                  id="employees"
                  value={editForm.employeesSizeRange}
                  onChange={(e) => setEditForm({ ...editForm, employeesSizeRange: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minEmployeesSize">Min Employees Size</Label>
                <Input
                  id="minEmployeesSize"
                  type="number"
                  value={editForm.minEmployeesSize}
                  onChange={(e) => setEditForm({ ...editForm, minEmployeesSize: e.target.value })}
                  placeholder="e.g., 100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxEmployeesSize">Max Employees Size</Label>
                <Input
                  id="maxEmployeesSize"
                  type="number"
                  value={editForm.maxEmployeesSize}
                  onChange={(e) => setEditForm({ ...editForm, maxEmployeesSize: e.target.value })}
                  placeholder="e.g., 500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="revenue">Annual Revenue</Label>
                <Input
                  id="revenue"
                  value={editForm.annualRevenue}
                  onChange={(e) => setEditForm({ ...editForm, annualRevenue: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="yearFounded">Year Founded</Label>
                <Input
                  id="yearFounded"
                  type="number"
                  value={editForm.yearFounded}
                  onChange={(e) => setEditForm({ ...editForm, yearFounded: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minAnnualRevenue">Min Annual Revenue</Label>
                <Input
                  id="minAnnualRevenue"
                  type="number"
                  value={editForm.minAnnualRevenue}
                  onChange={(e) => setEditForm({ ...editForm, minAnnualRevenue: e.target.value })}
                  placeholder="e.g., 1000000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxAnnualRevenue">Max Annual Revenue</Label>
                <Input
                  id="maxAnnualRevenue"
                  type="number"
                  value={editForm.maxAnnualRevenue}
                  onChange={(e) => setEditForm({ ...editForm, maxAnnualRevenue: e.target.value })}
                  placeholder="e.g., 5000000"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={editForm.hqCity}
                  onChange={(e) => setEditForm({ ...editForm, hqCity: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={editForm.hqState}
                  onChange={(e) => setEditForm({ ...editForm, hqState: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={editForm.hqCountry}
                  onChange={(e) => setEditForm({ ...editForm, hqCountry: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Main HQ Phone</Label>
                <Input
                  id="phone"
                  value={editForm.mainPhone}
                  onChange={(e) => setEditForm({ ...editForm, mainPhone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn URL</Label>
                <Input
                  id="linkedin"
                  value={editForm.linkedinUrl}
                  onChange={(e) => setEditForm({ ...editForm, linkedinUrl: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="list">List</Label>
              <Input
                id="list"
                value={editForm.list}
                onChange={(e) => setEditForm({ ...editForm, list: e.target.value })}
                placeholder="e.g., InFynd, ZoomInfo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customFields">
                Custom Fields 
                <span className="text-xs text-muted-foreground ml-2">(JSON format)</span>
              </Label>
              <Textarea
                id="customFields"
                value={editForm.customFields}
                onChange={(e) => setEditForm({ ...editForm, customFields: e.target.value })}
                rows={6}
                className="font-mono text-sm"
                placeholder='{"field_name": "value", "another_field": "another value"}'
                data-testid="input-custom-fields"
              />
              <p className="text-xs text-muted-foreground">
                Enter custom fields as JSON key-value pairs
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateAccountMutation.isPending}>
              {updateAccountMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}