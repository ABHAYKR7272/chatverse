import { useState, useRef } from 'react';
import { useChat } from '../../context/ChatContext';
import Avatar from '../shared/Avatar';
import api from '../../utils/api';

export default function CreateGroupModal({ onClose }) {
  const { createGroup, setActiveChat } = useChat();
  const [step, setStep] = useState(1); // 1=select members, 2=group info
  const [contacts, setContacts] = useState([]);
  const [loadedContacts, setLoadedContacts] = useState(false);
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const nameRef = useRef();

  const loadContacts = async () => {
    if (loadedContacts) return;
    try {
      const res = await api.get('/users/contacts');
      setContacts(res.data);
      setLoadedContacts(true);
    } catch {}
  };

  useState(() => { loadContacts(); }, []);

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const filtered = contacts.filter(c =>
    (c.username || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleNext = () => {
    if (selected.length === 0) return;
    setStep(2);
    setTimeout(() => nameRef.current?.focus(), 100);
  };

  const handleCreate = async () => {
    if (!groupName.trim()) return;
    setCreating(true);
    try {
      const chat = await createGroup({ name: groupName.trim(), description: groupDesc, members: selected });
      setActiveChat(chat);
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create group');
    } finally { setCreating(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        {step === 1 ? (
          <>
            <div className="modal-header teal">
              <button className="modal-back" onClick={onClose}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="white">
                  <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
                </svg>
              </button>
              <div>
                <h2>New Group</h2>
                <p className="modal-header-sub">Add participants</p>
              </div>
              {selected.length > 0 && (
                <button className="modal-next-btn" onClick={handleNext}>Next →</button>
              )}
            </div>

            {/* Selected chips */}
            {selected.length > 0 && (
              <div className="selected-chips">
                {selected.map(id => {
                  const c = contacts.find(x => (x._id||x.id) === id);
                  return c ? (
                    <div key={id} className="chip">
                      <Avatar user={c} size={28} />
                      <span>{c.username}</span>
                      <button onClick={() => toggleSelect(id)}>✕</button>
                    </div>
                  ) : null;
                })}
              </div>
            )}

            <div className="modal-search-bar">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="#8696A0">
                <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts" />
            </div>

            <div className="modal-list">
              {filtered.length === 0 && (
                <div className="modal-empty"><span>👥</span><p>No contacts found</p></div>
              )}
              {filtered.map(c => {
                const cid = c._id || c.id;
                const isSel = selected.includes(cid);
                return (
                  <div key={cid} className={`modal-user-item ${isSel ? 'selected' : ''}`} onClick={() => toggleSelect(cid)}>
                    <Avatar user={c} size={46} />
                    <div className="mui-info">
                      <span className="mui-name">{c.username}</span>
                      <span className="mui-sub">{c.about || ''}</span>
                    </div>
                    <div className={`select-circle ${isSel ? 'checked' : ''}`}>
                      {isSel && <span>✓</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div className="modal-header teal">
              <button className="modal-back" onClick={() => setStep(1)}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="white">
                  <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
                </svg>
              </button>
              <h2>New Group</h2>
            </div>

            <div className="group-info-form">
              <div className="group-avatar-placeholder">
                <span>📷</span>
              </div>

              <div className="group-name-input">
                <input
                  ref={nameRef}
                  value={groupName}
                  onChange={e => setGroupName(e.target.value.substring(0, 50))}
                  placeholder="Group name (required)"
                  maxLength={50}
                />
                <span className="char-count">{groupName.length}/50</span>
              </div>

              <div className="group-desc-input">
                <input
                  value={groupDesc}
                  onChange={e => setGroupDesc(e.target.value.substring(0, 100))}
                  placeholder="Group description (optional)"
                />
              </div>

              <div className="group-members-preview">
                <p>{selected.length} participant{selected.length !== 1 ? 's' : ''}</p>
                <div className="member-avatars">
                  {selected.slice(0, 5).map(id => {
                    const c = contacts.find(x => (x._id||x.id) === id);
                    return c ? <Avatar key={id} user={c} size={32} /> : null;
                  })}
                  {selected.length > 5 && <span className="more-members">+{selected.length - 5}</span>}
                </div>
              </div>

              <button
                className="create-group-btn"
                onClick={handleCreate}
                disabled={!groupName.trim() || creating}
              >
                {creating ? 'Creating...' : '✓ Create Group'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
