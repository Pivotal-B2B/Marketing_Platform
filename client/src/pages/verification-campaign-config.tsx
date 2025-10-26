import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { ArrowLeft, Save, ShieldX, Upload, Eye, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { AccountCapManager } from "@/components/verification/AccountCapManager";

export default function VerificationCampaignConfigPage() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isNew = id === "new";

  const { data: campaign, isLoading } = useQuery({
    queryKey: ["/api/verification-campaigns", id],
    enabled: !isNew,
  });

  const [formData, setFormData] = useState({
    name: "",
    monthlyTarget: 1000,
    leadCapPerAccount: 10,
    geoAllow: "",
    titleKeywords: "",
    seniorDmFallback: "",
    okRateTarget: 0.95,
    deliverabilityTarget: 0.97,
  });

  useEffect(() => {
    if (campaign && !isLoading) {
      const config = (campaign as any).eligibilityConfig || {};
      setFormData({
        name: (campaign as any).name,
        monthlyTarget: (campaign as any).monthlyTarget,
        leadCapPerAccount: (campaign as any).leadCapPerAccount,
        geoAllow: config.geoAllow?.join("\n") || "",
        titleKeywords: config.titleKeywords?.join("\n") || "",
        seniorDmFallback: config.seniorDmFallback?.join("\n") || "",
        okRateTarget: Number((campaign as any).okRateTarget),
        deliverabilityTarget: Number((campaign as any).deliverabilityTarget),
      });
    }
  }, [campaign, isLoading]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const eligibilityConfig: any = {};
      
      if (data.geoAllow?.trim()) {
        eligibilityConfig.geoAllow = data.geoAllow.split("\n").filter((s: string) => s.trim());
      }
      
      if (data.titleKeywords?.trim()) {
        eligibilityConfig.titleKeywords = data.titleKeywords.split("\n").filter((s: string) => s.trim());
      }
      
      if (data.seniorDmFallback?.trim()) {
        eligibilityConfig.seniorDmFallback = data.seniorDmFallback.split("\n").filter((s: string) => s.trim());
      }
      
      const payload = {
        ...data,
        eligibilityConfig: Object.keys(eligibilityConfig).length > 0 ? eligibilityConfig : null,
      };

      if (isNew) {
        const res = await apiRequest("POST", `/api/verification-campaigns`, payload);
        return res.json();
      } else {
        const res = await apiRequest("PUT", `/api/verification-campaigns/${id}`, payload);
        return res.json();
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `Campaign ${isNew ? "created" : "updated"} successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/verification-campaigns"] });
      if (isNew) {
        navigate("/verification/campaigns");
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save campaign",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  // Suppression list state and queries
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [suppressionFile, setSuppressionFile] = useState<File | null>(null);

  const { data: suppressionList, isLoading: suppressionLoading } = useQuery({
    queryKey: [`/api/verification-campaigns/${id}/suppression`],
    enabled: !isNew && !!id,
  });

  const uploadSuppressionMutation = useMutation({
    mutationFn: async (csvData: string) => {
      const res = await apiRequest("POST", `/api/verification-campaigns/${id}/suppression/upload`, { csvData });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Suppression list uploaded successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/verification-campaigns/${id}/suppression`] });
      setSuppressionFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload suppression list",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSuppressionFile(file);
    }
  };

  const handleUploadSuppression = async () => {
    if (!suppressionFile) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const csvData = e.target?.result as string;
      uploadSuppressionMutation.mutate(csvData);
    };
    reader.readAsText(suppressionFile);
  };

  if (isLoading && !isNew) {
    return <div className="p-6" data-testid="text-loading">Loading...</div>;
  }

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
            {isNew ? "New Verification Campaign" : `Configure: ${(campaign as any)?.name}`}
          </h1>
          <p className="text-muted-foreground mt-1" data-testid="text-page-description">
            Set up eligibility rules and account caps
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaign Details</CardTitle>
          <CardDescription>Basic campaign information and targets</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Campaign Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., CAT62542 or Q1-2025-Enterprise"
              data-testid="input-campaign-name"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="monthlyTarget">Monthly Target</Label>
              <Input
                id="monthlyTarget"
                type="number"
                value={formData.monthlyTarget}
                onChange={(e) => setFormData({ ...formData, monthlyTarget: Number(e.target.value) })}
                data-testid="input-monthly-target"
              />
            </div>
            <div>
              <Label htmlFor="leadCapPerAccount">Lead Cap per Account</Label>
              <Input
                id="leadCapPerAccount"
                type="number"
                value={formData.leadCapPerAccount}
                onChange={(e) => setFormData({ ...formData, leadCapPerAccount: Number(e.target.value) })}
                data-testid="input-lead-cap"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Eligibility Rules</CardTitle>
          <CardDescription>Define which contacts are eligible for this campaign (all fields optional)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="geoAllow">Allowed Geographies (Optional - one per line)</Label>
            <Textarea
              id="geoAllow"
              rows={15}
              value={formData.geoAllow}
              onChange={(e) => setFormData({ ...formData, geoAllow: e.target.value })}
              placeholder="United States&#10;Canada&#10;United Kingdom"
              data-testid="input-geo-allow"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Leave empty to allow all geographies. Showing {formData.geoAllow.split('\n').filter(l => l.trim()).length} countries.
            </p>
          </div>
          <div>
            <Label htmlFor="titleKeywords">Title Keywords (Optional - one per line)</Label>
            <Textarea
              id="titleKeywords"
              rows={5}
              value={formData.titleKeywords}
              onChange={(e) => setFormData({ ...formData, titleKeywords: e.target.value })}
              placeholder="director&#10;manager&#10;vp"
              data-testid="input-title-keywords"
            />
            <p className="text-xs text-muted-foreground mt-1">Leave empty to allow all job titles</p>
          </div>
          <div>
            <Label htmlFor="seniorDmFallback">Senior Decision Maker Fallback (Optional - one per line)</Label>
            <Textarea
              id="seniorDmFallback"
              rows={4}
              value={formData.seniorDmFallback}
              onChange={(e) => setFormData({ ...formData, seniorDmFallback: e.target.value })}
              placeholder="c-level&#10;ceo&#10;cfo"
              data-testid="input-senior-fallback"
            />
            <p className="text-xs text-muted-foreground mt-1">Fallback keywords when title matching fails</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quality Targets</CardTitle>
          <CardDescription>Set quality thresholds for this campaign</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="okRateTarget">OK Email Rate Target</Label>
              <Input
                id="okRateTarget"
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={formData.okRateTarget}
                onChange={(e) => setFormData({ ...formData, okRateTarget: Number(e.target.value) })}
                data-testid="input-ok-rate"
              />
              <p className="text-xs text-muted-foreground mt-1">Target: 0.95 (95%)</p>
            </div>
            <div>
              <Label htmlFor="deliverabilityTarget">Deliverability Target</Label>
              <Input
                id="deliverabilityTarget"
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={formData.deliverabilityTarget}
                onChange={(e) => setFormData({ ...formData, deliverabilityTarget: Number(e.target.value) })}
                data-testid="input-deliverability"
              />
              <p className="text-xs text-muted-foreground mt-1">Target: 0.97 (97%)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {!isNew && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ShieldX className="h-5 w-5" />
                  Suppression List
                </CardTitle>
                <CardDescription>
                  Upload a CSV file to exclude specific contacts from this campaign
                </CardDescription>
              </div>
              <Badge variant="secondary" data-testid="text-suppression-count">
                {suppressionList ? (suppressionList as any[]).length : 0} entries
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Upload Section */}
            <div className="border rounded-lg p-4 bg-muted/50">
              <div className="space-y-3">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <Label htmlFor="suppression-file">Upload CSV File</Label>
                    <p className="text-xs text-muted-foreground mt-1 mb-2">
                      Supports: Email, CAV ID, CAV User ID, or Full Name + Company Name
                    </p>
                    <Input
                      ref={fileInputRef}
                      id="suppression-file"
                      type="file"
                      accept=".csv"
                      onChange={handleFileSelect}
                      data-testid="input-suppression-file"
                    />
                    {suppressionFile && (
                      <div className="flex items-center gap-2 mt-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm" data-testid="text-selected-file">
                          {suppressionFile.name}
                        </span>
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={handleUploadSuppression}
                    disabled={!suppressionFile || uploadSuppressionMutation.isPending}
                    data-testid="button-upload-suppression"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadSuppressionMutation.isPending ? "Uploading..." : "Upload"}
                  </Button>
                </div>
                
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-medium">CSV Format Requirements:</p>
                  <ul className="list-disc list-inside space-y-0.5 ml-2">
                    <li>Headers: email, cavId, cavUserId, firstName, lastName, companyName</li>
                    <li>Each row must have: email OR cavId OR cavUserId OR (firstName + companyName)</li>
                    <li>Supports comma, tab, pipe, or semicolon delimiters (auto-detected)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Current Entries */}
            {suppressionLoading ? (
              <div className="text-sm text-muted-foreground" data-testid="text-suppression-loading">
                Loading suppression list...
              </div>
            ) : suppressionList && (suppressionList as any[]).length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-4 py-2 border-b">
                  <h4 className="text-sm font-medium">Current Suppression Entries</h4>
                </div>
                <div className="max-h-64 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Identifier</TableHead>
                        <TableHead>Added</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(suppressionList as any[]).slice(0, 100).map((entry: any) => (
                        <TableRow key={entry.id} data-testid={`row-suppression-${entry.id}`}>
                          <TableCell>
                            {entry.emailLower && <Badge variant="outline">Email</Badge>}
                            {entry.cavId && <Badge variant="outline">CAV ID</Badge>}
                            {entry.cavUserId && <Badge variant="outline">User ID</Badge>}
                            {entry.nameCompanyHash && <Badge variant="outline">Name+Company</Badge>}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {entry.emailLower || entry.cavId || entry.cavUserId || entry.nameCompanyHash?.substring(0, 16) + '...'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(entry.addedAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {(suppressionList as any[]).length > 100 && (
                  <div className="bg-muted/50 px-4 py-2 border-t text-xs text-muted-foreground">
                    Showing first 100 of {(suppressionList as any[]).length} entries
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ShieldX className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm" data-testid="text-no-suppressions">No suppression entries yet</p>
                <p className="text-xs mt-1">Upload a CSV file to exclude contacts from this campaign</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-2 mt-6">
        <Button
          variant="outline"
          onClick={() => navigate("/verification/campaigns")}
          data-testid="button-cancel"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          data-testid="button-save"
        >
          <Save className="h-4 w-4 mr-2" />
          {updateMutation.isPending ? "Saving..." : "Save Campaign"}
        </Button>
      </div>

      {!isNew && (
        <div className="mt-8">
          <AccountCapManager campaignId={id!} />
        </div>
      )}
    </div>
  );
}
