import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { getSocket } from '../utils/socket';
import { useAuth } from './AuthContext';

const CallContext = createContext(null);

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.relay.metered.ca:80' },
    {
      urls: 'turn:standard.relay.metered.ca:80',
      username: 'webrtc',
      credential: 'webrtc'
    },
    {
      urls: 'turn:standard.relay.metered.ca:443',
      username: 'webrtc',
      credential: 'webrtc'
    },
    {
      urls: 'turn:standard.relay.metered.ca:443?transport=tcp',
      username: 'webrtc',
      credential: 'webrtc'
    }
  ],
  iceCandidatePoolSize: 10
};

const CALL_TIMEOUT_MS = 35000;

export function CallProvider({ children }) {
  const { user } = useAuth();
  const [callState, setCallState] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  const callStateRef = useRef(null);
  const incomingCallRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const peerRef = useRef(null);
  const localVideoEl = useRef(null);
  const remoteVideoEl = useRef(null);
  const callTimerRef = useRef(null);
  const callTimeoutRef = useRef(null);
  const iceQueueRef = useRef([]);

  const setCallStateBoth = (value) => {
    const next = typeof value === 'function' ? value(callStateRef.current) : value;
    callStateRef.current = next;
    setCallState(next);
  };

  const setIncomingCallBoth = (value) => {
    incomingCallRef.current = value;
    setIncomingCall(value);
  };

  const getLocalStream = async (callType) => {
    const constraints = {
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: callType === 'video'
        ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
        : false
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    localStreamRef.current = stream;
    if (localVideoEl.current) localVideoEl.current.srcObject = stream;
    return stream;
  };

  const flushIceQueue = async () => {
    const pc = peerRef.current;
    if (!pc) return;
    while (iceQueueRef.current.length) {
      const candidate = iceQueueRef.current.shift();
      try { await pc.addIceCandidate(candidate); } catch (e) {
        console.warn('ICE candidate flush error', e);
      }
    }
  };

  const markConnected = () => {
    clearTimeout(callTimeoutRef.current);
    setCallStateBoth(prev => {
      if (!prev || prev.status === 'connected') return prev;
      return { ...prev, type: 'active', status: 'connected' };
    });
    startTimer();
  };

  const createPeer = (targetUserId) => {
    if (peerRef.current) {
      try { peerRef.current.close(); } catch {}
    }
    iceQueueRef.current = [];
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerRef.current = pc;

    pc.onicecandidate = ({ candidate }) => {
      if (candidate && targetUserId) {
        getSocket()?.emit('webrtc_ice', { targetUserId, candidate });
      }
    };

    pc.ontrack = (e) => {
      if (!e.streams || !e.streams[0]) return;
      remoteStreamRef.current = e.streams[0];
      if (remoteVideoEl.current) {
        remoteVideoEl.current.srcObject = e.streams[0];
      }
      markConnected();
    };

    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      if (st === 'connected') markConnected();
      else if (st === 'failed') {
        // ICE restart attempt
        const cs = callStateRef.current;
        if (cs?.peer?.id) {
          pc.createOffer({ iceRestart: true })
            .then(o => pc.setLocalDescription(o))
            .then(() => {
              getSocket()?.emit('webrtc_offer', {
                targetUserId: cs.peer.id,
                offer: pc.localDescription,
                roomId: cs.roomId
              });
            }).catch(() => {});
        }
      } else if (st === 'closed') {
        // no-op
      }
    };

    pc.oniceconnectionstatechange = () => {
      const st = pc.iceConnectionState;
      if (st === 'connected' || st === 'completed') markConnected();
    };

    return pc;
  };

  const cleanupCall = useCallback(() => {
    clearTimeout(callTimeoutRef.current);
    clearInterval(callTimerRef.current);
    callTimerRef.current = null;
    if (peerRef.current) {
      try { peerRef.current.close(); } catch {}
      peerRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (localVideoEl.current) localVideoEl.current.srcObject = null;
    if (remoteVideoEl.current) remoteVideoEl.current.srcObject = null;
    iceQueueRef.current = [];
    setCallStateBoth(null);
    setIncomingCallBoth(null);
    setCallDuration(0);
    setIsMuted(false);
    setIsVideoOff(false);
  }, []);

  const startTimer = () => {
    if (callTimerRef.current) return;
    setCallDuration(0);
    callTimerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
  };

  const stopTimer = () => {
    clearInterval(callTimerRef.current);
    callTimerRef.current = null;
    setCallDuration(0);
  };

  // ─── Outgoing call ────────────────────────────────────────────────────────
  const startCall = useCallback(async (peer, callType) => {
    const socket = getSocket();
    if (!socket || !user) return;
    if (callStateRef.current) return; // already in a call

    const roomId = [String(user._id || user.id), String(peer._id || peer.id)].sort().join('_call_');
    setCallStateBoth({ type: 'outgoing', callType, peer, roomId, status: 'calling' });
    setCallDuration(0);

    try {
      const stream = await getLocalStream(callType);
      const pc = createPeer(peer._id || peer.id);
      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === 'video'
      });
      await pc.setLocalDescription(offer);

      // Send offer inline with call_initiate so receiver gets it immediately
      socket.emit('call_initiate', {
        targetUserId: peer._id || peer.id,
        callType, roomId,
        offer: pc.localDescription
      });

      // Auto-cancel unanswered call like WhatsApp
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = setTimeout(() => {
        if (callStateRef.current?.status === 'calling') {
          socket.emit('call_missed', { targetUserId: peer._id || peer.id, roomId });
          socket.emit('call_end', { targetUserId: peer._id || peer.id, roomId });
          cleanupCall();
        }
      }, CALL_TIMEOUT_MS);
    } catch (err) {
      console.error('startCall error:', err);
      alert('Could not access microphone/camera. Please check browser permissions.');
      cleanupCall();
    }
  }, [user, cleanupCall]);

  // ─── Accept incoming call ─────────────────────────────────────────────────
  const acceptCall = useCallback(async () => {
    const incoming = incomingCallRef.current;
    if (!incoming) return;
    const socket = getSocket();
    const { callerId, callType, roomId, offer } = incoming;

    setCallStateBoth({
      type: 'active', callType, status: 'connecting',
      peer: {
        id: callerId,
        _id: callerId,
        name: incoming.callerName,
        username: incoming.callerName,
        avatar: incoming.callerAvatar,
        color: incoming.callerColor,
        avatarColor: incoming.callerColor
      },
      roomId
    });
    setIncomingCallBoth(null);

    try {
      const stream = await getLocalStream(callType);
      const pc = createPeer(callerId);
      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      // offer is bundled with call_initiate, so we have it right here
      if (offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        await flushIceQueue();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket?.emit('webrtc_answer', { targetUserId: callerId, answer: pc.localDescription, roomId });
      }

      socket?.emit('call_accept', { callerId, roomId });
    } catch (err) {
      console.error('acceptCall error:', err);
      alert('Could not access microphone/camera. Please check browser permissions.');
      socket?.emit('call_reject', { callerId, reason: 'media_error' });
      cleanupCall();
    }
  }, [cleanupCall]);

  const rejectCall = useCallback(() => {
    const incoming = incomingCallRef.current;
    if (!incoming) return;
    getSocket()?.emit('call_reject', { callerId: incoming.callerId, reason: 'declined' });
    setIncomingCallBoth(null);
  }, []);

  const endCall = useCallback(() => {
    const cs = callStateRef.current;
    if (cs?.peer) {
      const peerId = cs.peer._id || cs.peer.id;
      getSocket()?.emit('call_end', { targetUserId: peerId, roomId: cs.roomId });
    }
    cleanupCall();
  }, [cleanupCall]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const next = !isMuted;
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !next; });
      setIsMuted(next);
    }
  }, [isMuted]);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const next = !isVideoOff;
      localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = !next; });
      setIsVideoOff(next);
    }
  }, [isVideoOff]);

  const toggleSpeaker = useCallback(() => setIsSpeakerOn(v => !v), []);

  const flipCamera = useCallback(async () => {
    if (!localStreamRef.current) return;
    const current = localStreamRef.current.getVideoTracks()[0];
    if (!current) return;
    const facing = current.getSettings()?.facingMode;
    const newFacing = facing === 'environment' ? 'user' : 'environment';
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: newFacing }, audio: false });
      const newTrack = newStream.getVideoTracks()[0];
      const sender = peerRef.current?.getSenders().find(s => s.track?.kind === 'video');
      if (sender) await sender.replaceTrack(newTrack);
      current.stop();
      localStreamRef.current.removeTrack(current);
      localStreamRef.current.addTrack(newTrack);
      if (localVideoEl.current) localVideoEl.current.srcObject = localStreamRef.current;
    } catch (err) {
      console.warn('flipCamera error:', err);
    }
  }, []);

  // ─── Socket event handlers — registered ONCE on login ────────────────────
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    if (!socket) return;

    const onIncomingCall = (data) => {
      // Already in a call → auto-busy
      if (callStateRef.current) {
        socket.emit('call_busy', { callerId: data.callerId });
        return;
      }
      setIncomingCallBoth(data);
    };

    const onCallAccepted = () => {
      clearTimeout(callTimeoutRef.current);
      setCallStateBoth(prev =>
        prev ? { ...prev, status: 'connecting' } : prev
      );
    };

    const onCallRejected = ({ reason } = {}) => {
      setCallStateBoth(prev =>
        prev ? { ...prev, status: reason === 'media_error' ? 'unavailable' : 'rejected' } : prev
      );
      setTimeout(cleanupCall, 1600);
    };

    const onCallEnded = () => cleanupCall();

    const onCallBusy = () => {
      setCallStateBoth(prev => prev ? { ...prev, status: 'busy' } : prev);
      setTimeout(cleanupCall, 2000);
    };

    const onCallMissed = () => {
      setIncomingCallBoth(null);
    };

    // webrtc_offer comes in two cases:
    // 1) renegotiation / ICE restart initiated by the caller
    // 2) (legacy path) if offer was not bundled in call_initiate
    const onWebRTCOffer = async ({ fromId, offer, roomId }) => {
      try {
        const pc = peerRef.current;
        if (!pc || pc.signalingState === 'closed') return;
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        await flushIceQueue();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        getSocket()?.emit('webrtc_answer', { targetUserId: fromId, answer: pc.localDescription, roomId });
      } catch (err) {
        console.error('onWebRTCOffer error:', err);
      }
    };

    const onWebRTCAnswer = async ({ answer }) => {
      try {
        const pc = peerRef.current;
        if (!pc || pc.signalingState === 'closed') return;
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        await flushIceQueue();
      } catch (err) {
        console.error('onWebRTCAnswer error:', err);
      }
    };

    const onWebRTCIce = async ({ candidate }) => {
      const pc = peerRef.current;
      try {
        if (pc && pc.remoteDescription?.type) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          iceQueueRef.current.push(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.warn('onWebRTCIce error:', err);
      }
    };

    socket.on('call_incoming', onIncomingCall);
    socket.on('call_accepted', onCallAccepted);
    socket.on('call_rejected', onCallRejected);
    socket.on('call_ended', onCallEnded);
    socket.on('call_busy', onCallBusy);
    socket.on('call_missed', onCallMissed);
    socket.on('webrtc_offer', onWebRTCOffer);
    socket.on('webrtc_answer', onWebRTCAnswer);
    socket.on('webrtc_ice', onWebRTCIce);

    return () => {
      socket.off('call_incoming', onIncomingCall);
      socket.off('call_accepted', onCallAccepted);
      socket.off('call_rejected', onCallRejected);
      socket.off('call_ended', onCallEnded);
      socket.off('call_busy', onCallBusy);
      socket.off('call_missed', onCallMissed);
      socket.off('webrtc_offer', onWebRTCOffer);
      socket.off('webrtc_answer', onWebRTCAnswer);
      socket.off('webrtc_ice', onWebRTCIce);
    };
  }, [user, cleanupCall]);  // cleanupCall is stable (useCallback with no deps)

  return (
    <CallContext.Provider value={{
      callState, incomingCall,
      localVideoEl, remoteVideoEl,
      callDuration, isMuted, isVideoOff, isSpeakerOn,
      startCall, acceptCall, rejectCall, endCall,
      toggleMute, toggleVideo, toggleSpeaker, flipCamera
    }}>
      {children}
    </CallContext.Provider>
  );
}

export const useCall = () => useContext(CallContext);
