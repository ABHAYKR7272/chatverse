const jwt = require('jsonwebtoken');
const store = require('../utils/store');

const JWT_SECRET = process.env.JWT_SECRET || 'chatrix_ultra_secure_jwt_secret_2024_production';

// Track connected users
const socketToUser = new Map();   // socketId -> userId
const userToSocket = new Map();   // userId -> Set<socketId>
const userToRooms = new Map();    // userId -> Set<roomId>

function getSocketsForUser(userId) {
  return userToSocket.get(userId) || new Set();
}

function emitToUser(io, userId, event, data) {
  const sockets = getSocketsForUser(userId);
  sockets.forEach(sid => io.to(sid).emit(event, data));
}

function setupSocket(io) {
  // Auth middleware for socket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error('Authentication required'));
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await store.findUserById(decoded.id);
      if (!user) return next(new Error('User not found'));
      socket.userId = user._id || user.id;
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    console.log(`🔌 Connected: ${socket.user.username} (${socket.id})`);

    // Register socket
    socketToUser.set(socket.id, userId);
    if (!userToSocket.has(userId)) userToSocket.set(userId, new Set());
    userToSocket.get(userId).add(socket.id);
    if (!userToRooms.has(userId)) userToRooms.set(userId, new Set());

    // Mark user online
    await store.updateUser(userId, { isOnline: true, lastSeen: new Date().toISOString() });

    // Join all user's chat rooms
    const chats = await store.getUserChats(userId);
    chats.forEach(chat => {
      socket.join(chat.roomId);
      userToRooms.get(userId).add(chat.roomId);
    });

    // Notify contacts that user is online
    const userObj = await store.findUserById(userId);
    const contactIds = userObj?.contacts || [];
    contactIds.forEach(cid => {
      emitToUser(io, cid, 'user_online', { userId, lastSeen: new Date().toISOString() });
    });

    socket.emit('connected', { userId, username: socket.user.username });

    // ======== JOIN ROOM ========
    socket.on('join_room', async ({ roomId }) => {
      socket.join(roomId);
      if (userToRooms.has(userId)) userToRooms.get(userId).add(roomId);
    });

    // ======== SEND MESSAGE ========
    socket.on('send_message', async (data) => {
      try {
        const { roomId, content, type = 'text', replyToId, mediaUrl, mediaName, mediaSize, mediaMimeType, mediaDuration } = data;
        if (!roomId) return;
        if (type === 'text' && !content?.trim()) return;

        const msg = await store.createMessage({
          roomId, senderId: userId, content, type,
          replyToId, mediaUrl, mediaName, mediaSize, mediaMimeType, mediaDuration
        });

        const sender = await store.findUserById(userId);
        const fullMsg = { ...msg, senderInfo: store.safeUser(sender) };

        // Emit to everyone in room
        io.to(roomId).emit('new_message', fullMsg);

        // Send delivery confirmation to sender
        socket.emit('message_delivered', { messageId: msg._id || msg.id, roomId });

        // Notify offline users in room (for push notifications - placeholder)
        const chat = await store.getChatById(roomId);
        if (chat) {
          const participants = chat.participants || [];
          participants.forEach(pid => {
            if (pid !== userId) {
              const sockets = getSocketsForUser(pid);
              if (sockets.size === 0) {
                // User offline - would trigger push notification here
                console.log(`📱 Push notification would be sent to user ${pid}`);
              }
            }
          });
        }
      } catch (err) {
        console.error('send_message error:', err);
        socket.emit('message_error', { error: 'Failed to send message' });
      }
    });

    // ======== TYPING ========
    socket.on('typing_start', ({ roomId }) => {
      socket.to(roomId).emit('user_typing', { userId, username: socket.user.username, roomId });
    });

    socket.on('typing_stop', ({ roomId }) => {
      socket.to(roomId).emit('user_stopped_typing', { userId, roomId });
    });

    // ======== READ RECEIPTS ========
    socket.on('mark_read', async ({ roomId }) => {
      try {
        await store.markMessagesRead(roomId, userId);
        io.to(roomId).emit('messages_read', { roomId, userId, readAt: new Date().toISOString() });
      } catch (err) {}
    });

    // ======== REACTIONS ========
    socket.on('add_reaction', async ({ messageId, roomId, emoji }) => {
      try {
        const msg = await store.addReaction(messageId, roomId, userId, emoji);
        if (msg) io.to(roomId).emit('message_reaction', { messageId, roomId, userId, emoji, reactions: msg.reactions });
      } catch (err) {}
    });

    // ======== DELETE MESSAGE ========
    socket.on('delete_message', async ({ messageId, roomId, forEveryone }) => {
      try {
        const msg = await store.deleteMessage(messageId, roomId, forEveryone, userId);
        if (msg) {
          if (forEveryone) io.to(roomId).emit('message_deleted', { messageId, roomId, forEveryone: true });
          else socket.emit('message_deleted', { messageId, roomId, forEveryone: false });
        }
      } catch (err) {}
    });

    // ======== ONLINE STATUS REQUEST ========
    socket.on('get_user_status', ({ userIds }) => {
      const statuses = {};
      userIds.forEach(uid => {
        const sockets = getSocketsForUser(uid);
        statuses[uid] = { isOnline: sockets.size > 0 };
      });
      socket.emit('user_statuses', statuses);
    });

    // ======== WebRTC - 1:1 CALL ========
    socket.on('call_initiate', ({ targetUserId, callType, roomId, offer }) => {
      emitToUser(io, targetUserId, 'call_incoming', {
        callerId: userId,
        callerName: socket.user.username,
        callerAvatar: socket.user.avatar,
        callerColor: socket.user.avatarColor,
        callType,
        roomId
      });
    });

    socket.on('call_accept', ({ callerId, roomId, answer }) => {
      emitToUser(io, callerId, 'call_accepted', { roomId, answer, accepterId: userId });
    });

    socket.on('call_reject', ({ callerId, reason = 'declined' }) => {
      emitToUser(io, callerId, 'call_rejected', { userId, reason });
    });

    socket.on('call_end', ({ targetUserId, roomId }) => {
      if (targetUserId) emitToUser(io, targetUserId, 'call_ended', { userId, roomId });
    });

    socket.on('call_busy', ({ callerId }) => {
      emitToUser(io, callerId, 'call_busy', { userId });
    });

    socket.on('call_missed', ({ targetUserId, roomId }) => {
      emitToUser(io, targetUserId, 'call_missed', { callerId: userId, roomId });
    });

    // ======== WebRTC SIGNALING ========
    socket.on('webrtc_offer', ({ targetUserId, offer, roomId }) => {
      emitToUser(io, targetUserId, 'webrtc_offer', { fromId: userId, offer, roomId });
    });

    socket.on('webrtc_answer', ({ targetUserId, answer, roomId }) => {
      emitToUser(io, targetUserId, 'webrtc_answer', { fromId: userId, answer, roomId });
    });

    socket.on('webrtc_ice', ({ targetUserId, candidate }) => {
      emitToUser(io, targetUserId, 'webrtc_ice', { fromId: userId, candidate });
    });

    socket.on('webrtc_renegotiate', ({ targetUserId, offer }) => {
      emitToUser(io, targetUserId, 'webrtc_renegotiate', { fromId: userId, offer });
    });

    // ======== GROUP CALL ========
    socket.on('group_call_join', ({ roomId, callType }) => {
      socket.join(`call_${roomId}`);
      // Notify others in call
      socket.to(`call_${roomId}`).emit('group_call_peer_joined', {
        peerId: userId,
        peerName: socket.user.username,
        peerAvatar: socket.user.avatar,
        callType
      });
      socket.emit('group_call_joined', { roomId });
    });

    socket.on('group_call_leave', ({ roomId }) => {
      socket.leave(`call_${roomId}`);
      socket.to(`call_${roomId}`).emit('group_call_peer_left', { peerId: userId });
    });

    socket.on('group_call_offer', ({ peerId, offer, roomId }) => {
      emitToUser(io, peerId, 'group_call_offer', { fromId: userId, offer, roomId });
    });
    socket.on('group_call_answer', ({ peerId, answer }) => {
      emitToUser(io, peerId, 'group_call_answer', { fromId: userId, answer });
    });
    socket.on('group_call_ice', ({ peerId, candidate }) => {
      emitToUser(io, peerId, 'group_call_ice', { fromId: userId, candidate });
    });

    // ======== DISCONNECT ========
    socket.on('disconnect', async (reason) => {
      console.log(`❌ Disconnected: ${socket.user.username} (${reason})`);

      socketToUser.delete(socket.id);
      const userSockets = userToSocket.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          userToSocket.delete(userId);
          // Mark offline
          const lastSeen = new Date().toISOString();
          await store.updateUser(userId, { isOnline: false, lastSeen });

          // Notify contacts
          const userObj = await store.findUserById(userId);
          const contactIds = userObj?.contacts || [];
          contactIds.forEach(cid => {
            emitToUser(io, cid, 'user_offline', { userId, lastSeen });
          });
        }
      }
    });
  });

  return { getSocketsForUser, emitToUser };
}

module.exports = { setupSocket, getSocketsForUser };
