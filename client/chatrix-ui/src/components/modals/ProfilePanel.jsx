import { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../shared/Avatar';
import api from '../../utils/api';

export default function ProfilePanel({ onClose }) {
  const { user, updateUser, logout } = useAuth();
  const [editName, setEditName] = useState(false);
  const [editAbout, setEditAbout] = useState(false);
  const [username, setUsername] = useState(user?.username || '');
  const [about, setAbout] = useState(user?.about || '');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef();

  const saveField = async (field, value) => {
    setSaving(true);
    try {
      const res = await api.put('/users/profile', { [field]: value });
      updateUser(res.data);
      if (field === 'username') setEditName(false);
      if (field === 'about') setEditAbout(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Save failed');
    } finally { setSaving(false); }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await api.post('/users/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      updateUser({ avatar: res.data.avatar });
    } catch { alert('Avatar upload failed'); }
    finally { setUploadingAvatar(false); }
  };

  return (
    <div className="side-panel-overlay" onClick={onClose}>
      <div className="side-panel" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sp-header">
          <button className="sp-back" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="white">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
          </button>
          <h2>Profile</h2>
        </div>

        {/* Avatar */}
        <div className="sp-avatar-section">
          <div className="sp-avatar-wrap" onClick={() => avatarInputRef.current.click()}>
            <Avatar user={user} size={130} />
            <div className="sp-avatar-overlay">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="white">
                <path d="M12 15.2A3.2 3.2 0 0 1 8.8 12 3.2 3.2 0 0 1 12 8.8 3.2 3.2 0 0 1 15.2 12 3.2 3.2 0 0 1 12 15.2M18.4 2l1.6 1.8H22C23.1 3.8 24 4.7 24 5.8V20c0 1.1-.9 2-2 2H2c-1.1 0-2-.9-2-2V5.8c0-1.1.9-2 2-2h2l1.6-1.8h12.8M12 7C9.24 7 7 9.24 7 12s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5z"/>
              </svg>
              <span>{uploadingAvatar ? 'Uploading...' : 'CHANGE\nPHOTO'}</span>
            </div>
          </div>
          <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
        </div>

        {/* Info */}
        <div className="sp-info">
          {/* Name */}
          <div className="sp-field">
            <label>Your name</label>
            {editName ? (
              <div className="sp-edit-row">
                <input
                  autoFocus
                  value={username}
                  onChange={e => setUsername(e.target.value.substring(0, 30))}
                  maxLength={30}
                />
                <div className="sp-edit-actions">
                  <button onClick={() => { setUsername(user.username); setEditName(false); }}>✕</button>
                  <button className="confirm" onClick={() => saveField('username', username)} disabled={saving}>✓</button>
                </div>
              </div>
            ) : (
              <div className="sp-value-row" onClick={() => setEditName(true)}>
                <span>{user?.username}</span>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="#8696A0">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                </svg>
              </div>
            )}
            <p className="sp-hint">This is not your username or pin. This name will be visible to your CHATRIX contacts.</p>
          </div>

          {/* About */}
          <div className="sp-field">
            <label>About</label>
            {editAbout ? (
              <div className="sp-edit-row">
                <input
                  autoFocus
                  value={about}
                  onChange={e => setAbout(e.target.value.substring(0, 139))}
                  maxLength={139}
                />
                <div className="sp-edit-actions">
                  <button onClick={() => { setAbout(user.about); setEditAbout(false); }}>✕</button>
                  <button className="confirm" onClick={() => saveField('about', about)} disabled={saving}>✓</button>
                </div>
              </div>
            ) : (
              <div className="sp-value-row" onClick={() => setEditAbout(true)}>
                <span className={!user?.about ? 'muted' : ''}>{user?.about || 'Tap to add About'}</span>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="#8696A0">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                </svg>
              </div>
            )}
          </div>

          {/* Phone/Email */}
          <div className="sp-field">
            <label>Email</label>
            <div className="sp-value-row static">
              <span>{user?.email}</span>
            </div>
          </div>
        </div>

        <div className="sp-footer">
          <button className="sp-logout" onClick={logout}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="#EA0038">
              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
            </svg>
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
