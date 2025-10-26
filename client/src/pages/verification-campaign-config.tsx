import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { ArrowLeft, Save, ShieldX, Upload, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { AccountCapManager } from "@/components/verification/AccountCapManager";
import { PriorityConfigEditor } from "@/components/verification/PriorityConfigEditor";

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
            Set up eligibility rules, priority scoring, and account caps
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
        <Tabs defaultValue="priority" className="mt-8">
          <TabsList>
            <TabsTrigger value="priority" data-testid="tab-priority-config">Priority Configuration</TabsTrigger>
            <TabsTrigger value="caps" data-testid="tab-account-caps">Account Caps</TabsTrigger>
          </TabsList>
          <TabsContent value="priority">
            <PriorityConfigEditor campaignId={id!} />
          </TabsContent>
          <TabsContent value="caps">
            <AccountCapManager campaignId={id!} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
