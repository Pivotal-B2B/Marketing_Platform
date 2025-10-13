import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type CampaignType = "email" | "telemarketing";

export interface CampaignWizardStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<any>;
}

interface CampaignWizardProps {
  campaignType: CampaignType;
  steps: CampaignWizardStep[];
  onComplete: (data: any) => void;
  onCancel: () => void;
}

export function CampaignWizard({ campaignType, steps, onComplete, onCancel }: CampaignWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [campaignData, setCampaignData] = useState<any>({
    type: campaignType,
    audience: {},
    content: {},
    scheduling: {},
    compliance: {},
  });

  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = (stepData: any) => {
    // Save step data
    setCampaignData((prev: any) => ({ ...prev, ...stepData }));

    // Mark step as completed
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps([...completedSteps, currentStep]);
    }

    // Move to next step or complete
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete({ ...campaignData, ...stepData });
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    // Only allow navigation to completed steps or next step
    if (stepIndex <= currentStep || completedSteps.includes(stepIndex - 1)) {
      setCurrentStep(stepIndex);
    }
  };

  const CurrentStepComponent = steps[currentStep].component;

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card>
        <CardHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {campaignType === "email" ? "Email Campaign Builder" : "Telemarketing Campaign Builder"}
                </CardTitle>
                <CardDescription>
                  Step {currentStep + 1} of {steps.length}: {steps[currentStep].title}
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-sm">
                {Math.round(progress)}% Complete
              </Badge>
            </div>

            {/* Progress Bar */}
            <Progress value={progress} className="h-2" />

            {/* Step Indicators */}
            <div className="flex items-center justify-between">
              {steps.map((step, index) => {
                const isCompleted = completedSteps.includes(index);
                const isCurrent = index === currentStep;
                const isAccessible = index <= currentStep || completedSteps.includes(index - 1);

                return (
                  <button
                    key={step.id}
                    onClick={() => handleStepClick(index)}
                    disabled={!isAccessible}
                    className={cn(
                      "flex flex-col items-center gap-2 transition-opacity",
                      !isAccessible && "opacity-40 cursor-not-allowed",
                      isAccessible && !isCurrent && "hover-elevate cursor-pointer"
                    )}
                    data-testid={`step-indicator-${step.id}`}
                  >
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                        isCurrent && "border-primary bg-primary text-primary-foreground",
                        isCompleted && !isCurrent && "border-green-500 bg-green-500/10 text-green-500",
                        !isCurrent && !isCompleted && "border-muted bg-muted"
                      )}
                    >
                      {isCompleted ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <span className="text-sm font-semibold">{index + 1}</span>
                      )}
                    </div>
                    <div className="text-xs text-center max-w-[100px]">
                      <div className={cn("font-medium", isCurrent && "text-primary")}>
                        {step.title}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Current Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{steps[currentStep].title}</CardTitle>
          <CardDescription>{steps[currentStep].description}</CardDescription>
        </CardHeader>
        <CardContent>
          <CurrentStepComponent
            data={campaignData}
            onNext={handleNext}
            onBack={handleBack}
            campaignType={campaignType}
          />
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={currentStep === 0 ? onCancel : handleBack}
          data-testid="button-wizard-back"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          {currentStep === 0 ? "Cancel" : "Back"}
        </Button>

        <div className="text-sm text-muted-foreground">
          Step {currentStep + 1} of {steps.length}
        </div>
      </div>
    </div>
  );
}
