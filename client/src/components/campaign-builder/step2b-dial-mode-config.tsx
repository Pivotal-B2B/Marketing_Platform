import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, Zap, Settings, Volume2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step2bDialModeConfigProps {
  data: any;
  onNext: (data: any) => void;
  onBack: () => void;
}

export function Step2bDialModeConfig({ data, onNext, onBack }: Step2bDialModeConfigProps) {
  const [dialMode, setDialMode] = useState<'manual' | 'power'>(data.dialMode || 'power');
  const [amdEnabled, setAmdEnabled] = useState(data.powerSettings?.amd?.enabled ?? true);
  const [amdConfidenceThreshold, setAmdConfidenceThreshold] = useState(
    data.powerSettings?.amd?.confidenceThreshold ?? 0.70
  );
  const [amdTimeout, setAmdTimeout] = useState(data.powerSettings?.amd?.timeout ?? 3000);
  const [unknownAction, setUnknownAction] = useState<'route_to_agent' | 'drop_silent'>(
    data.powerSettings?.amd?.unknownAction || 'route_to_agent'
  );
  
  const [vmEnabled, setVmEnabled] = useState(data.powerSettings?.voicemailPolicy?.enabled ?? false);
  const [vmAction, setVmAction] = useState<'leave_message' | 'schedule_callback' | 'drop_silent'>(
    data.powerSettings?.voicemailPolicy?.action || 'leave_message'
  );
  const [vmMessage, setVmMessage] = useState(data.powerSettings?.voicemailPolicy?.message || '');
  const [vmCampaignCap, setVmCampaignCap] = useState(data.powerSettings?.voicemailPolicy?.campaign_daily_vm_cap || 100);
  const [vmContactCap, setVmContactCap] = useState(data.powerSettings?.voicemailPolicy?.contact_vm_cap || 1);

  const handleSubmit = () => {
    const powerSettings = dialMode === 'power' ? {
      amd: {
        enabled: amdEnabled,
        confidenceThreshold: amdConfidenceThreshold,
        timeout: amdTimeout,
        unknownAction: unknownAction,
      },
      voicemailPolicy: vmEnabled ? {
        enabled: true,
        action: vmAction,
        message: vmMessage,
        campaign_daily_vm_cap: vmCampaignCap,
        contact_vm_cap: vmContactCap,
        region_blacklist: [], // Can be configured later
      } : { enabled: false },
    } : undefined;

    onNext({
      dialMode,
      powerSettings,
    });
  };

  return (
    <div className="space-y-6">
      {/* Dial Mode Selection */}
      <div className="space-y-4">
        <div>
          <Label className="text-base font-semibold">Select Dial Mode</Label>
          <p className="text-sm text-muted-foreground mt-1">
            Choose how calls will be initiated to your contacts
          </p>
        </div>

        <RadioGroup value={dialMode} onValueChange={(v) => setDialMode(v as 'manual' | 'power')}>
          <Card className={cn(dialMode === 'manual' && "border-primary")}>
            <CardHeader className="pb-3">
              <div className="flex items-start gap-4">
                <RadioGroupItem value="manual" id="manual" className="mt-1" data-testid="radio-dial-mode-manual" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Phone className="w-5 h-5 text-primary" />
                    <Label htmlFor="manual" className="text-base font-semibold cursor-pointer">
                      Manual Dial Mode
                    </Label>
                  </div>
                  <CardDescription className="mt-2">
                    Agents pull contacts from their queue and manually initiate calls. Best for personalized outreach and complex sales cycles.
                  </CardDescription>
                  <div className="mt-3 space-y-1 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                      Agent-driven queue with pull/lock workflow
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                      Campaign-level collision prevention
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                      Filter-based audience selection
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className={cn(dialMode === 'power' && "border-primary")}>
            <CardHeader className="pb-3">
              <div className="flex items-start gap-4">
                <RadioGroupItem value="power" id="power" className="mt-1" data-testid="radio-dial-mode-power" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-primary" />
                    <Label htmlFor="power" className="text-base font-semibold cursor-pointer">
                      Power Dial Mode
                    </Label>
                  </div>
                  <CardDescription className="mt-2">
                    Automated dialing with AMD detection. Only connects agents to live humans. Maximizes agent talk time and productivity.
                  </CardDescription>
                  <div className="mt-3 space-y-1 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                      AMD with human-only routing
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                      Pacing engine with abandon-rate feedback (3% target)
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                      Progressive/predictive/preview modes
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>
        </RadioGroup>
      </div>

      {/* Power Mode Settings */}
      {dialMode === 'power' && (
        <>
          <Separator />

          {/* AMD Configuration */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                <CardTitle>Answering Machine Detection (AMD)</CardTitle>
              </div>
              <CardDescription>
                Configure how the system detects and handles answering machines
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="amd-enabled" className="font-medium">Enable AMD</Label>
                  <p className="text-sm text-muted-foreground">Automatically detect answering machines</p>
                </div>
                <Switch
                  id="amd-enabled"
                  checked={amdEnabled}
                  onCheckedChange={setAmdEnabled}
                  data-testid="switch-amd-enabled"
                />
              </div>

              {amdEnabled && (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Confidence Threshold: {(amdConfidenceThreshold * 100).toFixed(0)}%</Label>
                      <span className="text-sm text-muted-foreground">
                        {amdConfidenceThreshold >= 0.8 ? 'High' : amdConfidenceThreshold >= 0.6 ? 'Medium' : 'Low'}
                      </span>
                    </div>
                    <Slider
                      value={[amdConfidenceThreshold * 100]}
                      onValueChange={([v]) => setAmdConfidenceThreshold(v / 100)}
                      min={50}
                      max={95}
                      step={5}
                      className="w-full"
                      data-testid="slider-amd-confidence"
                    />
                    <p className="text-xs text-muted-foreground">
                      Higher threshold = more accurate but may miss some machines. Recommended: 70%
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label>AMD Timeout</Label>
                    <Select value={amdTimeout.toString()} onValueChange={(v) => setAmdTimeout(parseInt(v))}>
                      <SelectTrigger data-testid="select-amd-timeout">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2000">2 seconds</SelectItem>
                        <SelectItem value="3000">3 seconds (recommended)</SelectItem>
                        <SelectItem value="4000">4 seconds</SelectItem>
                        <SelectItem value="5000">5 seconds</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      How long to analyze the call before making a decision
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label>Unknown Result Action</Label>
                    <Select value={unknownAction} onValueChange={(v: any) => setUnknownAction(v)}>
                      <SelectTrigger data-testid="select-unknown-action">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="route_to_agent">Route to Agent (safer)</SelectItem>
                        <SelectItem value="drop_silent">Drop Silent</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      What to do when AMD confidence is below threshold
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Voicemail Policy */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Volume2 className="w-5 h-5" />
                <CardTitle>Voicemail Policy</CardTitle>
              </div>
              <CardDescription>
                Configure what happens when a machine is detected
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="vm-enabled" className="font-medium">Enable Voicemail Handling</Label>
                  <p className="text-sm text-muted-foreground">Automatically handle detected voicemail</p>
                </div>
                <Switch
                  id="vm-enabled"
                  checked={vmEnabled}
                  onCheckedChange={setVmEnabled}
                  data-testid="switch-vm-enabled"
                />
              </div>

              {vmEnabled && (
                <>
                  <div className="space-y-3">
                    <Label>Voicemail Action</Label>
                    <Select value={vmAction} onValueChange={(v: any) => setVmAction(v)}>
                      <SelectTrigger data-testid="select-vm-action">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="leave_message">Leave Voice Message (TTS)</SelectItem>
                        <SelectItem value="schedule_callback">Schedule Callback</SelectItem>
                        <SelectItem value="drop_silent">Drop Silent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {vmAction === 'leave_message' && (
                    <div className="space-y-3">
                      <Label>Voicemail Message</Label>
                      <Textarea
                        placeholder="Enter your voicemail message. Use {{firstName}}, {{lastName}}, {{companyName}} for personalization."
                        value={vmMessage}
                        onChange={(e) => setVmMessage(e.target.value)}
                        rows={4}
                        data-testid="textarea-vm-message"
                      />
                      <p className="text-xs text-muted-foreground">
                        This message will be converted to speech and left as a voicemail
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="vm-campaign-cap">
                        <Clock className="w-4 h-4 inline mr-1" />
                        Daily Campaign Cap
                      </Label>
                      <Input
                        id="vm-campaign-cap"
                        type="number"
                        value={vmCampaignCap}
                        onChange={(e) => setVmCampaignCap(parseInt(e.target.value))}
                        min={1}
                        data-testid="input-vm-campaign-cap"
                      />
                      <p className="text-xs text-muted-foreground">Max VMs per day for campaign</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="vm-contact-cap">
                        <Clock className="w-4 h-4 inline mr-1" />
                        Per-Contact Cap
                      </Label>
                      <Input
                        id="vm-contact-cap"
                        type="number"
                        value={vmContactCap}
                        onChange={(e) => setVmContactCap(parseInt(e.target.value))}
                        min={1}
                        max={5}
                        data-testid="input-vm-contact-cap"
                      />
                      <p className="text-xs text-muted-foreground">Max VMs per contact</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Navigation */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onBack} data-testid="button-back">
          Back
        </Button>
        <Button onClick={handleSubmit} data-testid="button-next">
          Continue to Scheduling
        </Button>
      </div>
    </div>
  );
}
