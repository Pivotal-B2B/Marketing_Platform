import { useLocation } from "wouter";
import { CampaignWizard, type CampaignWizardStep } from "@/components/campaign-builder/campaign-wizard";
import { Step1AudienceSelection } from "@/components/campaign-builder/step1-audience-selection";
import { Step2TelemarketingContent } from "@/components/campaign-builder/step2-telemarketing-content";
import { Step3Scheduling } from "@/components/campaign-builder/step3-scheduling";
import { Step4Compliance } from "@/components/campaign-builder/step4-compliance";
import { Step5Summary } from "@/components/campaign-builder/step5-summary";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function TelemarketingCreatePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const steps: CampaignWizardStep[] = [
    {
      id: "audience",
      title: "Audience",
      description: "Select your target audience for calling",
      component: Step1AudienceSelection,
    },
    {
      id: "content",
      title: "Call Script",
      description: "Create your call script and qualification questions",
      component: Step2TelemarketingContent,
    },
    {
      id: "scheduling",
      title: "Scheduling",
      description: "Configure call windows, agent assignment, and pacing",
      component: Step3Scheduling,
    },
    {
      id: "compliance",
      title: "Compliance",
      description: "Automated DNC checks and compliance verification",
      component: Step4Compliance,
    },
    {
      id: "summary",
      title: "Summary",
      description: "Review and launch your telemarketing campaign",
      component: Step5Summary,
    },
  ];

  const handleComplete = async (data: any) => {
    try {
      if (data.action === "draft") {
        await apiRequest("POST", "/api/campaigns", {
          ...data,
          type: "telemarketing",
          status: "draft",
        });

        toast({
          title: "Draft Saved",
          description: "Your telemarketing campaign has been saved as a draft.",
        });
      } else {
        await apiRequest("POST", "/api/campaigns", {
          ...data,
          type: "telemarketing",
          status: "active",
        });

        toast({
          title: "Campaign Launched!",
          description: "Your telemarketing campaign is now running. Agents can start calling.",
        });
      }

      setLocation("/campaigns/telemarketing");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create campaign. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setLocation("/campaigns/telemarketing");
  };

  return (
    <div className="max-w-7xl mx-auto">
      <CampaignWizard
        campaignType="telemarketing"
        steps={steps}
        onComplete={handleComplete}
        onCancel={handleCancel}
      />
    </div>
  );
}
