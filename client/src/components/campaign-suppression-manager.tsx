import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

interface SuppressionResponse<T> {
  data: T[];
  total: number;
  limit?: number;
  offset?: number;
}
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload, Trash2, Plus, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface CampaignSuppressionManagerProps {
  campaignId: string;
  isCompact?: boolean;
}

interface SuppressionEmail {
  id: string;
  campaignId: string;
  email: string;
  emailNorm: string;
  reason: string | null;
  addedBy: string | null;
  createdAt: string;
}

export function CampaignSuppressionManager({ 
  campaignId, 
  isCompact = false 
}: CampaignSuppressionManagerProps) {
  const { toast } = useToast();
  const [manualEmails, setManualEmails] = useState("");
  const [csvContent, setCsvContent] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [manualDialogOpen, setManualDialogOpen] = useState(false);

  // Fetch current suppressions
  const { data: suppressionsData, isLoading } = useQuery<SuppressionResponse<SuppressionEmail>>({
    queryKey: ['/api/campaigns', campaignId, 'suppressions', 'emails'],
    enabled: !!campaignId,
  });

  const suppressions = suppressionsData?.data || [];
  const totalCount = suppressionsData?.total || 0;

  // Upload CSV mutation
  const uploadCsvMutation = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest(
        "POST",
        `/api/campaigns/${campaignId}/suppressions/emails/upload`,
        { csvContent: content }
      );
    },
    onSuccess: (data: any) => {
      toast({
        title: "CSV Uploaded Successfully",
        description: `Added ${data.added} email(s) to suppression list. ${data.duplicates} duplicate(s) skipped.`,
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/campaigns', campaignId, 'suppressions', 'emails'] 
      });
      setCsvContent("");
      setUploadDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error?.message || "Failed to upload CSV file",
        variant: "destructive",
      });
    },
  });

  // Add manual emails mutation
  const addEmailsMutation = useMutation({
    mutationFn: async (emails: string[]) => {
      return await apiRequest(
        "POST",
        `/api/campaigns/${campaignId}/suppressions/emails`,
        { emails, reason: "Manually added" }
      );
    },
    onSuccess: (data: any) => {
      toast({
        title: "Emails Added",
        description: `Added ${data.added} email(s) to suppression list.`,
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/campaigns', campaignId, 'suppressions', 'emails'] 
      });
      setManualEmails("");
      setManualDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Add Emails",
        description: error?.message || "Please check your email format",
        variant: "destructive",
      });
    },
  });

  // Delete email mutation
  const deleteEmailMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(
        "DELETE",
        `/api/campaigns/${campaignId}/suppressions/emails/${id}`
      );
    },
    onSuccess: () => {
      toast({
        title: "Email Removed",
        description: "Email removed from suppression list",
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/campaigns', campaignId, 'suppressions', 'emails'] 
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Remove Email",
        description: error?.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const handleCsvUpload = () => {
    if (!csvContent.trim()) {
      toast({
        title: "No Content",
        description: "Please paste CSV content before uploading",
        variant: "destructive",
      });
      return;
    }
    uploadCsvMutation.mutate(csvContent);
  };

  const handleManualAdd = () => {
    if (!manualEmails.trim()) {
      toast({
        title: "No Emails",
        description: "Please enter at least one email address",
        variant: "destructive",
      });
      return;
    }

    // Parse emails from textarea (one per line or comma-separated)
    const emails = manualEmails
      .split(/[\n,]/)
      .map(e => e.trim())
      .filter(e => e.includes('@'));

    if (emails.length === 0) {
      toast({
        title: "Invalid Emails",
        description: "No valid email addresses found",
        variant: "destructive",
      });
      return;
    }

    addEmailsMutation.mutate(emails);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to remove this email from the suppression list?")) {
      deleteEmailMutation.mutate(id);
    }
  };

  if (isCompact) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">Campaign Email Suppressions</h3>
            <p className="text-sm text-muted-foreground">
              {totalCount} email(s) suppressed for this campaign
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={manualDialogOpen} onOpenChange={setManualDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-add-emails">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Emails
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Emails to Suppression List</DialogTitle>
                  <DialogDescription>
                    Enter email addresses (one per line or comma-separated)
                  </DialogDescription>
                </DialogHeader>
                <Textarea
                  placeholder="email1@example.com&#10;email2@example.com&#10;email3@example.com"
                  value={manualEmails}
                  onChange={(e) => setManualEmails(e.target.value)}
                  rows={8}
                  data-testid="textarea-manual-emails"
                />
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setManualDialogOpen(false)}
                    data-testid="button-cancel-manual"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleManualAdd}
                    disabled={addEmailsMutation.isPending}
                    data-testid="button-submit-manual"
                  >
                    {addEmailsMutation.isPending ? "Adding..." : "Add Emails"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-upload-csv">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload CSV
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload CSV with Email Suppressions</DialogTitle>
                  <DialogDescription>
                    Paste CSV content with an "email" column
                  </DialogDescription>
                </DialogHeader>
                <Textarea
                  placeholder="email&#10;email1@example.com&#10;email2@example.com&#10;email3@example.com"
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  rows={10}
                  data-testid="textarea-csv-content"
                />
                <Alert>
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription className="text-sm">
                    CSV must have an "email" column header. Duplicate emails will be skipped automatically.
                  </AlertDescription>
                </Alert>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setUploadDialogOpen(false)}
                    data-testid="button-cancel-upload"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCsvUpload}
                    disabled={uploadCsvMutation.isPending}
                    data-testid="button-submit-upload"
                  >
                    {uploadCsvMutation.isPending ? "Uploading..." : "Upload"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {totalCount > 0 && (
          <Alert>
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <AlertDescription className="text-sm">
              {totalCount} email address(es) will be excluded from this campaign only.
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Campaign Email Suppressions</CardTitle>
            <CardDescription>
              Manage email addresses excluded from this specific campaign
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Dialog open={manualDialogOpen} onOpenChange={setManualDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-add-emails-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Emails
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Emails to Suppression List</DialogTitle>
                  <DialogDescription>
                    Enter email addresses (one per line or comma-separated)
                  </DialogDescription>
                </DialogHeader>
                <Textarea
                  placeholder="email1@example.com&#10;email2@example.com&#10;email3@example.com"
                  value={manualEmails}
                  onChange={(e) => setManualEmails(e.target.value)}
                  rows={8}
                  data-testid="textarea-manual-emails-full"
                />
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setManualDialogOpen(false)}
                    data-testid="button-cancel-manual-full"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleManualAdd}
                    disabled={addEmailsMutation.isPending}
                    data-testid="button-submit-manual-full"
                  >
                    {addEmailsMutation.isPending ? "Adding..." : "Add Emails"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-upload-csv-full">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload CSV
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload CSV with Email Suppressions</DialogTitle>
                  <DialogDescription>
                    Paste CSV content with an "email" column
                  </DialogDescription>
                </DialogHeader>
                <Textarea
                  placeholder="email&#10;email1@example.com&#10;email2@example.com&#10;email3@example.com"
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  rows={10}
                  data-testid="textarea-csv-content-full"
                />
                <Alert>
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription className="text-sm">
                    CSV must have an "email" column header. Duplicate emails will be skipped automatically.
                  </AlertDescription>
                </Alert>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setUploadDialogOpen(false)}
                    data-testid="button-cancel-upload-full"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCsvUpload}
                    disabled={uploadCsvMutation.isPending}
                    data-testid="button-submit-upload-full"
                  >
                    {uploadCsvMutation.isPending ? "Uploading..." : "Upload"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading suppressions...
          </div>
        ) : suppressions.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              No email suppressions configured for this campaign
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Upload a CSV or add emails manually to get started
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="outline">
                {totalCount} Suppressed Email(s)
              </Badge>
            </div>
            
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email Address</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppressions.map((suppression: SuppressionEmail) => (
                    <TableRow key={suppression.id}>
                      <TableCell className="font-mono text-sm">
                        {suppression.email}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {suppression.reason || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(suppression.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(suppression.id)}
                          disabled={deleteEmailMutation.isPending}
                          data-testid={`button-delete-${suppression.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
