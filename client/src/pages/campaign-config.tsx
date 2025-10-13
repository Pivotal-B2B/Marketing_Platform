import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Mail, Phone, Settings2, Loader2, Trash2, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  type SenderProfile,
  type EmailTemplate,
  type CallScript,
  insertSenderProfileSchema,
  insertEmailTemplateSchema,
  insertCallScriptSchema,
} from "@shared/schema";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

export default function CampaignConfigPage() {
  const [activeTab, setActiveTab] = useState("sender-profiles");
  const [createProfileDialogOpen, setCreateProfileDialogOpen] = useState(false);
  const [createTemplateDialogOpen, setCreateTemplateDialogOpen] = useState(false);
  const [createScriptDialogOpen, setCreateScriptDialogOpen] = useState(false);
  const { toast } = useToast();

  // Sender Profiles
  const { data: senderProfiles, isLoading: profilesLoading } = useQuery<SenderProfile[]>({
    queryKey: ['/api/sender-profiles'],
  });

  const senderProfileForm = useForm({
    resolver: zodResolver(insertSenderProfileSchema),
    defaultValues: {
      fromEmail: "",
      fromName: "",
      replyToEmail: "",
      isActive: true,
    },
  });

  const createProfileMutation = useMutation({
    mutationFn: async (data: any) => await apiRequest('POST', '/api/sender-profiles', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sender-profiles'], refetchType: 'active' });
      setCreateProfileDialogOpen(false);
      senderProfileForm.reset();
      toast({ title: "Success", description: "Sender profile created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to create sender profile", variant: "destructive" });
    },
  });

  const deleteProfileMutation = useMutation({
    mutationFn: async (id: string) => await apiRequest('DELETE', `/api/sender-profiles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sender-profiles'], refetchType: 'active' });
      toast({ title: "Success", description: "Sender profile deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to delete sender profile", variant: "destructive" });
    },
  });

  // Email Templates
  const { data: emailTemplates, isLoading: templatesLoading } = useQuery<EmailTemplate[]>({
    queryKey: ['/api/email-templates'],
  });

  const emailTemplateForm = useForm({
    resolver: zodResolver(insertEmailTemplateSchema),
    defaultValues: {
      name: "",
      subject: "",
      htmlContent: "",
      version: 1,
      isApproved: false,
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: any) => await apiRequest('POST', '/api/email-templates', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-templates'], refetchType: 'active' });
      setCreateTemplateDialogOpen(false);
      emailTemplateForm.reset();
      toast({ title: "Success", description: "Email template created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to create email template", variant: "destructive" });
    },
  });

  const approveTemplateMutation = useMutation({
    mutationFn: async (id: string) => await apiRequest('POST', `/api/email-templates/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-templates'], refetchType: 'active' });
      toast({ title: "Success", description: "Email template approved successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to approve email template", variant: "destructive" });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => await apiRequest('DELETE', `/api/email-templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-templates'], refetchType: 'active' });
      toast({ title: "Success", description: "Email template deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to delete email template", variant: "destructive" });
    },
  });

  // Call Scripts
  const { data: callScripts, isLoading: scriptsLoading } = useQuery<CallScript[]>({
    queryKey: ['/api/call-scripts'],
  });

  const callScriptForm = useForm({
    resolver: zodResolver(insertCallScriptSchema),
    defaultValues: {
      name: "",
      content: "",
      version: 1,
    },
  });

  const createScriptMutation = useMutation({
    mutationFn: async (data: any) => await apiRequest('POST', '/api/call-scripts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/call-scripts'], refetchType: 'active' });
      setCreateScriptDialogOpen(false);
      callScriptForm.reset();
      toast({ title: "Success", description: "Call script created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to create call script", variant: "destructive" });
    },
  });

  const deleteScriptMutation = useMutation({
    mutationFn: async (id: string) => await apiRequest('DELETE', `/api/call-scripts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/call-scripts'], refetchType: 'active' });
      toast({ title: "Success", description: "Call script deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to delete call script", variant: "destructive" });
    },
  });

  return (
    <div className="p-6 space-y-6" data-testid="page-campaign-config">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Campaign Configuration</h1>
          <p className="text-muted-foreground" data-testid="text-page-description">
            Manage sender profiles, email templates, and call scripts
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList data-testid="tabs-campaign-config">
          <TabsTrigger value="sender-profiles" data-testid="tab-sender-profiles">
            <Mail className="h-4 w-4 mr-2" />
            Sender Profiles
          </TabsTrigger>
          <TabsTrigger value="email-templates" data-testid="tab-email-templates">
            <Settings2 className="h-4 w-4 mr-2" />
            Email Templates
          </TabsTrigger>
          <TabsTrigger value="call-scripts" data-testid="tab-call-scripts">
            <Phone className="h-4 w-4 mr-2" />
            Call Scripts
          </TabsTrigger>
        </TabsList>

        {/* Sender Profiles Tab */}
        <TabsContent value="sender-profiles" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setCreateProfileDialogOpen(true)} data-testid="button-create-sender-profile">
              <Plus className="h-4 w-4 mr-2" />
              Create Sender Profile
            </Button>
          </div>

          {profilesLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-5 w-3/4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {senderProfiles?.map((profile) => (
                <Card key={profile.id} data-testid={`card-sender-profile-${profile.id}`}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-base" data-testid={`text-profile-name-${profile.id}`}>
                        {profile.fromName}
                      </CardTitle>
                      <Badge variant={profile.isActive ? "default" : "secondary"} data-testid={`badge-profile-status-${profile.id}`}>
                        {profile.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-sm">
                      <p className="text-muted-foreground">From:</p>
                      <p className="font-mono text-xs" data-testid={`text-profile-from-${profile.id}`}>
                        {profile.fromName} &lt;{profile.fromEmail}&gt;
                      </p>
                    </div>
                    {profile.replyToEmail && (
                      <div className="text-sm">
                        <p className="text-muted-foreground">Reply-To:</p>
                        <p className="font-mono text-xs" data-testid={`text-profile-reply-${profile.id}`}>{profile.replyToEmail}</p>
                      </div>
                    )}
                    <div className="pt-2 flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteProfileMutation.mutate(profile.id)}
                        disabled={deleteProfileMutation.isPending}
                        data-testid={`button-delete-profile-${profile.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Email Templates Tab */}
        <TabsContent value="email-templates" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setCreateTemplateDialogOpen(true)} data-testid="button-create-email-template">
              <Plus className="h-4 w-4 mr-2" />
              Create Email Template
            </Button>
          </div>

          {templatesLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-5 w-3/4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {emailTemplates?.map((template) => (
                <Card key={template.id} data-testid={`card-email-template-${template.id}`}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-base" data-testid={`text-template-name-${template.id}`}>
                        {template.name}
                      </CardTitle>
                      <Badge variant={template.isApproved ? "default" : "secondary"} data-testid={`badge-template-status-${template.id}`}>
                        {template.isApproved ? "Approved" : "Draft"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-sm">
                      <p className="text-muted-foreground">Subject:</p>
                      <p className="font-medium" data-testid={`text-template-subject-${template.id}`}>{template.subject}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-muted-foreground">Version:</p>
                      <p data-testid={`text-template-version-${template.id}`}>{template.version}</p>
                    </div>
                    <div className="pt-2 flex justify-end gap-2">
                      {!template.isApproved && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => approveTemplateMutation.mutate(template.id)}
                          disabled={approveTemplateMutation.isPending}
                          data-testid={`button-approve-template-${template.id}`}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteTemplateMutation.mutate(template.id)}
                        disabled={deleteTemplateMutation.isPending}
                        data-testid={`button-delete-template-${template.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Call Scripts Tab */}
        <TabsContent value="call-scripts" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setCreateScriptDialogOpen(true)} data-testid="button-create-call-script">
              <Plus className="h-4 w-4 mr-2" />
              Create Call Script
            </Button>
          </div>

          {scriptsLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-5 w-3/4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {callScripts?.map((script) => (
                <Card key={script.id} data-testid={`card-call-script-${script.id}`}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-base" data-testid={`text-script-name-${script.id}`}>
                        {script.name}
                      </CardTitle>
                      <Badge variant="outline" data-testid={`badge-script-version-${script.id}`}>
                        v{script.version}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-sm">
                      <p className="text-muted-foreground">Content Preview:</p>
                      <p className="text-xs line-clamp-3 bg-muted p-2 rounded font-mono" data-testid={`text-script-content-${script.id}`}>
                        {script.content}
                      </p>
                    </div>
                    <div className="pt-2 flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteScriptMutation.mutate(script.id)}
                        disabled={deleteScriptMutation.isPending}
                        data-testid={`button-delete-script-${script.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Sender Profile Dialog */}
      <Dialog open={createProfileDialogOpen} onOpenChange={setCreateProfileDialogOpen}>
        <DialogContent data-testid="dialog-create-sender-profile">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">Create Sender Profile</DialogTitle>
            <DialogDescription data-testid="text-dialog-description">
              Add a new email sender profile for campaigns
            </DialogDescription>
          </DialogHeader>
          <Form {...senderProfileForm}>
            <form onSubmit={senderProfileForm.handleSubmit((data) => createProfileMutation.mutate(data))} className="space-y-4">
              <FormField
                control={senderProfileForm.control}
                name="fromName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Acme Corp" data-testid="input-profile-from-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={senderProfileForm.control}
                name="fromEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="marketing@acme.com" data-testid="input-profile-from-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={senderProfileForm.control}
                name="replyToEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reply-To Email (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="support@acme.com" data-testid="input-profile-reply-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={createProfileMutation.isPending} data-testid="button-submit-sender-profile">
                  {createProfileMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Profile
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Create Email Template Dialog */}
      <Dialog open={createTemplateDialogOpen} onOpenChange={setCreateTemplateDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-create-email-template">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">Create Email Template</DialogTitle>
            <DialogDescription data-testid="text-dialog-description">
              Create a new email template for campaigns
            </DialogDescription>
          </DialogHeader>
          <Form {...emailTemplateForm}>
            <form onSubmit={emailTemplateForm.handleSubmit((data) => createTemplateMutation.mutate(data))} className="space-y-4">
              <FormField
                control={emailTemplateForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Welcome Email" data-testid="input-template-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={emailTemplateForm.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Subject</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Welcome to {{company_name}}" data-testid="input-template-subject" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={emailTemplateForm.control}
                name="htmlContent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>HTML Content</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="<html>...</html>" rows={10} data-testid="textarea-template-content" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={createTemplateMutation.isPending} data-testid="button-submit-email-template">
                  {createTemplateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Template
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Create Call Script Dialog */}
      <Dialog open={createScriptDialogOpen} onOpenChange={setCreateScriptDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-create-call-script">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">Create Call Script</DialogTitle>
            <DialogDescription data-testid="text-dialog-description">
              Create a new call script for telemarketing campaigns
            </DialogDescription>
          </DialogHeader>
          <Form {...callScriptForm}>
            <form onSubmit={callScriptForm.handleSubmit((data) => createScriptMutation.mutate(data))} className="space-y-4">
              <FormField
                control={callScriptForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Script Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Discovery Call Script" data-testid="input-script-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={callScriptForm.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Script Content</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Hi {{contact_name}}, this is {{agent_name}} from..." rows={10} data-testid="textarea-script-content" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={createScriptMutation.isPending} data-testid="button-submit-call-script">
                  {createScriptMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Script
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
