import { useQuery, useMutation } from '@tanstack/react-query';
import { useRoute, Link } from 'wouter';
import { ArrowLeft, Upload, Play, Download, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageShell } from '@/components/patterns/page-shell';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function DvProjectDetail() {
  const [, params] = useRoute('/dv/projects/:id');
  const projectId = params?.id;
  const { toast } = useToast();

  const { data: project, isLoading } = useQuery({
    queryKey: ['/api/dv/projects', projectId],
    enabled: !!projectId,
  });

  const startProcessingMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/dv/projects/${projectId}/queue/start`),
    onSuccess: () => {
      toast({ title: 'Processing started', description: 'Records are being normalized and queued' });
      queryClient.invalidateQueries({ queryKey: ['/api/dv/projects', projectId] });
    },
  });

  const exportMutation = useMutation({
    mutationFn: (type: string) => apiRequest('POST', `/api/dv/projects/${projectId}/export`, { type }),
    onSuccess: (data: any) => {
      toast({ title: 'Export generated', description: `${data.rowCount} records exported` });
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" data-testid="loading-spinner"/>
    </div>;
  }

  if (!project) {
    return <div>Project not found</div>;
  }

  return (
    <PageShell
      title={
        <div className="flex items-center gap-2">
          <Link href="/dv/projects">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <span data-testid="text-project-name">{project.name}</span>
        </div>
      }
      description={project.description || 'Data verification project'}
      actions={
        <div className="flex gap-2">
          <Link href={`/dv/console/${projectId}`}>
            <Button variant="outline" data-testid="button-agent-console">
              <Users className="w-4 h-4 mr-2" />
              Agent Console
            </Button>
          </Link>
          <Button 
            variant="outline" 
            onClick={() => startProcessingMutation.mutate()}
            disabled={startProcessingMutation.isPending}
            data-testid="button-start-processing"
          >
            <Play className="w-4 h-4 mr-2" />
            Start Processing
          </Button>
        </div>
      }
    >
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Project Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Total Records</div>
                <div className="text-3xl font-bold" data-testid="stat-total">{project.stats?.total || 0}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Verified</div>
                <div className="text-3xl font-bold text-green-600" data-testid="stat-verified">{project.stats?.verified || 0}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Invalid</div>
                <div className="text-3xl font-bold text-red-600" data-testid="stat-invalid">{project.stats?.invalid || 0}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">In Queue</div>
                <div className="text-3xl font-bold" data-testid="stat-in-queue">{project.stats?.inQueue || 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Project Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Status</div>
                  <div className="text-sm text-muted-foreground">Current project status</div>
                </div>
                <Badge variant={project.status === 'active' ? 'default' : 'secondary'} data-testid="badge-status">
                  {project.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Cap per Company</div>
                  <div className="text-sm text-muted-foreground">Maximum verified records per domain</div>
                </div>
                <span className="font-mono" data-testid="text-cap">{project.capPerCompany || 'Unlimited'}</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Dedupe Scope</div>
                  <div className="text-sm text-muted-foreground">Deduplication level</div>
                </div>
                <Badge variant="outline" data-testid="badge-dedupe-scope">{project.dedupeScope}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Export Data</CardTitle>
            <CardDescription>Download verification results in various formats</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => exportMutation.mutate('all_verification_data')}
                disabled={exportMutation.isPending}
                data-testid="button-export-all"
              >
                <Download className="w-4 h-4 mr-2" />
                All Data
              </Button>
              <Button 
                variant="outline" 
                onClick={() => exportMutation.mutate('verified_only')}
                disabled={exportMutation.isPending}
                data-testid="button-export-verified"
              >
                <Download className="w-4 h-4 mr-2" />
                Verified Only
              </Button>
              <Button 
                variant="outline" 
                onClick={() => exportMutation.mutate('deliverable_only')}
                disabled={exportMutation.isPending}
                data-testid="button-export-deliverable"
              >
                <Download className="w-4 h-4 mr-2" />
                Deliverable Only
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
