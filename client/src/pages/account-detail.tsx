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
  Tag
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
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
                        <p className="text-sm text-muted-foreground">Industry</p>
                        <p className="font-medium">{account.industry || "-"}</p>
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
