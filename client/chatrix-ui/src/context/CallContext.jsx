import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { getSocket } from '../utils/socket';
import { useAuth } from './AuthContext';

const CallContext = createContext(null);

const ICE_SERVERS = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }
  ]
};

export function CallProvider({ children }) {
  const { user } = useAuth();
  const [callState, setCallState] = useState(null);
  // callState: { type: 'outgoing'|'incoming'|'active', callType: 'voice'|'video',
  //              peer: {id, name, avatar, color}, roomId, status }
  const [incomingCall, setIncomingCall] = useState(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const peerRef = useRef(null);
  const localVideoEl = useRef(null);
  const remoteVideoEl = useRef(null);
  const callTimerRef = useRef(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const iceCandidateQueue = useRef([]);

  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    if (!socket) return;

    const onIncomingCall = (data) => {
      setIncomingCall(data);
    };

    const onCallAccepted = async ({ answer, accepterId }) => {
      try {
        if (peerRef.current && answer) {
          await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          // Flush queued ICE candidates
          while (iceCandidateQueue.current.length) {
            await peerRef.current.addIceCandidate(iceCandidateQueue.current.shift());
          }
        }
        setCallState(prev => prev ? { ...prev, type: 'active', status: 'connected' } : null);
        startTimer();
      } catch (err) { console.error('call accept error:', err); }
    };

    const onCallRejected = ({ reason }) => {
      setCallState(null);
      stopTimer();
    };

    const onCallEnded = () => {
      cleanupCall();
    };

    const onCallBusy = () => {
      setCallState(prev => prev ? { ...prev, status: 'busy' } : null);
      setTimeout(cleanupCall, 2000);
    };

    const onOffer = async ({ fromId, offer, roomId }) => {
      try {
        const pc = createPeer();
        const stream = await getLocalStream(callState?.callType || 'voice');
        stream.getTracks().forEach(t => pc.addTrack(t, stream));
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc_answer', { targetUserId: fromId, answer, roomId });
        while (iceCandidateQueue.current.length) {
          await pc.addIceCandidate(iceCandidateQueue.current.shift());
        }
      } catch (err) { console.error('offer error:', err); }
    };

    const onAnswer = async ({ answer }) => {
      try {
        if (peerRef.current) {
          await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        }
      } catch (err) {}
    };

    const onIce = async ({ candidate }) => {
      try {
        if (peerRef.current?.remoteDescription) {
          await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          iceCandidateQueue.current.push(new RTCIceCandidate(candidate));
        }
      } catch (err) {}
    };

    socket.on('call_incoming', onIncomingCall);
    socket.on('call_accepted', onCallAccepted);
    socket.on('call_rejected', onCallRejected);
    socket.on('call_ended', onCallEnded);
    socket.on('call_busy', onCallBusy);
    socket.on('webrtc_offer', onOffer);
    socket.on('webrtc_answer', onAnswer);
    socket.on('webrtc_ice', onIce);

    return () => {
      socket.off('call_incoming', onIncomingCall);
      socket.off('call_accepted', onCallAccepted);
      socket.off('call_rejected', onCallRejected);
      socket.off('call_ended', onCallEnded);
      socket.off('call_busy', onCallBusy);
      socket.off('webrtc_offer', onOffer);
      socket.off('webrtc_answer', onAnswer);
      socket.off('webrtc_ice', onIce);
    };
  }, [user, callState]);

  const getLocalStream = async (callType) => {
    const constraints = {
      audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 },
      video: callType === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    localStreamRef.current = stream;
    if (localVideoEl.current) localVideoEl.current.srcObject = stream;
    return stream;
  };

  const createPeer = () => {
    if (peerRef.current) { peerRef.current.close(); }
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerRef.current = pc;

    pc.onicecandidate = ({ candidate }) => {
      if (candidate && callState?.peer?.id) {
        getSocket()?.emit('webrtc_ice', { targetUserId: callState.peer.id, candidate });
      }
    };

    pc.ontrack = (e) => {
      remoteStreamRef.current = e.streams[0];
      if (remoteVideoEl.current) remoteVideoEl.current.srcObject = e.streams[0];
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected') {
        setCallState(prev => prev ? { ...prev, status: 'connected', type: 'active' } : null);
        startTimer();
      } else if (['disconnected', 'failed', 'closed'].includes(state)) {
        cleanupCall();
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'connected') {
        setCallState(prev => prev ? { ...prev, status: 'connected', type: 'active' } : null);
      }
    };

    return pc;
  };

  const startCall = useCallback(async (peer, callType) => {
    const socket = getSocket();
    if (!socket) return;
    const roomId = [user.id, peer.id].sort().join('_call_');
    setCallState({ type: 'outgoing', callType, peer, roomId, status: 'calling' });
    setCallDuration(0);

    try {
      const stream = await getLocalStream(callType);
      const pc = createPeer();
      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === 'video'
      });
      await pc.setLocalDescription(offer);

      socket.emit('call_initiate', { targetUserId: peer.id, callType, roomId, offer });

      // Update ICE candidate target
      pc.onicecandidate = ({ candidate }) => {
        if (candidate) socket.emit('webrtc_ice', { targetUserId: peer.id, candidate });
      };
    } catch (err) {
      console.error('startCall error:', err);
      setCallState(null);
    }
  }, [user]);

  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;
    const socket = getSocket();
    const { callerId, callType, roomId } = incomingCall;

    setCallState({
      type: 'active', callType, status: 'connecting',
      peer: { id: callerId, name: incomingCall.callerName, avatar: incomingCall.callerAvatar, color: incomingCall.callerColor },
      roomId
    });
    setIncomingCall(null);

    try {
      const stream = await getLocalStream(callType);
      const pc = createPeer();
      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      pc.onicecandidate = ({ candidate }) => {
        if (candidate) socket?.emit('webrtc_ice', { targetUserId: callerId, candidate });
      };

      socket?.emit('call_accept', { callerId, roomId });
      startTimer();
    } catch (err) {
      console.error('acceptCall error:', err);
    }
  }, [incomingCall]);

  const rejectCall = useCallback(() => {
    if (!incomingCall) return;
    getSocket()?.emit('call_reject', { callerId: incomingCall.callerId });
    setIncomingCall(null);
  }, [incomingCall]);

  const endCall = useCallback(() => {
    if (callState?.peer?.id) {
      getSocket()?.emit('call_end', { targetUserId: callState.peer.id, roomId: callState.roomId });
    }
    cleanupCall();
  }, [callState]);

  const cleanupCall = () => {
    if (peerRef.current) { peerRef.current.close(); peerRef.current = null; }
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; }
    if (localVideoEl.current) localVideoEl.current.srcObject = null;
    if (remoteVideoEl.current) remoteVideoEl.current.srcObject = null;
    stopTimer();
    setCallState(null);
    setIsMuted(false);
    setIsVideoOff(false);
    iceCandidateQueue.current = [];
  };

  const startTimer = () => {
    setCallDuration(0);
    callTimerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
  };
  const stopTimer = () => { clearInterval(callTimerRef.current); setCallDuration(0); };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = isMuted; });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = isVideoOff; });
      setIsVideoOff(!isVideoOff);
    }
  };

  const flipCamera = async () => {
    if (!localStreamRef.current) return;
    const currentTrack = localStreamRef.current.getVideoTracks()[0];
    const settings = currentTrack?.getSettings();
    const newFacing = settings?.facingMode === 'user' ? 'environment' : 'user';
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: newFacing }, audio: false });
      const newTrack = newStream.getVideoTracks()[0];
      const sender = peerRef.current?.getSenders().find(s => s.track?.kind === 'video');
      if (sender) await sender.replaceTrack(newTrack);
      currentTrack?.stop();
      localStreamRef.current.removeTrack(currentTrack);
      localStreamRef.current.addTrack(newTrack);
      if (localVideoEl.current) localVideoEl.current.srcObject = localStreamRef.current;
    } catch {}
  };

  return (
    <CallContext.Provider value={{
      callState, incomingCall,
      localVideoEl, remoteVideoEl,
      callDuration, isMuted, isVideoOff, isSpeakerOn,
      startCall, acceptCall, rejectCall, endCall,
      toggleMute, toggleVideo, flipCamera
    }}>
      {children}
    </CallContext.Provider>
  );
}

export const useCall = () => useContext(CallContext);
