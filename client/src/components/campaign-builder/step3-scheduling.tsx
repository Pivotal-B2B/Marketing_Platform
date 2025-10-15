import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ChevronRight, Calendar, Clock, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface Step3Props {
  data: any;
  onNext: (data: any) => void;
  onBack: () => void;
  campaignType: "email" | "telemarketing";
}

export function Step3Scheduling({ data, onNext, campaignType }: Step3Props) {
  const [schedulingType, setSchedulingType] = useState<"now" | "scheduled">(data.scheduling?.type || "now");
  const [scheduleDate, setScheduleDate] = useState(data.scheduling?.date || "");
  const [scheduleTime, setScheduleTime] = useState(data.scheduling?.time || "");
  const [timezone, setTimezone] = useState(data.scheduling?.timezone || "UTC");
  const [throttle, setThrottle] = useState(data.scheduling?.throttle || "");
  const [assignedAgents, setAssignedAgents] = useState<string[]>(data.scheduling?.assignedAgents || []);

  // Fetch available agents for telemarketing campaigns
  const { data: agents = [] } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await fetch("/api/users", {
        credentials: 'include',
      });
      if (!response.ok) throw new Error("Failed to fetch agents");
      const users = await response.json();
      // Filter to only show agents
      return users.filter((user: any) => user.role === 'agent');
    },
    enabled: campaignType === "telemarketing",
  });

  const handleNext = () => {
    onNext({
      scheduling: {
        type: schedulingType,
        date: scheduleDate,
        time: scheduleTime,
        timezone,
        throttle,
        assignedAgents: campaignType === "telemarketing" ? assignedAgents : undefined,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Schedule Type */}
      <Card>
        <CardHeader>
          <CardTitle>
            {campaignType === "email" ? "Send Schedule" : "Call Schedule"}
          </CardTitle>
          <CardDescription>
            {campaignType === "email"
              ? "Choose when to send your email campaign"
              : "Define call window and scheduling parameters"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup value={schedulingType} onValueChange={(v) => setSchedulingType(v as any)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="now" id="now" data-testid="radio-send-now" />
              <Label htmlFor="now" className="font-normal cursor-pointer">
                {campaignType === "email" ? "Send immediately after launch" : "Start calling immediately"}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="scheduled" id="scheduled" data-testid="radio-schedule" />
              <Label htmlFor="scheduled" className="font-normal cursor-pointer">
                Schedule for later
              </Label>
            </div>
          </RadioGroup>

          {schedulingType === "scheduled" && (
            <div className="grid grid-cols-2 gap-4 pl-6">
              <div className="space-y-2">
                <Label>
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Date
                </Label>
                <Input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  data-testid="input-schedule-date"
                />
              </div>
              <div className="space-y-2">
                <Label>
                  <Clock className="w-4 h-4 inline mr-2" />
                  Time
                </Label>
                <Input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  data-testid="input-schedule-time"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger data-testid="select-timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UTC">UTC (Coordinated Universal Time)</SelectItem>
                <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                <SelectItem value="Europe/London">London (GMT)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Pacing & Throttling */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Zap className="w-5 h-5 inline mr-2" />
            Pacing & Throttling
          </CardTitle>
          <CardDescription>
            {campaignType === "email"
              ? "Control email delivery rate to manage server load"
              : "Set call volume limits and agent assignment rules"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {campaignType === "email" ? (
            <>
              <div className="space-y-2">
                <Label>Maximum Emails per Minute</Label>
                <Input
                  type="number"
                  value={throttle}
                  onChange={(e) => setThrottle(e.target.value)}
                  placeholder="e.g., 100"
                  data-testid="input-throttle"
                />
                <p className="text-xs text-muted-foreground">
                  Recommended: 50-200 emails/minute depending on your ESP limits
                </p>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm">
                  <p className="font-medium mb-1">AI-Optimized Send Time</p>
                  <p className="text-muted-foreground">
                    Enable AI to automatically adjust send times based on recipient engagement patterns (optional)
                  </p>
                  <Button variant="outline" size="sm" className="mt-2" data-testid="button-enable-ai-timing">
                    Enable AI Optimization
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Call Window Start</Label>
                  <Input type="time" defaultValue="09:00" data-testid="input-call-window-start" />
                </div>
                <div className="space-y-2">
                  <Label>Call Window End</Label>
                  <Input type="time" defaultValue="18:00" data-testid="input-call-window-end" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Max Concurrent Calls per Agent</Label>
                <Input type="number" defaultValue="1" min="1" max="5" data-testid="input-max-concurrent" />
              </div>

              <div className="space-y-2">
                <Label>Frequency Cap (Days between calls to same contact)</Label>
                <Input type="number" defaultValue="7" min="1" data-testid="input-frequency-cap" />
              </div>

              <div className="space-y-2">
                <Label>Assign Agents</Label>
                <Select 
                  value={assignedAgents[0] || ""} 
                  onValueChange={(value) => {
                    if (value === "all") {
                      setAssignedAgents(agents.map((a: any) => a.id));
                    } else {
                      setAssignedAgents([value]);
                    }
                  }}
                >
                  <SelectTrigger data-testid="select-agent-assignment">
                    <SelectValue placeholder="Select agent..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Available Agents ({agents.length})</SelectItem>
                    {agents.map((agent: any) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.firstName} {agent.lastName} ({agent.username})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {assignedAgents.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {assignedAgents.length === agents.length 
                      ? `All ${agents.length} agents assigned` 
                      : `${assignedAgents.length} agent(s) assigned`}
                  </p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Next Button */}
      <div className="flex justify-end">
        <Button onClick={handleNext} size="lg" data-testid="button-next-step">
          Continue to Compliance Review
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
