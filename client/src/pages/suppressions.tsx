import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Mail, Phone, Upload, Trash2, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  type SuppressionEmail, 
  type SuppressionPhone,
  type InsertSuppressionEmail,
  type InsertSuppressionPhone,
  insertSuppressionEmailSchema,
  insertSuppressionPhoneSchema
} from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

export default function SuppressionsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Check if user has permission to manage suppressions
  const canManageSuppressions = user?.role === 'admin' || user?.role === 'data_ops';

  // Fetch email suppressions
  const { data: emailSuppressions = [], isLoading: emailLoading } = useQuery<SuppressionEmail[]>({
    queryKey: ['/api/suppressions/email'],
  });

  // Fetch phone suppressions
  const { data: phoneSuppressions = [], isLoading: phoneLoading } = useQuery<SuppressionPhone[]>({
    queryKey: ['/api/suppressions/phone'],
  });

  // Email suppression form
  const emailForm = useForm<InsertSuppressionEmail>({
    resolver: zodResolver(insertSuppressionEmailSchema),
    defaultValues: {
      email: "",
      reason: "",
      source: "",
    },
  });

  // Phone suppression form
  const phoneForm = useForm<InsertSuppressionPhone>({
    resolver: zodResolver(insertSuppressionPhoneSchema),
    defaultValues: {
      phoneE164: "",
      reason: "",
      source: "",
    },
  });

  // Create email suppression
  const createEmailSuppression = useMutation({
    mutationFn: async (data: InsertSuppressionEmail) => {
      return await apiRequest('POST', '/api/suppressions/email', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/suppressions/email'], refetchType: 'active' });
      setEmailDialogOpen(false);
      emailForm.reset();
      toast({
        title: "Success",
        description: "Email added to suppression list",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add email suppression",
        variant: "destructive",
      });
    },
  });

  // Create phone suppression
  const createPhoneSuppression = useMutation({
    mutationFn: async (data: InsertSuppressionPhone) => {
      return await apiRequest('POST', '/api/suppressions/phone', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/suppressions/phone'], refetchType: 'active' });
      setPhoneDialogOpen(false);
      phoneForm.reset();
      toast({
        title: "Success",
        description: "Phone number added to DNC list",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add phone suppression",
        variant: "destructive",
      });
    },
  });

  // Delete email suppression
  const deleteEmailSuppression = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/suppressions/email/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/suppressions/email'], refetchType: 'active' });
      toast({
        title: "Success",
        description: "Email removed from suppression list",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove email suppression",
        variant: "destructive",
      });
    },
  });

  // Delete phone suppression
  const deletePhoneSuppression = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/suppressions/phone/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/suppressions/phone'], refetchType: 'active' });
      toast({
        title: "Success",
        description: "Phone number removed from DNC list",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove phone suppression",
        variant: "destructive",
      });
    },
  });

  const filteredEmailSuppressions = emailSuppressions.filter((s) =>
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPhoneSuppressions = phoneSuppressions.filter((s) =>
    s.phoneE164.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-suppressions">Suppressions</h1>
          <p className="text-muted-foreground mt-1">
            Manage DNC lists and email unsubscribes for compliance
          </p>
        </div>
      </div>

      <Tabs defaultValue="email" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="email" data-testid="tab-email-suppressions">
            <Mail className="mr-2 h-4 w-4" />
            Email Unsubscribes
          </TabsTrigger>
          <TabsTrigger value="phone" data-testid="tab-phone-suppressions">
            <Phone className="mr-2 h-4 w-4" />
            DNC (Phone)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="space-y-4 mt-6">
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search email suppressions..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-email-suppressions"
              />
            </div>
            {canManageSuppressions && (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  data-testid="button-import-email-suppressions"
                  disabled
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Import
                </Button>
                <Button 
                  onClick={() => setEmailDialogOpen(true)}
                  data-testid="button-add-email-suppression"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Email
                </Button>
              </div>
            )}
          </div>

          {emailLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : filteredEmailSuppressions.length > 0 ? (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Date Added</TableHead>
                    {canManageSuppressions && <TableHead className="w-[100px]">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmailSuppressions.map((suppression) => (
                    <TableRow key={suppression.id} data-testid={`row-email-suppression-${suppression.id}`}>
                      <TableCell className="font-mono" data-testid={`text-email-${suppression.id}`}>
                        {suppression.email}
                      </TableCell>
                      <TableCell data-testid={`text-email-reason-${suppression.id}`}>
                        <Badge variant="secondary">{suppression.reason || "N/A"}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground" data-testid={`text-email-source-${suppression.id}`}>
                        {suppression.source || "N/A"}
                      </TableCell>
                      <TableCell className="text-muted-foreground" data-testid={`text-email-date-${suppression.id}`}>
                        {format(new Date(suppression.createdAt), 'MMM d, yyyy')}
                      </TableCell>
                      {canManageSuppressions && (
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => deleteEmailSuppression.mutate(suppression.id)}
                            disabled={deleteEmailSuppression.isPending}
                            data-testid={`button-remove-email-${suppression.id}`}
                          >
                            {deleteEmailSuppression.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              icon={Mail}
              title="No email suppressions"
              description="Email addresses added to the suppression list will be automatically excluded from campaigns."
              actionLabel={canManageSuppressions ? "Add Email" : undefined}
              onAction={canManageSuppressions ? () => setEmailDialogOpen(true) : undefined}
            />
          )}
        </TabsContent>

        <TabsContent value="phone" className="space-y-4 mt-6">
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search DNC list..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-phone-suppressions"
              />
            </div>
            {canManageSuppressions && (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  data-testid="button-import-phone-suppressions"
                  disabled
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Import
                </Button>
                <Button 
                  onClick={() => setPhoneDialogOpen(true)}
                  data-testid="button-add-phone-suppression"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Phone
                </Button>
              </div>
            )}
          </div>

          {phoneLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : filteredPhoneSuppressions.length > 0 ? (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Date Added</TableHead>
                    {canManageSuppressions && <TableHead className="w-[100px]">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPhoneSuppressions.map((suppression) => (
                    <TableRow key={suppression.id} data-testid={`row-phone-suppression-${suppression.id}`}>
                      <TableCell className="font-mono" data-testid={`text-phone-${suppression.id}`}>
                        {suppression.phoneE164}
                      </TableCell>
                      <TableCell data-testid={`text-phone-reason-${suppression.id}`}>
                        <Badge variant="destructive">{suppression.reason || "N/A"}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground" data-testid={`text-phone-source-${suppression.id}`}>
                        {suppression.source || "N/A"}
                      </TableCell>
                      <TableCell className="text-muted-foreground" data-testid={`text-phone-date-${suppression.id}`}>
                        {format(new Date(suppression.createdAt), 'MMM d, yyyy')}
                      </TableCell>
                      {canManageSuppressions && (
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => deletePhoneSuppression.mutate(suppression.id)}
                            disabled={deletePhoneSuppression.isPending}
                            data-testid={`button-remove-phone-${suppression.id}`}
                          >
                            {deletePhoneSuppression.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                          )}
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              icon={Phone}
              title="No DNC entries"
              description="Phone numbers added to the DNC list will be automatically excluded from telemarketing campaigns."
              actionLabel={canManageSuppressions ? "Add Phone" : undefined}
              onAction={canManageSuppressions ? () => setPhoneDialogOpen(true) : undefined}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Add Email Suppression Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent data-testid="dialog-add-email-suppression">
          <DialogHeader>
            <DialogTitle>Add Email Suppression</DialogTitle>
            <DialogDescription>
              Add an email address to the suppression list. This email will be excluded from all campaigns.
            </DialogDescription>
          </DialogHeader>
          <Form {...emailForm}>
            <form onSubmit={emailForm.handleSubmit((data) => createEmailSuppression.mutate(data))} className="space-y-4">
              <FormField
                control={emailForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="email@example.com" 
                        {...field} 
                        data-testid="input-email-address"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={emailForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Unsubscribe request" 
                        {...field} 
                        data-testid="input-email-reason"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={emailForm.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Manual, ESP, Email link" 
                        {...field} 
                        data-testid="input-email-source"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEmailDialogOpen(false)}
                  data-testid="button-cancel-email"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createEmailSuppression.isPending}
                  data-testid="button-submit-email"
                >
                  {createEmailSuppression.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Add Email
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add Phone Suppression Dialog */}
      <Dialog open={phoneDialogOpen} onOpenChange={setPhoneDialogOpen}>
        <DialogContent data-testid="dialog-add-phone-suppression">
          <DialogHeader>
            <DialogTitle>Add Phone to DNC List</DialogTitle>
            <DialogDescription>
              Add a phone number to the Do Not Call list. This number will be excluded from all telemarketing campaigns.
            </DialogDescription>
          </DialogHeader>
          <Form {...phoneForm}>
            <form onSubmit={phoneForm.handleSubmit((data) => createPhoneSuppression.mutate(data))} className="space-y-4">
              <FormField
                control={phoneForm.control}
                name="phoneE164"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number (E.164 format)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="+15551234567" 
                        {...field} 
                        data-testid="input-phone-number"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={phoneForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., DNC request" 
                        {...field} 
                        data-testid="input-phone-reason"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={phoneForm.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Agent, Automated, Manual" 
                        {...field} 
                        data-testid="input-phone-source"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setPhoneDialogOpen(false)}
                  data-testid="button-cancel-phone"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createPhoneSuppression.isPending}
                  data-testid="button-submit-phone"
                >
                  {createPhoneSuppression.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Add Phone
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
