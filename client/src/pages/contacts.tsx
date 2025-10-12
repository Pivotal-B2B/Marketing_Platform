import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, Download, Upload, Users, Trash2, ShieldAlert, Phone as PhoneIcon, Mail as MailIcon } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  insertContactSchema, 
  type InsertContact, 
  type Contact, 
  type Account,
  type SuppressionEmail,
  type SuppressionPhone 
} from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";

export default function ContactsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: contacts, isLoading: contactsLoading } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });

  const { data: accounts } = useQuery<Account[]>({
    queryKey: ['/api/accounts'],
  });

  // Fetch suppression lists for validation
  const { data: emailSuppressions = [] } = useQuery<SuppressionEmail[]>({
    queryKey: ['/api/suppressions/email'],
  });

  const { data: phoneSuppressions = [] } = useQuery<SuppressionPhone[]>({
    queryKey: ['/api/suppressions/phone'],
  });

  // Helper functions to check suppressions
  const isEmailSuppressed = (email: string) => {
    return emailSuppressions.some(s => s.email.toLowerCase() === email.toLowerCase());
  };

  const isPhoneSuppressed = (phone: string) => {
    return phoneSuppressions.some(s => s.phoneE164 === phone);
  };

  const createForm = useForm<InsertContact>({
    resolver: zodResolver(insertContactSchema),
    defaultValues: {
      fullName: "",
      firstName: "",
      lastName: "",
      email: "",
      directPhone: "",
      jobTitle: "",
      accountId: "",
    },
  });

  // Watch email and phone for real-time suppression checks
  const watchedEmail = createForm.watch("email");
  const watchedPhone = createForm.watch("directPhone");
  
  const emailIsSuppressed = watchedEmail ? isEmailSuppressed(watchedEmail) : false;
  // Note: Assuming phone is entered in E.164 format for suppression check
  const phoneIsSuppressed = watchedPhone ? isPhoneSuppressed(watchedPhone) : false;

  const createMutation = useMutation({
    mutationFn: async (data: InsertContact) => {
      // Compute fullName from firstName + lastName if not provided
      const fullName = data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim();
      await apiRequest('POST', '/api/contacts', { ...data, fullName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      setCreateDialogOpen(false);
      createForm.reset();
      toast({
        title: "Success",
        description: "Contact created successfully",
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/contacts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      toast({
        title: "Success",
        description: "Contact deleted successfully",
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

  const filteredContacts = contacts?.filter(contact =>
    searchQuery === "" ||
    contact.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.title?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contacts</h1>
          <p className="text-muted-foreground mt-1">
            Manage your contact database with advanced filtering
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" data-testid="button-import-contacts">
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-contact">
                <Plus className="mr-2 h-4 w-4" />
                Create Contact
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create Contact</DialogTitle>
                <DialogDescription>
                  Add a new contact to your database
                </DialogDescription>
              </DialogHeader>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={createForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Smith" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={createForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="john.smith@company.com" 
                            {...field}
                            className={emailIsSuppressed ? "border-destructive" : ""}
                            data-testid="input-contact-email"
                          />
                        </FormControl>
                        {emailIsSuppressed && (
                          <FormDescription className="flex items-center gap-1 text-destructive">
                            <ShieldAlert className="h-3 w-3" />
                            Warning: This email is on the suppression list
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="directPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="+1234567890" 
                            {...field} 
                            value={field.value || ""}
                            className={phoneIsSuppressed ? "border-destructive" : ""}
                            data-testid="input-contact-phone"
                          />
                        </FormControl>
                        {phoneIsSuppressed && (
                          <FormDescription className="flex items-center gap-1 text-destructive">
                            <ShieldAlert className="h-3 w-3" />
                            Warning: This phone is on the DNC list
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="jobTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="VP of Sales" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="accountId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select account" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {accounts?.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending ? "Creating..." : "Create Contact"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name, email, title, company..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-contacts"
          />
        </div>
        <Button variant="outline" data-testid="button-filter">
          <Filter className="mr-2 h-4 w-4" />
          Advanced Filters
        </Button>
        <Button variant="outline" data-testid="button-export">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      {contactsLoading ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3].map((i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-10 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : filteredContacts.length > 0 ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContacts.map((contact) => {
                const account = accounts?.find(a => a.id === contact.accountId);
                const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
                const initials = `${contact.firstName?.[0] || ''}${contact.lastName?.[0] || ''}`.toUpperCase();
                const contactEmailSuppressed = isEmailSuppressed(contact.email);
                const contactPhoneSuppressed = contact.directPhoneE164 ? isPhoneSuppressed(contact.directPhoneE164) : false;
                
                return (
                  <TableRow key={contact.id} className="hover-elevate" data-testid={`row-contact-${contact.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="font-medium">{fullName || "No name"}</div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground font-mono">{contact.email}</span>
                            {contactEmailSuppressed && (
                              <Badge variant="destructive" className="text-xs" data-testid={`badge-email-suppressed-${contact.id}`}>
                                <MailIcon className="h-3 w-3 mr-1" />
                                Suppressed
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{contact.jobTitle || "-"}</TableCell>
                    <TableCell>{account?.name || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">{contact.directPhone || "-"}</span>
                        {contactPhoneSuppressed && (
                          <Badge variant="destructive" className="text-xs" data-testid={`badge-phone-suppressed-${contact.id}`}>
                            <PhoneIcon className="h-3 w-3 mr-1" />
                            DNC
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          data-testid={`button-view-contact-${contact.id}`}
                        >
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(contact.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-contact-${contact.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title="No contacts found"
          description={searchQuery ? "Try adjusting your search query" : "Get started by creating your first contact"}
          action={
            !searchQuery ? (
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Contact
              </Button>
            ) : undefined
          }
        />
      )}
    </div>
  );
}
