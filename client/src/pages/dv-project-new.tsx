import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { PageShell } from '@/components/patterns/page-shell';
import { Link } from 'wouter';

export default function DvProjectNew() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    clientId: 'default-client',
    capPerCompany: 0,
    dedupeScope: 'client',
    createdBy: 'current-user',
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/dv/projects', data),
    onSuccess: (project: any) => {
      toast({ title: 'Project created', description: 'Data verification project created successfully' });
      setLocation(`/dv/projects/${project.id}`);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create project', variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <PageShell
      title={
        <div className="flex items-center gap-2">
          <Link href="/dv/projects">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <span>New Data Verification Project</span>
        </div>
      }
      description="Create a new data cleaning and verification project"
    >
      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
          <CardDescription>Configure your data verification project settings</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Q1 2025 Contact Verification"
                required
                data-testid="input-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the purpose and scope of this verification project"
                data-testid="textarea-description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="capPerCompany">Cap per Company</Label>
              <Input
                id="capPerCompany"
                type="number"
                min="0"
                value={formData.capPerCompany}
                onChange={(e) => setFormData({ ...formData, capPerCompany: parseInt(e.target.value) || 0 })}
                placeholder="0 for unlimited"
                data-testid="input-cap"
              />
              <p className="text-sm text-muted-foreground">
                Maximum number of verified contacts per company (0 = unlimited)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dedupeScope">Deduplication Scope</Label>
              <Select
                value={formData.dedupeScope}
                onValueChange={(value) => setFormData({ ...formData, dedupeScope: value })}
              >
                <SelectTrigger id="dedupeScope" data-testid="select-dedupe-scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="project">Project Only</SelectItem>
                  <SelectItem value="client">Client Wide</SelectItem>
                  <SelectItem value="global">Global</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Define how duplicate detection should work across your data
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                type="submit" 
                disabled={createMutation.isPending || !formData.name}
                data-testid="button-create"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Project'}
              </Button>
              <Link href="/dv/projects">
                <Button type="button" variant="outline" data-testid="button-cancel">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </PageShell>
  );
}
