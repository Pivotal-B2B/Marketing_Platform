import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Upload, FileText, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { parseCSV } from "@/lib/csv-utils";
import { CSVFieldMapper } from "@/components/csv-field-mapper";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface FieldMapping {
  csvColumn: string;
  targetField: string | null;
  targetEntity: "contact" | "account" | null;
}

type UploadStage = "select" | "map" | "upload" | "complete";

// Auto-map verification column names
function autoMapVerificationColumn(header: string): string | null {
  const normalized = header.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  
  const mappings: Record<string, string> = {
    'fullname': 'fullName',
    'name': 'fullName',
    'firstname': 'firstName',
    'lastname': 'lastName',
    'jobtitle': 'title',
    'title': 'title',
    'emailaddress': 'email',
    'email': 'email',
    'phonenumber': 'phone',
    'phone': 'phone',
    'mobilenumber': 'mobile',
    'mobile': 'mobile',
    'linkedin': 'linkedinUrl',
    'linkedinurl': 'linkedinUrl',
    'contactaddress1': 'contactAddress1',
    'contactaddress2': 'contactAddress2',
    'contactaddress3': 'contactAddress3',
    'address1': 'contactAddress1',
    'address2': 'contactAddress2',
    'address3': 'contactAddress3',
    'street1': 'contactAddress1',
    'street2': 'contactAddress2',
    'street3': 'contactAddress3',
    'contactcity': 'contactCity',
    'city': 'contactCity',
    'contactstate': 'contactState',
    'state': 'contactState',
    'contactcountry': 'contactCountry',
    'country': 'contactCountry',
    'contactpostalcode': 'contactPostal',
    'contactpostal': 'contactPostal',
    'postalcode': 'contactPostal',
    'postal': 'contactPostal',
    'zip': 'contactPostal',
    'zipcode': 'contactPostal',
    'companyname': 'account_name',
    'company': 'account_name',
    'accountname': 'account_name',
    'companydomain': 'domain',
    'domain': 'domain',
    'hqaddress1': 'hqAddress1',
    'hqaddress2': 'hqAddress2',
    'hqaddress3': 'hqAddress3',
    'companyaddress1': 'hqAddress1',
    'companyaddress2': 'hqAddress2',
    'companyaddress3': 'hqAddress3',
    'hqstreet1': 'hqAddress1',
    'hqstreet2': 'hqAddress2',
    'hqstreet3': 'hqAddress3',
    'hqcity': 'hqCity',
    'hqstate': 'hqState',
    'hqpostalcode': 'hqPostal',
    'hqpostal': 'hqPostal',
    'hqzip': 'hqPostal',
    'companypostalcode': 'hqPostal',
    'companypostal': 'hqPostal',
    'hqcountry': 'hqCountry',
    'companycountry': 'hqCountry',
    'hqphone': 'hqPhone',
    'companyphone': 'hqPhone',
    'mainphone': 'hqPhone',
    'companyphonenumber': 'hqPhone',
    'cavid': 'cavId',
    'cavuserid': 'cavUserId',
    'sourcetype': 'sourceType',
    'source': 'sourceType',
  };

  return mappings[normalized] || null;
}

function getTargetEntity(fieldName: string): "contact" | "account" | null {
  const accountFields = ['account_name', 'domain', 'hqPhone', 'hqAddress1', 'hqAddress2', 'hqAddress3', 'hqCity', 'hqState', 'hqPostal', 'hqCountry'];
  return accountFields.includes(fieldName) ? 'account' : 'contact';
}

