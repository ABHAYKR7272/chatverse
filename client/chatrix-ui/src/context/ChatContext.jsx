import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getSocket } from '../utils/socket';
import { useAuth } from './AuthContext';
import api from '../utils/api';

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState({}); // roomId -> []
  const [onlineUsers, setOnlineUsers] = useState({});
  const [typingUsers, setTypingUsers] = useState({}); // roomId -> { userId: username }
  const [loading, setLoading] = useState(false);
  const typingTimers = useRef({});

  // Load chats on mount
  useEffect(() => {
    if (user) loadChats();
  }, [user]);

  // Socket events
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    if (!socket) return;

    const handlers = {
      new_message: (msg) => {
        setMessages(prev => ({
          ...prev,
          [msg.roomId]: [...(prev[msg.roomId] || []), msg]
        }));
        setChats(prev => prev.map(c => {
          if (c.roomId === msg.roomId) {
            const isActive = activeChat?.roomId === msg.roomId;
            return {
              ...c,
              lastMessageText: msg.type === 'text' ? msg.content : `📎 ${msg.type}`,
              lastMessageType: msg.type,
              lastMessageAt: msg.createdAt,
              lastMessageSender: msg.senderId,
              unreadCount: (msg.senderId !== user.id && !isActive) ? ((c.unreadCount || 0) + 1) : 0
            };
          }
          return c;
        }));
      },

      user_typing: ({ userId, username, roomId }) => {
        setTypingUsers(prev => ({
          ...prev,
          [roomId]: { ...(prev[roomId] || {}), [userId]: username }
        }));
        // Auto-clear after 3s
        const key = `${roomId}_${userId}`;
        clearTimeout(typingTimers.current[key]);
        typingTimers.current[key] = setTimeout(() => {
          setTypingUsers(prev => {
            const room = { ...(prev[roomId] || {}) };
            delete room[userId];
            return { ...prev, [roomId]: room };
          });
        }, 3000);
      },

      user_stopped_typing: ({ userId, roomId }) => {
        setTypingUsers(prev => {
          const room = { ...(prev[roomId] || {}) };
          delete room[userId];
          return { ...prev, [roomId]: room };
        });
      },

      messages_read: ({ roomId, userId: readerId }) => {
        if (readerId === user.id) return;
        setMessages(prev => ({
          ...prev,
          [roomId]: (prev[roomId] || []).map(m => ({
            ...m,
            readBy: m.readBy?.some(r => r.user === readerId)
              ? m.readBy
              : [...(m.readBy || []), { user: readerId, readAt: new Date().toISOString() }]
          }))
        }));
      },

      message_reaction: ({ messageId, roomId, userId: reactUserId, emoji, reactions }) => {
        setMessages(prev => ({
          ...prev,
          [roomId]: (prev[roomId] || []).map(m =>
            (m._id === messageId || m.id === messageId) ? { ...m, reactions } : m
          )
        }));
      },

      message_deleted: ({ messageId, roomId, forEveryone }) => {
        if (forEveryone) {
          setMessages(prev => ({
            ...prev,
            [roomId]: (prev[roomId] || []).map(m =>
              (m._id === messageId || m.id === messageId)
                ? { ...m, deletedForEveryone: true, type: 'deleted', content: '' }
                : m
            )
          }));
        }
      },

      user_online: ({ userId }) => {
        setOnlineUsers(prev => ({ ...prev, [userId]: true }));
        setChats(prev => prev.map(c =>
          c.otherUser?.id === userId || c.otherUser?._id === userId
            ? { ...c, otherUser: { ...(c.otherUser || {}), isOnline: true } }
            : c
        ));
      },

      user_offline: ({ userId, lastSeen }) => {
        setOnlineUsers(prev => ({ ...prev, [userId]: false }));
        setChats(prev => prev.map(c =>
          c.otherUser?.id === userId || c.otherUser?._id === userId
            ? { ...c, otherUser: { ...(c.otherUser || {}), isOnline: false, lastSeen } }
            : c
        ));
      }
    };

    Object.entries(handlers).forEach(([event, handler]) => socket.on(event, handler));
    return () => Object.entries(handlers).forEach(([event, handler]) => socket.off(event, handler));
  }, [user, activeChat]);

  const loadChats = async () => {
    setLoading(true);
    try {
      const res = await api.get('/chats');
      setChats(res.data);
    } finally { setLoading(false); }
  };

  const openChat = useCallback(async (chat) => {
    setActiveChat(chat);
    const roomId = chat.roomId;

    // Join socket room
    const socket = getSocket();
    if (socket) socket.emit('join_room', { roomId });

    // Reset unread
    setChats(prev => prev.map(c => c.roomId === roomId ? { ...c, unreadCount: 0 } : c));
    socket?.emit('mark_read', { roomId });

    // Load messages if not cached
    if (!messages[roomId]) {
      try {
        const res = await api.get(`/chats/${roomId}/messages`);
        setMessages(prev => ({ ...prev, [roomId]: res.data }));
      } catch {}
    }
  }, [messages]);

  const sendMessage = useCallback((roomId, data) => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit('send_message', { roomId, ...data });
  }, []);

  const sendTyping = useCallback((roomId, isTyping) => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit(isTyping ? 'typing_start' : 'typing_stop', { roomId });
  }, []);

  const createDirectChat = async (targetUserId) => {
    const res = await api.post('/chats/direct', { targetUserId });
    const chat = res.data;
    setChats(prev => {
      const exists = prev.find(c => c.roomId === chat.roomId);
      return exists ? prev.map(c => c.roomId === chat.roomId ? chat : c) : [chat, ...prev];
    });
    return chat;
  };

  const createGroup = async (data) => {
    const res = await api.post('/chats/group', data);
    setChats(prev => [res.data, ...prev]);
    return res.data;
  };

  const addReaction = async (messageId, roomId, emoji) => {
    const socket = getSocket();
    socket?.emit('add_reaction', { messageId, roomId, emoji });
  };

  const deleteMessage = async (messageId, roomId, forEveryone) => {
    const socket = getSocket();
    socket?.emit('delete_message', { messageId, roomId, forEveryone });
  };

  return (
    <ChatContext.Provider value={{
      chats, setChats, activeChat, setActiveChat: openChat,
      messages, onlineUsers, typingUsers,
      loading, loadChats, sendMessage, sendTyping,
      createDirectChat, createGroup, addReaction, deleteMessage
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => useContext(ChatContext);
