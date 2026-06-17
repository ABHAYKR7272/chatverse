import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useCall } from '../../context/CallContext';
import { formatLastSeen, getDateLabel } from '../../utils/format';
import { SERVER_URL } from '../../utils/api';
import Avatar from '../shared/Avatar';
import MessageBubble from './MessageBubble';
import api from '../../utils/api';

const EMOJIS = ['😀','😂','😍','😎','😢','😡','🥰','😱','🤔','🤣','😭','🥳','🤝','👍','👎','❤️','🔥','✨','💯','🎉','🙏','💪','👀','🤦','🤷','😴','🤒','😇','🤩','🥺'];

export default function ChatWindow({ onBack }) {
  const { user } = useAuth();
  const { activeChat, messages, typingUsers, sendMessage, sendTyping } = useChat();
  const { startCall } = useCall();
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const typingTimerRef = useRef(null);
  const recorderRef = useRef(null);
  const recTimerRef = useRef(null);
  const chunksRef = useRef([]);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const roomId = activeChat?.roomId;
  const roomMessages = messages[roomId] || [];
  const roomTyping = typingUsers[roomId] || {};
  const isGroup = activeChat?.type === 'group';
  const otherUser = activeChat?.otherUser;
  const displayName = isGroup ? activeChat?.name : otherUser?.username;
  const isOnline = !isGroup && otherUser?.isOnline;
  const lastSeen = !isGroup && !isOnline ? formatLastSeen(otherUser?.lastSeen) : null;
  const typingList = Object.values(roomTyping);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [roomMessages, typingList]);

  // Auto resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'; }
  }, [text]);

  const handleTextChange = (e) => {
    setText(e.target.value);
    sendTyping(roomId, true);
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => sendTyping(roomId, false), 1500);
  };

  const handleSend = useCallback(() => {
    const t = text.trim();
    if (!t) return;
    sendMessage(roomId, { content: t, type: 'text', replyToId: replyTo?.id || replyTo?._id });
    setText('');
    setReplyTo(null);
    sendTyping(roomId, false);
    textareaRef.current?.focus();
  }, [text, roomId, replyTo, sendMessage, sendTyping]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleFileUpload = async (file, forceType) => {
    if (!file) return;
    setUploading(true);
    setShowAttach(false);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/chats/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const { url, mimetype, size, name } = res.data;
      let type = forceType || 'file';
      if (!forceType) {
        if (mimetype?.startsWith('image/')) type = 'image';
        else if (mimetype?.startsWith('video/')) type = 'video';
        else if (mimetype?.startsWith('audio/')) type = 'audio';
        else type = 'file';
      }
      sendMessage(roomId, {
        content: '',
        type,
        mediaUrl: url,
        mediaName: name,
        mediaSize: size,
        mediaMimeType: mimetype,
        replyToId: replyTo?.id || replyTo?._id
      });
      setReplyTo(null);
    } catch (err) {
      alert('Upload failed. Try again.');
    } finally { setUploading(false); }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];
      recorderRef.current.ondataavailable = e => chunksRef.current.push(e.data);
      recorderRef.current.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        clearInterval(recTimerRef.current);
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
        await handleFileUpload(file, 'voice');
        setRecordSecs(0);
      };
      recorderRef.current.start();
      setIsRecording(true);
      setRecordSecs(0);
      recTimerRef.current = setInterval(() => setRecordSecs(s => s + 1), 1000);
    } catch { alert('Microphone permission denied'); }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setIsRecording(false);
  };

  const cancelRecording = () => {
    if (recorderRef.current) {
      recorderRef.current.ondataavailable = null;
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordSecs(0);
    clearInterval(recTimerRef.current);
  };

  const formatRecTime = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  // Group messages by date
  const groupedMessages = [];
  let lastDate = null;
  roomMessages.forEach(msg => {
    const d = getDateLabel(msg.createdAt);
    if (d !== lastDate) { groupedMessages.push({ type: 'date', label: d, key: d + msg._id }); lastDate = d; }
    groupedMessages.push({ type: 'message', msg, key: msg._id || msg.id });
  });

  if (!activeChat) return null;

  return (
    <div className="chat-window" onClick={() => { setShowEmoji(false); setShowAttach(false); }}>
      {/* HEADER */}
      <div className="cw-header">
        <button className="cw-back" onClick={onBack}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
        </button>

        <div className="cw-header-info">
          <Avatar user={isGroup ? { ...activeChat, type: 'group' } : otherUser} size={40} />
          <div className="cw-header-text">
            <span className="cw-name">{displayName}</span>
            <span className="cw-status">
              {typingList.length > 0
                ? (isGroup
                    ? `${typingList[0]} is typing...`
                    : 'typing...')
                : isGroup
                  ? `${activeChat.participants?.length || 0} members`
                  : isOnline ? 'online' : (lastSeen || '')}
            </span>
          </div>
        </div>

        <div className="cw-header-actions">
          {!isGroup && (
            <>
              <button className="cw-icon-btn" onClick={(e) => { e.stopPropagation(); startCall(otherUser, 'voice'); }} title="Voice Call">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                  <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.58.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.01L6.6 10.8z"/>
                </svg>
              </button>
              <button className="cw-icon-btn" onClick={(e) => { e.stopPropagation(); startCall(otherUser, 'video'); }} title="Video Call">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                  <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                </svg>
              </button>
            </>
          )}
          <button className="cw-icon-btn" title="Search in chat">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
          </button>
          <button className="cw-icon-btn" title="More">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* MESSAGES */}
      <div className="cw-messages" onClick={() => { setShowEmoji(false); setShowAttach(false); }}>
        <div className="cw-messages-inner">
          {groupedMessages.map(item => {
            if (item.type === 'date') return (
              <div key={item.key} className="date-separator">
                <span>{item.label}</span>
              </div>
            );
            return (
              <MessageBubble
                key={item.key}
                msg={item.msg}
                onReply={setReplyTo}
                isGroup={isGroup}
                contacts={activeChat.participants}
              />
            );
          })}

          {/* Typing indicator */}
          {typingList.length > 0 && (
            <div className="typing-row">
              <div className="typing-bubble">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* REPLY PREVIEW */}
      {replyTo && (
        <div className="reply-bar">
          <div className="reply-bar-line" />
          <div className="reply-bar-content">
            <span className="reply-bar-label">Reply to {replyTo.senderInfo?.username || 'message'}</span>
            <span className="reply-bar-text">
              {replyTo.type === 'text' ? replyTo.content?.substring(0, 60) : `📎 ${replyTo.type}`}
            </span>
          </div>
          <button className="reply-close" onClick={() => setReplyTo(null)}>✕</button>
        </div>
      )}

      {/* INPUT AREA */}
      <div className="cw-input-area" onClick={e => e.stopPropagation()}>
        {/* Hidden file inputs */}
        <input ref={imageInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={e => handleFileUpload(e.target.files[0])} />
        <input ref={videoInputRef} type="file" accept="video/*" style={{display:'none'}} onChange={e => handleFileUpload(e.target.files[0])} />
        <input ref={fileInputRef} type="file" accept="*/*" style={{display:'none'}} onChange={e => handleFileUpload(e.target.files[0])} />

        {/* Emoji btn */}
        <div className="emoji-wrap">
          <button className="input-icon-btn" onClick={() => { setShowEmoji(v=>!v); setShowAttach(false); }}>
            <svg viewBox="0 0 24 24" width="26" height="26" fill="#8696A0">
              <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
            </svg>
          </button>
          {showEmoji && (
            <div className="emoji-panel" onClick={e=>e.stopPropagation()}>
              {EMOJIS.map(e => (
                <button key={e} onClick={() => { setText(t => t+e); textareaRef.current?.focus(); }}>
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Attach btn */}
        <div className="attach-wrap">
          <button className="input-icon-btn" onClick={() => { setShowAttach(v=>!v); setShowEmoji(false); }}>
            <svg viewBox="0 0 24 24" width="26" height="26" fill="#8696A0">
              <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/>
            </svg>
          </button>
          {showAttach && (
            <div className="attach-panel" onClick={e=>e.stopPropagation()}>
              <button onClick={() => { imageInputRef.current.click(); }}>
                <span className="attach-icon" style={{background:'#BF59CF'}}>🖼</span>Photos & Videos
              </button>
              <button onClick={() => { videoInputRef.current.click(); }}>
                <span className="attach-icon" style={{background:'#0063CB'}}>🎥</span>Video
              </button>
              <button onClick={() => { fileInputRef.current.click(); }}>
                <span className="attach-icon" style={{background:'#5157AE'}}>📄</span>Document
              </button>
            </div>
          )}
        </div>

        {/* Main text area or recording */}
        {isRecording ? (
          <div className="recording-bar">
            <button className="rec-cancel" onClick={cancelRecording}>✕</button>
            <div className="rec-dot-anim" />
            <span className="rec-time">{formatRecTime(recordSecs)}</span>
            <span className="rec-hint">Slide to cancel →</span>
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            className="cw-textarea"
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message"
            rows={1}
          />
        )}

        {/* Send or Mic */}
        {text.trim() || uploading ? (
          <button className="send-btn" onClick={handleSend} disabled={uploading}>
            {uploading ? (
              <svg viewBox="0 0 24 24" width="24" height="24" fill="white"><circle cx="12" cy="12" r="8" stroke="white" strokeWidth="2" fill="none" strokeDasharray="25 25" className="upload-spin"/></svg>
            ) : (
              <svg viewBox="0 0 24 24" width="24" height="24" fill="white">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            )}
          </button>
        ) : (
          <button
            className={`mic-btn ${isRecording ? 'recording' : ''}`}
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
            onTouchEnd={stopRecording}
            title="Hold to record voice message"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="white">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
