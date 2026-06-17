// In-memory store - used when MongoDB is not available (demo mode)
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

class InMemoryStore {
  constructor() {
    this.users = new Map();       // id -> user
    this.chats = new Map();       // roomId -> chat
    this.messages = new Map();    // roomId -> [messages]
    this.userChats = new Map();   // userId -> [roomIds]
    this._usedEmails = new Map(); // email -> userId
  }

  // ---- USERS ----
  async createUser({ username, email, password, about }) {
    if (this._usedEmails.has(email)) throw new Error('Email already exists');
    const id = uuidv4();
    const colors = ['#25D366','#128C7E','#075E54','#34B7F1','#9C27B0','#FF5722','#00BCD4'];
    const hash = await bcrypt.hash(password, 12);
    const user = {
      _id: id, id,
      username, email,
      password: hash,
      avatar: null,
      avatarColor: colors[Math.floor(Math.random() * colors.length)],
      about: about || 'Hey there! I am using CHATRIX.',
      isOnline: false,
      lastSeen: new Date().toISOString(),
      contacts: [],
      blockedUsers: [],
      settings: {
        readReceipts: true,
        lastSeenVisible: 'everyone',
        onlineStatusVisible: true,
        notificationsEnabled: true
      },
      createdAt: new Date().toISOString()
    };
    this.users.set(id, user);
    this._usedEmails.set(email, id);
    this.userChats.set(id, []);
    return user;
  }

  async findUserByEmail(email) {
    const id = this._usedEmails.get(email);
    return id ? this.users.get(id) : null;
  }

  async findUserById(id) { return this.users.get(id) || null; }

  async updateUser(id, updates) {
    const user = this.users.get(id);
    if (!user) return null;
    Object.assign(user, updates);
    return user;
  }

