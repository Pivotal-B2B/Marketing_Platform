import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Phone, PhoneCall, PhoneMissed, PhoneOff, PhoneForwarded } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function TelemarketingPage() {
  const [callStatus, setCallStatus] = useState<"idle" | "calling" | "connected">("idle");
  const [disposition, setDisposition] = useState("");
  const [notes, setNotes] = useState("");

  const currentContact = {
    name: "John Smith",
    title: "VP of Sales",
    company: "Acme Corporation",
    phone: "+1 555-0123",
    email: "john.smith@acme.com",
  };

  const callScript = `
Hi, this is [Your Name] from Pivotal Solutions.

May I speak with ${currentContact.name}?

[If yes]
Great! I'm reaching out because we help companies like ${currentContact.company} streamline their B2B sales processes...

[Continue with qualification questions]
  `;

  const handleCall = () => {
    setCallStatus("calling");
    setTimeout(() => setCallStatus("connected"), 2000);
  };

  const handleHangup = () => {
    setCallStatus("idle");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Telemarketing</h1>
          <p className="text-muted-foreground mt-1">
            Make calls, qualify leads, and track conversations
          </p>
        </div>
        <Badge variant={callStatus === "connected" ? "default" : "secondary"} className="text-sm">
          {callStatus === "idle" && "Ready to Call"}
          {callStatus === "calling" && "Calling..."}
          {callStatus === "connected" && "Connected"}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Softphone Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Softphone
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-semibold">Current Contact</h4>
              <div className="text-sm space-y-1">
                <div className="font-medium">{currentContact.name}</div>
                <div className="text-muted-foreground">{currentContact.title}</div>
                <div className="text-muted-foreground">{currentContact.company}</div>
                <div className="font-mono text-primary">{currentContact.phone}</div>
              </div>
            </div>

            <div className="pt-4 border-t">
              {callStatus === "idle" && (
                <Button 
                  className="w-full" 
                  size="lg" 
                  onClick={handleCall}
                  data-testid="button-start-call"
                >
                  <PhoneCall className="mr-2 h-5 w-5" />
                  Start Call
                </Button>
              )}
              {callStatus === "calling" && (
                <Button 
                  className="w-full" 
                  size="lg" 
                  variant="secondary"
                  disabled
                  data-testid="button-calling"
                >
                  <Phone className="mr-2 h-5 w-5 animate-pulse" />
                  Calling...
                </Button>
              )}
              {callStatus === "connected" && (
                <Button 
                  className="w-full" 
                  size="lg" 
                  variant="destructive"
                  onClick={handleHangup}
                  data-testid="button-hangup"
                >
                  <PhoneOff className="mr-2 h-5 w-5" />
                  Hang Up
                </Button>
              )}
            </div>

            {callStatus === "connected" && (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" data-testid="button-mute">
                  Mute
                </Button>
                <Button variant="outline" size="sm" data-testid="button-hold">
                  Hold
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Call Script */}
        <Card>
          <CardHeader>
            <CardTitle>Call Script</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg">
                {callScript}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Qualification Form */}
        <Card>
          <CardHeader>
            <CardTitle>Qualification</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="questions" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="questions">Questions</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
              </TabsList>
              <TabsContent value="questions" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Budget Range</Label>
                  <RadioGroup>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="low" id="budget-low" />
                      <Label htmlFor="budget-low" className="font-normal">
                        Under $10k
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="medium" id="budget-medium" />
                      <Label htmlFor="budget-medium" className="font-normal">
                        $10k - $50k
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="high" id="budget-high" />
                      <Label htmlFor="budget-high" className="font-normal">
                        Over $50k
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label>Timeline</Label>
                  <RadioGroup>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="immediate" id="timeline-immediate" />
                      <Label htmlFor="timeline-immediate" className="font-normal">
                        Immediate (0-30 days)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="short" id="timeline-short" />
                      <Label htmlFor="timeline-short" className="font-normal">
                        Short term (1-3 months)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="long" id="timeline-long" />
                      <Label htmlFor="timeline-long" className="font-normal">
                        Long term (3+ months)
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </TabsContent>
              <TabsContent value="notes" className="mt-4">
                <Textarea
                  placeholder="Add call notes here..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[200px]"
                  data-testid="textarea-call-notes"
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Disposition Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Call Disposition</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              variant={disposition === "no_answer" ? "default" : "outline"}
              onClick={() => setDisposition("no_answer")}
              className="justify-start"
              data-testid="button-disposition-no-answer"
            >
              <PhoneMissed className="mr-2 h-4 w-4" />
              No Answer
            </Button>
            <Button
              variant={disposition === "voicemail" ? "default" : "outline"}
              onClick={() => setDisposition("voicemail")}
              className="justify-start"
              data-testid="button-disposition-voicemail"
            >
              <Phone className="mr-2 h-4 w-4" />
              Voicemail
            </Button>
            <Button
              variant={disposition === "not_interested" ? "default" : "outline"}
              onClick={() => setDisposition("not_interested")}
              className="justify-start"
              data-testid="button-disposition-not-interested"
            >
              <PhoneOff className="mr-2 h-4 w-4" />
              Not Interested
            </Button>
            <Button
              variant={disposition === "callback" ? "default" : "outline"}
              onClick={() => setDisposition("callback")}
              className="justify-start"
              data-testid="button-disposition-callback"
            >
              <PhoneForwarded className="mr-2 h-4 w-4" />
              Callback
            </Button>
            <Button
              variant={disposition === "qualified" ? "default" : "outline"}
              onClick={() => setDisposition("qualified")}
              className="justify-start"
              data-testid="button-disposition-qualified"
            >
              <PhoneCall className="mr-2 h-4 w-4" />
              Qualified
            </Button>
            <Button
              variant={disposition === "dnc" ? "destructive" : "outline"}
              onClick={() => setDisposition("dnc")}
              className="justify-start"
              data-testid="button-disposition-dnc"
            >
              <PhoneOff className="mr-2 h-4 w-4" />
              DNC Request
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
