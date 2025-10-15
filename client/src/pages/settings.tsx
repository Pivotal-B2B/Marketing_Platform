
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Settings, User, Bell, Shield, Mail, Phone, Database, Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import type { CustomFieldDefinition } from "@shared/schema";

export default function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [customFieldDialogOpen, setCustomFieldDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null);
  const { toast } = useToast();

  // Custom Fields State
  const [fieldEntityType, setFieldEntityType] = useState<"contact" | "account">("contact");
  const [fieldKey, setFieldKey] = useState("");
  const [displayLabel, setDisplayLabel] = useState("");
  const [fieldType, setFieldType] = useState<string>("text");
  const [helpText, setHelpText] = useState("");
  const [required, setRequired] = useState(false);
  const [options, setOptions] = useState("");

  const { data: customFields, isLoading: fieldsLoading } = useQuery<CustomFieldDefinition[]>({
    queryKey: ['/api/custom-fields'],
  });

  const createFieldMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest('POST', '/api/custom-fields', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/custom-fields'] });
      resetFieldForm();
      setCustomFieldDialogOpen(false);
      toast({
        title: "Success",
        description: "Custom field created successfully",
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

  const updateFieldMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await apiRequest('PATCH', `/api/custom-fields/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/custom-fields'] });
      resetFieldForm();
      setCustomFieldDialogOpen(false);
      toast({
        title: "Success",
        description: "Custom field updated successfully",
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

  const deleteFieldMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/custom-fields/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/custom-fields'] });
      toast({
        title: "Success",
        description: "Custom field deleted successfully",
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

  const resetFieldForm = () => {
    setFieldEntityType("contact");
    setFieldKey("");
    setDisplayLabel("");
    setFieldType("text");
    setHelpText("");
    setRequired(false);
    setOptions("");
    setEditingField(null);
  };

  const handleEditField = (field: CustomFieldDefinition) => {
    setEditingField(field);
    setFieldEntityType(field.entityType);
    setFieldKey(field.fieldKey);
    setDisplayLabel(field.displayLabel);
    setFieldType(field.fieldType);
    setHelpText(field.helpText || "");
    setRequired(field.required);
    setOptions(field.options ? JSON.stringify(field.options) : "");
    setCustomFieldDialogOpen(true);
  };

  const handleSaveField = () => {
    const data: any = {
      entityType: fieldEntityType,
      fieldKey: fieldKey,
      displayLabel: displayLabel,
      fieldType: fieldType,
      helpText: helpText || null,
      required: required,
      options: (fieldType === 'select' || fieldType === 'multi_select') && options ? JSON.parse(options) : null,
    };

    if (editingField) {
      updateFieldMutation.mutate({ id: editingField.id, data });
    } else {
      createFieldMutation.mutate(data);
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));

    toast({
      title: "Success",
      description: "Your password has been updated.",
    });

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const contactFields = customFields?.filter(f => f.entityType === 'contact') || [];
  const accountFields = customFields?.filter(f => f.entityType === 'account') || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account and system preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList>
          <TabsTrigger value="profile" data-testid="tab-profile">
            <User className="mr-2 h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="custom-fields" data-testid="tab-custom-fields">
            <Database className="mr-2 h-4 w-4" />
            Custom Fields
          </TabsTrigger>
          <TabsTrigger value="notifications" data-testid="tab-notifications">
            <Bell className="mr-2 h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="integrations" data-testid="tab-integrations">
            <Settings className="mr-2 h-4 w-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="security" data-testid="tab-security">
            <Shield className="mr-2 h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" placeholder="John" data-testid="input-first-name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" placeholder="Doe" data-testid="input-last-name" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="john.doe@company.com" data-testid="input-email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input id="role" value="Admin" disabled data-testid="input-role" />
              </div>
              <Button data-testid="button-save-profile">Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom-fields" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Contact Custom Fields</CardTitle>
                  <CardDescription>
                    Define custom fields for contacts
                  </CardDescription>
                </div>
                <Dialog open={customFieldDialogOpen && fieldEntityType === 'contact'} onOpenChange={(open) => {
                  if (!open) resetFieldForm();
                  setCustomFieldDialogOpen(open);
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm" onClick={() => setFieldEntityType('contact')}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Field
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-xl">
                    <DialogHeader>
                      <DialogTitle>{editingField ? 'Edit' : 'Create'} Contact Custom Field</DialogTitle>
                      <DialogDescription>
                        Define a custom field for contacts
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Field Key (internal)</Label>
                        <Input
                          value={fieldKey}
                          onChange={(e) => setFieldKey(e.target.value)}
                          placeholder="e.g., lead_score"
                          disabled={!!editingField}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Display Label</Label>
                        <Input
                          value={displayLabel}
                          onChange={(e) => setDisplayLabel(e.target.value)}
                          placeholder="e.g., Lead Score"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Field Type</Label>
                        <Select value={fieldType} onValueChange={setFieldType}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="date">Date</SelectItem>
                            <SelectItem value="boolean">Boolean</SelectItem>
                            <SelectItem value="select">Select (dropdown)</SelectItem>
                            <SelectItem value="multi_select">Multi-Select</SelectItem>
                            <SelectItem value="url">URL</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {(fieldType === 'select' || fieldType === 'multi_select') && (
                        <div className="space-y-2">
                          <Label>Options (JSON array)</Label>
                          <Textarea
                            value={options}
                            onChange={(e) => setOptions(e.target.value)}
                            placeholder='["Option 1", "Option 2", "Option 3"]'
                          />
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label>Help Text</Label>
                        <Input
                          value={helpText}
                          onChange={(e) => setHelpText(e.target.value)}
                          placeholder="Optional helper text"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch checked={required} onCheckedChange={setRequired} />
                        <Label>Required Field</Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setCustomFieldDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveField}>
                        {editingField ? 'Update' : 'Create'} Field
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Label</TableHead>
                    <TableHead>Key</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contactFields.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No custom fields defined
                      </TableCell>
                    </TableRow>
                  ) : (
                    contactFields.map((field) => (
                      <TableRow key={field.id}>
                        <TableCell className="font-medium">{field.displayLabel}</TableCell>
                        <TableCell className="font-mono text-sm">{field.fieldKey}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{field.fieldType}</Badge>
                        </TableCell>
                        <TableCell>
                          {field.required ? <Badge>Required</Badge> : <span className="text-muted-foreground">Optional</span>}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditField(field)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this field?')) {
                                  deleteFieldMutation.mutate(field.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Account Custom Fields</CardTitle>
                  <CardDescription>
                    Define custom fields for accounts
                  </CardDescription>
                </div>
                <Dialog open={customFieldDialogOpen && fieldEntityType === 'account'} onOpenChange={(open) => {
                  if (!open) resetFieldForm();
                  setCustomFieldDialogOpen(open);
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm" onClick={() => setFieldEntityType('account')}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Field
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-xl">
                    <DialogHeader>
                      <DialogTitle>{editingField ? 'Edit' : 'Create'} Account Custom Field</DialogTitle>
                      <DialogDescription>
                        Define a custom field for accounts
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Field Key (internal)</Label>
                        <Input
                          value={fieldKey}
                          onChange={(e) => setFieldKey(e.target.value)}
                          placeholder="e.g., contract_type"
                          disabled={!!editingField}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Display Label</Label>
                        <Input
                          value={displayLabel}
                          onChange={(e) => setDisplayLabel(e.target.value)}
                          placeholder="e.g., Contract Type"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Field Type</Label>
                        <Select value={fieldType} onValueChange={setFieldType}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="date">Date</SelectItem>
                            <SelectItem value="boolean">Boolean</SelectItem>
                            <SelectItem value="select">Select (dropdown)</SelectItem>
                            <SelectItem value="multi_select">Multi-Select</SelectItem>
                            <SelectItem value="url">URL</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {(fieldType === 'select' || fieldType === 'multi_select') && (
                        <div className="space-y-2">
                          <Label>Options (JSON array)</Label>
                          <Textarea
                            value={options}
                            onChange={(e) => setOptions(e.target.value)}
                            placeholder='["Option 1", "Option 2", "Option 3"]'
                          />
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label>Help Text</Label>
                        <Input
                          value={helpText}
                          onChange={(e) => setHelpText(e.target.value)}
                          placeholder="Optional helper text"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch checked={required} onCheckedChange={setRequired} />
                        <Label>Required Field</Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setCustomFieldDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveField}>
                        {editingField ? 'Update' : 'Create'} Field
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Label</TableHead>
                    <TableHead>Key</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accountFields.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No custom fields defined
                      </TableCell>
                    </TableRow>
                  ) : (
                    accountFields.map((field) => (
                      <TableRow key={field.id}>
                        <TableCell className="font-medium">{field.displayLabel}</TableCell>
                        <TableCell className="font-mono text-sm">{field.fieldKey}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{field.fieldType}</Badge>
                        </TableCell>
                        <TableCell>
                          {field.required ? <Badge>Required</Badge> : <span className="text-muted-foreground">Optional</span>}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditField(field)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this field?')) {
                                  deleteFieldMutation.mutate(field.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose how you want to be notified about important events
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Campaign Completion</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when a campaign completes
                  </p>
                </div>
                <Switch data-testid="switch-campaign-completion" />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Lead Approvals</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when leads are ready for review
                  </p>
                </div>
                <Switch defaultChecked data-testid="switch-lead-approvals" />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Import Completion</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when bulk imports finish
                  </p>
                </div>
                <Switch defaultChecked data-testid="switch-import-completion" />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Order Updates</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified about client order status changes
                  </p>
                </div>
                <Switch defaultChecked data-testid="switch-order-updates" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Service Provider</CardTitle>
              <CardDescription>
                Configure your ESP for email campaigns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Mail className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <h4 className="font-medium">SendGrid</h4>
                    <p className="text-sm text-muted-foreground">Connected</p>
                  </div>
                </div>
                <Button variant="outline" data-testid="button-configure-esp">
                  Configure
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Telephony Provider</CardTitle>
              <CardDescription>
                Configure Telnyx for telemarketing campaigns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Phone className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <h4 className="font-medium">Telnyx</h4>
                    <p className="text-sm text-muted-foreground">Not connected</p>
                  </div>
                </div>
                <Button data-testid="button-connect-telephony">
                  Connect
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  data-testid="input-current-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  data-testid="input-new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  data-testid="input-confirm-password"
                />
              </div>
              <Button onClick={handlePasswordChange} data-testid="button-change-password">
                Update Password
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Two-Factor Authentication</CardTitle>
              <CardDescription>
                Add an extra layer of security to your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable 2FA</Label>
                  <p className="text-sm text-muted-foreground">
                    Require authentication code in addition to password
                  </p>
                </div>
                <Switch data-testid="switch-2fa" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
