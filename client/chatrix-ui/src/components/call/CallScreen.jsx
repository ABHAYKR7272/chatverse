import { useRef, useEffect } from 'react';
import { useCall } from '../../context/CallContext';
import { formatCallDuration } from '../../utils/format';
import Avatar from '../shared/Avatar';

export default function CallScreen() {
  const {
    callState, localVideoEl, remoteVideoEl,
    callDuration, isMuted, isVideoOff,
    endCall, toggleMute, toggleVideo, flipCamera
  } = useCall();

  const localRef = useRef(null);
  const remoteRef = useRef(null);

  useEffect(() => {
    if (localRef.current) localVideoEl.current = localRef.current;
    if (remoteRef.current) remoteVideoEl.current = remoteRef.current;
  }, [localVideoEl, remoteVideoEl]);

  if (!callState) return null;

  const { callType, peer, status, type } = callState;
  const isVideo = callType === 'video';
  const isConnected = status === 'connected' || type === 'active';

  const statusText = {
    calling: 'Calling...',
    ringing: 'Ringing...',
    connecting: 'Connecting...',
    connected: formatCallDuration(callDuration),
    busy: 'Line busy'
  }[status] || 'Connecting...';

  return (
    <div className={`call-screen ${isVideo ? 'video-call' : 'voice-call'}`}>
      {/* Background */}
      {isVideo ? (
        <div className="call-video-bg">
          <video ref={remoteRef} autoPlay playsInline className="remote-video-bg" />
        </div>
      ) : (
        <div className="call-voice-bg" style={{ background: `linear-gradient(135deg, ${peer?.color || '#128C7E'}aa, #111B21)` }} />
      )}

      {/* Top info */}
      <div className="call-top">
        <div className="call-avatar-section">
          {!isVideo && <Avatar user={peer} size={90} />}
          {isVideo && isConnected && (
            <div className="call-local-video-wrap">
              <video ref={localRef} autoPlay playsInline muted className="local-video-preview" />
            </div>
          )}
        </div>
        <h2 className="call-peer-name">{peer?.name || peer?.username}</h2>
        <p className={`call-status-text ${isConnected ? 'connected' : ''}`}>
          {statusText}
        </p>
        {isVideo && !isConnected && (
          <div className="call-waiting-avatar">
            <Avatar user={peer} size={110} />
          </div>
        )}
      </div>

      {/* Video: remote stream fills background when connected */}
      {isVideo && isConnected && (
        <video ref={remoteRef} autoPlay playsInline className="remote-video-full" />
      )}

      {/* Controls */}
      <div className="call-controls">
        {/* Mute */}
        <div className="ctrl-btn-wrap">
          <button className={`ctrl-btn ${isMuted ? 'active' : ''}`} onClick={toggleMute}>
            {isMuted ? (
              <svg viewBox="0 0 24 24" width="26" height="26" fill="white">
                <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="26" height="26" fill="white">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
            )}
          </button>
          <span>{isMuted ? 'Unmute' : 'Mute'}</span>
        </div>

        {/* Video toggle (only for video calls) */}
        {isVideo && (
          <div className="ctrl-btn-wrap">
            <button className={`ctrl-btn ${isVideoOff ? 'active' : ''}`} onClick={toggleVideo}>
              {isVideoOff ? (
                <svg viewBox="0 0 24 24" width="26" height="26" fill="white">
                  <path d="M21 6.5l-4-4-15 15 1.5 1.5 2.5-2.5H10v-1l1-1H8v-1h3l3-3H8v-1h7l3.14-3.14L21 6.5zm-1 11l-4-4v-2.5l4-4V17.5z"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="26" height="26" fill="white">
                  <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                </svg>
              )}
            </button>
            <span>{isVideoOff ? 'Start Video' : 'Stop Video'}</span>
          </div>
        )}

        {/* Flip camera for video */}
        {isVideo && (
          <div className="ctrl-btn-wrap">
            <button className="ctrl-btn" onClick={flipCamera}>
              <svg viewBox="0 0 24 24" width="26" height="26" fill="white">
                <path d="M20 5h-3.17L15 3H9L7.17 5H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-5 11.5V14H9v2.5L5.5 13 9 9.5V12h6V9.5l3.5 3.5-3.5 3.5z"/>
              </svg>
            </button>
            <span>Flip</span>
          </div>
        )}

        {/* Speaker */}
        <div className="ctrl-btn-wrap">
          <button className="ctrl-btn">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="white">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
          </button>
          <span>Speaker</span>
        </div>

        {/* End call */}
        <div className="ctrl-btn-wrap">
          <button className="ctrl-btn end-call" onClick={endCall}>
            <svg viewBox="0 0 24 24" width="30" height="30" fill="white">
              <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.58.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.01L6.6 10.8z" transform="rotate(135 12 12)"/>
            </svg>
          </button>
          <span>End</span>
        </div>
      </div>
    </div>
  );
}
