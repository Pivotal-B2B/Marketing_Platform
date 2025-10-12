import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { 
  User, 
  Pencil, 
  Trash2, 
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Building2,
  Mail,
  Phone,
  Linkedin,
  Tag,
  Briefcase
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Contact, Account } from "@shared/schema";

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

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

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('DELETE', `/api/contacts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      toast({
        title: "Success",
        description: "Contact deleted successfully",
      });
      setLocation('/contacts');
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  // Find previous/next contacts
  const currentIndex = contacts.findIndex(c => c.id === id);
  const prevContact = currentIndex > 0 ? contacts[currentIndex - 1] : null;
  const nextContact = currentIndex < contacts.length - 1 ? contacts[currentIndex + 1] : null;

  if (contactLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Contact not found</p>
        <Button variant="outline" onClick={() => setLocation('/contacts')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Contacts
        </Button>
      </div>
    );
  }

  const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
  const initials = `${contact.firstName?.[0] || ''}${contact.lastName?.[0] || ''}`.toUpperCase();

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
          <span className="text-foreground font-medium" data-testid="breadcrumb-contact-name">{fullName || "Contact"}</span>
        </nav>
      </div>

      {/* Header */}
      <div className="border-b p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setLocation('/contacts')}
              data-testid="button-back-contacts"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Avatar className="h-12 w-12">
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold">{fullName || "No name"}</h1>
              <p className="text-muted-foreground mt-1">{contact.jobTitle || "No title"}</p>
            </div>
          </div>

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
            <Button variant="outline" data-testid="button-edit-contact">
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button 
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              data-testid="button-delete-contact"
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
                <TabsTrigger value="account" data-testid="tab-account">Account Info</TabsTrigger>
                <TabsTrigger value="activity" data-testid="tab-activity">Activity</TabsTrigger>
                <TabsTrigger value="notes" data-testid="tab-notes">Notes</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-auto p-6">
              <TabsContent value="overview" className="mt-0 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <p className="font-mono text-sm">{contact.email}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <p className="font-mono text-sm">{contact.directPhone || "-"}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Job Title</p>
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-muted-foreground" />
                          <p className="font-medium">{contact.jobTitle || "-"}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Department</p>
                        <p className="font-medium">{contact.department || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Seniority</p>
                        <p className="font-medium">{contact.seniorityLevel || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">LinkedIn</p>
                        {contact.linkedinUrl ? (
                          <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">
                            View Profile
                          </a>
                        ) : (
                          <p className="font-medium">-</p>
                        )}
                      </div>
                    </div>

                    {contact.intentTopics && contact.intentTopics.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Intent Topics</p>
                        <div className="flex flex-wrap gap-2">
                          {contact.intentTopics.map((topic, idx) => (
                            <Badge key={idx} variant="outline">{topic}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="account" className="mt-0 space-y-4">
                {account ? (
                  <Card className="hover-elevate cursor-pointer" onClick={() => setLocation(`/accounts/${account.id}`)}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Linked Account</span>
                        <Button size="sm" data-testid="button-view-company">
                          <Building2 className="mr-2 h-4 w-4" />
                          View Company
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-8 w-8 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold">{account.name}</h3>
                          <p className="text-sm text-muted-foreground font-mono">{account.domain}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div>
                          <p className="text-sm text-muted-foreground">Industry</p>
                          <p className="font-medium">{account.industry || "-"}</p>
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
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">No account linked to this contact</p>
                      <Button size="sm" className="mt-4" data-testid="button-link-account">
                        Link Account
                      </Button>
                    </CardContent>
                  </Card>
                )}
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
            <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-4">Contact Status</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Email Verification</p>
                <Badge variant={contact.emailVerificationStatus === 'valid' ? 'default' : 'secondary'}>
                  {contact.emailVerificationStatus || 'unknown'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Consent Basis</p>
                <p className="text-sm font-medium">{contact.consentBasis || "Not specified"}</p>
              </div>
              {contact.consentSource && (
                <div>
                  <p className="text-sm text-muted-foreground">Consent Source</p>
                  <p className="text-sm font-medium">{contact.consentSource}</p>
                </div>
              )}
            </div>
          </div>

          {contact.tags && contact.tags.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {contact.tags.map((tag, idx) => (
                  <Badge key={idx} variant="secondary">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Contact Details</h3>
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
          </div>
        </div>
      </div>
    </div>
  );
}
