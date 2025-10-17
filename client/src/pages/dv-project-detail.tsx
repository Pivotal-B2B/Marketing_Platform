import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRoute, Link } from 'wouter';
import { ArrowLeft, Upload, Play, Download, Users, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageShell } from '@/components/patterns/page-shell';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function DvProjectDetail() {
  const [, params] = useRoute('/dv/projects/:id');
  const projectId = params?.id;
  const { toast } = useToast();
  
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploadedData, setUploadedData] = useState<any>(null);
  const [mappings, setMappings] = useState<any[]>([]);

  const { data: project, isLoading } = useQuery({
    queryKey: ['/api/dv/projects', projectId],
    enabled: !!projectId,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text();
      const res = await apiRequest('POST', `/api/dv/projects/${projectId}/upload`, {
        csvData: text,
        fileName: file.name,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setUploadedData(data);
      // Auto-suggest mappings
      const suggested = data.headers.map((header: string) => ({
        clientHeader: header,
        crmField: suggestMapping(header),
        confidence: 0.8,
      }));
      setMappings(suggested);
      toast({ title: 'CSV uploaded', description: `${data.preview.length} rows detected` });
    },
  });

  const confirmMappingsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/dv/projects/${projectId}/mappings`, { mappings });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Mappings saved', description: 'Starting data import...' });
      queryClient.invalidateQueries({ queryKey: ['/api/dv/projects', projectId] });
      setUploadedData(null);
      setCsvFile(null);
    },
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
      uploadMutation.mutate(file);
    }
  };

  const suggestMapping = (header: string): string => {
    const h = header.toLowerCase();
    if (h.includes('email')) return 'email';
    if (h.includes('first') && h.includes('name')) return 'firstName';
    if (h.includes('last') && h.includes('name')) return 'lastName';
    if (h.includes('phone') || h.includes('mobile')) return 'phoneRaw';
    if (h.includes('company')) return 'company';
    if (h.includes('title') || h.includes('job')) return 'jobTitle';
    if (h.includes('domain')) return 'accountDomain';
    if (h.includes('country')) return 'country';
    return '';
  };

  const updateMapping = (index: number, field: string, value: string) => {
    const updated = [...mappings];
    updated[index] = { ...updated[index], [field]: value };
    setMappings(updated);
  };

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
        {/* Upload CSV Section */}
        {!uploadedData && (
          <Card>
            <CardHeader>
              <CardTitle>Import Data</CardTitle>
              <CardDescription>Upload a CSV file to start data verification</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <Label htmlFor="csv-upload" className="cursor-pointer">
                    <div className="text-sm font-medium mb-2">
                      {csvFile ? csvFile.name : 'Click to upload CSV or drag and drop'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      CSV files up to 50MB
                    </div>
                  </Label>
                  <Input
                    id="csv-upload"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileChange}
                    data-testid="input-csv-upload"
                  />
                </div>
                {uploadMutation.isPending && (
                  <div className="text-sm text-muted-foreground text-center">
                    Uploading and analyzing CSV...
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Field Mapping Section */}
        {uploadedData && (
          <Card>
            <CardHeader>
              <CardTitle>Map Fields</CardTitle>
              <CardDescription>
                Match your CSV columns to CRM fields ({mappings.length} fields detected)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>CSV Column</TableHead>
                      <TableHead>Sample Data</TableHead>
                      <TableHead>Maps To</TableHead>
                      <TableHead>Confidence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mappings.map((mapping, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{mapping.clientHeader}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {uploadedData.preview[0]?.[mapping.clientHeader] || '—'}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={mapping.crmField}
                            onValueChange={(value) => updateMapping(index, 'crmField', value)}
                          >
                            <SelectTrigger data-testid={`select-mapping-${index}`}>
                              <SelectValue placeholder="Select field" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="firstName">First Name</SelectItem>
                              <SelectItem value="lastName">Last Name</SelectItem>
                              <SelectItem value="phoneRaw">Phone</SelectItem>
                              <SelectItem value="company">Company</SelectItem>
                              <SelectItem value="accountDomain">Domain</SelectItem>
                              <SelectItem value="jobTitle">Job Title</SelectItem>
                              <SelectItem value="country">Country</SelectItem>
                              <SelectItem value="">Skip</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {mapping.crmField ? (
                            <Badge variant="default" className="gap-1">
                              <Check className="w-3 h-3" />
                              Auto
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1">
                              <X className="w-3 h-3" />
                              None
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex gap-2">
                  <Button
                    onClick={() => confirmMappingsMutation.mutate()}
                    disabled={confirmMappingsMutation.isPending || !mappings.some(m => m.crmField)}
                    data-testid="button-confirm-mappings"
                  >
                    Confirm & Import ({uploadedData.totalRows} rows)
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setUploadedData(null);
                      setCsvFile(null);
                    }}
                    data-testid="button-cancel-upload"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
