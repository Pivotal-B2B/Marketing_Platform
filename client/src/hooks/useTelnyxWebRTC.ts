import { useState, useEffect, useCallback, useRef } from 'react';
import { TelnyxRTC } from '@telnyx/webrtc';
import type { Call } from '@telnyx/webrtc';
import { useToast } from '@/hooks/use-toast';

export type CallState = 'idle' | 'connecting' | 'ringing' | 'active' | 'held' | 'hangup';

interface TelnyxErrorDetail {
  code?: number;
  message?: string;
  sessionId?: string;
  rawError?: any;
  timestamp?: string;
}

interface UseTelnyxWebRTCProps {
  sipUsername?: string;
  sipPassword?: string;
  sipDomain?: string;
  onCallStateChange?: (state: CallState) => void;
  onCallEnd?: () => void;
}

export function useTelnyxWebRTC({
  sipUsername,
  sipPassword,
  sipDomain = 'sip.telnyx.com',
  onCallStateChange,
  onCallEnd,
}: UseTelnyxWebRTCProps = {}) {
  const [client, setClient] = useState<TelnyxRTC | null>(null);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [callState, setCallState] = useState<CallState>('idle');
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [lastError, setLastError] = useState<TelnyxErrorDetail | null>(null);
  const [telnyxCallId, setTelnyxCallId] = useState<string | null>(null);
  const { toast } = useToast();
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Telnyx client
  useEffect(() => {
    if (!sipUsername || !sipPassword) {
      return;
    }

    try {
      // Extract just the username if full SIP URI is provided
      // Telnyx SDK expects ONLY the username, not username@domain
      const username = sipUsername.includes('@') ? sipUsername.split('@')[0] : sipUsername;
      
      console.log('Telnyx WebRTC - Attempting connection with:', {
        login: username,
        domain: sipDomain,
        hasPassword: !!sipPassword,
      });
      console.log('SDK version: 2.22.18-beta.2');
      
      const telnyxClient = new TelnyxRTC({
        login: username,
        password: sipPassword,
        ringbackFile: undefined, // Use default ringback
        // Note: Telnyx SDK automatically handles:
        // - WebSocket: wss://sip.telnyx.com:7443
        // - STUN: stun.telnyx.com:3478
        // - TURN: turn.telnyx.com:3478
      });

      // Event listeners
      telnyxClient.on('telnyx.ready', () => {
        console.log('Telnyx WebRTC client ready');
        setIsConnected(true);
        toast({
          title: "Connected",
          description: "Ready to make calls",
        });
      });

      telnyxClient.on('telnyx.error', (error: any) => {
        // Capture detailed error information
        const errorDetail: TelnyxErrorDetail = {
          code: error?.error?.code || error?.code,
          message: error?.error?.message || error?.message || 'Unknown error',
          sessionId: error?.sessionId || '',
          rawError: error,
          timestamp: new Date().toISOString(),
        };
        
        setLastError(errorDetail);
        
        // Enhanced console logging
        console.error('=== TELNYX ERROR DETAILS ===');
        console.error('Error Code:', errorDetail.code);
        console.error('Error Message:', errorDetail.message);
        console.error('Session ID:', errorDetail.sessionId);
        console.error('Timestamp:', errorDetail.timestamp);
        console.error('Full Error Object:', error);
        console.error('SDK Version:', TelnyxRTC.prototype.constructor.name);
        console.error('===========================');
        
        // User-friendly error messages based on error code
        let userMessage = errorDetail.message;
        let troubleshootingTip = '';
        
        switch (errorDetail.code) {
          case -32001:
            userMessage = 'Authentication Failed';
            troubleshootingTip = 'Invalid credentials. Please verify your SIP username and password are correct.';
            break;
          case -32002:
            userMessage = 'Connection Timeout';
            troubleshootingTip = 'Unable to reach Telnyx server. Check your internet connection.';
            break;
          case -32003:
            userMessage = 'Account Issue';
            troubleshootingTip = 'Your Telnyx account may need attention (balance, permissions, etc).';
            break;
          default:
            troubleshootingTip = `Error code: ${errorDetail.code}`;
        }
        
        toast({
          variant: "destructive",
          title: userMessage,
          description: troubleshootingTip,
        });
        
        setIsConnected(false);
      });

      telnyxClient.on('telnyx.notification', (notification: any) => {
        console.log('Telnyx notification - Type:', notification.type, 'Call State:', notification.call?.state);
        
        if (notification.type === 'callUpdate' && notification.call) {
          const call = notification.call;
          
          // Map Telnyx call states to our CallState
          switch (call.state) {
            case 'new':
            case 'requesting':
              updateCallState('connecting');
              break;
            case 'trying':
            case 'ringing':
              updateCallState('ringing');
              break;
            case 'active':
              updateCallState('active');
              startDurationTimer();
              break;
            case 'held':
              updateCallState('held');
              break;
            case 'hangup':
            case 'destroy':
            case 'done':
              updateCallState('hangup');
              stopDurationTimer();
              setActiveCall(null);
              if (onCallEnd) {
                onCallEnd();
              }
              break;
          }
        }
      });

      telnyxClient.on('telnyx.socket.close', () => {
        console.log('Telnyx socket closed');
        setIsConnected(false);
        setActiveCall(null);
        updateCallState('idle');
      });

      // Connect to Telnyx
      telnyxClient.connect().catch((error: any) => {
        console.error('Telnyx connection failed:', error);
        setIsConnected(false);
        toast({
          variant: "destructive",
          title: "Connection Failed",
          description: error.message || "Failed to connect to Telnyx server",
        });
      });
      
      setClient(telnyxClient);

      return () => {
        if (telnyxClient) {
          telnyxClient.disconnect();
        }
        stopDurationTimer();
      };
    } catch (error) {
      console.error('Failed to initialize Telnyx client:', error);
      toast({
        variant: "destructive",
        title: "Initialization Error",
        description: "Failed to initialize calling service",
      });
    }
  }, [sipUsername, sipPassword, sipDomain]);

  // Update call state and notify parent
  const updateCallState = useCallback((newState: CallState) => {
    setCallState(newState);
    if (onCallStateChange) {
      onCallStateChange(newState);
    }
  }, [onCallStateChange]);

  // Start duration timer
  const startDurationTimer = useCallback(() => {
    stopDurationTimer(); // Clear any existing timer
    setCallDuration(0);
    durationIntervalRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  }, []);

  // Stop duration timer
  const stopDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }, []);

  // Make outbound call
  const makeCall = useCallback((phoneNumber: string, callerIdNumber?: string) => {
    if (!client || !isConnected) {
      toast({
        variant: "destructive",
        title: "Not Connected",
        description: "Please wait for connection to be established",
      });
      return;
    }

    if (activeCall) {
      toast({
        variant: "destructive",
        title: "Call in Progress",
        description: "Please end the current call first",
      });
      return;
    }

    try {
      console.log('Making call with params:', {
        destinationNumber: phoneNumber,
        callerNumber: callerIdNumber,
        hasClient: !!client,
        isConnected,
      });

      const call = client.newCall({
        destinationNumber: phoneNumber,
        callerNumber: callerIdNumber,
        audio: true,
        video: false,
        // Automatically attach to audio element with id 'remoteAudio'
        remoteElement: 'remoteAudio',
        // Enable call recording (stored in Telnyx)
        record: 'record-from-answer',
      } as any); // Type assertion needed as SDK types may not include all parameters

      console.log('Call object created - ID:', call?.id, 'State:', call?.state);

      // Capture the Telnyx call ID for recording lookup
      if (call?.id) {
        setTelnyxCallId(call.id);
        console.log('Captured Telnyx Call ID:', call.id);
      }

      setActiveCall(call);
      updateCallState('connecting');

      toast({
        title: "Dialing",
        description: `Calling ${phoneNumber}...`,
      });
    } catch (error: any) {
      console.error('Failed to make call:', error);
      console.error('Error type:', typeof error);
      console.error('Error name:', error?.name);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      
      const errorMessage = error?.message || error?.toString() || "Failed to initiate call";
      
      toast({
        variant: "destructive",
        title: "Call Failed",
        description: errorMessage,
      });
      updateCallState('idle');
    }
  }, [client, isConnected, activeCall, updateCallState, toast]);

  // Hangup call
  const hangup = useCallback(() => {
    if (activeCall) {
      try {
        activeCall.hangup();
        updateCallState('hangup');
      } catch (error) {
        console.error('Failed to hangup:', error);
      }
    }
  }, [activeCall, updateCallState]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (activeCall) {
      try {
        if (isMuted) {
          activeCall.unmuteAudio();
          setIsMuted(false);
          toast({
            description: "Microphone unmuted",
          });
        } else {
          activeCall.muteAudio();
          setIsMuted(true);
          toast({
            description: "Microphone muted",
          });
        }
      } catch (error) {
        console.error('Failed to toggle mute:', error);
      }
    }
  }, [activeCall, isMuted, toast]);

  // Hold/Unhold
  const toggleHold = useCallback(() => {
    if (activeCall) {
      try {
        if (callState === 'held') {
          activeCall.unhold();
          updateCallState('active');
          toast({
            description: "Call resumed",
          });
        } else {
          activeCall.hold();
          updateCallState('held');
          toast({
            description: "Call on hold",
          });
        }
      } catch (error) {
        console.error('Failed to toggle hold:', error);
      }
    }
  }, [activeCall, callState, updateCallState, toast]);

  // Send DTMF tones
  const sendDTMF = useCallback((digit: string) => {
    if (activeCall && callState === 'active') {
      try {
        activeCall.dtmf(digit);
      } catch (error) {
        console.error('Failed to send DTMF:', error);
      }
    }
  }, [activeCall, callState]);

  // Format duration as MM:SS
  const formatDuration = useCallback(() => {
    const minutes = Math.floor(callDuration / 60);
    const seconds = callDuration % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [callDuration]);

  return {
    client,
    activeCall,
    callState,
    isConnected,
    isMuted,
    callDuration,
    lastError,
    telnyxCallId,
    formatDuration,
    makeCall,
    hangup,
    toggleMute,
    toggleHold,
    sendDTMF,
  };
}
