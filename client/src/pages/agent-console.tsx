import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
  FileText,
  RefreshCw,
  ChevronRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTelnyxWebRTC } from "@/hooks/useTelnyxWebRTC";
import type { CallState } from "@/hooks/useTelnyxWebRTC";

// Backwards compatibility type alias
type CallStatus = CallState | 'wrap-up';

// Queue item type
type QueueItem = {
  id: string;
  campaignId: string;
  campaignName: string;
  contactId: string;
  contactName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  accountId: string;
  accountName: string | null;
  priority: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

// Campaign type for selector
type Campaign = {
  id: string;
  name: string;
};

export default function AgentConsolePage() {
  const { toast } = useToast();
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('all');
  const [selectedContact, setSelectedContact] = useState<QueueItem | null>(null);
  const [showDispositionModal, setShowDispositionModal] = useState(false);
  
  // Disposition form state
  const [disposition, setDisposition] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [qualificationData, setQualificationData] = useState<any>({});

  // Fetch SIP trunk credentials
  const { data: sipConfig } = useQuery<{sipUsername: string; sipPassword: string; sipDomain?: string}>({
    queryKey: ['/api/sip-trunks/default'],
  });

  // Initialize Telnyx WebRTC
  const {
    callState,
    isConnected,
    isMuted,
    callDuration,
    formatDuration,
    makeCall,
    hangup,
    toggleMute,
  } = useTelnyxWebRTC({
    sipUsername: sipConfig?.sipUsername,
    sipPassword: sipConfig?.sipPassword,
    sipDomain: sipConfig?.sipDomain || 'sip.telnyx.com',
    onCallStateChange: (state) => {
      // Map Telnyx call states to our UI states
      if (state === 'hangup') {
        setCallStatus('wrap-up');
      } else {
        setCallStatus(state as CallStatus);
      }
    },
    onCallEnd: () => {
      // Call ended, show inline disposition
      setCallStatus('wrap-up');
    },
  });

  // Fetch agent queue data
  const { data: queueData = [], isLoading: queueLoading, refetch: refetchQueue } = useQuery<QueueItem[]>({
    queryKey: selectedCampaignId === 'all' 
      ? ['/api/agents/me/queue?status=queued']
      : [`/api/agents/me/queue?campaignId=${selectedCampaignId}&status=queued`],
  });

  // Extract unique campaigns from queue data
  const campaigns: Campaign[] = Array.from(
    new Map(queueData.map(item => [item.campaignId, { id: item.campaignId, name: item.campaignName }])).values()
  );

  // Auto-select first contact when queue loads
  useEffect(() => {
    if (queueData.length > 0 && !selectedContact) {
      setSelectedContact(queueData[0]);
    }
  }, [queueData, selectedContact]);

  // Mutation for saving disposition
  const saveDispositionMutation = useMutation({
    mutationFn: async (dispositionData: any) => {
      return await apiRequest('POST', '/api/calls/disposition', dispositionData);
    },
    onSuccess: () => {
      toast({
        title: "Disposition saved",
        description: "Call disposition has been recorded successfully.",
      });
      
      // Reset form
      setDisposition('');
      setNotes('');
      setQualificationData({});
      setCallStatus('idle');
      
      // Move to next contact
      const currentIndex = queueData.findIndex(c => c.id === selectedContact?.id);
      if (currentIndex < queueData.length - 1) {
        setSelectedContact(queueData[currentIndex + 1]);
      } else if (queueData.length > 0) {
        setSelectedContact(queueData[0]);
      }
      
      // Refetch queue to get updated status
      refetchQueue();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save disposition",
        variant: "destructive",
      });
    },
  });

  const handleDial = () => {
    if (!selectedContact?.contactPhone) {
      toast({
        title: "No phone number",
        description: "This contact doesn't have a phone number",
        variant: "destructive",
      });
      return;
    }

    if (!isConnected) {
      toast({
        title: "Not connected",
        description: "WebRTC client is not connected. Please wait...",
        variant: "destructive",
      });
      return;
    }

    // Use real Telnyx calling
    makeCall(selectedContact.contactPhone);
  };

  const handleHangup = () => {
    hangup();
  };

  const handleSaveDisposition = () => {
    if (!disposition) {
      toast({
        title: "Disposition required",
        description: "Please select a call disposition before proceeding.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedContact) {
      toast({
        title: "Error",
        description: "No contact selected",
        variant: "destructive",
      });
      return;
    }

    saveDispositionMutation.mutate({
      queueItemId: selectedContact.id,
      campaignId: selectedContact.campaignId,
      contactId: selectedContact.contactId,
      disposition,
      duration: callDuration,
      notes,
      qualificationData: Object.keys(qualificationData).length > 0 ? qualificationData : null,
      callbackRequested: disposition === 'callback_requested',
    });
  };

  const isCallActive = ['connecting', 'ringing', 'active'].includes(callStatus);

  const getStatusBadge = () => {
    if (!isConnected) {
      return <Badge variant="destructive" data-testid="badge-not-connected">Disconnected</Badge>;
    }
    
    switch (callStatus) {
      case 'idle':
        return <Badge variant="secondary" data-testid="badge-call-idle">Ready</Badge>;
      case 'connecting':
        return <Badge variant="outline" data-testid="badge-call-connecting">Connecting...</Badge>;
      case 'ringing':
        return <Badge variant="outline" data-testid="badge-call-ringing">Ringing...</Badge>;
      case 'active':
        return <Badge className="bg-green-600 hover:bg-green-700" data-testid="badge-call-active">Active - {formatDuration()}</Badge>;
      case 'held':
        return <Badge variant="outline" data-testid="badge-call-held">On Hold</Badge>;
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
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-page-title">Agent Console</h1>
            <p className="text-sm text-muted-foreground">Make calls and manage dispositions</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
              <SelectTrigger className="w-[200px]" data-testid="select-campaign">
                <SelectValue placeholder="Select campaign" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campaigns</SelectItem>
                {campaigns.map(campaign => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {getStatusBadge()}
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetchQueue()}
              data-testid="button-refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Two-Column Layout: Sidebar + Main Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT SIDEBAR: Queue + Softphone */}
        <div className="w-72 border-r bg-card flex flex-col">
          {/* Softphone Controls */}
          <div className="p-4 border-b">
            <div className="space-y-3">
              <div className="text-center space-y-2">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-sm truncate" data-testid="text-current-contact">
                  {selectedContact?.contactName || 'No Contact'}
                </h3>
                <p className="text-xs text-muted-foreground truncate" data-testid="text-current-account">
                  {selectedContact?.accountName || '-'}
                </p>
                <p className="text-xs font-mono text-muted-foreground" data-testid="text-current-phone">
                  {selectedContact?.contactPhone || 'No phone'}
                </p>
              </div>

              {/* Call Duration */}
              {callStatus === 'active' && (
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono text-sm" data-testid="text-call-duration">
                      {formatDuration()}
                    </span>
                  </div>
                </div>
              )}

              {/* Call Controls */}
              <div className="flex justify-center gap-2">
                {!isCallActive && callStatus !== 'wrap-up' && (
                  <Button
                    size="lg"
                    className="h-12 w-12 rounded-full"
                    onClick={handleDial}
                    disabled={!selectedContact}
                    data-testid="button-dial"
                  >
                    <Phone className="h-5 w-5" />
                  </Button>
                )}

                {isCallActive && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={toggleMute}
                      data-testid="button-mute"
                    >
                      {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>

                    <Button
                      size="lg"
                      variant="destructive"
                      className="h-12 w-12 rounded-full"
                      onClick={handleHangup}
                      data-testid="button-hangup"
                    >
                      <PhoneOff className="h-5 w-5" />
                    </Button>
                  </>
                )}
              </div>

              {callStatus === 'wrap-up' && (
                <div className="text-center py-2">
                  <p className="text-xs text-muted-foreground">
                    Complete disposition below
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Call Queue */}
          <div className="flex-1 flex flex-col">
            <div className="p-3 border-b">
              <h2 className="font-semibold text-sm flex items-center gap-2" data-testid="text-queue-title">
                <Phone className="h-3.5 w-3.5" />
                Queue ({queueData.length})
              </h2>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {queueLoading ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-1" />
                    <p className="text-xs">Loading...</p>
                  </div>
                ) : queueData.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <Phone className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs font-medium">No contacts</p>
                  </div>
                ) : (
                  queueData.map((contact) => (
                    <div
                      key={contact.id}
                      className={`p-2 rounded-md cursor-pointer hover-elevate border ${
                        selectedContact?.id === contact.id ? 'border-primary bg-primary/5' : 'border-transparent'
                      }`}
                      onClick={() => setSelectedContact(contact)}
                      data-testid={`card-queue-contact-${contact.id}`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs truncate" data-testid={`text-contact-name-${contact.id}`}>
                            {contact.contactName || 'Unknown'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {contact.accountName || 'No account'}
                          </p>
                          <p className="text-xs font-mono text-muted-foreground mt-0.5">
                            {contact.contactPhone || 'No phone'}
                          </p>
                        </div>
                        <Badge
                          variant={contact.priority >= 3 ? 'destructive' : contact.priority >= 2 ? 'default' : 'secondary'}
                          className="text-xs h-5 px-1.5"
                          data-testid={`badge-priority-${contact.id}`}
                        >
                          P{contact.priority}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* MAIN AREA: Script + Dispositions */}
        <div className="flex-1 flex flex-col bg-background overflow-hidden">
          <ScrollArea className="flex-1">
            <div className="max-w-4xl mx-auto p-6 space-y-6">
              {/* Call Script - Large and Centered */}
              <Card className="border-2">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Call Script
                    </CardTitle>
                    {selectedContact && (
                      <Badge variant="outline" className="text-xs">
                        {selectedContact.campaignName}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-base leading-relaxed">
                      "Hello, this is [Your Name] calling from Pivotal CRM. May I speak with{' '}
                      <span className="font-semibold text-primary">
                        {selectedContact?.contactName || '[Contact Name]'}
                      </span>?"
                    </p>
                  </div>
                  <Separator />
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-base leading-relaxed">
                      "I'm calling to discuss how our B2B solutions can help{' '}
                      <span className="font-semibold text-primary">
                        {selectedContact?.accountName || '[Company Name]'}
                      </span>{' '}
                      streamline their customer engagement and drive growth..."
                    </p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-base leading-relaxed">
                      "We specialize in Account-Based Marketing and multi-channel campaign management. 
                      Do you have a few minutes to discuss your current marketing challenges?"
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Call Notes */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Call Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    className="min-h-[100px] resize-none text-base"
                    placeholder="Enter call notes here..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    data-testid="input-call-notes"
                  />
                </CardContent>
              </Card>

              {/* Disposition Section - Always Visible */}
              <Card className={callStatus === 'wrap-up' ? 'border-2 border-primary' : ''}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    Call Disposition {callStatus === 'wrap-up' && <span className="text-destructive">*</span>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Disposition Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="disposition">Call Outcome {callStatus === 'wrap-up' && '*'}</Label>
                    <Select value={disposition} onValueChange={setDisposition}>
                      <SelectTrigger id="disposition" data-testid="select-disposition">
                        <SelectValue placeholder="Select disposition..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="qualified">Qualified Lead</SelectItem>
                        <SelectItem value="callback_requested">Callback Requested</SelectItem>
                        <SelectItem value="not_interested">Not Interested</SelectItem>
                        <SelectItem value="voicemail">Voicemail</SelectItem>
                        <SelectItem value="no_answer">No Answer</SelectItem>
                        <SelectItem value="busy">Busy</SelectItem>
                        <SelectItem value="dnc_request">DNC Request</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Qualification Questions */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor="budget" className="text-sm">Budget Range</Label>
                      <Select
                        value={qualificationData.budget || ''}
                        onValueChange={(value) => setQualificationData({...qualificationData, budget: value})}
                      >
                        <SelectTrigger id="budget" data-testid="select-qual-budget">
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
                      <Label htmlFor="timeline" className="text-sm">Decision Timeline</Label>
                      <Select
                        value={qualificationData.timeline || ''}
                        onValueChange={(value) => setQualificationData({...qualificationData, timeline: value})}
                      >
                        <SelectTrigger id="timeline" data-testid="select-qual-timeline">
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
                      <Label htmlFor="interest" className="text-sm">Interest Level</Label>
                      <Select
                        value={qualificationData.interest || ''}
                        onValueChange={(value) => setQualificationData({...qualificationData, interest: value})}
                      >
                        <SelectTrigger id="interest" data-testid="select-qual-interest">
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
                  </div>

                  {/* Save Button */}
                  {(callStatus === 'wrap-up' || disposition) && (
                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={handleSaveDisposition}
                        disabled={!disposition || saveDispositionMutation.isPending}
                        size="lg"
                        data-testid="button-save-disposition"
                      >
                        {saveDispositionMutation.isPending ? 'Saving...' : 'Save Disposition & Next Contact'}
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {/* Call Duration Display */}
                  {callDuration > 0 && (
                    <div className="text-sm text-muted-foreground">
                      Call duration: {Math.floor(callDuration / 60)}:{(callDuration % 60).toString().padStart(2, '0')}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
