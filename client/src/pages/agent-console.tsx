import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff,
  Settings,
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
  Volume2,
  CheckCircle2,
  XCircle,
  Filter,
  Plus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTelnyxWebRTC } from "@/hooks/useTelnyxWebRTC";
import { useAuth } from "@/contexts/AuthContext";
import type { CallState } from "@/hooks/useTelnyxWebRTC";
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { FilterBuilder } from "@/components/filter-builder";
import type { FilterGroup } from "@shared/filter-types";

// Backwards compatibility type alias
type CallStatus = CallState | 'wrap-up';

// Helper function to validate and normalize phone number to E.164
function normalizePhoneToE164(phone: string | null, country: string = 'US'): string | null {
  if (!phone) return null;
  
  // Try to parse with libphonenumber-js
  try {
    const phoneNumber = parsePhoneNumberFromString(phone, country as any);
    if (phoneNumber && phoneNumber.isValid()) {
      return phoneNumber.number; // Returns E.164 format
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
  
  // Manual queue filter state
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [filterGroup, setFilterGroup] = useState<FilterGroup | undefined>();
  const [priorityLevel, setPriorityLevel] = useState<number>(1);
  
  // Debug: Log filterGroup changes
  useEffect(() => {
    console.log('[Agent Console] filterGroup updated:', filterGroup);
  }, [filterGroup]);

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

  // Fetch agent queue data - filter by selected campaign if one is chosen
  const { data: queueData = [], isLoading: queueLoading, refetch: refetchQueue } = useQuery<QueueItem[]>({
    queryKey: selectedCampaignId 
      ? [`/api/agents/me/queue?campaignId=${selectedCampaignId}&status=queued`]
      : ['/api/agents/me/queue?status=queued'],
    enabled: !!selectedCampaignId, // Only fetch when a campaign is selected
  });

  // Fetch contact details for current contact
  const currentQueueItem = queueData[currentContactIndex];
  const { data: contactDetails } = useQuery<Contact>({
    queryKey: currentQueueItem ? [`/api/contacts/${currentQueueItem.contactId}`] : [],
    enabled: !!currentQueueItem?.contactId,
  });

  // Compute valid phone options (Priority: Direct → Company)
  // Mobile numbers kept in records for identification only, not for calling
  const validPhoneOptions = useMemo(() => {
    if (!contactDetails) return [];
    
    const options: Array<{ type: 'direct' | 'company' | 'manual'; number: string; label: string }> = [];
    
    // Priority 1: Direct phone (primary calling method)
    if (contactDetails.directPhone && normalizePhoneToE164(contactDetails.directPhone)) {
      options.push({
        type: 'direct',
        number: contactDetails.directPhone,
        label: `Direct: ${contactDetails.directPhone}`
      });
    }
    
    // Priority 2: Company phone (secondary option if needed)
    if (contactDetails.account?.mainPhone && normalizePhoneToE164(contactDetails.account.mainPhone)) {
      options.push({
        type: 'company',
        number: contactDetails.account.mainPhone,
        label: `Company: ${contactDetails.account.mainPhone}`
      });
    }
    
    // Note: Mobile numbers are kept in records for identification only
    
    return options;
  }, [contactDetails]);

  // Auto-select first valid phone number when contact changes
  useEffect(() => {
    if (validPhoneOptions.length > 0) {
      setSelectedPhoneType(validPhoneOptions[0].type);
      setShowManualDial(false);
      setManualPhoneNumber('');
    } else {
      // No valid numbers, show manual dial option
      setSelectedPhoneType('manual');
      setShowManualDial(true);
    }
  }, [validPhoneOptions]);

  // Fetch campaign details for qualification questions and dial mode
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

  // Fetch campaigns where the agent is assigned
  const { data: assignedCampaigns = [] } = useQuery<Campaign[]>({
    queryKey: ['/api/campaigns'],
    select: (campaigns) => {
      // This will be filtered by the backend based on agent assignments
      return campaigns.filter(c => c.type === 'call');
    }
  });

  // Get agent's assigned campaigns
  const { data: agentAssignments = [] } = useQuery<Array<{ campaignId: string; campaignName: string }>>({
    queryKey: ['/api/campaigns/agent-assignments'],
  });

  // Use assigned campaigns if available, otherwise extract from queue data
  const campaigns: Campaign[] = agentAssignments.length > 0 
    ? agentAssignments.map(a => ({ id: a.campaignId, name: a.campaignName }))
    : Array.from(
        new Map(queueData.map(item => [item.campaignId, { id: item.campaignId, name: item.campaignName }])).values()
      );

  // Auto-select first campaign when campaigns load
  useEffect(() => {
    if (campaigns.length > 0 && !selectedCampaignId) {
      setSelectedCampaignId(campaigns[0].id);
    }
  }, [campaigns, selectedCampaignId]);

  // Reset index when queue data changes
  useEffect(() => {
    setCurrentContactIndex(0);
  }, [queueData]);
  
  // Reset all contact-specific state when the active queue item changes
  useEffect(() => {
    setDispositionSaved(false);
    setCallMadeToContact(false);
    setDisposition('');
    setNotes('');
    setQualificationData({});
  }, [currentQueueItem?.id]); // Key on queue item ID, not index

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
      
      // Mark disposition as saved BEFORE resetting form
      setDispositionSaved(true);
      
      // Reset form
      setDisposition('');
      setNotes('');
      setQualificationData({});
      setCallStatus('idle');
      
      // Move to next contact
      handleNextContact();
      
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

  // Mutation for adding contacts to manual queue
  const addToQueueMutation = useMutation({
    mutationFn: async ({ filters, priority }: { filters: FilterGroup; priority: number }) => {
      if (!selectedCampaignId) throw new Error("No campaign selected");
      if (!user?.id) throw new Error("Agent ID not found");
      
      return await apiRequest('POST', `/api/campaigns/${selectedCampaignId}/manual/queue/add`, {
        agentId: user.id,
        filters,
        priority
      });
    },
    onSuccess: (data: any) => {
      const { added = 0, skipped = 0 } = data;
      
      // Show appropriate toast based on results
      if (added === 0 && skipped > 0) {
        toast({
          title: "No contacts added",
          description: `${skipped} contact${skipped === 1 ? ' was' : 's were'} skipped (already assigned to agents or suppressed)`,
          variant: "destructive",
        });
      } else if (added > 0 && skipped > 0) {
        toast({
          title: "Contacts added to queue",
          description: `${added} contact${added === 1 ? '' : 's'} added. ${skipped} skipped (already assigned or suppressed)`,
        });
      } else if (added > 0) {
        toast({
          title: "Contacts added to queue",
          description: `${added} contact${added === 1 ? '' : 's'} added to your queue successfully.`,
        });
      } else {
        toast({
          title: "No contacts found",
          description: "No eligible contacts matched your filters.",
          variant: "destructive",
        });
      }
      
      // Reset filter dialog
      setShowFilterDialog(false);
      setFilterGroup(undefined);
      setPriorityLevel(1);
      
      // Refetch queue
      refetchQueue();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add contacts to queue",
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

    // Get phone number based on selected type
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

    // Validate and normalize phone number to E.164 format
    const e164Phone = normalizePhoneToE164(phoneNumber);
    
    if (!e164Phone) {
      toast({
        title: "Invalid phone number",
        description: `${phoneLabel} "${phoneNumber}" is not a valid phone number`,
        variant: "destructive",
      });
      return;
    }

    console.log(`Calling ${phoneLabel}: ${phoneNumber} → ${e164Phone}`);
    
    // If manual dial, append to notes for record keeping
    if (selectedPhoneType === 'manual') {
      const manualDialNote = `[Manual Dial: ${phoneNumber}]`;
      setNotes(prev => prev ? `${prev}\n${manualDialNote}` : manualDialNote);
    }
    
    makeCall(e164Phone, sipConfig?.callerIdNumber);
    setCallMadeToContact(true); // Track that a call was made to this contact
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

    // CRITICAL: Hang up the call immediately when disposition is submitted
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

  const handleAddToQueue = () => {
    if (!filterGroup || filterGroup.conditions.length === 0) {
      toast({
        title: "Filters required",
        description: "Please configure at least one filter condition.",
        variant: "destructive",
      });
      return;
    }

    addToQueueMutation.mutate({
      filters: filterGroup,
      priority: priorityLevel
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
              <SelectTrigger className="w-[250px]" data-testid="select-campaign">
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
              <Badge variant={dialMode === 'power' ? 'default' : 'outline'} className="gap-1" data-testid="badge-dial-mode">
                {dialMode === 'power' ? <Zap className="h-3 w-3" /> : <Phone className="h-3 w-3" />}
                {dialMode === 'power' ? 'Power Dial' : 'Manual Dial'}
              </Badge>
            )}
            {campaignDetails && dialMode === 'power' && amdEnabled && (
              <Badge variant="outline" className="gap-1" data-testid="badge-amd-enabled">
                <CheckCircle2 className="h-3 w-3" />
                AMD Enabled
              </Badge>
            )}
            {getStatusBadge()}
            
            {/* Filter Queue button - only show for manual dial campaigns */}
            {campaignDetails && dialMode === 'manual' && (
              <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="button-filter-queue">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter Queue
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Filter Your Calling Queue</DialogTitle>
                    <DialogDescription>
                      Refine your queue by filtering the campaign audience. Matching contacts will be added to your queue for prioritized calling.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Priority Level</Label>
                      <Select value={priorityLevel.toString()} onValueChange={(v) => setPriorityLevel(parseInt(v))}>
                        <SelectTrigger data-testid="select-priority">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Low Priority</SelectItem>
                          <SelectItem value="2">Normal Priority</SelectItem>
                          <SelectItem value="3">High Priority</SelectItem>
                          <SelectItem value="4">Urgent Priority</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-2">
                      <Label>Filter Contacts</Label>
                      <FilterBuilder
                        entityType="contact"
                        onApplyFilter={(filter) => {
                          console.log('[Agent Console] onApplyFilter called with:', filter);
                          setFilterGroup(filter);
                          console.log('[Agent Console] filterGroup will be set to:', filter);
                        }}
                        initialFilter={filterGroup}
                        includeRelatedEntities={true}
                      />
                    </div>
                    
                    {filterGroup && filterGroup.conditions.length > 0 && (
                      <div className="border rounded-lg p-4 bg-muted/50">
                        <p className="text-sm font-medium mb-2">Active Filters:</p>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">
                            Match <Badge variant="outline">{filterGroup.logic}</Badge> of {filterGroup.conditions.length} condition{filterGroup.conditions.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowFilterDialog(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleAddToQueue} 
                      disabled={!filterGroup || filterGroup.conditions.length === 0 || addToQueueMutation.isPending}
                      data-testid="button-confirm-add-to-queue"
                    >
                      {addToQueueMutation.isPending ? "Adding..." : "Add to Queue"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            
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

        {/* Error Details Alert */}
        {lastError && (
          <div className="bg-destructive/10 border-l-4 border-destructive p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h3 className="font-semibold text-sm text-destructive mb-1">WebRTC Connection Error</h3>
                <div className="text-xs space-y-1 font-mono">
                  <div className="flex gap-2">
                    <span className="text-muted-foreground">Code:</span>
                    <span className="text-destructive font-semibold" data-testid="text-error-code">{lastError.code || 'Unknown'}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-muted-foreground">Message:</span>
                    <span data-testid="text-error-message">{lastError.message}</span>
                  </div>
                  {lastError.sessionId && (
                    <div className="flex gap-2">
                      <span className="text-muted-foreground">Session:</span>
                      <span className="opacity-70" data-testid="text-error-session">{lastError.sessionId}</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <span className="text-muted-foreground">Time:</span>
                    <span className="opacity-70">{lastError.timestamp ? new Date(lastError.timestamp).toLocaleTimeString() : 'Unknown'}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Check browser console for full error details. Ensure SIP credentials are correct and Telnyx account is active.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT SIDEBAR: Contact Card & Softphone */}
        <div className="w-80 border-r bg-card flex flex-col">
          {/* Contact Navigation */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm">Current Contact</h2>
              <Badge variant="outline" className="text-xs">
                {currentContactIndex + 1} of {queueData.length}
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousContact}
                disabled={currentContactIndex === 0 || queueData.length === 0}
                className="flex-1"
                data-testid="button-previous-contact"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
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
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>

          {/* Contact Details Card */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {queueLoading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Loading queue...</p>
                </div>
              ) : !currentQueueItem ? (
                <div className="text-center py-8 space-y-3">
                  <Phone className="h-12 w-12 mx-auto mb-3 opacity-50 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">No contacts in queue</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {dialMode === 'manual' 
                        ? "Your queue will be populated when agents are assigned to this campaign"
                        : "Select a campaign with assigned contacts"}
                    </p>
                  </div>
                </div>
              ) : (
                <Card className="shadow-sm">
                  <CardHeader className="pb-3 bg-gradient-to-b from-primary/5 to-transparent">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3 shadow-sm">
                      <User className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-center text-base font-semibold" data-testid="text-contact-name">
                      {currentQueueItem.contactName || 'Unknown Contact'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm pt-4">
                    {/* Job Title */}
                    {contactDetails?.jobTitle && (
                      <div className="flex items-start gap-2">
                        <Briefcase className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">Title</p>
                          <p className="font-medium truncate" data-testid="text-contact-title">
                            {contactDetails.jobTitle}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Email */}
                    <div className="flex items-start gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Email</p>
                        <div className="overflow-x-auto scrollbar-thin max-w-full">
                          <p className="font-medium text-sm whitespace-nowrap" data-testid="text-contact-email">
                            {currentQueueItem.contactEmail || contactDetails?.email || 'No email'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Phone Numbers with Selector */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Select Phone Number</Label>
                      <Select value={selectedPhoneType} onValueChange={(value: 'direct' | 'company' | 'manual') => {
                        setSelectedPhoneType(value);
                        if (value === 'manual') {
                          setShowManualDial(true);
                        } else {
                          setShowManualDial(false);
                        }
                      }}>
                        <SelectTrigger data-testid="select-phone-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {validPhoneOptions.map((option) => (
                            <SelectItem 
                              key={option.type} 
                              value={option.type} 
                              data-testid={`option-${option.type}-phone`}
                            >
                              {option.label}
                            </SelectItem>
                          ))}
                          <SelectItem value="manual" data-testid="option-manual-dial">
                            📞 Manual Dial (External Number)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {/* Manual Dial Input */}
                      {showManualDial && (
                        <div className="space-y-1 pt-1">
                          <Label className="text-xs text-muted-foreground">Enter Phone Number</Label>
                          <input
                            type="tel"
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            placeholder="e.g., (555) 123-4567"
                            value={manualPhoneNumber}
                            onChange={(e) => setManualPhoneNumber(e.target.value)}
                            data-testid="input-manual-phone"
                          />
                          <p className="text-xs text-muted-foreground">
                            Will be recorded in call notes
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Company/Account */}
                    <div className="flex items-start gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Company</p>
                        <p className="font-medium text-sm" data-testid="text-contact-company">
                          {currentQueueItem.accountName || 'No company'}
                        </p>
                      </div>
                    </div>

                    <Separator />

                    {/* Campaign Info */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Campaign</p>
                      <Badge variant="outline" className="text-xs">
                        {currentQueueItem.campaignName}
                      </Badge>
                    </div>

                    {/* Priority */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Priority</p>
                      <Badge
                        variant={currentQueueItem.priority >= 3 ? 'destructive' : currentQueueItem.priority >= 2 ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        Priority {currentQueueItem.priority}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Softphone Controls */}
              {currentQueueItem && (
                <Card className="shadow-sm border-primary/20">
                  <CardHeader className="pb-3 bg-gradient-to-b from-primary/5 to-transparent">
                    <CardTitle className="text-sm font-semibold">Softphone</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-4">
                    {/* Call Duration */}
                    {callStatus === 'active' && (
                      <div className="text-center py-2">
                        <div className="flex items-center justify-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono text-base" data-testid="text-call-duration">
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
                          disabled={!currentQueueItem}
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
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* MAIN AREA: Script + Dispositions */}
        <div className="flex-1 flex flex-col bg-background overflow-hidden">
          <ScrollArea className="flex-1">
            <div className="max-w-4xl mx-auto p-6 space-y-6">
              {/* Call Script - Large and Centered */}
              <Card className="border-2 border-primary/20 shadow-md">
                <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-transparent">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <FileText className="h-5 w-5 text-primary" />
                      Call Script
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  {campaignDetails?.callScript ? (
                    <div className="p-5 bg-gradient-to-br from-muted/40 to-muted/20 rounded-lg border border-muted">
                      <p className="text-base leading-relaxed whitespace-pre-line">
                        {campaignDetails.callScript
                          .replace(/\[Contact Name\]/gi, currentQueueItem?.contactName || '[Contact Name]')
                          .replace(/\[Company Name\]/gi, currentQueueItem?.accountName || '[Company Name]')
                        }
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                        <p className="text-base leading-relaxed">
                          "Hello, this is [Your Name] calling from Pivotal CRM. May I speak with{' '}
                          <span className="font-semibold text-primary">
                            {currentQueueItem?.contactName || '[Contact Name]'}
                          </span>?"
                        </p>
                      </div>
                      <Separator />
                      <div className="p-5 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 rounded-lg border border-purple-200/50 dark:border-purple-800/50">
                        <p className="text-base leading-relaxed">
                          "I'm calling to discuss how our B2B solutions can help{' '}
                          <span className="font-semibold text-primary">
                            {currentQueueItem?.accountName || '[Company Name]'}
                          </span>{' '}
                          streamline their customer engagement and drive growth..."
                        </p>
                      </div>
                      <div className="p-5 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 rounded-lg border border-green-200/50 dark:border-green-800/50">
                        <p className="text-base leading-relaxed">
                          "We specialize in Account-Based Marketing and multi-channel campaign management. 
                          Do you have a few minutes to discuss your current marketing challenges?"
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Call Notes - Compact */}
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Call Notes</CardTitle>
                </CardHeader>
                <CardContent className="pt-3">
                  <Textarea
                    className="min-h-[50px] resize-none text-sm focus:ring-2 focus:ring-primary/20"
                    placeholder="Brief notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    data-testid="input-call-notes"
                  />
                </CardContent>
              </Card>

              {/* Disposition Section - Compact */}
              <Card className={callStatus === 'wrap-up' ? 'border-2 border-primary shadow-lg' : 'shadow-sm'}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    Disposition {callStatus === 'wrap-up' && <span className="text-destructive">*</span>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-3">
                  {/* Disposition Selection */}
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

                  {/* Qualification Questions - Compact */}
                  {campaignDetails?.qualificationQuestions && campaignDetails.qualificationQuestions.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Qualification</Label>
                      <div className="grid grid-cols-2 gap-2">
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
                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={handleSaveDisposition}
                        disabled={!disposition || saveDispositionMutation.isPending || !currentQueueItem}
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
      
      {/* Hidden audio element for remote audio stream - required by Telnyx SDK */}
      <audio id="remoteAudio" autoPlay playsInline style={{ display: 'none' }} />
    </div>
  );
}
