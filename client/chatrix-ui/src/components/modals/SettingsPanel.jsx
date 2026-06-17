import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../shared/Avatar';
import api from '../../utils/api';

export default function SettingsPanel({ onClose, onOpenProfile }) {
  const { user, updateUser, logout } = useAuth();
  const [settings, setSettings] = useState(user?.settings || {
    readReceipts: true,
    lastSeenVisible: 'everyone',
    onlineStatusVisible: true,
    notificationsEnabled: true
  });
  const [saving, setSaving] = useState(false);

  const updateSetting = async (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    setSaving(true);
    try {
      await api.put('/users/settings', { settings: newSettings });
      updateUser({ settings: newSettings });
    } catch {}
    finally { setSaving(false); }
  };

  const Toggle = ({ value, onChange }) => (
    <div className={`toggle ${value ? 'on' : 'off'}`} onClick={() => onChange(!value)}>
      <div className="toggle-knob" />
    </div>
  );

  const sections = [
    {
      title: 'Privacy',
      items: [
        { label: 'Read receipts', sub: 'If turned off, you won\'t send or receive read receipts', key: 'readReceipts', type: 'toggle' },
        { label: 'Online status', sub: 'Show when you\'re online', key: 'onlineStatusVisible', type: 'toggle' },
        {
          label: 'Last seen', sub: 'Who can see your last seen', key: 'lastSeenVisible', type: 'select',
          options: [{ value: 'everyone', label: 'Everyone' }, { value: 'contacts', label: 'My contacts' }, { value: 'nobody', label: 'Nobody' }]
        }
      ]
    },
    {
      title: 'Notifications',
      items: [
        { label: 'Message notifications', sub: 'Show notifications for new messages', key: 'notificationsEnabled', type: 'toggle' }
      ]
    }
  ];

  return (
    <div className="side-panel-overlay" onClick={onClose}>
      <div className="side-panel" onClick={e => e.stopPropagation()}>
        <div className="sp-header">
          <button className="sp-back" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="white">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
          </button>
          <h2>Settings</h2>
        </div>

        {/* Profile preview */}
        <div className="settings-profile-row" onClick={onOpenProfile}>
          <Avatar user={user} size={56} />
          <div className="settings-profile-info">
            <span className="sp-name">{user?.username}</span>
            <span className="sp-about">{user?.about || 'Hey there! I am using CHATRIX.'}</span>
          </div>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="#8696A0">
            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
          </svg>
        </div>

        <div className="settings-body">
          {sections.map(section => (
            <div key={section.title} className="settings-section">
              <h3 className="settings-section-title">{section.title}</h3>
              {section.items.map(item => (
                <div key={item.key} className="settings-item">
                  <div className="settings-item-text">
                    <span className="si-label">{item.label}</span>
                    <span className="si-sub">{item.sub}</span>
                  </div>
                  {item.type === 'toggle' ? (
                    <Toggle value={settings[item.key]} onChange={v => updateSetting(item.key, v)} />
                  ) : (
                    <select
                      value={settings[item.key]}
                      onChange={e => updateSetting(item.key, e.target.value)}
                      className="settings-select"
                    >
                      {item.options.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
            </div>
          ))}

          <div className="settings-section">
            <h3 className="settings-section-title">Account</h3>
            <button className="settings-danger-btn" onClick={logout}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="#EA0038">
                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
              </svg>
              Log out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
