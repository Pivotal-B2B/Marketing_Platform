import { useState, useEffect, useCallback, useRef } from 'react';
import { TelnyxRTC } from '@telnyx/webrtc';
import type { Call } from '@telnyx/webrtc';
import { useToast } from '@/hooks/use-toast';

export type CallState = 'idle' | 'connecting' | 'ringing' | 'active' | 'held' | 'hangup';

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
  const { toast } = useToast();
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Telnyx client
  useEffect(() => {
    if (!sipUsername || !sipPassword) {
      return;
    }

    try {
      const telnyxClient = new TelnyxRTC({
        login: `${sipUsername}@${sipDomain}`,
        password: sipPassword,
        ringbackFile: undefined, // Use default ringback
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
        console.error('Telnyx error:', error);
        toast({
          variant: "destructive",
          title: "Connection Error",
          description: error.message || "Failed to connect to calling service",
        });
        setIsConnected(false);
      });

      telnyxClient.on('telnyx.notification', (notification: any) => {
        console.log('Telnyx notification:', notification);
        
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
      telnyxClient.connect();
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
      const call = client.newCall({
        destinationNumber: phoneNumber,
        callerNumber: callerIdNumber,
        audio: true,
        video: false,
        // Automatically attach to audio element with id 'remoteAudio'
        remoteElement: 'remoteAudio',
      });

      setActiveCall(call);
      updateCallState('connecting');

      toast({
        title: "Dialing",
        description: `Calling ${phoneNumber}...`,
      });
    } catch (error) {
      console.error('Failed to make call:', error);
      toast({
        variant: "destructive",
        title: "Call Failed",
        description: "Failed to initiate call",
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
    formatDuration,
    makeCall,
    hangup,
    toggleMute,
    toggleHold,
    sendDTMF,
  };
}
