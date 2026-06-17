import { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import Avatar from '../shared/Avatar';
import { formatChatTime, getMsgPreview } from '../../utils/format';

export default function Sidebar({ onOpenProfile, onNewChat, onCreateGroup, onOpenSettings }) {
  const { user } = useAuth();
  const { chats, activeChat, setActiveChat } = useChat();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all'); // all, unread, groups
  const [showMenu, setShowMenu] = useState(false);
  const { logout } = useAuth();

  const filtered = chats.filter(c => {
    const name = c.type === 'group' ? c.name : c.otherUser?.username;
    const matchSearch = !search || name?.toLowerCase().includes(search.toLowerCase());
    const matchTab = tab === 'all' || (tab === 'unread' && c.unreadCount > 0) || (tab === 'groups' && c.type === 'group');
    return matchSearch && matchTab;
  });

  const getDisplayName = (chat) => {
    if (chat.type === 'group') return chat.name;
    return chat.otherUser?.username || 'Unknown';
  };

  const getPreview = (chat) => {
    if (!chat.lastMessageText && !chat.lastMessageType) return '';
    const isMe = chat.lastMessageSender === user?.id || chat.lastMessageSender === user?._id;
    const prefix = isMe ? 'You: ' : '';
    return prefix + getMsgPreview(chat);
  };

  const isOnline = (chat) => {
    if (chat.type === 'group') return false;
    return chat.otherUser?.isOnline || false;
  };

  return (
    <div className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div className="sb-user" onClick={onOpenProfile} title="Profile">
          <Avatar user={user} size={40} />
        </div>
        <span className="sb-title">CHATRIX</span>
        <div className="sb-actions">
          <button className="sb-icon-btn" onClick={onNewChat} title="New chat">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M19.005 3.175H4.674C3.642 3.175 3 3.789 3 4.821V21.02l3.544-3.514h12.461c1.033 0 2.064-1.06 2.064-2.093V4.821c-.001-1.032-1.032-1.646-2.064-1.646zm-4.989 9.869H7.041V11.1h6.975v1.944zm3-4H7.041V7.1h9.975v1.944z"/>
            </svg>
          </button>
          <button className="sb-icon-btn" onClick={onCreateGroup} title="New group">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
            </svg>
          </button>
          <div className="sb-menu-wrap">
            <button className="sb-icon-btn" onClick={() => setShowMenu(v => !v)} title="Menu">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
              </svg>
            </button>
            {showMenu && (
              <div className="sb-dropdown" onClick={() => setShowMenu(false)}>
                <button onClick={onOpenProfile}>Profile</button>
                <button onClick={onNewChat}>New Chat</button>
                <button onClick={onCreateGroup}>New Group</button>
                <button onClick={onOpenSettings}>Settings</button>
                <hr/>
                <button onClick={logout} className="danger">Log Out</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="sb-search-bar">
        <div className="sb-search-inner">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="#8696A0">
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search or start new chat"
          />
          {search && <button onClick={() => setSearch('')} className="clear-search">✕</button>}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="sb-tabs">
        {['all','unread','groups'].map(t => (
          <button key={t} className={`sb-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t === 'unread' && chats.reduce((sum,c) => sum + (c.unreadCount||0), 0) > 0 && (
              <span className="tab-badge">{chats.reduce((s,c) => s+(c.unreadCount||0),0)}</span>
            )}
          </button>
        ))}
      </div>

      {/* Chat list */}
      <div className="sb-chat-list">
        {filtered.length === 0 && (
          <div className="sb-empty">
            {search ? (
              <><div className="sb-empty-icon">🔍</div><p>No results for "{search}"</p></>
            ) : (
              <><div className="sb-empty-icon">💬</div><p>No chats yet</p><button className="btn-start-chat" onClick={onNewChat}>Start a new chat</button></>
            )}
          </div>
        )}

        {filtered.map(chat => {
          const name = getDisplayName(chat);
          const preview = getPreview(chat);
          const time = formatChatTime(chat.lastMessageAt || chat.createdAt);
          const unread = chat.unreadCount || 0;
          const online = isOnline(chat);
          const isActive = activeChat?.roomId === chat.roomId;

          return (
            <div
              key={chat.roomId}
              className={`chat-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveChat(chat)}
            >
              <div className="ci-avatar-wrap">
                <Avatar user={chat.type === 'group' ? { ...chat, type: 'group' } : chat.otherUser} size={49} />
                {online && <span className="ci-online-dot" />}
              </div>

              <div className="ci-body">
                <div className="ci-row1">
                  <span className="ci-name">{name}</span>
                  <span className={`ci-time ${unread > 0 ? 'unread' : ''}`}>{time}</span>
                </div>
                <div className="ci-row2">
                  <span className="ci-preview">{preview || (chat.type === 'group' ? `${chat.participants?.length || 0} members` : '')}</span>
                  {unread > 0 && <span className="ci-badge">{unread > 99 ? '99+' : unread}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
