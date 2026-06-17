const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('../middleware/auth');
const store = require('../utils/store');

// Multer for media uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'files';
    if (file.mimetype.startsWith('image/')) folder = 'images';
    else if (file.mimetype.startsWith('video/')) folder = 'videos';
    else if (file.mimetype.startsWith('audio/')) folder = 'audio';
    const dir = path.join(__dirname, `../../uploads/${folder}`);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 64 * 1024 * 1024 } }); // 64MB

// GET /api/chats - get all chats for current user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const chats = await store.getUserChats(userId);

    // Populate participant info
    const populated = await Promise.all(chats.map(async chat => {
      if (chat.type === 'direct') {
        const otherId = chat.participants.find(p => p !== userId);
        const other = await store.findUserById(otherId);
        return {
          ...chat,
          otherUser: other ? store.safeUser(other) : null,
          unreadCount: chat.unreadCounts?.[userId] || 0
        };
      }
      return { ...chat, unreadCount: chat.unreadCounts?.[userId] || 0 };
    }));

    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get chats' });
  }
});

// POST /api/chats/direct - open or create direct chat
router.post('/direct', authMiddleware, async (req, res) => {
  try {
    const { targetUserId } = req.body;
    const userId = req.user._id || req.user.id;
    if (!targetUserId) return res.status(400).json({ error: 'targetUserId required' });
    const target = await store.findUserById(targetUserId);
    if (!target) return res.status(404).json({ error: 'User not found' });

    const chat = await store.findOrCreateDirectChat(userId, targetUserId);
    const { password, ...safeTarget } = target;
    res.json({ ...chat, otherUser: safeTarget, unreadCount: 0 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create chat' });
  }
});

// POST /api/chats/group - create group
router.post('/group', authMiddleware, async (req, res) => {
  try {
    const { name, description, members } = req.body;
    const userId = req.user._id || req.user.id;
    if (!name?.trim()) return res.status(400).json({ error: 'Group name required' });
    if (!members || members.length === 0) return res.status(400).json({ error: 'Add at least one member' });

    const allMembers = [...new Set([userId, ...members])];
    const chat = await store.createGroupChat({
      name: name.trim(), description, members: allMembers,
      admins: [userId], createdBy: userId
    });
    res.status(201).json(chat);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// GET /api/chats/:roomId/messages
router.get('/:roomId/messages', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const messages = await store.getMessages(roomId, page, limit);

    // Populate sender info
    const populated = await Promise.all(messages.map(async msg => {
      const sender = await store.findUserById(msg.senderId || msg.sender);
      return {
        ...msg,
        senderInfo: sender ? store.safeUser(sender) : null
      };
    }));

    // Populate replyTo
    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// POST /api/chats/:roomId/mark-read
router.post('/:roomId/mark-read', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id || req.user.id;
    await store.markMessagesRead(roomId, userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark read' });
  }
});

// POST /api/chats/upload - upload media
router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { mimetype, filename, size, originalname } = req.file;

    let folder = 'files';
    if (mimetype.startsWith('image/')) folder = 'images';
    else if (mimetype.startsWith('video/')) folder = 'videos';
    else if (mimetype.startsWith('audio/')) folder = 'audio';

    const url = `/uploads/${folder}/${filename}`;
    res.json({ url, mimetype, size, name: originalname, folder });
  } catch (err) {
    res.status(500).json({ error: 'Upload failed' });
  }
});

// POST /api/chats/:roomId/messages/:msgId/react
router.post('/:roomId/messages/:msgId/react', authMiddleware, async (req, res) => {
  try {
    const { roomId, msgId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id || req.user.id;
    const msg = await store.addReaction(msgId, roomId, userId, emoji);
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    res.json(msg);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add reaction' });
  }
});

// DELETE /api/chats/:roomId/messages/:msgId
router.delete('/:roomId/messages/:msgId', authMiddleware, async (req, res) => {
  try {
    const { roomId, msgId } = req.params;
    const { forEveryone } = req.body;
    const userId = req.user._id || req.user.id;
    const msg = await store.deleteMessage(msgId, roomId, forEveryone, userId);
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    res.json({ success: true, message: msg });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

module.exports = router;