  async searchUsers(query, excludeId) {
    const q = query.toLowerCase();
    return [...this.users.values()].filter(u =>
      u.id !== excludeId &&
      (u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    ).map(u => { const { password, ...safe } = u; return safe; });
  }

  safeUser(user) {
    if (!user) return null;
    const { password, ...safe } = user;
    return safe;
  }

  // ---- CHATS ----
  async findOrCreateDirectChat(userId1, userId2) {
    const roomId = [userId1, userId2].sort().join('_');
    if (this.chats.has(roomId)) return this.chats.get(roomId);
    const chat = {
      _id: roomId, roomId, type: 'direct',
      participants: [userId1, userId2],
      lastMessage: null, lastMessageAt: null,
      lastMessageText: '', lastMessageType: 'text',
      lastMessageSender: null,
      unreadCounts: {}, createdAt: new Date().toISOString()
    };
    this.chats.set(roomId, chat);
    if (!this.messages.has(roomId)) this.messages.set(roomId, []);
    // Add to each user's chat list
    [userId1, userId2].forEach(uid => {
      const list = this.userChats.get(uid) || [];
      if (!list.includes(roomId)) { list.push(roomId); this.userChats.set(uid, list); }
    });
    return chat;
  }

  async createGroupChat({ name, description, members, admins, createdBy, avatar }) {
    const roomId = 'grp_' + uuidv4();
    const colors = ['#25D366','#128C7E','#075E54','#34B7F1'];
    const chat = {
      _id: roomId, roomId, type: 'group',
      name, description: description || '',
      avatar: avatar || null,
      avatarColor: colors[Math.floor(Math.random() * colors.length)],
      participants: members,
      admins: admins || [createdBy],
      createdBy,
      lastMessage: null, lastMessageAt: null,
      lastMessageText: '', lastMessageType: 'text',
      unreadCounts: {}, createdAt: new Date().toISOString()
    };
    this.chats.set(roomId, chat);
    this.messages.set(roomId, []);
    members.forEach(uid => {
      const list = this.userChats.get(uid) || [];
      if (!list.includes(roomId)) { list.push(roomId); this.userChats.set(uid, list); }
    });
    return chat;
  }

  async getUserChats(userId) {
    const roomIds = this.userChats.get(userId) || [];
    return roomIds.map(rid => this.chats.get(rid)).filter(Boolean)
      .sort((a, b) => new Date(b.lastMessageAt || b.createdAt) - new Date(a.lastMessageAt || a.createdAt));
  }

  async getChatById(roomId) { return this.chats.get(roomId) || null; }

  // ---- MESSAGES ----
  async createMessage({ roomId, senderId, content, type, replyToId, mediaUrl, mediaName, mediaSize, mediaMimeType, mediaDuration }) {
    const id = uuidv4();
    const msg = {
      _id: id, id, roomId,
      sender: senderId, senderId,
      content: content || '',
      type: type || 'text',
      mediaUrl: mediaUrl || null,
      mediaName: mediaName || null,
      mediaSize: mediaSize || null,
      mediaMimeType: mediaMimeType || null,
      mediaDuration: mediaDuration || null,
      replyTo: replyToId || null,
      deliveredTo: [senderId],
      readBy: [{ user: senderId, readAt: new Date().toISOString() }],
      reactions: [],
      starredBy: [],
      deletedForEveryone: false,
      deletedFor: [],
      isEdited: false,
      createdAt: new Date().toISOString()
    };

    const list = this.messages.get(roomId) || [];
    list.push(msg);
    this.messages.set(roomId, list);

    // Update chat last message
    const chat = this.chats.get(roomId);
    if (chat) {
      chat.lastMessage = id;
      chat.lastMessageAt = msg.createdAt;
      chat.lastMessageText = type === 'text' ? (content || '') : `📎 ${type}`;
      chat.lastMessageType = type;
      chat.lastMessageSender = senderId;
      // Increment unread for all except sender
      const participants = chat.participants || [];
      participants.forEach(uid => {
        if (uid !== senderId) {
          chat.unreadCounts[uid] = (chat.unreadCounts[uid] || 0) + 1;
        }
      });
    }
    return msg;
  }

  async getMessages(roomId, page = 1, limit = 50) {
    const all = this.messages.get(roomId) || [];
    const start = Math.max(0, all.length - page * limit);
    const end = all.length - (page - 1) * limit;
    return all.slice(start, end);
  }

  async markMessagesRead(roomId, userId) {
    const msgs = this.messages.get(roomId) || [];
    msgs.forEach(msg => {
      if (!msg.readBy.find(r => r.user === userId)) {
        msg.readBy.push({ user: userId, readAt: new Date().toISOString() });
      }
    });
    const chat = this.chats.get(roomId);
    if (chat && chat.unreadCounts) chat.unreadCounts[userId] = 0;
  }

  async addReaction(messageId, roomId, userId, emoji) {
    const msgs = this.messages.get(roomId) || [];
    const msg = msgs.find(m => m._id === messageId || m.id === messageId);
    if (!msg) return null;
    msg.reactions = msg.reactions.filter(r => r.user !== userId);
    if (emoji) msg.reactions.push({ user: userId, emoji });
    return msg;
  }

  async deleteMessage(messageId, roomId, forEveryone, userId) {
    const msgs = this.messages.get(roomId) || [];
    const msg = msgs.find(m => m._id === messageId || m.id === messageId);
    if (!msg) return null;
    if (forEveryone) {
      msg.deletedForEveryone = true;
      msg.content = '';
      msg.mediaUrl = null;
      msg.type = 'deleted';
    } else {
      if (!msg.deletedFor.includes(userId)) msg.deletedFor.push(userId);
    }
    return msg;
  }

  async addContact(userId, contactId) {
    const user = this.users.get(userId);
    if (!user) return;
    if (!user.contacts.includes(contactId)) user.contacts.push(contactId);
  }

  async getUserContacts(userId) {
    const user = this.users.get(userId);
    if (!user) return [];
    return user.contacts.map(cid => {
      const c = this.users.get(cid);
      if (!c) return null;
      const { password, ...safe } = c;
      return safe;
    }).filter(Boolean);
  }
}

module.exports = new InMemoryStore();
