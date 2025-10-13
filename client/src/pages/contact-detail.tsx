import { useParams, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

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
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => prevContact && setLocation(`/contacts/${prevContact.id}`)}
              disabled={!prevContact}
              data-testid="button-prev-contact"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => nextContact && setLocation(`/contacts/${nextContact.id}`)}
              disabled={!nextContact}
              data-testid="button-next-contact"
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
                <Button variant="outline" size="sm">
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
                  <p className="text-sm text-muted-foreground mb-1">Email Status</p>
                  <Badge variant={contact.emailVerificationStatus === 'valid' ? 'default' : 'secondary'}>
                    {contact.emailVerificationStatus || 'unknown'}
                  </Badge>
                </div>
              </div>

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
            <SectionCard title="Quick Actions" icon={TrendingUp}>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <List className="mr-2 h-4 w-4" />
                  Add to List
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <FileText className="mr-2 h-4 w-4" />
                  Create Note
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
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
    </div>
  );
}
