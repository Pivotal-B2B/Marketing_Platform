import { useLocation } from "wouter";
import { CampaignWizard, type CampaignWizardStep } from "@/components/campaign-builder/campaign-wizard";
import { Step1AudienceSelection } from "@/components/campaign-builder/step1-audience-selection";
import { Step2EmailContent } from "@/components/campaign-builder/step2-email-content";
import { Step3Scheduling } from "@/components/campaign-builder/step3-scheduling";
import { Step4Compliance } from "@/components/campaign-builder/step4-compliance";
import { Step5Summary } from "@/components/campaign-builder/step5-summary";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function EmailCampaignCreatePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const steps: CampaignWizardStep[] = [
    {
      id: "audience",
      title: "Audience",
      description: "Select your target audience using filters, segments, lists, or domain sets",
      component: Step1AudienceSelection,
    },
    {
      id: "content",
      title: "Content",
      description: "Design your email with rich HTML editor and personalization",
      component: Step2EmailContent,
    },
    {
      id: "scheduling",
      title: "Scheduling",
      description: "Configure send time, timezone, and pacing",
      component: Step3Scheduling,
    },
    {
      id: "compliance",
      title: "Compliance",
      description: "Automated pre-flight checks for deliverability and compliance",
      component: Step4Compliance,
    },
    {
      id: "summary",
      title: "Summary",
      description: "Review and launch your email campaign",
      component: Step5Summary,
    },
  ];

  const handleComplete = async (data: any) => {
    try {
      if (data.action === "draft") {
        // Save as draft
        await apiRequest("POST", "/api/campaigns", {
          ...data,
          type: "email",
          status: "draft",
        });

        toast({
          title: "Draft Saved",
          description: "Your email campaign has been saved as a draft.",
        });
      } else {
        // Launch campaign
        const response = await apiRequest("POST", "/api/campaigns", {
          ...data,
          type: "email",
          status: "active",
        });

        toast({
          title: "Campaign Launched!",
          description: "Your email campaign is now running.",
        });
      }

      setLocation("/campaigns/email");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create campaign. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setLocation("/campaigns/email");
  };

  return (
    <div className="max-w-7xl mx-auto">
      <CampaignWizard
        campaignType="email"
        steps={steps}
        onComplete={handleComplete}
        onCancel={handleCancel}
      />
    </div>
  );
}