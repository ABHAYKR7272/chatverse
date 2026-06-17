import { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { formatMessageTime, formatFileSize } from '../../utils/format';
import { SERVER_URL } from '../../utils/api';

const REACTIONS = ['👍','❤️','😂','😮','😢','🙏'];

export default function MessageBubble({ msg, onReply, isGroup, contacts }) {
  const { user } = useAuth();
  const { addReaction, deleteMessage } = useChat();
  const [showActions, setShowActions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const longPressTimer = useRef(null);

  const isMine = (msg.senderId || msg.sender) === (user?._id || user?.id);
  const msgId = msg._id || msg.id;

  // Long press for mobile
  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => setShowActions(true), 500);
  };
  const handleTouchEnd = () => clearTimeout(longPressTimer.current);

  const getSenderName = () => {
    const sid = msg.senderId || msg.sender;
    if (msg.senderInfo) return msg.senderInfo.username;
    const c = contacts?.find(c => (c._id||c.id) === sid);
    return c?.username || 'Unknown';
  };

  const getMediaUrl = (url) => {
    if (!url) return '';
    return url.startsWith('http') ? url : `${SERVER_URL}${url}`;
  };

  const renderTicks = () => {
    if (!isMine) return null;
    const readCount = msg.readBy?.length || 0;
    const isRead = readCount > 1;
    return (
      <span className={`msg-ticks ${isRead ? 'read' : 'sent'}`}>
        {isRead ? (
          <svg viewBox="0 0 16 11" width="16" height="11">
            <path d="M11.071.653a.56.56 0 0 0-.812-.074L4.99 5.465l-1.8-1.8a.56.56 0 0 0-.799.784l2.2 2.2a.56.56 0 0 0 .807-.011l5.687-5.2a.56.56 0 0 0-.014-.785z" fill="#53bdeb"/>
            <path d="M14.971.653a.56.56 0 0 0-.812-.074L8.89 5.465l-.574-.574a.56.56 0 0 0-.799.784l.974.974a.56.56 0 0 0 .807-.011l5.687-5.2a.56.56 0 0 0-.014-.785z" fill="#53bdeb"/>
          </svg>
        ) : (
          <svg viewBox="0 0 10 11" width="10" height="11">
            <path d="M9.071.653a.56.56 0 0 0-.812-.074L3.99 5.265l-1.8-1.8a.56.56 0 0 0-.799.784l2.2 2.2a.56.56 0 0 0 .807-.011l4.687-4.2a.56.56 0 0 0-.014-.785z" fill="rgba(255,255,255,0.6)"/>
          </svg>
        )}
      </span>
    );
  };

  const renderContent = () => {
    if (msg.deletedForEveryone || msg.type === 'deleted') {
      return <p className="msg-deleted">🚫 This message was deleted</p>;
    }

    switch (msg.type) {
      case 'image':
        return (
          <div className="msg-media">
            {!imgLoaded && <div className="media-skeleton" />}
            <img
              src={getMediaUrl(msg.mediaUrl || msg.content)}
              alt="Photo"
              onLoad={() => setImgLoaded(true)}
              onClick={() => window.open(getMediaUrl(msg.mediaUrl || msg.content), '_blank')}
              style={{ display: imgLoaded ? 'block' : 'none' }}
            />
            {msg.content && msg.content !== msg.mediaUrl && (
              <p className="media-caption">{msg.content}</p>
            )}
          </div>
        );
      case 'video':
        return (
          <div className="msg-media">
            <video src={getMediaUrl(msg.mediaUrl || msg.content)} controls preload="metadata" />
          </div>
        );
      case 'voice':
        return (
          <div className="msg-voice">
            <div className="voice-waveform">
              {Array.from({length: 20}).map((_,i) => (
                <div key={i} className="wave-bar" style={{ height: `${Math.random()*20+4}px` }} />
              ))}
            </div>
            <audio src={getMediaUrl(msg.mediaUrl || msg.content)} controls />
          </div>
        );
      case 'audio':
        return (
          <div className="msg-audio-file">
            <span className="audio-icon">🎵</span>
            <audio src={getMediaUrl(msg.mediaUrl || msg.content)} controls />
          </div>
        );
      case 'file':
      case 'document':
        return (
          <a href={getMediaUrl(msg.mediaUrl || msg.content)} target="_blank" rel="noreferrer" className="msg-file" download>
            <div className="file-icon-wrap">📎</div>
            <div className="file-details">
              <span className="file-name">{msg.mediaName || 'Document'}</span>
              <span className="file-size">{formatFileSize(msg.mediaSize)}</span>
            </div>
            <span className="file-dl">⬇</span>
          </a>
        );
      default:
        return <p className="msg-text">{msg.content}</p>;
    }
  };

  const myReaction = msg.reactions?.find(r => r.user === (user?._id || user?.id));

  return (
    <div
      className={`msg-wrap ${isMine ? 'mine' : 'theirs'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowReactions(false); }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Sender avatar for groups */}
      {isGroup && !isMine && (
        <div className="msg-group-avatar" />
      )}

      <div className={`msg-bubble ${isMine ? 'mine' : 'theirs'} ${msg.type !== 'text' ? 'media-bubble' : ''}`}>
        {/* Group sender name */}
        {isGroup && !isMine && (
          <span className="msg-sender-name">{getSenderName()}</span>
        )}

        {/* Reply quote */}
        {msg.replyTo && (
          <div className="msg-reply-quote">
            <span>↩ Replied</span>
          </div>
        )}

        {renderContent()}

        {/* Meta: time + ticks */}
        <div className="msg-meta">
          {msg.isEdited && <span className="msg-edited">edited</span>}
          <span className="msg-time">{formatMessageTime(msg.createdAt)}</span>
          {renderTicks()}
        </div>

        {/* Reactions display */}
        {msg.reactions?.length > 0 && (
          <div className="msg-reactions">
            {Object.entries(
              msg.reactions.reduce((acc, r) => { acc[r.emoji] = (acc[r.emoji]||0)+1; return acc; }, {})
            ).map(([emoji, count]) => (
              <span key={emoji} className="reaction-chip" onClick={() => addReaction(msgId, msg.roomId, myReaction?.emoji === emoji ? null : emoji)}>
                {emoji}{count > 1 && <span className="reaction-count">{count}</span>}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Hover actions */}
      {showActions && (
        <div className={`msg-actions ${isMine ? 'mine' : 'theirs'}`}>
          <button onClick={() => setShowReactions(v => !v)} title="React">😊</button>
          <button onClick={() => onReply(msg)} title="Reply">↩</button>
          {isMine && (
            <button onClick={() => deleteMessage(msgId, msg.roomId, true)} title="Delete">🗑</button>
          )}
        </div>
      )}

      {/* Emoji picker */}
      {showReactions && (
        <div className={`reaction-picker ${isMine ? 'mine' : 'theirs'}`}>
          {REACTIONS.map(e => (
            <button key={e} onClick={() => { addReaction(msgId, msg.roomId, myReaction?.emoji === e ? null : e); setShowReactions(false); }}>
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
