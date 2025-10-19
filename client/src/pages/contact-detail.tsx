import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  User, 
  ChevronLeft,
  ChevronRight,
  Building2,
  Mail,
  Phone,
  Briefcase,
  Tag,
  Activity,
  FileText,
  Shield,
  TrendingUp,
  MapPin,
  Calendar,
  List
} from "lucide-react";
import type { Contact, Account } from "@shared/schema";
import { HeaderActionBar } from "@/components/shared/header-action-bar";
import { SectionCard } from "@/components/shared/section-card";
import { ListSegmentMembership } from "@/components/list-segment-membership";
import { ActivityLogTimeline } from "@/components/activity-log-timeline";

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    directPhone: "",
    jobTitle: "",
    department: "",
    seniorityLevel: "",
  });

  const { data: contact, isLoading: contactLoading } = useQuery<Contact>({
    queryKey: [`/api/contacts/${id}`],
  });

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['/api/accounts'],
  });

  const account = accounts.find(a => a.id === contact?.accountId);

  const currentIndex = contacts.findIndex(c => c.id === id);
  const prevContact = currentIndex > 0 ? contacts[currentIndex - 1] : null;
  const nextContact = currentIndex < contacts.length - 1 ? contacts[currentIndex + 1] : null;

  const updateContactMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('PATCH', `/api/contacts/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/contacts/${id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      setEditDialogOpen(false);
      toast({
        title: "Success",
        description: "Contact updated successfully",
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
    if (contact) {
      setEditForm({
        firstName: contact.firstName || "",
        lastName: contact.lastName || "",
        email: contact.email || "",
        directPhone: contact.directPhone || "",
        jobTitle: contact.jobTitle || "",
        department: contact.department || "",
        seniorityLevel: contact.seniorityLevel || "",
      });
      setEditDialogOpen(true);
    }
  };

  const handleSaveEdit = () => {
    updateContactMutation.mutate(editForm);
  };

  if (contactLoading) {
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

  if (!contact) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Contact not found</p>
        <Button variant="outline" onClick={() => setLocation('/contacts')} className="mt-4">
          Back to Contacts
        </Button>
      </div>
    );
  }

  const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
  const initials = `${contact.firstName?.[0] || ''}${contact.lastName?.[0] || ''}`.toUpperCase();

  const headerActions = [
    {
      type: "linkedin" as const,
      value: contact.linkedinUrl || undefined,
      label: "View LinkedIn Profile",
    },
    {
      type: "call" as const,
      value: contact.directPhone ?? undefined,
      label: "Call Direct Line",
    },
    {
      type: "email" as const,
      value: contact.email || undefined,
      label: "Send Email",
    },
    {
      type: "copy" as const,
      value: contact.email || undefined,
      label: "Copy Email",
    },
  ];

  const badges = [
    contact.jobTitle && {
      label: contact.jobTitle,
      variant: "default" as const,
    },
    contact.department && {
      label: contact.department,
      variant: "outline" as const,
    },
  ].filter(Boolean) as Array<{ label: string; variant?: any; className?: string }>;

  return (
    <div className="h-full flex flex-col">
      {/* Breadcrumb */}
      <div className="border-b px-6 py-3">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/contacts" className="hover:text-foreground" data-testid="breadcrumb-contacts">
            Contacts
          </Link>
          {account && (
            <>
              <ChevronRight className="h-4 w-4" />
              <Link 
                href={`/accounts/${account.id}`} 
                className="hover:text-foreground"
                data-testid="breadcrumb-account"
              >
                {account.name}
              </Link>
            </>
          )}
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium" data-testid="breadcrumb-contact-name">
            {fullName || "Contact"}
          </span>
        </nav>
      </div>

      {/* Header Action Bar */}
      <HeaderActionBar
        avatarFallback={initials}
        title={fullName || "No name"}
        subtitle={account?.name}
        badges={badges}
        actions={headerActions}
        loading={contactLoading}
        rightContent={
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => prevContact && setLocation(`/contacts/${prevContact.id}`)}
              disabled={!prevContact}
              data-testid="button-prev-contact"
              className="h-9 w-9 rounded-lg border border-border/50 hover:border-border hover:bg-accent/50 disabled:opacity-30"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => nextContact && setLocation(`/contacts/${nextContact.id}`)}
              disabled={!nextContact}
              data-testid="button-next-contact"
              className="h-9 w-9 rounded-lg border border-border/50 hover:border-border hover:bg-accent/50 disabled:opacity-30"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        }
      />

      {/* Main Content - Two Column Layout */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Primary Content (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Information */}
            <SectionCard
              title="Contact Information"
              icon={User}
              action={
                <Button variant="outline" size="sm" onClick={handleEditClick}>
                  Edit Details
                </Button>
              }
            >
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Email</p>
                  <p className="font-mono text-sm flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    {contact.email}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Phone</p>
                  <p className="font-mono text-sm flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    {contact.directPhone || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Job Title</p>
                  <p className="font-medium flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-muted-foreground" />
                    {contact.jobTitle || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Department</p>
                  <p className="font-medium">{contact.department || "-"}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Seniority</p>
                  <p className="font-medium">{contact.seniorityLevel || "-"}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Direct Work Phone</p>
                  {contact.directPhoneE164 ? (
                    <a href={`tel:${contact.directPhoneE164}`} className="font-medium text-primary hover:underline flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {contact.directPhone}
                    </a>
                  ) : (
                    <p className="font-medium">-</p>
                  )}
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Mobile Direct</p>
                  {contact.mobilePhoneE164 ? (
                    <a href={`tel:${contact.mobilePhoneE164}`} className="font-medium text-primary hover:underline flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {contact.mobilePhone}
                    </a>
                  ) : (
                    <p className="font-medium">-</p>
                  )}
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Email Status</p>
                  <Badge variant={contact.emailVerificationStatus === 'valid' ? 'default' : 'secondary'}>
                    {contact.emailVerificationStatus || 'unknown'}
                  </Badge>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">City</p>
                  <p className="font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    {contact.city || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">State</p>
                  <p className="font-medium">{contact.state || "-"}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">County</p>
                  <p className="font-medium">{contact.county || "-"}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Postal Code</p>
                  <p className="font-medium">{contact.postalCode || "-"}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Country</p>
                  <p className="font-medium">{contact.country || "-"}</p>
                </div>
              </div>

              {/* Additional Address Information */}
              {(contact.address || contact.contactLocation) && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium mb-3">Additional Address Details</p>
                  <div className="space-y-3">
                    {contact.address && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Street Address</p>
                        <p className="font-medium text-sm">{contact.address}</p>
                      </div>
                    )}
                    {contact.contactLocation && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Full Location String</p>
                        <p className="font-medium text-sm">{contact.contactLocation}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {contact.intentTopics && contact.intentTopics.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Intent Signals</p>
                  <div className="flex flex-wrap gap-2">
                    {contact.intentTopics.map((topic, idx) => (
                      <Badge key={idx} className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Fields */}
              {contact.customFields && Object.keys(contact.customFields).length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium mb-3">Custom Fields</p>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(contact.customFields).map(([key, value]) => (
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
            </SectionCard>

            {/* Linked Account */}
            {account && (
              <SectionCard
                title="Account Information"
                icon={Building2}
                action={
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setLocation(`/accounts/${account.id}`)}
                    data-testid="button-view-company"
                  >
                    View Full Profile
                  </Button>
                }
              >
                <div 
                  className="flex items-center gap-4 p-4 border rounded-lg hover-elevate cursor-pointer"
                  onClick={() => setLocation(`/accounts/${account.id}`)}
                >
                  <div className="h-16 w-16 rounded bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-8 w-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold">{account.name}</h3>
                    <p className="text-sm text-muted-foreground font-mono">{account.domain || "-"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Industry</p>
                    <p className="font-medium">{account.industryStandardized || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Employee Size</p>
                    <p className="font-medium">{account.employeesSizeRange || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Revenue</p>
                    <p className="font-medium">{account.annualRevenue || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">
                      {[account.hqCity, account.hqState].filter(Boolean).join(", ") || "-"}
                    </p>
                  </div>
                </div>
              </SectionCard>
            )}

            {/* Lists & Segments */}
            <SectionCard
              title="Lists & Segments"
              icon={List}
              description="Membership in static lists and dynamic segments"
            >
              <ListSegmentMembership entityType="contact" entityId={id || ''} />
            </SectionCard>

            {/* Activity Timeline */}
            <SectionCard
              title="Activity Timeline"
              icon={Activity}
              description="Recent interactions and events"
            >
              <ActivityLogTimeline 
                entityType="contact" 
                entityId={id || ''} 
                autoRefresh={true}
                refreshInterval={30000}
              />
            </SectionCard>
          </div>

          {/* Right Column - Contextual Actions & Info (1/3) */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <SectionCard title="Quick Actions" icon={TrendingUp}>
              <div className="space-y-2">
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
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  size="sm"
                  onClick={() => {
                    toast({
                      title: "Coming Soon",
                      description: "Task scheduling will be available soon",
                    });
                  }}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Schedule Task
                </Button>
              </div>
            </SectionCard>

            {/* Contact Status */}
            <SectionCard title="Contact Status" icon={Shield}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Email Status</span>
                  <Badge variant={contact.emailVerificationStatus === 'valid' ? 'default' : 'secondary'}>
                    {contact.emailVerificationStatus || 'unknown'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Consent</span>
                  <span className="text-sm font-medium">{contact.consentBasis || "Not specified"}</span>
                </div>
                {contact.consentSource && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Source</span>
                    <span className="text-sm font-medium">{contact.consentSource}</span>
                  </div>
                )}
              </div>
            </SectionCard>

            {/* Tags */}
            {contact.tags && contact.tags.length > 0 && (
              <SectionCard title="Tags" icon={Tag}>
                <div className="flex flex-wrap gap-2">
                  {contact.tags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Metadata */}
            <SectionCard title="Metadata" icon={FileText}>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span>{contact.createdAt ? new Date(contact.createdAt).toLocaleDateString() : "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Updated</span>
                  <span>{contact.updatedAt ? new Date(contact.updatedAt).toLocaleDateString() : "N/A"}</span>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      </div>

      {/* Edit Contact Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Contact Details</DialogTitle>
            <DialogDescription>Update contact information below.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="directPhone">Direct Phone</Label>
                <Input
                  id="directPhone"
                  value={editForm.directPhone}
                  onChange={(e) => setEditForm({ ...editForm, directPhone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="jobTitle">Job Title</Label>
                <Input
                  id="jobTitle"
                  value={editForm.jobTitle}
                  onChange={(e) => setEditForm({ ...editForm, jobTitle: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={editForm.department}
                  onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="seniorityLevel">Seniority Level</Label>
              <Input
                id="seniorityLevel"
                value={editForm.seniorityLevel}
                onChange={(e) => setEditForm({ ...editForm, seniorityLevel: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateContactMutation.isPending}>
              {updateContactMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}