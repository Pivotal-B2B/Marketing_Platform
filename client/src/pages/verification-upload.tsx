import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Upload, FileText, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function VerificationUploadPage() {
  const { campaignId } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);

  const { data: campaign } = useQuery({
    queryKey: ["/api/verification-campaigns", campaignId],
  });

  const uploadMutation = useMutation({
    mutationFn: async (csvData: string) => {
      const res = await apiRequest("POST", `/api/verification-campaigns/${campaignId}/upload`, {
        csvData,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setUploadResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/verification-campaigns", campaignId, "queue"] });
      toast({
        title: "Upload Complete",
        description: `Created ${data.created} contacts, skipped ${data.skipped}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload CSV",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        toast({
          title: "Invalid File",
          description: "Please select a CSV file",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const csvData = e.target?.result as string;
      uploadMutation.mutate(csvData);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/verification/campaigns")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            Upload Contacts
          </h1>
          <p className="text-muted-foreground mt-1" data-testid="text-campaign-name">
            Campaign: {(campaign as any)?.name}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>CSV Format Guidelines</CardTitle>
          <CardDescription>Accepted column headers and data requirements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Contact Information (at least name required)</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• <strong>fullName or name</strong> - Full contact name</p>
                <p>• <strong>firstName</strong> - First name</p>
                <p>• <strong>lastName</strong> - Last name</p>
                <p>• <strong>title or jobTitle</strong> - Job title</p>
                <p>• <strong>email or emailAddress</strong> - Email address</p>
                <p>• <strong>phone or phoneNumber</strong> - Phone number</p>
                <p>• <strong>mobile or mobileNumber</strong> - Mobile number</p>
                <p>• <strong>linkedin or linkedinUrl</strong> - LinkedIn profile URL</p>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Contact Location</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• <strong>city</strong> - Contact city</p>
                <p>• <strong>state</strong> - Contact state</p>
                <p>• <strong>country</strong> - Contact country</p>
                <p>• <strong>postalCode or zip</strong> - Postal/ZIP code</p>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Company/Account Information</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• <strong>companyName or company or accountName</strong> - Company name</p>
                <p>• <strong>domain or companyDomain</strong> - Company website domain</p>
                <p>• <strong>hqCity</strong> - Company HQ city</p>
                <p>• <strong>hqState</strong> - Company HQ state</p>
                <p>• <strong>hqCountry</strong> - Company HQ country</p>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Additional Fields</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• <strong>cavId</strong> - CAV ID for suppression matching</p>
                <p>• <strong>cavUserId</strong> - CAV User ID for suppression matching</p>
                <p>• <strong>sourceType or source</strong> - "Client_Provided" or "New_Sourced"</p>
              </div>
            </div>

            <Alert>
              <AlertDescription className="text-xs">
                <strong>Note:</strong> Column headers are case-insensitive and spaces/special characters are ignored. 
                After upload, contacts are automatically evaluated for eligibility and checked against suppression lists.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload File</CardTitle>
          <CardDescription>Select and upload your CSV file</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <label
              htmlFor="csv-file"
              className="flex items-center gap-2 px-4 py-2 bg-secondary hover-elevate active-elevate-2 rounded-md cursor-pointer"
              data-testid="button-select-file"
            >
              <FileText className="h-4 w-4" />
              <span>Select CSV File</span>
              <input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                data-testid="input-file"
              />
            </label>
            
            {file && (
              <div className="flex items-center gap-2 text-sm" data-testid="text-selected-file">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>{file.name}</span>
                <span className="text-muted-foreground">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            )}
          </div>

          {file && (
            <Button
              onClick={handleUpload}
              disabled={uploadMutation.isPending}
              data-testid="button-upload"
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploadMutation.isPending ? "Uploading..." : "Upload and Process"}
            </Button>
          )}

          {uploadMutation.isPending && (
            <div className="space-y-2">
              <Progress value={50} data-testid="progress-upload" />
              <p className="text-sm text-muted-foreground" data-testid="text-processing">
                Processing contacts... This may take a moment.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {uploadResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Upload Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="p-4 bg-secondary rounded-md">
                <div className="text-sm text-muted-foreground">Total Rows</div>
                <div className="text-2xl font-bold" data-testid="text-total">
                  {uploadResult.total}
                </div>
              </div>
              <div className="p-4 bg-primary/10 rounded-md">
                <div className="text-sm text-muted-foreground">Created</div>
                <div className="text-2xl font-bold text-primary" data-testid="text-created">
                  {uploadResult.created}
                </div>
              </div>
              <div className="p-4 bg-destructive/10 rounded-md">
                <div className="text-sm text-muted-foreground">Skipped</div>
                <div className="text-2xl font-bold text-destructive" data-testid="text-skipped">
                  {uploadResult.skipped}
                </div>
              </div>
            </div>

            {uploadResult.errors && uploadResult.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  Errors ({uploadResult.errors.length})
                </h4>
                <div className="max-h-60 overflow-y-auto space-y-1" data-testid="container-errors">
                  {uploadResult.errors.map((error: string, i: number) => (
                    <div key={i} className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <Button
                onClick={() => navigate(`/verification/console/${campaignId}`)}
                data-testid="button-start-verification"
              >
                Start Verification
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setFile(null);
                  setUploadResult(null);
                }}
                data-testid="button-upload-more"
              >
                Upload More
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
