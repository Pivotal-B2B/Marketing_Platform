import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Upload, Trash2, List, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface DomainSet {
  id: string;
  name: string;
  description?: string;
  totalUploaded: number;
  matchedAccounts: number;
  matchedContacts: number;
  duplicatesRemoved: number;
  unknownDomains: number;
  status: 'processing' | 'completed' | 'error';
  createdAt: string;
}

interface DomainSetItem {
  id: string;
  domain: string;
  normalizedDomain: string;
  accountId?: string;
  matchType?: 'exact' | 'fuzzy' | 'none';
  matchConfidence?: string;
  matchedContactsCount: number;
}

export default function DomainSets() {
  const { toast } = useToast();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedDomainSet, setSelectedDomainSet] = useState<DomainSet | null>(null);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [csvContent, setCsvContent] = useState("");
  const [listName, setListName] = useState("");

  const { data: domainSets = [], isLoading } = useQuery<DomainSet[]>({
    queryKey: ['/api/domain-sets'],
  });

  const { data: items = [] } = useQuery<DomainSetItem[]>({
    queryKey: ['/api/domain-sets', selectedDomainSet?.id, 'items'],
    enabled: !!selectedDomainSet,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; csvContent: string }) => {
      return await apiRequest('/api/domain-sets', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/domain-sets'] });
      setUploadDialogOpen(false);
      setName("");
      setDescription("");
      setCsvContent("");
      toast({
        title: "Domain set created",
        description: "Processing matches in background...",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create domain set",
        variant: "destructive",
      });
    },
  });

  const convertMutation = useMutation({
    mutationFn: async ({ id, listName }: { id: string; listName: string }) => {
      return await apiRequest(`/api/domain-sets/${id}/convert-to-list`, {
        method: 'POST',
        body: JSON.stringify({ listName }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lists'] });
      setConvertDialogOpen(false);
      setListName("");
      toast({
        title: "List created",
        description: "Domain set converted to list successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to convert to list",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/domain-sets/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/domain-sets'] });
      setSelectedDomainSet(null);
      toast({
        title: "Domain set deleted",
        description: "Domain set has been removed",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete domain set",
        variant: "destructive",
      });
    },
  });

  const handleUpload = () => {
    if (!name || !csvContent) {
      toast({
        title: "Validation Error",
        description: "Name and CSV content are required",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate({ name, description, csvContent });
  };

  const handleConvertToList = (domainSet: DomainSet) => {
    setSelectedDomainSet(domainSet);
    setListName(`${domainSet.name} - Contact List`);
    setConvertDialogOpen(true);
  };

  const getStatusBadge = (status: DomainSet['status']) => {
    const variants = {
      processing: 'secondary',
      completed: 'default',
      error: 'destructive',
    } as const;
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  const getMatchTypeBadge = (matchType?: string) => {
    if (!matchType) return <Badge variant="outline">pending</Badge>;
    const variants = {
      exact: 'default',
      fuzzy: 'secondary',
      none: 'outline',
    } as const;
    return <Badge variant={variants[matchType as keyof typeof variants]}>{matchType}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-64 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Domain Sets</h1>
          <p className="text-muted-foreground">
            Upload and match domains to accounts for ABM campaigns
          </p>
        </div>
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-upload-domain-set">
              <Upload className="mr-2 h-4 w-4" />
              Upload Domain Set
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl" data-testid="dialog-upload-domain-set">
            <DialogHeader>
              <DialogTitle>Upload Domain Set</DialogTitle>
              <DialogDescription>
                Upload a CSV file with domains. Format: domain, account_name (optional), notes (optional)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Q4 2025 Target Accounts"
                  data-testid="input-domain-set-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enterprise accounts for outbound campaign"
                  data-testid="input-domain-set-description"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="csvContent">CSV Content</Label>
                <Textarea
                  id="csvContent"
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  placeholder="acme.com,Acme Corp,Enterprise prospect&#10;example.com,Example Inc&#10;test.org"
                  rows={8}
                  data-testid="textarea-domain-set-csv"
                />
                <p className="text-sm text-muted-foreground">
                  Enter one domain per line. Optionally include account name and notes separated by commas.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={createMutation.isPending} data-testid="button-create-domain-set">
                {createMutation.isPending ? "Uploading..." : "Upload & Process"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {domainSets.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No domain sets yet</h3>
            <p className="text-muted-foreground mb-4">Upload your first domain set to start matching accounts</p>
            <Button onClick={() => setUploadDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Upload Domain Set
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {domainSets.map((domainSet) => (
            <Card key={domainSet.id} data-testid={`card-domain-set-${domainSet.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      {domainSet.name}
                      {getStatusBadge(domainSet.status)}
                    </CardTitle>
                    {domainSet.description && (
                      <CardDescription>{domainSet.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleConvertToList(domainSet)}
                      disabled={domainSet.status !== 'completed' || domainSet.matchedAccounts === 0}
                      data-testid={`button-convert-to-list-${domainSet.id}`}
                    >
                      <List className="mr-2 h-4 w-4" />
                      Convert to List
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDomainSet(selectedDomainSet?.id === domainSet.id ? null : domainSet)}
                      data-testid={`button-view-details-${domainSet.id}`}
                    >
                      {selectedDomainSet?.id === domainSet.id ? "Hide Details" : "View Details"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteMutation.mutate(domainSet.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-${domainSet.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{domainSet.totalUploaded}</p>
                    <p className="text-sm text-muted-foreground">Total Uploaded</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{domainSet.matchedAccounts}</p>
                    <p className="text-sm text-muted-foreground">Matched Accounts</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{domainSet.matchedContacts}</p>
                    <p className="text-sm text-muted-foreground">Matched Contacts</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">{domainSet.unknownDomains}</p>
                    <p className="text-sm text-muted-foreground">Unknown</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-600">{domainSet.duplicatesRemoved}</p>
                    <p className="text-sm text-muted-foreground">Duplicates</p>
                  </div>
                </div>

                {selectedDomainSet?.id === domainSet.id && items.length > 0 && (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Domain</TableHead>
                          <TableHead>Normalized</TableHead>
                          <TableHead>Match Type</TableHead>
                          <TableHead>Confidence</TableHead>
                          <TableHead>Contacts</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.slice(0, 10).map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-mono">{item.domain}</TableCell>
                            <TableCell className="font-mono text-sm text-muted-foreground">
                              {item.normalizedDomain}
                            </TableCell>
                            <TableCell>{getMatchTypeBadge(item.matchType)}</TableCell>
                            <TableCell>
                              {item.matchConfidence ? `${(parseFloat(item.matchConfidence) * 100).toFixed(0)}%` : '-'}
                            </TableCell>
                            <TableCell>{item.matchedContactsCount}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {items.length > 10 && (
                      <p className="text-sm text-muted-foreground text-center py-2 border-t">
                        Showing 10 of {items.length} domains
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent data-testid="dialog-convert-to-list">
          <DialogHeader>
            <DialogTitle>Convert to List</DialogTitle>
            <DialogDescription>
              Create a static contact list from this domain set
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="listName">List Name</Label>
              <Input
                id="listName"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                data-testid="input-list-name"
              />
            </div>
            {selectedDomainSet && (
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm">
                  This will create a list with <strong>{selectedDomainSet.matchedContacts} contacts</strong> from{' '}
                  <strong>{selectedDomainSet.matchedAccounts} matched accounts</strong>
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedDomainSet) {
                  convertMutation.mutate({ id: selectedDomainSet.id, listName });
                }
              }}
              disabled={!listName || convertMutation.isPending}
              data-testid="button-confirm-convert"
            >
              {convertMutation.isPending ? "Creating..." : "Create List"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
