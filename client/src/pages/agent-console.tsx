import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX,
  PhoneForwarded,
  Settings,
  Clock,
  User,
  Building2,
  FileText
} from "lucide-react";

// Mock call queue data
const mockQueue = [
  { id: "1", contactName: "John Smith", accountName: "Acme Corp", phone: "+1-555-0101", priority: "high" },
  { id: "2", contactName: "Jane Doe", accountName: "TechStart Inc", phone: "+1-555-0102", priority: "medium" },
  { id: "3", contactName: "Bob Johnson", accountName: "Global Enterprises", phone: "+1-555-0103", priority: "low" },
];

// Call status types
type CallStatus = 'idle' | 'dialing' | 'ringing' | 'connected' | 'wrap-up';

export default function AgentConsolePage() {
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [selectedContact, setSelectedContact] = useState(mockQueue[0]);
  const [callDuration, setCallDuration] = useState(0);
  
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clear all timeouts
  const clearAllTimeouts = () => {
    timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    timeoutsRef.current = [];
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => clearAllTimeouts();
  }, []);

  // Start call duration timer when connected
  useEffect(() => {
    if (callStatus === 'connected') {
      setCallDuration(0);
      durationIntervalRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [callStatus]);

  const handleDial = () => {
    clearAllTimeouts();
    setCallStatus('dialing');
    
    const timeout1 = setTimeout(() => setCallStatus('ringing'), 1000);
    const timeout2 = setTimeout(() => setCallStatus('connected'), 3000);
    
    timeoutsRef.current = [timeout1, timeout2];
  };

  const handleHangup = () => {
    clearAllTimeouts();
    setCallStatus('wrap-up');
    
    const timeout = setTimeout(() => setCallStatus('idle'), 2000);
    timeoutsRef.current = [timeout];
  };

  const isCallActive = ['dialing', 'ringing', 'connected'].includes(callStatus);

  const getStatusBadge = () => {
    switch (callStatus) {
      case 'idle':
        return <Badge variant="secondary" data-testid="badge-call-idle">Ready</Badge>;
      case 'dialing':
        return <Badge variant="outline" data-testid="badge-call-dialing">Dialing...</Badge>;
      case 'ringing':
        return <Badge variant="outline" data-testid="badge-call-ringing">Ringing...</Badge>;
      case 'connected':
        return <Badge className="bg-green-600 hover:bg-green-700" data-testid="badge-call-connected">Connected</Badge>;
      case 'wrap-up':
        return <Badge variant="outline" data-testid="badge-call-wrapup">Wrap-Up</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Page Header */}
      <div className="border-b bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-page-title">Agent Console</h1>
            <p className="text-sm text-muted-foreground">Make calls and manage dispositions</p>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge()}
            <Button
              variant="outline"
              size="icon"
              onClick={() => {/* TODO: Open settings modal */}}
              data-testid="button-settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Three-Pane Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[300px_1fr_400px] gap-0 overflow-hidden">
        {/* LEFT PANE: Call Queue */}
        <div className="border-r bg-card">
          <div className="p-4 border-b">
            <h2 className="font-semibold flex items-center gap-2" data-testid="text-queue-title">
              <Phone className="h-4 w-4" />
              Call Queue
            </h2>
            <p className="text-sm text-muted-foreground mt-1">{mockQueue.length} contacts</p>
          </div>
          <ScrollArea className="h-[calc(100vh-12rem)]">
            <div className="p-2 space-y-2">
              {mockQueue.map((contact) => (
                <Card
                  key={contact.id}
                  className={`cursor-pointer hover-elevate ${
                    selectedContact?.id === contact.id ? 'border-primary' : ''
                  }`}
                  onClick={() => setSelectedContact(contact)}
                  data-testid={`card-queue-contact-${contact.id}`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <p className="font-medium text-sm truncate" data-testid={`text-contact-name-${contact.id}`}>
                            {contact.contactName}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <p className="text-xs text-muted-foreground truncate">
                            {contact.accountName}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <p className="text-xs font-mono text-muted-foreground">
                            {contact.phone}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={contact.priority === 'high' ? 'destructive' : contact.priority === 'medium' ? 'default' : 'secondary'}
                        className="text-xs"
                        data-testid={`badge-priority-${contact.id}`}
                      >
                        {contact.priority}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* CENTER PANE: Softphone Controls */}
        <div className="bg-background flex flex-col">
          <div className="flex-1 flex items-center justify-center p-6">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="text-center" data-testid="text-softphone-title">Softphone</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Contact Info */}
                <div className="text-center space-y-2">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold" data-testid="text-current-contact">
                    {selectedContact?.contactName || 'No Contact Selected'}
                  </h3>
                  <p className="text-sm text-muted-foreground" data-testid="text-current-account">
                    {selectedContact?.accountName}
                  </p>
                  <p className="text-sm font-mono text-muted-foreground" data-testid="text-current-phone">
                    {selectedContact?.phone}
                  </p>
                </div>

                {/* Call Duration */}
                {callStatus === 'connected' && (
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono text-lg" data-testid="text-call-duration">
                        {Math.floor(callDuration / 60)}:{(callDuration % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Call Controls */}
                <div className="flex justify-center gap-3">
                  {!isCallActive && callStatus !== 'wrap-up' && (
                    <Button
                      size="lg"
                      className="h-14 w-14 rounded-full"
                      onClick={handleDial}
                      disabled={!selectedContact}
                      data-testid="button-dial"
                    >
                      <Phone className="h-6 w-6" />
                    </Button>
                  )}

                  {isCallActive && (
                    <>
                      <Button
                        variant="outline"
                        size="lg"
                        className="h-12 w-12 rounded-full"
                        onClick={() => setIsMuted(!isMuted)}
                        data-testid="button-mute"
                      >
                        {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                      </Button>

                      <Button
                        size="lg"
                        variant="destructive"
                        className="h-14 w-14 rounded-full"
                        onClick={handleHangup}
                        data-testid="button-hangup"
                      >
                        <PhoneOff className="h-6 w-6" />
                      </Button>

                      <Button
                        variant="outline"
                        size="lg"
                        className="h-12 w-12 rounded-full"
                        onClick={() => setSpeakerOn(!speakerOn)}
                        data-testid="button-speaker"
                      >
                        {speakerOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                      </Button>
                    </>
                  )}

                  {callStatus === 'wrap-up' && (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground">
                        Disposition required before next call
                      </p>
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                {isCallActive && (
                  <div className="flex justify-center gap-2">
                    <Button variant="outline" size="sm" data-testid="button-transfer">
                      <PhoneForwarded className="h-4 w-4 mr-2" />
                      Transfer
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* RIGHT PANE: Script & Qualification */}
        <div className="border-l bg-card flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-semibold flex items-center gap-2" data-testid="text-script-title">
              <FileText className="h-4 w-4" />
              Script & Notes
            </h2>
          </div>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Call Script</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p className="text-muted-foreground italic">
                    "Hello, this is [Your Name] calling from Pivotal CRM. May I speak with {selectedContact?.contactName}?"
                  </p>
                  <Separator className="my-3" />
                  <p className="text-muted-foreground italic">
                    "I'm calling to discuss how our B2B solutions can help {selectedContact?.accountName} streamline their customer engagement..."
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Call Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    className="min-h-[120px] resize-none"
                    placeholder="Enter call notes here..."
                    data-testid="input-call-notes"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Qualification Questions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <label className="font-medium block mb-1">Budget Range:</label>
                    <Select>
                      <SelectTrigger data-testid="select-budget">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="<10k">&lt; $10,000</SelectItem>
                        <SelectItem value="10k-50k">$10,000 - $50,000</SelectItem>
                        <SelectItem value="50k-100k">$50,000 - $100,000</SelectItem>
                        <SelectItem value=">100k">&gt; $100,000</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="font-medium block mb-1">Decision Timeline:</label>
                    <Select>
                      <SelectTrigger data-testid="select-timeline">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate">Immediate (1-30 days)</SelectItem>
                        <SelectItem value="short">Short-term (1-3 months)</SelectItem>
                        <SelectItem value="medium">Medium-term (3-6 months)</SelectItem>
                        <SelectItem value="long">Long-term (6+ months)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="font-medium block mb-1">Interest Level:</label>
                    <Select>
                      <SelectTrigger data-testid="select-interest">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>

          {/* Disposition Bar */}
          {callStatus === 'wrap-up' && (
            <div className="border-t p-4 bg-background">
              <p className="text-sm font-medium mb-3">Call Disposition Required</p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" data-testid="button-disposition-qualified">
                  Qualified Lead
                </Button>
                <Button variant="outline" size="sm" data-testid="button-disposition-not-interested">
                  Not Interested
                </Button>
                <Button variant="outline" size="sm" data-testid="button-disposition-callback">
                  Schedule Callback
                </Button>
                <Button variant="outline" size="sm" data-testid="button-disposition-dnc">
                  Add to DNC
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
