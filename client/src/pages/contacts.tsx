import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, Download, Upload, Users, Trash2, ShieldAlert, Phone as PhoneIcon, Mail as MailIcon, Link as LinkIcon, Building2 } from "lucide-react";
import { FilterBuilder } from "@/components/filter-builder";
import type { FilterGroup } from "@shared/filter-types";
import { CSVImportDialog } from "@/components/csv-import-dialog";
import { exportContactsToCSV, downloadCSV, generateContactsTemplate } from "@/lib/csv-utils";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useSelection } from "@/hooks/use-selection";
import { BulkActionsToolbar } from "@/components/bulk-actions-toolbar";
import { BulkUpdateDialog } from "@/components/bulk-update-dialog";
import { AddToListDialog } from "@/components/add-to-list-dialog";
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
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [bulkUpdateDialogOpen, setBulkUpdateDialogOpen] = useState(false);
  const [addToListDialogOpen, setAddToListDialogOpen] = useState(false);
  const [filterGroup, setFilterGroup] = useState<FilterGroup | undefined>(undefined);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: contacts, isLoading: contactsLoading } = useQuery<Contact[]>({
    queryKey: ['/api/contacts', filterGroup],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const params = new URLSearchParams();
      if (filterGroup) {
        params.set('filters', JSON.stringify(filterGroup));
      }
      const response = await fetch(`/api/contacts?${params.toString()}`, {
        headers,
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch contacts');
      return response.json();
    },
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

  const autoLinkMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/contacts/auto-link', {});
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      toast({
        title: "Auto-Linking Complete",
        description: `Linked ${data?.linked || 0} contacts to accounts. ${(data?.failed || 0) > 0 ? `${data.failed} failed.` : ''}`,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Auto-Link Failed",
        description: error.message,
      });
    },
  });

  const filteredContacts = contacts?.filter(contact =>
    searchQuery === "" ||
    contact.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.jobTitle?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const {
    selectedIds,
    selectedCount,
    selectItem,
    selectAll,
    clearSelection,
    isSelected,
    isAllSelected,
    isSomeSelected,
  } = useSelection(filteredContacts);

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => apiRequest('DELETE', `/api/contacts/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      clearSelection();
      toast({
        title: "Success",
        description: `Deleted ${selectedCount} contacts`,
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

  const handleBulkExport = () => {
    const selectedContacts = filteredContacts.filter(c => selectedIds.has(c.id));
    const csv = exportContactsToCSV(selectedContacts);
    downloadCSV(csv, `contacts_bulk_export_${new Date().toISOString().split('T')[0]}.csv`);
    toast({
      title: "Export Complete",
      description: `Exported ${selectedCount} contacts to CSV`,
    });
  };

  const handleBulkDelete = () => {
    if (confirm(`Are you sure you want to delete ${selectedCount} contacts? This action cannot be undone.`)) {
      bulkDeleteMutation.mutate(Array.from(selectedIds));
    }
  };

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: string }) => {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          apiRequest('PATCH', `/api/contacts/${id}`, { [field]: value })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      clearSelection();
      toast({
        title: "Success",
        description: `Updated ${selectedCount} contacts`,
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

  const addToListMutation = useMutation({
    mutationFn: async (segmentId: string) => {
      await apiRequest('POST', `/api/segments/${segmentId}/contacts`, {
        contactIds: Array.from(selectedIds),
      });
    },
    onSuccess: () => {
      clearSelection();
      toast({
        title: "Success",
        description: `Added ${selectedCount} contacts to list`,
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

  const createListMutation = useMutation({
    mutationFn: async ({ name, description }: { name: string; description: string }) => {
      const list = await apiRequest('POST', '/api/lists', {
        name,
        description,
        entityType: 'contact',
        sourceType: 'selection',
        recordIds: Array.from(selectedIds),
      });
      return list.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lists'] });
      clearSelection();
      toast({
        title: "Success",
        description: `Created list and added ${selectedCount} contacts`,
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
          <Button 
            variant="outline" 
            onClick={() => autoLinkMutation.mutate()}
            disabled={autoLinkMutation.isPending}
            data-testid="button-auto-link-contacts"
          >
            <LinkIcon className="mr-2 h-4 w-4" />
            {autoLinkMutation.isPending ? "Linking..." : "Auto-Link"}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              const csv = exportContactsToCSV(filteredContacts);
              downloadCSV(csv, `contacts_export_${new Date().toISOString().split('T')[0]}.csv`);
              toast({
                title: "Export Complete",
                description: `Exported ${filteredContacts.length} contacts to CSV`,
              });
            }}
            data-testid="button-export-contacts"
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setImportDialogOpen(true)}
            data-testid="button-import-contacts"
          >
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
                        <Select onValueChange={field.onChange} value={field.value || undefined}>
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
        <FilterBuilder
          entityType="contact"
          onApplyFilter={setFilterGroup}
          initialFilter={filterGroup}
        />
        <Button variant="outline" data-testid="button-export">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      <BulkActionsToolbar
        selectedCount={selectedCount}
        totalCount={filteredContacts.length}
        onClearSelection={clearSelection}
        onBulkExport={handleBulkExport}
        onBulkDelete={handleBulkDelete}
        onBulkUpdate={() => setBulkUpdateDialogOpen(true)}
        onBulkAddToList={() => setAddToListDialogOpen(true)}
      />

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
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={isAllSelected ? true : isSomeSelected ? "indeterminate" : false}
                    onCheckedChange={() => isAllSelected ? clearSelection() : selectAll()}
                    aria-label="Select all"
                    data-testid="checkbox-select-all"
                  />
                </TableHead>
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
                  <TableRow 
                    key={contact.id} 
                    className="hover-elevate cursor-pointer"
                    onClick={() => setLocation(`/contacts/${contact.id}`)}
                    data-testid={`row-contact-${contact.id}`}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected(contact.id)}
                        onCheckedChange={() => selectItem(contact.id)}
                        aria-label={`Select ${fullName || contact.email}`}
                        data-testid={`checkbox-contact-${contact.id}`}
                      />
                    </TableCell>
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
                    <TableCell>
                      {account ? (
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{account.name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
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
                          onClick={(e) => {
                            e.stopPropagation();
                            setLocation(`/contacts/${contact.id}`);
                          }}
                          data-testid={`button-view-contact-${contact.id}`}
                        >
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMutation.mutate(contact.id);
                          }}
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
          actionLabel={!searchQuery ? "Create Contact" : undefined}
          onAction={!searchQuery ? () => setCreateDialogOpen(true) : undefined}
        />
      )}

      {/* CSV Import Dialog */}
      <CSVImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImportComplete={() => {
          queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
          queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
        }}
      />

      {/* Bulk Update Dialog */}
      <BulkUpdateDialog
        open={bulkUpdateDialogOpen}
        onOpenChange={setBulkUpdateDialogOpen}
        entityType="contact"
        selectedCount={selectedCount}
        onUpdate={(field, value) => bulkUpdateMutation.mutate({ field, value })}
      />

      {/* Add to List Dialog */}
      <AddToListDialog
        open={addToListDialogOpen}
        onOpenChange={setAddToListDialogOpen}
        entityType="contact"
        selectedCount={selectedCount}
        onAddToList={(listId) => addToListMutation.mutate(listId)}
        onCreateList={(name, description) => createListMutation.mutate({ name, description })}
      />
    </div>
  );
}
