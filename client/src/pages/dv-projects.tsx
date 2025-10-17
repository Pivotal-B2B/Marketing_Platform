import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Plus, Database, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageShell } from '@/components/patterns/page-shell';

export default function DvProjects() {
  const { data: projects, isLoading } = useQuery({
    queryKey: ['/api/dv/projects'],
  });

  if (isLoading) {
    return (
      <PageShell
        title="Data Verification Projects"
        description="Manage data cleaning and verification projects"
      >
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" data-testid="loading-spinner"/>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Data Verification Projects"
      description="Manage data cleaning and verification projects"
      actions={
        <Link href="/dv/projects/new">
          <Button data-testid="button-new-project">
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </Link>
      }
    >
      <div className="grid gap-4">
        {projects?.map((project: any) => (
          <Link key={project.id} href={`/dv/projects/${project.id}`}>
            <Card className="hover-elevate active-elevate-2 cursor-pointer" data-testid={`card-project-${project.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2" data-testid={`text-project-name-${project.id}`}>
                      <Database className="w-5 h-5" />
                      {project.name}
                    </CardTitle>
                    <CardDescription data-testid={`text-project-description-${project.id}`}>
                      {project.description || 'No description'}
                    </CardDescription>
                  </div>
                  <Badge variant={project.status === 'active' ? 'default' : 'secondary'} data-testid={`badge-status-${project.id}`}>
                    {project.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Total</div>
                    <div className="text-2xl font-bold" data-testid={`stat-total-${project.id}`}>{project.stats?.total || 0}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      Verified
                    </div>
                    <div className="text-2xl font-bold text-green-600" data-testid={`stat-verified-${project.id}`}>
                      {project.stats?.verified || 0}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <XCircle className="w-3 h-3 text-red-500" />
                      Invalid
                    </div>
                    <div className="text-2xl font-bold text-red-600" data-testid={`stat-invalid-${project.id}`}>
                      {project.stats?.invalid || 0}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-orange-500" />
                      Excluded
                    </div>
                    <div className="text-2xl font-bold text-orange-600" data-testid={`stat-excluded-${project.id}`}>
                      {project.stats?.excluded || 0}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">In Queue</div>
                    <div className="text-2xl font-bold" data-testid={`stat-queue-${project.id}`}>
                      {project.stats?.inQueue || 0}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}

        {(!projects || projects.length === 0) && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Database className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first data verification project to get started
                </p>
                <Link href="/dv/projects/new">
                  <Button data-testid="button-create-first">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Project
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageShell>
  );
}
