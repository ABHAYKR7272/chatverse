import { useState } from 'react';
import { useChat } from '../context/ChatContext';
import { useCall } from '../context/CallContext';
import Sidebar from '../components/chat/Sidebar';
import ChatWindow from '../components/chat/ChatWindow';
import CallScreen from '../components/call/CallScreen';
import IncomingCall from '../components/call/IncomingCall';
import NewChatModal from '../components/modals/NewChatModal';
import CreateGroupModal from '../components/modals/CreateGroupModal';
import ProfilePanel from '../components/modals/ProfilePanel';
import SettingsPanel from '../components/modals/SettingsPanel';

export default function ChatPage() {
  const { activeChat, setActiveChat } = useChat();
  const { callState, incomingCall } = useCall();
  const [showNewChat, setShowNewChat] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="chat-page">
      {/* LEFT: Sidebar */}
      <div className={`chat-sidebar-panel ${activeChat ? 'hide-mobile' : ''}`}>
        <Sidebar
          onOpenProfile={() => setShowProfile(true)}
          onNewChat={() => setShowNewChat(true)}
          onCreateGroup={() => setShowCreateGroup(true)}
          onOpenSettings={() => setShowSettings(true)}
        />
      </div>

      {/* RIGHT: Chat area */}
      <div className={`chat-main-panel ${!activeChat ? 'hide-mobile' : ''}`}>
        {activeChat ? (
          <ChatWindow onBack={() => setActiveChat(null)} />
        ) : (
          <div className="chat-welcome">
            <div className="chat-welcome-inner">
              <svg viewBox="0 0 303 172" width="303" height="172" fill="none">
                <path d="M229.565 160.229..." fill="none"/>
              </svg>
              <div className="welcome-logo">
                <svg viewBox="0 0 50 50" width="72" height="72">
                  <circle cx="25" cy="25" r="25" fill="rgba(37,211,102,0.12)"/>
                  <circle cx="25" cy="25" r="22" fill="none" stroke="#25D366" strokeWidth="1.5"/>
                  <path d="M25 10C16.7 10 10 16.7 10 25c0 3.3.96 6.37 2.6 8.94L10 40l6.3-2.52A14.9 14.9 0 0 0 25 40c8.3 0 15-6.7 15-15S33.3 10 25 10zm7.5 20.5c-.35.98-1.75 1.79-2.45 1.9-.63.1-1.43.14-2.3-.14-.53-.17-1.22-.4-2.1-.79-3.7-1.59-6.1-5.3-6.28-5.55-.17-.25-1.4-1.87-1.4-3.57s.88-2.54 1.2-2.88c.31-.35.68-.44.9-.44h.65c.21 0 .5.08.78.6.3.53 1.02 2.5 1.12 2.68.1.18.17.4.03.65-.13.25-.2.4-.38.62-.18.22-.38.48-.54.65-.18.18-.37.38-.16.74.21.36.94 1.55 2.02 2.5 1.39 1.25 2.56 1.64 2.92 1.82.35.18.56.15.77-.09.21-.24.9-.96 1.14-1.29.24-.33.48-.27.8-.16.33.1 2.08.98 2.43 1.16.36.18.6.27.7.42.09.15.09.87-.27 1.77z" fill="#25D366"/>
                </svg>
              </div>
              <h2>CHATRIX Web</h2>
              <p>Send and receive messages without keeping your phone online.<br/>Use CHATRIX on up to 4 linked devices and 1 phone at the same time.</p>
              <div className="welcome-e2e">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="#8696A0"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                Your personal messages are end-to-end encrypted
              </div>
            </div>
          </div>
        )}
      </div>

      {/* OVERLAYS */}
      {callState && <CallScreen />}
      {incomingCall && <IncomingCall />}
      {showNewChat && <NewChatModal onClose={() => setShowNewChat(false)} />}
      {showCreateGroup && <CreateGroupModal onClose={() => setShowCreateGroup(false)} />}
      {showProfile && <ProfilePanel onClose={() => setShowProfile(false)} />}
      {showSettings && (
        <SettingsPanel
          onClose={() => setShowSettings(false)}
          onOpenProfile={() => { setShowSettings(false); setShowProfile(true); }}
        />
      )}
    </div>
  );
}
