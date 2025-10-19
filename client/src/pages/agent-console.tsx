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
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-purple-50/30 to-blue-50">
      {/* TOP FIXED HEADER - Premium Gradient Design */}
      <div className="h-20 border-b shadow-2xl relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)' }}>
        {/* Decorative overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0"></div>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent"></div>
        <div className="relative h-full px-6 flex items-center justify-between">
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
        {/* LEFT SIDEBAR: Queue (18% width) - Modern Glass Design */}
        <div className="w-[18%] border-r flex flex-col bg-gradient-to-b from-purple-50/50 to-white">
          <div className="p-4 border-b relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)' }}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
            <div className="relative">
              <h2 className="font-bold text-sm mb-3 text-white flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <Phone className="h-3.5 w-3.5 text-white" />
                </div>
                Queue
              </h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousContact}
                  disabled={currentContactIndex === 0 || queueData.length === 0 || (callMadeToContact && !dispositionSaved)}
                  className="flex-1 bg-white hover:bg-white/95 border-0 text-purple-900 font-medium shadow-lg hover:shadow-xl transition-all"
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
                  className="flex-1 bg-white hover:bg-white/95 border-0 text-purple-900 font-medium shadow-lg hover:shadow-xl transition-all"
                  data-testid="button-next-contact"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
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
                {queueData.slice(0, 15).map((item, index) => {
                  const isDisabled = (callMadeToContact && !dispositionSaved) && index !== currentContactIndex;
                  const isActive = index === currentContactIndex;
                  return (
                    <button
                      key={item.id}
                      onClick={() => !isDisabled && setCurrentContactIndex(index)}
                      disabled={isDisabled}
                      className={`
                        w-full text-left p-3 rounded-xl transition-all relative overflow-hidden
                        ${isActive 
                          ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-2 border-purple-400 shadow-lg transform scale-105' 
                          : 'bg-white border-2 border-gray-100 hover:border-purple-200'}
                        ${isDisabled 
                          ? 'opacity-50 cursor-not-allowed' 
                          : 'hover:shadow-md cursor-pointer'}
                      `}
                      title={isDisabled ? 'Complete disposition before switching contacts' : ''}
                    >
                      {isActive && (
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10"></div>
                      )}
                      <div className="relative flex items-start gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 shadow-lg ${
                          isActive ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gray-300'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold truncate ${isActive ? 'text-purple-900' : 'text-gray-900'}`}>
                            {item.contactName}
                          </p>
                          <p className="text-[10px] text-gray-500 truncate">{item.accountName}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
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
          {/* CONTACT INFORMATION BAR - Premium Card Design */}
          {currentQueueItem ? (
            <div className="border-b relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%)' }}>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0"></div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500"></div>
              <div className="relative px-6 py-6 flex items-center gap-6 text-white">
                {/* Profile Picture - Enhanced */}
                <div className="relative">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-white/30 to-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0 shadow-2xl border border-white/20">
                    <User className="h-8 w-8 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-green-500 rounded-full border-2 border-white shadow-lg"></div>
                </div>

                {/* Contact Information - Organized Layout */}
                <div className="flex-1 flex flex-col gap-2">
                  {/* Contact Name */}
                  <h2 className="text-xl font-semibold" data-testid="text-contact-name">
                    {currentQueueItem.contactName || 'Unknown Contact'}
                  </h2>
                  
                  {/* Contact Details Grid */}
                  <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
                    {/* Job Title & Company */}
                    <div className="flex items-center gap-2 text-sm text-white/90">
                      <Briefcase className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate" data-testid="text-contact-title">
                        {contactDetails?.jobTitle || 'No title'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-white/90">
                      <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate" data-testid="text-contact-company">
                        {currentQueueItem.accountName || 'No company'}
                      </span>
                    </div>
                    
                    {/* Email & Phone */}
                    <div className="flex items-center gap-2 text-sm text-white/90">
                      <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate" data-testid="text-contact-email">
                        {currentQueueItem.contactEmail || contactDetails?.email || 'No email'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 flex-shrink-0 text-white/90" />
                      <Select value={selectedPhoneType} onValueChange={(value: 'direct' | 'company' | 'manual') => {
                        setSelectedPhoneType(value);
                        setShowManualDial(value === 'manual');
                      }}>
                        <SelectTrigger className="h-8 bg-white/10 text-white border-white/20 text-sm w-[200px]" data-testid="select-phone-type">
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
                    
                    {/* Manual Phone Input */}
                    {showManualDial && (
                      <div className="col-span-2 flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 flex-shrink-0 text-white/90" />
                        <input
                          type="tel"
                          className="h-8 px-3 rounded bg-white/10 border border-white/20 text-white text-sm placeholder:text-white/50 w-[200px]"
                          placeholder="Enter phone number"
                          value={manualPhoneNumber}
                          onChange={(e) => setManualPhoneNumber(e.target.value)}
                          data-testid="input-manual-phone"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Call Button - Premium Design */}
                <div className="flex items-center gap-2">
                  {!isCallActive && callStatus !== 'wrap-up' && (
                    <Button
                      size="lg"
                      className="h-16 w-36 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold shadow-2xl transform hover:scale-105 transition-all border-2 border-white/30"
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
                      className="h-16 w-36 rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-bold shadow-2xl transform hover:scale-105 transition-all border-2 border-white/30"
                      onClick={handleHangup}
                      data-testid="button-hangup"
                    >
                      <PhoneOff className="h-5 w-5 mr-2" />
                      Hang Up
                    </Button>
                  )}

                  {callStatus === 'wrap-up' && (
                    <div className="h-16 w-36 flex items-center justify-center text-sm text-white font-medium text-center bg-white/20 backdrop-blur-sm rounded-2xl border-2 border-white/30 shadow-xl">
                      Complete disposition below
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="border-b bg-muted/30 py-6 flex items-center justify-center">
              <div className="text-center">
                <Phone className="h-10 w-10 mx-auto mb-2 opacity-50 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No contact selected</p>
              </div>
            </div>
          )}

          {/* BOTTOM SPLIT: Script (70%) | Dispositions (30%) - Premium Design */}
          <div className="flex-1 flex overflow-hidden min-h-0">
            {/* LEFT: SCRIPT PANEL (70%) - Enhanced Card */}
            <div className="w-[70%] border-r p-4 bg-gradient-to-br from-indigo-50/50 via-purple-50/30 to-pink-50/20">
              <Card className="border-0 shadow-2xl h-full flex flex-col bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-3 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border-b border-purple-100 flex-shrink-0">
                  <CardTitle className="flex items-center gap-3 text-base">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                      <FileText className="h-4 w-4 text-white" />
                    </div>
                    <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent font-bold">Call Script</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 min-h-0 pt-3">
                  {campaignDetails?.callScript ? (
                    <div className="p-5 bg-gradient-to-br from-white to-purple-50/30 rounded-xl border-2 border-purple-100 shadow-inner h-full">
                      <p className="text-sm leading-relaxed line-clamp-[20] text-gray-700">
                        {campaignDetails.callScript
                          .replace(/\[Contact Name\]/gi, currentQueueItem?.contactName || '[Contact Name]')
                          .replace(/\[Company Name\]/gi, currentQueueItem?.accountName || '[Company Name]')
                        }
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 h-full flex flex-col justify-center">
                      <div className="p-5 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-xl border-2 border-blue-200 shadow-lg backdrop-blur-sm">
                        <p className="text-sm leading-relaxed text-gray-700">
                          "Hello, this is [Your Name] calling from Pivotal CRM. May I speak with{' '}
                          <span className="font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            {currentQueueItem?.contactName || '[Contact Name]'}
                          </span>?"
                        </p>
                      </div>
                      <div className="p-5 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl border-2 border-purple-200 shadow-lg backdrop-blur-sm">
                        <p className="text-sm leading-relaxed text-gray-700">
                          "I'm calling to discuss how our B2B solutions can help{' '}
                          <span className="font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                            {currentQueueItem?.accountName || '[Company Name]'}
                          </span>{' '}
                          streamline their customer engagement..."
                        </p>
                      </div>
                      <div className="p-5 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-xl border-2 border-emerald-200 shadow-lg backdrop-blur-sm">
                        <p className="text-sm leading-relaxed text-gray-700">
                          "We specialize in Account-Based Marketing. Do you have a few minutes to discuss your marketing challenges?"
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* RIGHT: DISPOSITIONS PANEL (30%) - Premium Cards */}
            <div className="w-[30%] p-3 bg-gradient-to-br from-slate-50 to-gray-50 min-h-0">
              <div className="p-4 space-y-4">
                {/* Call Notes - Enhanced */}
                <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
                  <CardHeader className="pb-2 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-b border-blue-100">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                        <FileText className="h-3 w-3 text-white" />
                      </div>
                      Call Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-3">
                    <Textarea
                      className="min-h-[80px] resize-none text-sm border-2 border-blue-100 focus:border-blue-300 rounded-lg"
                      placeholder="Brief notes..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      data-testid="input-call-notes"
                    />
                  </CardContent>
                </Card>

                {/* Disposition - Premium Design */}
                <Card className={`border-0 shadow-xl bg-white/90 backdrop-blur-sm ${callStatus === 'wrap-up' ? 'ring-4 ring-purple-400 ring-offset-2' : ''}`}>
                  <CardHeader className="pb-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-b border-purple-100">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                        <CheckCircle2 className="h-3 w-3 text-white" />
                      </div>
                      Disposition {callStatus === 'wrap-up' && <span className="text-red-500">*</span>}
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

                    {/* Save Button - Premium Design */}
                    {(callStatus === 'wrap-up' || disposition) && (
                      <Button
                        onClick={handleSaveDisposition}
                        disabled={!disposition || saveDispositionMutation.isPending || !currentQueueItem}
                        size="lg"
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all rounded-xl border-2 border-white/20"
                        data-testid="button-save-disposition"
                      >
                        {saveDispositionMutation.isPending ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            Save & Next
                            <ChevronRight className="ml-2 h-4 w-4" />
                          </>
                        )}
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
