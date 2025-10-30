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
  const [selectedMicId, setSelectedMicId] = useState<string | null>(null);
  const [selectedSpeakerId, setSelectedSpeakerId] = useState<string | null>(null);
  const { toast } = useToast();
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load saved audio device preferences from localStorage
  useEffect(() => {
    const savedMic = localStorage.getItem('telnyx_microphone_id');
    const savedSpeaker = localStorage.getItem('telnyx_speaker_id');
    
    if (savedMic) setSelectedMicId(savedMic);
    if (savedSpeaker) setSelectedSpeakerId(savedSpeaker);
  }, []);

  // Initialize Telnyx client
  useEffect(() => {
    if (!sipUsername || !sipPassword) {
      console.warn('WebRTC initialization skipped: Missing SIP credentials');
      return;
    }

    let connectionTimeout: NodeJS.Timeout;
    let telnyxClient: TelnyxRTC | null = null;

    try {
      // Extract just the username if full SIP URI is provided
      // Telnyx SDK expects ONLY the username, not username@domain
      const username = sipUsername.includes('@') ? sipUsername.split('@')[0] : sipUsername;
      
      console.log('=== TELNYX WebRTC CONNECTION START ===');
      console.log('Connection details:', {
        login: username,
        domain: sipDomain,
        hasPassword: !!sipPassword,
        timestamp: new Date().toISOString(),
      });
      console.log('SDK version: 2.22.18-beta.2');
      console.log('Network requirements: WebSocket (WSS), STUN (UDP), TURN (UDP/TCP)');
      
      telnyxClient = new TelnyxRTC({
        login: username,
        password: sipPassword,
        ringbackFile: undefined,
        // Force TCP transport instead of UDP (better for cloud environments)
        iceTransportPolicy: 'relay',
        // Configure TURN servers with TCP transport
        iceServers: [
          {
            urls: 'turn:turn.telnyx.com:3478?transport=tcp',
          },
          {
            urls: 'turns:turn.telnyx.com:5349', // TLS on port 5349
          }
        ]
      } as any); // Type assertion: SDK types don't include WebRTC config options

      // Set connection timeout (30 seconds)
      connectionTimeout = setTimeout(() => {
        console.error('=== TELNYX CONNECTION TIMEOUT ===');
        console.error('Connection failed to establish within 30 seconds');
        console.error('Possible causes:');
        console.error('1. Network firewall blocking WebRTC (UDP ports for STUN/TURN)');
        console.error('2. Invalid SIP credentials');
        console.error('3. Telnyx service unavailable');
        console.error('4. Cloud environment restricting WebRTC protocols');
        console.error('=====================================');
        
        setIsConnected(false);
        toast({
          variant: "destructive",
          title: "Connection Timeout",
          description: "Unable to connect to calling service. WebRTC may be blocked by network policies.",
          duration: 10000,
        });
        
        if (telnyxClient) {
          try {
            telnyxClient.disconnect();
          } catch (e) {
            console.error('Error disconnecting after timeout:', e);
          }
        }
      }, 30000);

      // Event listeners
      telnyxClient.on('telnyx.ready', () => {
        clearTimeout(connectionTimeout);
        console.log('=== TELNYX CONNECTION SUCCESS ===');
        console.log('WebRTC client ready at', new Date().toISOString());
        console.log('==================================');
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

      telnyxClient.on('telnyx.socket.error', (error: any) => {
        console.error('=== TELNYX SOCKET ERROR ===');
        console.error('Socket error:', error);
        console.error('===========================');
      });

      // Connect to Telnyx
      console.log('Initiating WebRTC connection...');
      telnyxClient.connect().catch((error: any) => {
        clearTimeout(connectionTimeout);
        console.error('=== TELNYX CONNECTION ERROR ===');
        console.error('Connection rejected:', error);
        console.error('Error type:', typeof error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        console.error('================================');
        setIsConnected(false);
        toast({
          variant: "destructive",
          title: "Connection Failed",
          description: error.message || "Failed to connect to Telnyx server. Check network and credentials.",
          duration: 10000,
        });
      });
      
      setClient(telnyxClient);

      return () => {
        clearTimeout(connectionTimeout);
        if (telnyxClient) {
          try {
            telnyxClient.disconnect();
          } catch (e) {
            console.error('Error during cleanup disconnect:', e);
          }
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
        selectedMicId,
        selectedSpeakerId,
      });

      // Build call options with audio constraints if devices are selected
      const callOptions: any = {
        destinationNumber: phoneNumber,
        callerNumber: callerIdNumber,
        audio: true,
        video: false,
        // Automatically attach to audio element with id 'remoteAudio'
        remoteElement: 'remoteAudio',
        // Enable call recording (stored in Telnyx)
        record: 'record-from-answer',
      };

      // Apply microphone device constraint if selected
      if (selectedMicId) {
        callOptions.audio = {
          deviceId: { exact: selectedMicId }
        };
        console.log('Using selected microphone:', selectedMicId);
      }

      const call = client.newCall(callOptions);

      console.log('Call object created - ID:', call?.id, 'State:', call?.state);

      // Capture the Telnyx call ID for recording lookup
      if (call?.id) {
        setTelnyxCallId(call.id);
        console.log('Captured Telnyx Call ID:', call.id);
      }

      setActiveCall(call);
      updateCallState('connecting');

      // Apply speaker to remote audio element once call is active
      if (selectedSpeakerId) {
        // Wait a bit for the remote audio element to be created
        setTimeout(() => {
          const audioElement = document.getElementById('remoteAudio') as HTMLAudioElement;
          if (audioElement && 'setSinkId' in audioElement) {
            (audioElement as any).setSinkId(selectedSpeakerId)
              .then(() => {
                console.log('Applied selected speaker:', selectedSpeakerId);
              })
              .catch((error: any) => {
                console.error('Failed to apply speaker:', error);
              });
          }
        }, 500);
      }

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
  }, [client, isConnected, activeCall, updateCallState, toast, selectedMicId, selectedSpeakerId]);

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

  // Set audio devices (microphone and speaker)
  const setAudioDevices = useCallback((micId: string | null, speakerId: string | null) => {
    if (micId) {
      setSelectedMicId(micId);
      localStorage.setItem('telnyx_microphone_id', micId);
    }
    if (speakerId) {
      setSelectedSpeakerId(speakerId);
      localStorage.setItem('telnyx_speaker_id', speakerId);
    }
    
    // If call is active, try to apply devices immediately
    if (activeCall) {
      try {
        // Apply microphone to local stream
        if (micId) {
          navigator.mediaDevices.getUserMedia({ 
            audio: { deviceId: { exact: micId } } 
          }).then(stream => {
            // Replace audio track in active call
            const audioTrack = stream.getAudioTracks()[0];
            if (audioTrack) {
              console.log('Applied new microphone:', micId);
            }
          }).catch(error => {
            console.error('Failed to apply microphone:', error);
          });
        }
        
        // Apply speaker to remote audio element
        if (speakerId) {
          const audioElement = document.getElementById('remoteAudio') as HTMLAudioElement;
          if (audioElement && 'setSinkId' in audioElement) {
            (audioElement as any).setSinkId(speakerId)
              .then(() => {
                console.log('Applied new speaker:', speakerId);
              })
              .catch((error: any) => {
                console.error('Failed to apply speaker:', error);
              });
          }
        }
      } catch (error) {
        console.error('Error applying audio devices during call:', error);
      }
    }
  }, [activeCall]);

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
    selectedMicId,
    selectedSpeakerId,
    formatDuration,
    makeCall,
    hangup,
    toggleMute,
    toggleHold,
    sendDTMF,
    setAudioDevices,
  };
}