export default function VerificationUploadPage() {
  const { campaignId } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [stage, setStage] = useState<UploadStage>("select");
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [rawCSVContent, setRawCSVContent] = useState<string>("");
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [updateMode, setUpdateMode] = useState<boolean>(false);
  const [uploadJobId, setUploadJobId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatus, setUploadStatus] = useState<string>("idle");

  const { data: campaign } = useQuery({
    queryKey: ["/api/verification-campaigns", campaignId],
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ csvData, fieldMappings, updateMode }: { csvData: string; fieldMappings: FieldMapping[]; updateMode: boolean }) => {
      const res = await apiRequest("POST", `/api/verification-upload-jobs`, {
        campaignId,
        csvData,
        fieldMappings,
        updateMode,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setUploadJobId(data.jobId);
      setUploadStatus("processing");
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload CSV",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!uploadJobId || (uploadStatus !== "processing" && uploadStatus !== "pending")) {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/verification-upload-jobs/${uploadJobId}`);
        const data = await res.json();

        setUploadProgress(data.progress || 0);
        setUploadStatus(data.status);

        if (data.status === "completed") {
          clearInterval(pollInterval);
          setUploadResult({
            total: data.totalRows,
            created: data.successCount,
            updated: 0,
            skipped: data.errorCount,
            errors: data.errors || [],
          });
          setStage("complete");
          queryClient.invalidateQueries({ queryKey: ["/api/verification-campaigns", campaignId, "queue"] });
          queryClient.invalidateQueries({ queryKey: ["/api/verification-campaigns", campaignId, "stats"] });
          
          toast({
            title: "Upload Complete",
            description: `${data.successCount} contacts processed successfully, ${data.errorCount} errors`,
          });
        } else if (data.status === "failed") {
          clearInterval(pollInterval);
          toast({
            variant: "destructive",
            title: "Upload Failed",
            description: data.errors?.[0]?.message || "Upload processing failed",
          });
        }
      } catch (error: any) {
        console.error("Error polling upload status:", error);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [uploadJobId, uploadStatus, campaignId, queryClient, toast]);

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
      
      // Parse CSV to extract headers
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setRawCSVContent(content);
        const parsed = parseCSV(content);
        
        if (parsed.length > 0) {
          setCsvHeaders(parsed[0]);
          setCsvData(parsed.slice(1));
          setStage("map");
        }
      };
      reader.readAsText(selectedFile);
    }
  };

  const handleMappingComplete = (mappings: FieldMapping[]) => {
    setFieldMappings(mappings);
    setStage("upload");
  };

  const handleUpload = async () => {
    if (!file || !rawCSVContent) return;

    uploadMutation.mutate({ csvData: rawCSVContent, fieldMappings, updateMode });
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

      {stage === "select" && (
        <Card>
          <CardHeader>
            <CardTitle>Upload File</CardTitle>
            <CardDescription>Select your CSV file to begin</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
                <Checkbox
                  id="update-mode"
                  checked={updateMode}
                  onCheckedChange={(checked) => setUpdateMode(checked === true)}
                  data-testid="checkbox-update-mode"
                />
                <Label htmlFor="update-mode" className="cursor-pointer flex-1">
                  <div className="font-medium">Update Existing Contacts</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Match by Name + Country + Company and update CAV IDs or other fields
                  </div>
                </Label>
              </div>

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
              </div>
            </div>
            
            <Alert>
              <AlertDescription className="text-xs space-y-2">
                {updateMode ? (
                  <>
                    <p><strong>Update Mode:</strong> Matching criteria (in order):</p>
                    <ol className="list-decimal list-inside pl-2 space-y-1">
                      <li>Exact email match (strongest signal)</li>
                      <li>Name + Country + Company (all three required)</li>
                      <li>If multiple matches found, will create new instead of updating</li>
                    </ol>
                    <p className="mt-2"><strong>Update rules (strict):</strong></p>
                    <ul className="list-disc list-inside pl-2 space-y-1">
                      <li><strong>CSV has CAV IDs?</strong> → ONLY CAV ID fields updated</li>
                      <li><strong>DB has CAV IDs (CSV doesn't)?</strong> → ALL non-CAV fields updated</li>
                      <li><strong>Neither has CAV IDs?</strong> → ALL fields updated</li>
                      <li>Empty CSV values never overwrite existing data</li>
                    </ul>
                  </>
                ) : (
                  <>
                    <strong>Next Step:</strong> After selecting a file, you'll be able to map CSV columns to contact fields manually.
                  </>
                )}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {stage === "map" && file && (
        <Card>
          <CardHeader>
            <CardTitle>Map CSV Columns to Fields</CardTitle>
            <CardDescription>
              Match your CSV columns to verification contact fields. You can also create custom fields on the fly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CSVFieldMapper
              csvHeaders={csvHeaders}
              sampleData={csvData.slice(0, 3)}
              onMappingComplete={handleMappingComplete}
              onCancel={() => {
                setStage("select");
                setFile(null);
                setCsvHeaders([]);
                setCsvData([]);
                setFieldMappings([]);
              }}
            />
          </CardContent>
        </Card>
      )}

      {stage === "upload" && file && (
        <Card>
          <CardHeader>
            <CardTitle>Ready to Upload</CardTitle>
            <CardDescription>Review and confirm your upload</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm mb-4" data-testid="text-selected-file">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="font-medium">{file.name}</span>
              <span className="text-muted-foreground">
                ({(file.size / 1024).toFixed(1)} KB)
              </span>
            </div>

            <Alert>
              <AlertDescription>
                <strong>{csvData.length} rows</strong> will be uploaded with your custom field mappings.
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button
                onClick={handleUpload}
                disabled={uploadMutation.isPending}
                data-testid="button-upload"
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploadMutation.isPending ? "Uploading..." : "Upload and Process"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setStage("map")}
                disabled={uploadMutation.isPending}
              >
                Back to Mapping
              </Button>
            </div>

            {(uploadMutation.isPending || uploadStatus === "processing" || uploadStatus === "pending") && (
              <div className="space-y-2">
                <Progress value={uploadProgress} data-testid="progress-upload" />
                <p className="text-sm text-muted-foreground" data-testid="text-processing">
                  Processing contacts... {uploadProgress}% complete
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {uploadResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Upload Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`grid ${updateMode ? 'grid-cols-4' : 'grid-cols-3'} gap-4 mb-4`}>
              <div className="p-4 bg-secondary rounded-md">
                <div className="text-sm text-muted-foreground">Total Rows</div>
                <div className="text-2xl font-bold" data-testid="text-total">
                  {uploadResult.total}
                </div>
              </div>
              <div className="p-4 bg-primary/10 rounded-md">
                <div className="text-sm text-muted-foreground">Created</div>
                <div className="text-2xl font-bold text-primary" data-testid="text-created">
                  {uploadResult.created || 0}
                </div>
              </div>
              {updateMode && (
                <div className="p-4 bg-green-500/10 rounded-md">
                  <div className="text-sm text-muted-foreground">Updated</div>
                  <div className="text-2xl font-bold text-green-600" data-testid="text-updated">
                    {uploadResult.updated || 0}
                  </div>
                </div>
              )}
              <div className="p-4 bg-destructive/10 rounded-md">
                <div className="text-sm text-muted-foreground">Skipped</div>
                <div className="text-2xl font-bold text-destructive" data-testid="text-skipped">
                  {uploadResult.skipped || 0}
                </div>
              </div>
            </div>

            {uploadResult.updatedContacts && uploadResult.updatedContacts.length > 0 && (
              <div className="space-y-2 mb-4">
                <h4 className="font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Updated Contacts ({uploadResult.updatedContacts.length})
                </h4>
                <div className="max-h-60 overflow-y-auto space-y-1 border rounded-md p-2" data-testid="container-updated-contacts">
                  {uploadResult.updatedContacts.map((contact: any, i: number) => (
                    <div key={i} className="text-sm bg-green-500/10 p-2 rounded border border-green-500/20">
                      <div className="font-medium">{contact.fullName}</div>
                      {contact.email && (
                        <div className="text-xs text-muted-foreground">{contact.email}</div>
                      )}
                      {contact.accountName && (
                        <div className="text-xs text-muted-foreground">Company: {contact.accountName}</div>
                      )}
                      <div className="text-xs text-green-700 mt-1">
                        Updated: {contact.fieldsUpdated.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                onClick={() => navigate(`/verification/${campaignId}/console`)}
                data-testid="button-start-verification"
              >
                Start Verification
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setFile(null);
                  setUploadResult(null);
                  setStage("select");
                  setCsvHeaders([]);
                  setCsvData([]);
                  setFieldMappings([]);
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
