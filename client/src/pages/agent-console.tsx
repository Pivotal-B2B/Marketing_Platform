import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff,
  Clock,
  User,
  Building2,
  FileText,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  Mail,
  Briefcase,
  Zap,
  CheckCircle2,
  ExternalLink,
  Linkedin,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTelnyxWebRTC } from "@/hooks/useTelnyxWebRTC";
import { useAuth } from "@/contexts/AuthContext";
import type { CallState } from "@/hooks/useTelnyxWebRTC";
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { QueueControls } from "@/components/queue-controls";

// Backwards compatibility type alias
type CallStatus = CallState | 'wrap-up';

// Helper function to validate and normalize phone number to E.164
function normalizePhoneToE164(phone: string | null, country: string = 'US'): string | null {
  if (!phone) return null;
  
  try {
    const phoneNumber = parsePhoneNumberFromString(phone, country as any);
    if (phoneNumber && phoneNumber.isValid()) {
      return phoneNumber.number;
    }
  } catch (error) {
    console.error('Phone normalization error:', error);
  }
  
  return null;
}

// Contact type with additional fields
type Contact = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  email: string;
  directPhone: string | null;
  mobilePhone: string | null;
  jobTitle: string | null;
  accountId: string | null;
  account?: {
    id: string;
    name: string;
    mainPhone: string | null;
  } | null;
};

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
  type?: 'email' | 'call' | 'combo';
};

