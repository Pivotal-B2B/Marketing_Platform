
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User as UserType } from "@shared/schema";

type UserWithoutPassword = Omit<UserType, 'password'>;

export default function UserManagementPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithoutPassword | null>(null);
  
  // Form state
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<string>("agent");

  const { data: users, isLoading } = useQuery<UserWithoutPassword[]>({
    queryKey: ['/api/users'],
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest('POST', '/api/users', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      resetForm();
      setDialogOpen(false);
      toast({
        title: "Success",
        description: "User created successfully",
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

  const resetForm = () => {
    setUsername("");
    setEmail("");
    setPassword("");
    setFirstName("");
    setLastName("");
    setRole("agent");
    setEditingUser(null);
  };

  const handleSaveUser = () => {
    if (!username || !email || (!editingUser && !password)) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill in all required fields",
      });
      return;
    }

    const data = {
      username,
      email,
      password,
      firstName: firstName || null,
      lastName: lastName || null,
      role,
    };

    createUserMutation.mutate(data);
  };

  const getRoleBadgeVariant = (userRole: string) => {
    switch (userRole) {
      case 'admin':
        return 'destructive';
      case 'campaign_manager':
        return 'default';
      case 'data_ops':
        return 'secondary';
      case 'qa_analyst':
        return 'outline';
      case 'agent':
        return 'outline';
      case 'client_user':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getRoleLabel = (userRole: string) => {
    const labels: Record<string, string> = {
      admin: 'Admin',
      campaign_manager: 'Campaign Manager',
      data_ops: 'Data Operations',
      qa_analyst: 'QA Analyst',
      agent: 'Agent',
      client_user: 'Client User',
    };
    return labels[userRole] || userRole;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage users and their roles
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          if (!open) resetForm();
          setDialogOpen(open);
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingUser ? 'Edit' : 'Create'} User</DialogTitle>
              <DialogDescription>
                {editingUser ? 'Update user details and permissions' : 'Add a new user to the system'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Username *</Label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="john.doe"
                  disabled={!!editingUser}
                />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john.doe@company.com"
                />
              </div>
              {!editingUser && (
                <div className="space-y-2">
                  <Label>Password *</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Role *</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="campaign_manager">Campaign Manager</SelectItem>
                    <SelectItem value="data_ops">Data Operations</SelectItem>
                    <SelectItem value="qa_analyst">QA Analyst</SelectItem>
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="client_user">Client User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveUser} disabled={createUserMutation.isPending}>
                {createUserMutation.isPending ? 'Saving...' : (editingUser ? 'Update' : 'Create')} User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Users</CardTitle>
          <CardDescription>
            All users with access to the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading users...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!users || users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {user.username}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.firstName || user.lastName
                          ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                          : '-'}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {getRoleLabel(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingUser(user);
                              setUsername(user.username);
                              setEmail(user.email);
                              setFirstName(user.firstName || '');
                              setLastName(user.lastName || '');
                              setRole(user.role);
                              setDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled
                            title="Delete functionality coming soon"
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
          <CardDescription>
            Overview of what each role can access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Badge variant="destructive">Admin</Badge>
              <p className="text-sm text-muted-foreground">
                Full system access, user management, all settings and configurations
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Badge>Campaign Manager</Badge>
              <p className="text-sm text-muted-foreground">
                Create and manage campaigns, access contacts and accounts, view reports
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="secondary">Data Operations</Badge>
              <p className="text-sm text-muted-foreground">
                Manage contacts, accounts, imports, and data quality
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline">QA Analyst</Badge>
              <p className="text-sm text-muted-foreground">
                Review and approve leads, access quality assurance tools
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline">Agent</Badge>
              <p className="text-sm text-muted-foreground">
                Access agent console, make calls, view assigned queue
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline">Client User</Badge>
              <p className="text-sm text-muted-foreground">
                Submit campaign orders, view reports for their campaigns
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
