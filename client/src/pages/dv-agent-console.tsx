import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRoute, Link } from 'wouter';
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function DvAgentConsole() {
  const [, params] = useRoute('/dv/console/:projectId');
  const projectId = params?.projectId;
  const { toast } = useToast();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [notes, setNotes] = useState('');

  const { data: queue, isLoading } = useQuery({
    queryKey: ['/api/dv/queue', projectId],
    enabled: !!projectId,
  });

  const currentRecord = queue?.[currentIndex];

  const dispositionMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/dv/runs', data),
    onSuccess: () => {
      toast({ title: 'Disposition saved', description: 'Record updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/dv/queue', projectId] });
      setCurrentIndex(prev => prev + 1);
      setNotes('');
    },
  });

  const handleDisposition = (disposition: string) => {
    if (!currentRecord) return;

    dispositionMutation.mutate({
      recordId: currentRecord.id,
      projectId,
      disposition,
      notes,
      checks: {
        email: currentRecord.email ? 'valid' : 'missing',
        phone: currentRecord.phoneE164 ? 'valid' : 'missing',
      },
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" data-testid="loading-spinner"/>
    </div>;
  }

  if (!queue || queue.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-2 mb-6">
          <Link href={`/dv/projects/${projectId}`}>
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Agent Console</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Queue is empty</h3>
              <p className="text-muted-foreground">
                No records available for verification
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentIndex >= queue.length) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-2 mb-6">
          <Link href={`/dv/projects/${projectId}`}>
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Agent Console</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">All records processed</h3>
              <p className="text-muted-foreground mb-4">
                You've reviewed all records in the queue
              </p>
              <Link href={`/dv/projects/${projectId}`}>
                <Button data-testid="button-back-to-project">Back to Project</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Link href={`/dv/projects/${projectId}`}>
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Agent Console</h1>
        </div>
        <Badge variant="secondary" data-testid="badge-progress">
          {currentIndex + 1} / {queue.length}
        </Badge>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Full Name</Label>
                  <Input value={currentRecord?.contactFullName || ''} readOnly data-testid="input-name" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={currentRecord?.email || ''} readOnly data-testid="input-email" />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={currentRecord?.phoneRaw || currentRecord?.phoneE164 || ''} readOnly data-testid="input-phone" />
                </div>
                <div>
                  <Label>Job Title</Label>
                  <Input value={currentRecord?.jobTitle || ''} readOnly data-testid="input-title" />
                </div>
                <div>
                  <Label>Company</Label>
                  <Input value={currentRecord?.accountName || ''} readOnly data-testid="input-company" />
                </div>
                <div>
                  <Label>Domain</Label>
                  <Input value={currentRecord?.accountDomain || ''} readOnly data-testid="input-domain" />
                </div>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add verification notes..."
                  data-testid="textarea-notes"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Verification Checks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span>Email</span>
                {currentRecord?.email ? (
                  <Badge variant="default" className="bg-green-500" data-testid="badge-email-status">Valid</Badge>
                ) : (
                  <Badge variant="destructive" data-testid="badge-email-status">Missing</Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span>Phone</span>
                {currentRecord?.phoneE164 ? (
                  <Badge variant="default" className="bg-green-500" data-testid="badge-phone-status">Valid</Badge>
                ) : (
                  <Badge variant="secondary" data-testid="badge-phone-status">Missing</Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span>Company</span>
                {currentRecord?.accountName ? (
                  <Badge variant="default" className="bg-green-500" data-testid="badge-company-status">Present</Badge>
                ) : (
                  <Badge variant="secondary" data-testid="badge-company-status">Missing</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4">
        <div className="container mx-auto flex gap-2 justify-center">
          <Button 
            size="lg" 
            variant="default" 
            className="bg-green-600 hover:bg-green-700"
            onClick={() => handleDisposition('Verified')}
            disabled={dispositionMutation.isPending}
            data-testid="button-verify"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Verify (V)
          </Button>
          <Button 
            size="lg" 
            variant="destructive"
            onClick={() => handleDisposition('InvalidEmail')}
            disabled={dispositionMutation.isPending}
            data-testid="button-invalid"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Invalid (I)
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            onClick={() => handleDisposition('ExcludedByRule')}
            disabled={dispositionMutation.isPending}
            data-testid="button-exclude"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Exclude (X)
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            onClick={() => handleDisposition('NeedsManualReview')}
            disabled={dispositionMutation.isPending}
            data-testid="button-review"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Needs Review (R)
          </Button>
          <Button 
            size="lg" 
            variant="ghost"
            onClick={() => setCurrentIndex(prev => prev + 1)}
            data-testid="button-skip"
          >
            <ArrowRight className="w-4 h-4 mr-2" />
            Skip (N)
          </Button>
        </div>
      </div>
    </div>
  );
}