export default function AgentConsolePage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [currentContactIndex, setCurrentContactIndex] = useState(0);
  const [selectedPhoneType, setSelectedPhoneType] = useState<'direct' | 'company' | 'manual'>('direct');
  const [manualPhoneNumber, setManualPhoneNumber] = useState<string>('');
  const [showManualDial, setShowManualDial] = useState(false);
  
  // Disposition form state
  const [disposition, setDisposition] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [qualificationData, setQualificationData] = useState<any>({});
  const [dispositionSaved, setDispositionSaved] = useState(false);
  const [callMadeToContact, setCallMadeToContact] = useState(false);

  // Fetch SIP trunk credentials
  const { data: sipConfig } = useQuery<{
    sipUsername: string; 
    sipPassword: string; 
    sipDomain?: string;
    callerIdNumber?: string;
  }>({
    queryKey: ['/api/sip-trunks/default'],
  });

  // Initialize Telnyx WebRTC
  const {
    callState,
    isConnected,
    isMuted,
    callDuration,
    lastError,
    formatDuration,
    makeCall,
    hangup,
    toggleMute,
  } = useTelnyxWebRTC({
    sipUsername: sipConfig?.sipUsername,
    sipPassword: sipConfig?.sipPassword,
    sipDomain: sipConfig?.sipDomain || 'sip.telnyx.com',
    onCallStateChange: (state) => {
      if (state === 'hangup') {
        setCallStatus('wrap-up');
      } else {
        setCallStatus(state as CallStatus);
      }
    },
    onCallEnd: () => {
      setCallStatus('wrap-up');
    },
  });

  // Fetch agent queue data
  const { data: queueData = [], isLoading: queueLoading, refetch: refetchQueue } = useQuery<QueueItem[]>({
    queryKey: selectedCampaignId 
      ? [`/api/agents/me/queue?campaignId=${selectedCampaignId}&status=queued`]
      : ['/api/agents/me/queue?status=queued'],
    enabled: !!selectedCampaignId,
  });

  // Fetch contact details for current contact
  const currentQueueItem = queueData[currentContactIndex];
  const { data: contactDetails } = useQuery<Contact>({
    queryKey: currentQueueItem ? [`/api/contacts/${currentQueueItem.contactId}`] : [],
    enabled: !!currentQueueItem?.contactId,
  });

  // Compute valid phone options
  const validPhoneOptions = useMemo(() => {
    if (!contactDetails) return [];
    
    const options: Array<{ type: 'direct' | 'company' | 'manual'; number: string; label: string }> = [];
    
    if (contactDetails.directPhone && normalizePhoneToE164(contactDetails.directPhone)) {
      options.push({
        type: 'direct',
        number: contactDetails.directPhone,
        label: `Direct: ${contactDetails.directPhone}`
      });
    }
    
    if (contactDetails.account?.mainPhone && normalizePhoneToE164(contactDetails.account.mainPhone)) {
      options.push({
        type: 'company',
        number: contactDetails.account.mainPhone,
        label: `Company: ${contactDetails.account.mainPhone}`
      });
    }
    
    return options;
  }, [contactDetails]);

  // Auto-select first valid phone number when contact changes
  useEffect(() => {
    if (validPhoneOptions.length > 0) {
      setSelectedPhoneType(validPhoneOptions[0].type);
      setShowManualDial(false);
      setManualPhoneNumber('');
    } else {
      setSelectedPhoneType('manual');
      setShowManualDial(true);
    }
  }, [validPhoneOptions]);

  // Fetch campaign details
  const { data: campaignDetails } = useQuery<{
    id: string;
    name: string;
    dialMode?: 'manual' | 'power';
    callScript?: string;
    qualificationQuestions?: Array<{
      id: string;
      label: string;
      type: 'select' | 'text' | 'number';
      options?: Array<{ value: string; label: string }>;
      required?: boolean;
    }>;
    powerSettings?: {
      amd?: {
        enabled: boolean;
        confidenceThreshold: number;
      };
      voicemailPolicy?: {
        enabled: boolean;
      };
    };
  }>({
    queryKey: selectedCampaignId ? [`/api/campaigns/${selectedCampaignId}`] : [],
    enabled: !!selectedCampaignId,
  });

  const dialMode = campaignDetails?.dialMode || 'manual';
  const amdEnabled = campaignDetails?.powerSettings?.amd?.enabled ?? false;

  // Get agent's assigned campaigns
  const { data: agentAssignments = [] } = useQuery<Array<{ campaignId: string; campaignName: string }>>({
    queryKey: ['/api/campaigns/agent-assignments'],
  });

  const campaigns: Campaign[] = agentAssignments.length > 0 
    ? agentAssignments.map(a => ({ id: a.campaignId, name: a.campaignName }))
    : Array.from(
        new Map(queueData.map(item => [item.campaignId, { id: item.campaignId, name: item.campaignName }])).values()
      );

  // Auto-select first campaign
  useEffect(() => {
    if (campaigns.length > 0 && !selectedCampaignId) {
      setSelectedCampaignId(campaigns[0].id);
    }
  }, [campaigns, selectedCampaignId]);

  // Reset index when queue changes
  useEffect(() => {
    setCurrentContactIndex(0);
  }, [queueData]);
  
  // Reset state when contact changes
  useEffect(() => {
    setDispositionSaved(false);
    setCallMadeToContact(false);
    setDisposition('');
    setNotes('');
    setQualificationData({});
  }, [currentQueueItem?.id]);

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
      
      setDispositionSaved(true);
      setDisposition('');
      setNotes('');
      setQualificationData({});
      setCallStatus('idle');
      
      handleNextContact();
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
    if (!isConnected) {
      toast({
        title: "Not connected",
        description: "WebRTC client is not connected. Please wait...",
        variant: "destructive",
      });
      return;
    }

    let phoneNumber: string | null = null;
    let phoneLabel = '';

    if (selectedPhoneType === 'manual') {
      phoneNumber = manualPhoneNumber.trim();
      phoneLabel = 'Manual Number';
      
      if (!phoneNumber) {
        toast({
          title: "No phone number",
          description: "Please enter a phone number to dial",
          variant: "destructive",
        });
        return;
      }
    } else if (selectedPhoneType === 'direct') {
      phoneNumber = contactDetails?.directPhone || null;
      phoneLabel = 'Direct Phone';
    } else if (selectedPhoneType === 'company') {
      phoneNumber = contactDetails?.account?.mainPhone || null;
      phoneLabel = 'Company Phone';
    }

    if (!phoneNumber) {
      toast({
        title: "No phone number",
        description: `This contact doesn't have a ${phoneLabel.toLowerCase()}`,
        variant: "destructive",
      });
      return;
    }

    const e164Phone = normalizePhoneToE164(phoneNumber);
    
    if (!e164Phone) {
      toast({
        title: "Invalid phone number",
        description: `${phoneLabel} "${phoneNumber}" is not a valid phone number`,
        variant: "destructive",
      });
      return;
    }

    if (selectedPhoneType === 'manual') {
      const manualDialNote = `[Manual Dial: ${phoneNumber}]`;
      setNotes(prev => prev ? `${prev}\n${manualDialNote}` : manualDialNote);
    }
    
    makeCall(e164Phone, sipConfig?.callerIdNumber);
    setCallMadeToContact(true);
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

    if (!currentQueueItem) {
      toast({
        title: "Error",
        description: "No contact selected",
        variant: "destructive",
      });
      return;
    }

    hangup();

    saveDispositionMutation.mutate({
      queueItemId: currentQueueItem.id,
      campaignId: currentQueueItem.campaignId,
      contactId: currentQueueItem.contactId,
      disposition,
      duration: callDuration,
      notes,
      qualificationData: Object.keys(qualificationData).length > 0 ? qualificationData : null,
      callbackRequested: disposition === 'callback_requested',
    });
  };

  const handleNextContact = () => {
    if (currentContactIndex < queueData.length - 1) {
      setCurrentContactIndex(currentContactIndex + 1);
    }
  };

  const handlePreviousContact = () => {
    if (currentContactIndex > 0) {
      setCurrentContactIndex(currentContactIndex - 1);
    }
  };

  const isCallActive = ['connecting', 'ringing', 'active', 'held'].includes(callStatus);

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

  const queueProgress = queueData.length > 0 ? ((currentContactIndex + 1) / queueData.length) * 100 : 0;

  return (
    <div className="h-screen flex flex-col" style={{ background: 'linear-gradient(to bottom, #e9f0f7 0%, #ffffff 100%)' }}>
      {/* TOP FIXED HEADER */}
      <div className="h-20 border-b shadow-sm" style={{ background: 'linear-gradient(to right, #0a2540, #1a4d7a, #2f6feb)' }}>
        <div className="h-full px-6 flex items-center justify-between">
          {/* Left: Title & Queue Management */}
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-white font-semibold text-lg" data-testid="text-page-title">Agent Console</h1>
              <p className="text-white/70 text-xs">
                {campaignDetails?.name || 'Select a campaign'}
              </p>
            </div>
            
            {campaignDetails && dialMode === 'manual' && selectedCampaignId && (
              <>
                <Separator orientation="vertical" className="h-8 bg-white/20" />
                <QueueControls 
                  campaignId={selectedCampaignId}
                  compact={true}
                  onQueueUpdated={() => {
                    refetchQueue();
                    toast({
                      title: "Queue Updated",
                      description: "Your queue has been refreshed",
                    });
                  }}
                />
              </>
            )}
          </div>

          {/* Center: Queue Progress */}
          <div className="flex-1 max-w-md mx-8">
            <div className="text-center mb-1">
              <span className="text-white text-sm font-medium">
                Contact {currentContactIndex + 1} of {queueData.length}
              </span>
            </div>
            <Progress value={queueProgress} className="h-2 bg-white/20" />
          </div>

          {/* Right: Status & Controls */}
          <div className="flex items-center gap-3">
            <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
              <SelectTrigger className="w-[200px] bg-white/10 text-white border-white/20" data-testid="select-campaign">
                <SelectValue placeholder="Select campaign" />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map(campaign => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {campaignDetails && dialMode && (
              <Badge variant={dialMode === 'power' ? 'default' : 'secondary'} className="gap-1" data-testid="badge-dial-mode">
                {dialMode === 'power' ? <Zap className="h-3 w-3" /> : <Phone className="h-3 w-3" />}
                {dialMode === 'power' ? 'Power' : 'Manual'}
              </Badge>
            )}
            
            {campaignDetails && dialMode === 'power' && amdEnabled && (
              <Badge variant="outline" className="gap-1 bg-white/10 text-white border-white/20" data-testid="badge-amd-enabled">
                <CheckCircle2 className="h-3 w-3" />
                AMD
              </Badge>
            )}
            
            {callStatus === 'active' && (
              <div className="flex items-center gap-2 text-white">
                <Clock className="h-4 w-4" />
                <span className="font-mono text-sm" data-testid="text-call-duration">{formatDuration()}</span>
              </div>
            )}
            
            {getStatusBadge()}
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetchQueue()}
              className="text-white hover:bg-white/10"
              data-testid="button-refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* MAIN BODY GRID */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT SIDEBAR: Queue (18% width) */}
        <div className="w-[18%] border-r bg-[#f9fbfd] flex flex-col">
          <div className="p-4 border-b bg-white">
            <h2 className="font-semibold text-sm mb-3">Queue</h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousContact}
                disabled={currentContactIndex === 0 || queueData.length === 0}
                className="flex-1"
                data-testid="button-previous-contact"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextContact}
                disabled={
                  currentContactIndex >= queueData.length - 1 || 
                  queueData.length === 0 ||
                  (callMadeToContact && !dispositionSaved)
                }
                className="flex-1"
                data-testid="button-next-contact"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Queue List - No scrolling, fits viewport */}
          <div className="flex-1 p-2 space-y-1 min-h-0">
            {queueLoading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Loading...</p>
              </div>
            ) : queueData.length === 0 ? (
              <div className="text-center py-8 px-2">
                <Phone className="h-8 w-8 mx-auto mb-2 opacity-50 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">No contacts in queue</p>
              </div>
            ) : (
              <>
                <div className="text-[10px] text-muted-foreground px-2 mb-2">
                  Showing {Math.min(queueData.length, 15)} of {queueData.length} contacts
                </div>
                {queueData.slice(0, 15).map((item, index) => (
                  <button
                    key={item.id}
                    onClick={() => setCurrentContactIndex(index)}
                    className={`
                      w-full text-left p-2 rounded hover-elevate active-elevate-2 transition-all
                      ${index === currentContactIndex ? 'bg-primary/10 border border-primary/20' : 'bg-white border border-transparent'}
                    `}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${
                        index === currentContactIndex ? 'bg-green-500' : 'bg-gray-300'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{item.contactName}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{item.accountName}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>

          {/* Device Controls */}
          <div className="p-3 border-t bg-white space-y-2">
            <p className="text-xs text-muted-foreground mb-2">Audio Controls</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleMute}
                disabled={!isCallActive}
                className="flex-1"
                data-testid="button-mute"
              >
                {isMuted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
              </Button>
            </div>
          </div>
        </div>

        {/* RIGHT MAIN SECTION (82% width) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* CONTACT INFORMATION BAR (Horizontal) */}
          {currentQueueItem ? (
            <div className="h-[120px] border-b" style={{ background: 'linear-gradient(to right, #0a2540, #2f6feb)' }}>
              <div className="h-full px-6 py-4 flex items-center justify-between text-white">
                {/* Left: Profile */}
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                    <User className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold mb-1" data-testid="text-contact-name">
                      {currentQueueItem.contactName || 'Unknown Contact'}
                    </h2>
                    <div className="flex items-center gap-3 text-sm text-white/80">
                      {contactDetails?.jobTitle && (
                        <>
                          <div className="flex items-center gap-1">
                            <Briefcase className="h-3 w-3" />
                            <span data-testid="text-contact-title">{contactDetails.jobTitle}</span>
                          </div>
                          <span>•</span>
                        </>
                      )}
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        <span data-testid="text-contact-company">{currentQueueItem.accountName || 'No company'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Center: Contact Details */}
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate max-w-xs" data-testid="text-contact-email">
                      {currentQueueItem.contactEmail || contactDetails?.email || 'No email'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 flex-shrink-0" />
                    <Select value={selectedPhoneType} onValueChange={(value: 'direct' | 'company' | 'manual') => {
                      setSelectedPhoneType(value);
                      setShowManualDial(value === 'manual');
                    }}>
                      <SelectTrigger className="h-7 bg-white/10 text-white border-white/20 text-xs w-[180px]" data-testid="select-phone-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {validPhoneOptions.map((option) => (
                          <SelectItem key={option.type} value={option.type} data-testid={`option-${option.type}-phone`}>
                            {option.label}
                          </SelectItem>
                        ))}
                        <SelectItem value="manual" data-testid="option-manual-dial">
                          Manual Dial
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {showManualDial && (
                    <input
                      type="tel"
                      className="h-7 px-2 rounded bg-white/10 border border-white/20 text-white text-xs placeholder:text-white/50"
                      placeholder="Enter phone number"
                      value={manualPhoneNumber}
                      onChange={(e) => setManualPhoneNumber(e.target.value)}
                      data-testid="input-manual-phone"
                    />
                  )}
                  <div className="flex items-center gap-2 text-xs">
                    <span>Campaign:</span>
                    <Badge variant="secondary" className="text-xs">{currentQueueItem.campaignName}</Badge>
                    <Badge variant={currentQueueItem.priority >= 3 ? 'destructive' : 'default'} className="text-xs">
                      Priority {currentQueueItem.priority}
                    </Badge>
                  </div>
                </div>

                {/* Right: Call Actions */}
                <div className="flex flex-col gap-2">
                  {!isCallActive && callStatus !== 'wrap-up' && (
                    <Button
                      size="lg"
                      className="h-14 w-32 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold"
                      onClick={handleDial}
                      disabled={!currentQueueItem}
                      data-testid="button-dial"
                    >
                      <Phone className="h-5 w-5 mr-2" />
                      Call
                    </Button>
                  )}

                  {isCallActive && (
                    <Button
                      size="lg"
                      variant="destructive"
                      className="h-14 w-32 rounded-lg font-semibold"
                      onClick={handleHangup}
                      data-testid="button-hangup"
                    >
                      <PhoneOff className="h-5 w-5 mr-2" />
                      Hang Up
                    </Button>
                  )}

                  {callStatus === 'wrap-up' && (
                    <div className="text-xs text-white/80 text-center">Complete disposition below</div>
                  )}

                  <div className="flex gap-2 mt-1">
                    {contactDetails?.account?.id && (
                      <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 text-xs h-7">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[120px] border-b bg-muted/30 flex items-center justify-center">
              <div className="text-center">
                <Phone className="h-12 w-12 mx-auto mb-2 opacity-50 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No contact selected</p>
              </div>
            </div>
          )}

          {/* BOTTOM SPLIT: Script (70%) | Dispositions (30%) - No scrolling */}
          <div className="flex-1 flex overflow-hidden min-h-0">
            {/* LEFT: SCRIPT PANEL (70%) */}
            <div className="w-[70%] border-r p-4" style={{ background: '#f7fafd' }}>
              <Card className="border-2 border-primary/20 shadow-md h-full flex flex-col">
                <CardHeader className="pb-2 bg-gradient-to-r from-primary/5 to-transparent flex-shrink-0">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4 text-primary" />
                    Call Script
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 min-h-0 pt-3">
                  {campaignDetails?.callScript ? (
                    <div className="p-4 bg-white rounded-lg border h-full">
                      <p className="text-sm leading-relaxed line-clamp-[20]">
                        {campaignDetails.callScript
                          .replace(/\[Contact Name\]/gi, currentQueueItem?.contactName || '[Contact Name]')
                          .replace(/\[Company Name\]/gi, currentQueueItem?.accountName || '[Company Name]')
                        }
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 h-full flex flex-col justify-center">
                      <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                        <p className="text-sm leading-relaxed">
                          "Hello, this is [Your Name] calling from Pivotal CRM. May I speak with{' '}
                          <span className="font-semibold text-primary">
                            {currentQueueItem?.contactName || '[Contact Name]'}
                          </span>?"
                        </p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 rounded-lg border border-purple-200/50 dark:border-purple-800/50">
                        <p className="text-sm leading-relaxed">
                          "I'm calling to discuss how our B2B solutions can help{' '}
                          <span className="font-semibold text-primary">
                            {currentQueueItem?.accountName || '[Company Name]'}
                          </span>{' '}
                          streamline their customer engagement..."
                        </p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 rounded-lg border border-green-200/50 dark:border-green-800/50">
                        <p className="text-sm leading-relaxed">
                          "We specialize in Account-Based Marketing. Do you have a few minutes to discuss your marketing challenges?"
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* RIGHT: DISPOSITIONS PANEL (30%) */}
            <div className="w-[30%] p-3 bg-background min-h-0">
              <div className="p-4 space-y-4">
                {/* Call Notes */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Call Notes</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-3">
                    <Textarea
                      className="min-h-[80px] resize-none text-sm"
                      placeholder="Brief notes..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      data-testid="input-call-notes"
                    />
                  </CardContent>
                </Card>

                {/* Disposition */}
                <Card className={callStatus === 'wrap-up' ? 'border-2 border-primary shadow-lg' : ''}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      Disposition {callStatus === 'wrap-up' && <span className="text-destructive">*</span>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="disposition" className="text-xs">Outcome {callStatus === 'wrap-up' && '*'}</Label>
                      <Select value={disposition} onValueChange={setDisposition}>
                        <SelectTrigger id="disposition" className="h-9" data-testid="select-disposition">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="qualified">✅ Qualified</SelectItem>
                          <SelectItem value="callback_requested">📞 Callback</SelectItem>
                          <SelectItem value="not_interested">❌ Not Interested</SelectItem>
                          <SelectItem value="voicemail">📧 Voicemail</SelectItem>
                          <SelectItem value="no_answer">📵 No Answer</SelectItem>
                          <SelectItem value="busy">⏰ Busy</SelectItem>
                          <SelectItem value="dnc_request">🚫 DNC</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Qualification Questions */}
                    {campaignDetails?.qualificationQuestions && campaignDetails.qualificationQuestions.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">Qualification</Label>
                        <div className="space-y-2">
                          {campaignDetails.qualificationQuestions.map((question) => (
                            <div key={question.id} className="space-y-1">
                              <Label htmlFor={question.id} className="text-xs">
                                {question.label}
                                {question.required && <span className="text-destructive ml-1">*</span>}
                              </Label>
                              {question.type === 'select' && question.options ? (
                                <Select
                                  value={qualificationData[question.id] || ''}
                                  onValueChange={(value) => setQualificationData({...qualificationData, [question.id]: value})}
                                >
                                  <SelectTrigger id={question.id} className="h-8 text-xs" data-testid={`select-qual-${question.id}`}>
                                    <SelectValue placeholder="Select..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {question.options.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : question.type === 'text' ? (
                                <Textarea
                                  id={question.id}
                                  value={qualificationData[question.id] || ''}
                                  onChange={(e) => setQualificationData({...qualificationData, [question.id]: e.target.value})}
                                  placeholder={`Enter ${question.label.toLowerCase()}...`}
                                  className="min-h-[50px] resize-none text-xs"
                                  data-testid={`input-qual-${question.id}`}
                                />
                              ) : (
                                <input
                                  type="number"
                                  id={question.id}
                                  value={qualificationData[question.id] || ''}
                                  onChange={(e) => setQualificationData({...qualificationData, [question.id]: e.target.value})}
                                  placeholder={`Enter ${question.label.toLowerCase()}...`}
                                  className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                  data-testid={`input-qual-${question.id}`}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Save Button */}
                    {(callStatus === 'wrap-up' || disposition) && (
                      <Button
                        onClick={handleSaveDisposition}
                        disabled={!disposition || saveDispositionMutation.isPending || !currentQueueItem}
                        size="lg"
                        className="w-full"
                        data-testid="button-save-disposition"
                      >
                        {saveDispositionMutation.isPending ? 'Saving...' : 'Save & Next'}
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}

                    {callDuration > 0 && (
                      <div className="text-sm text-muted-foreground">
                        Call duration: {Math.floor(callDuration / 60)}:{(callDuration % 60).toString().padStart(2, '0')}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden audio element for Telnyx */}
      <audio id="remoteAudio" autoPlay playsInline style={{ display: 'none' }} />
    </div>
  );
}
