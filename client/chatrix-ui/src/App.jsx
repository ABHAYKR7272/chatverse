import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import { CallProvider } from './context/CallContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChatPage from './pages/ChatPage';
import './styles/globals.css';
import './styles/auth.css';
import './styles/sidebar.css';
import './styles/chat.css';
import './styles/messages.css';
import './styles/calls.css';
import './styles/modals.css';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="app-loading">
      <div className="app-loading-logo">
        <svg viewBox="0 0 50 50" width="56" height="56">
          <circle cx="25" cy="25" r="25" fill="#25D366"/>
          <path d="M25 10C16.7 10 10 16.7 10 25c0 3.3.96 6.37 2.6 8.94L10 40l6.3-2.52A14.9 14.9 0 0 0 25 40c8.3 0 15-6.7 15-15S33.3 10 25 10zm7.5 20.5c-.35.98-1.75 1.79-2.45 1.9-.63.1-1.43.14-2.3-.14-.53-.17-1.22-.4-2.1-.79-3.7-1.59-6.1-5.3-6.28-5.55-.17-.25-1.4-1.87-1.4-3.57s.88-2.54 1.2-2.88c.31-.35.68-.44.9-.44h.65c.21 0 .5.08.78.6.3.53 1.02 2.5 1.12 2.68.1.18.17.4.03.65-.13.25-.2.4-.38.62-.18.22-.38.48-.54.65-.18.18-.37.38-.16.74.21.36.94 1.55 2.02 2.5 1.39 1.25 2.56 1.64 2.92 1.82.35.18.56.15.77-.09.21-.24.9-.96 1.14-1.29.24-.33.48-.27.8-.16.33.1 2.08.98 2.43 1.16.36.18.6.27.7.42.09.15.09.87-.27 1.77z" fill="white"/>
        </svg>
        <div className="app-loading-spinner" />
      </div>
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return !user ? children : <Navigate to="/chat" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/chat" element={
            <ProtectedRoute>
              <ChatProvider>
                <CallProvider>
                  <ChatPage />
                </CallProvider>
              </ChatProvider>
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/chat" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
