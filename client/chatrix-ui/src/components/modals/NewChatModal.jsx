import { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import Avatar from '../shared/Avatar';
import api from '../../utils/api';

export default function NewChatModal({ onClose }) {
  const { createDirectChat, setActiveChat } = useChat();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addedIds, setAddedIds] = useState(new Set());

  const search = async (q) => {
    setQuery(q);
    if (q.trim().length < 1) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await api.get(`/users/search?q=${encodeURIComponent(q)}`);
      setResults(res.data);
    } catch {} finally { setLoading(false); }
  };

  const handleAddContact = async (u) => {
    try {
      await api.post('/users/contacts/add', { contactId: u._id || u.id });
      setAddedIds(prev => new Set([...prev, u._id || u.id]));
    } catch {}
  };

  const handleOpenChat = async (u) => {
    try {
      await api.post('/users/contacts/add', { contactId: u._id || u.id });
      const chat = await createDirectChat(u._id || u.id);
      setActiveChat(chat);
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-header teal">
          <button className="modal-back" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="white">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
          </button>
          <h2>New Chat</h2>
        </div>

        <div className="modal-search-bar">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="#8696A0">
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <input
            autoFocus
            value={query}
            onChange={e => search(e.target.value)}
            placeholder="Search name or email"
          />
          {query && <button className="clear-btn" onClick={() => { setQuery(''); setResults([]); }}>✕</button>}
        </div>

        <div className="modal-list">
          {loading && (
            <div className="modal-loading">
              <div className="spinner-sm" /><span>Searching...</span>
            </div>
          )}
          {!loading && query.length > 0 && results.length === 0 && (
            <div className="modal-empty">
              <span>🔍</span>
              <p>No users found for "{query}"</p>
            </div>
          )}
          {!loading && query.length === 0 && (
            <div className="modal-hint">
              <span>👤</span>
              <p>Search for people to start chatting</p>
            </div>
          )}
          {results.map(u => {
            const uid = u._id || u.id;
            const isAdded = addedIds.has(uid);
            return (
              <div key={uid} className="modal-user-item" onClick={() => handleOpenChat(u)}>
                <Avatar user={u} size={46} />
                <div className="mui-info">
                  <span className="mui-name">{u.username}</span>
                  <span className="mui-sub">{u.about || u.email}</span>
                </div>
                <button
                  className={`mui-add-btn ${isAdded ? 'added' : ''}`}
                  onClick={e => { e.stopPropagation(); handleAddContact(u); }}
                >
                  {isAdded ? '✓' : '+'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
