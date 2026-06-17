// MongoDB-backed store - used when MONGODB_URI is set and connected
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Chat = require('../models/Chat');
const Message = require('../models/Message');

function toPlain(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  obj.id = String(obj._id);
  return obj;
}

class MongoStore {
  // ---- USERS ----
  async createUser({ username, email, password, about }) {
    const existing = await User.findOne({ email });
    if (existing) throw new Error('Email already exists');
    const user = await User.create({ username, email, password, about });
    const obj = user.toObject();
    obj.id = String(obj._id);
    return obj; // includes hashed password internally, stripped by callers
  }

  async findUserByEmail(email) {
    const user = await User.findOne({ email }).select('+password');
    return toPlain(user);
  }

  async findUserById(id) {
    if (!id) return null;
    try {
      const user = await User.findById(id).select('+password');
      return toPlain(user);
    } catch { return null; }
  }

  async updateUser(id, updates) {
    const user = await User.findByIdAndUpdate(id, updates, { new: true });
    return toPlain(user);
  }

  async searchUsers(query, excludeId) {
    const users = await User.find({
      _id: { $ne: excludeId },
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    }).limit(20);
    return users.map(u => this.safeUser(toPlain(u)));
  }

  safeUser(user) {
    if (!user) return null;
    const { password, __v, ...safe } = user;
    return safe;
  }

  // ---- CHATS ----
  async findOrCreateDirectChat(userId1, userId2) {
    const roomId = [userId1, userId2].sort().join('_');
    let chat = await Chat.findOne({ roomId });
    if (!chat) {
      chat = await Chat.create({
        type: 'direct', roomId,
        participants: [userId1, userId2],
        unreadCounts: {}
      });
      // Add each other to contacts
      await User.findByIdAndUpdate(userId1, { $addToSet: { contacts: userId2 } });
      await User.findByIdAndUpdate(userId2, { $addToSet: { contacts: userId1 } });
    }
    return toPlain(chat);
  }

  async createGroupChat({ name, description, members, admins, createdBy, avatar }) {
    const roomId = 'grp_' + require('uuid').v4();
    const chat = await Chat.create({
      type: 'group', roomId, name, description,
      avatar: avatar || null,
      participants: members,
      admins: admins || [createdBy],
      createdBy,
      unreadCounts: {}
    });
    return toPlain(chat);
  }

  async getUserChats(userId) {
    const chats = await Chat.find({ participants: userId, isActive: true })
      .sort({ lastMessageAt: -1, createdAt: -1 });
    return chats.map(toPlain);
  }

  async getChatById(roomId) {
    const chat = await Chat.findOne({ roomId });
    return toPlain(chat);
  }

  // ---- MESSAGES ----
  async createMessage({ roomId, senderId, content, type, replyToId, mediaUrl, mediaName, mediaSize, mediaMimeType, mediaDuration }) {
    const msg = await Message.create({
      roomId, sender: senderId, content: content || '',
      type: type || 'text',
      mediaUrl: mediaUrl || null,
      mediaName: mediaName || null,
      mediaSize: mediaSize || null,
      mediaMimeType: mediaMimeType || null,
      mediaDuration: mediaDuration || null,
      replyTo: replyToId || null,
      deliveredTo: [senderId],
      readBy: [{ user: senderId, readAt: new Date() }]
    });

    const chat = await Chat.findOne({ roomId });
    if (chat) {
      chat.lastMessage = msg._id;
      chat.lastMessageAt = msg.createdAt;
      chat.lastMessageText = type === 'text' ? (content || '') : `📎 ${type}`;
      chat.lastMessageType = type;
      chat.lastMessageSender = senderId;
      const participants = chat.participants || [];
      participants.forEach(uid => {
        const uidStr = String(uid);
        if (uidStr !== String(senderId)) {
          const current = chat.unreadCounts.get(uidStr) || 0;
          chat.unreadCounts.set(uidStr, current + 1);
        }
      });
      await chat.save();
    }

    const obj = msg.toObject();
    obj.id = String(obj._id);
    obj.senderId = String(obj.sender);
    return obj;
  }

  async getMessages(roomId, page = 1, limit = 50) {
    const skip = Math.max(0, (page - 1) * limit);
    const msgs = await Message.find({ roomId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    return msgs.reverse().map(m => {
      const obj = m.toObject();
      obj.id = String(obj._id);
      obj.senderId = String(obj.sender);
      return obj;
    });
  }

  async markMessagesRead(roomId, userId) {
    await Message.updateMany(
      { roomId, 'readBy.user': { $ne: userId } },
      { $push: { readBy: { user: userId, readAt: new Date() } } }
    );
    const chat = await Chat.findOne({ roomId });
    if (chat) {
      chat.unreadCounts.set(String(userId), 0);
      await chat.save();
    }
  }

  async addReaction(messageId, roomId, userId, emoji) {
    const msg = await Message.findById(messageId);
    if (!msg) return null;
    msg.reactions = msg.reactions.filter(r => String(r.user) !== String(userId));
    if (emoji) msg.reactions.push({ user: userId, emoji });
    await msg.save();
    return msg.toObject();
  }

  async deleteMessage(messageId, roomId, forEveryone, userId) {
    const msg = await Message.findById(messageId);
    if (!msg) return null;
    if (forEveryone) {
      msg.deletedForEveryone = true;
      msg.content = '';
      msg.mediaUrl = null;
      msg.type = 'deleted';
    } else {
      if (!msg.deletedFor.includes(userId)) msg.deletedFor.push(userId);
    }
    await msg.save();
    return msg.toObject();
  }

  async addContact(userId, contactId) {
    await User.findByIdAndUpdate(userId, { $addToSet: { contacts: contactId } });
  }

  async getUserContacts(userId) {
    const user = await User.findById(userId).populate('contacts');
    if (!user) return [];
    return user.contacts.map(c => this.safeUser(toPlain(c)));
  }
}

module.exports = new MongoStore();
