import { useEffect, useRef } from 'react';
import { useCall } from '../../context/CallContext';
import Avatar from '../shared/Avatar';

export default function IncomingCall() {
  const { incomingCall, acceptCall, rejectCall } = useCall();
  const ringRef = useRef(null);

  useEffect(() => {
    if (!incomingCall) return;
    // Play ringtone (oscillator based)
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const playRing = () => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 440;
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start(); osc.stop(ctx.currentTime + 0.5);
      };
      playRing();
      const interval = setInterval(playRing, 1500);
      ringRef.current = { ctx, interval };
    } catch {}
    return () => {
      if (ringRef.current) {
        clearInterval(ringRef.current.interval);
        try { ringRef.current.ctx.close(); } catch {}
      }
    };
  }, [incomingCall]);

  if (!incomingCall) return null;

  const caller = {
    id: incomingCall.callerId,
    username: incomingCall.callerName,
    avatar: incomingCall.callerAvatar,
    avatarColor: incomingCall.callerColor
  };

  return (
    <div className="incoming-call-overlay">
      <div className="incoming-call-card">
        <div className="ic-top">
          <p className="ic-call-type">
            {incomingCall.callType === 'video' ? '📹 CHATRIX Video Call' : '📞 CHATRIX Voice Call'}
          </p>
        </div>

        <div className="ic-avatar-ring">
          <div className="ring r1" /><div className="ring r2" /><div className="ring r3" />
          <Avatar user={caller} size={96} />
        </div>

        <h2 className="ic-name">{incomingCall.callerName}</h2>
        <p className="ic-sub">Incoming {incomingCall.callType} call</p>

        <div className="ic-actions">
          <div className="ic-action-wrap">
            <button className="ic-btn reject" onClick={rejectCall}>
              <svg viewBox="0 0 24 24" width="30" height="30" fill="white">
                <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.58.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.01L6.6 10.8z" transform="rotate(135 12 12)"/>
              </svg>
            </button>
            <span>Decline</span>
          </div>

          <div className="ic-action-wrap">
            <button className="ic-btn accept" onClick={acceptCall}>
              <svg viewBox="0 0 24 24" width="30" height="30" fill="white">
                <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.58.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.01L6.6 10.8z"/>
              </svg>
            </button>
            <span>Accept</span>
          </div>
        </div>
      </div>
    </div>
  );
}
