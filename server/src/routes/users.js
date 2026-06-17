const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('../middleware/auth');
const store = require('../utils/store');

// Multer config for avatar
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/avatars');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `avatar_${uuidv4()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'));
  }
});

// GET /api/users/search?q=
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 1) return res.json([]);
    const results = await store.searchUsers(q.trim(), req.user._id || req.user.id);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// GET /api/users/contacts
router.get('/contacts', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const contacts = await store.getUserContacts(userId);
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get contacts' });
  }
});

// POST /api/users/contacts/add
router.post('/contacts/add', authMiddleware, async (req, res) => {
  try {
    const { contactId } = req.body;
    const userId = req.user._id || req.user.id;
    if (!contactId) return res.status(400).json({ error: 'contactId required' });
    const contact = await store.findUserById(contactId);
    if (!contact) return res.status(404).json({ error: 'User not found' });
    await store.addContact(userId, contactId);
    const { password, ...safe } = contact;
    res.json({ success: true, contact: safe });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add contact' });
  }
});

// GET /api/users/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const user = await store.findUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { password, ...safe } = user;
    res.json(safe);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// PUT /api/users/profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { username, about, phone } = req.body;
    const userId = req.user._id || req.user.id;
    const updates = {};
    if (username?.trim()) updates.username = username.trim();
    if (about !== undefined) updates.about = about.substring(0, 139);
    if (phone !== undefined) updates.phone = phone;
    const updated = await store.updateUser(userId, updates);
    const { password, ...safe } = updated;
    res.json(safe);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// POST /api/users/avatar
router.post('/avatar', authMiddleware, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const userId = req.user._id || req.user.id;
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    await store.updateUser(userId, { avatar: avatarUrl });
    res.json({ success: true, avatar: avatarUrl });
  } catch (err) {
    res.status(500).json({ error: 'Avatar upload failed' });
  }
});

// PUT /api/users/settings
router.put('/settings', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { settings } = req.body;
    const user = await store.findUserById(userId);
    const updatedSettings = { ...user.settings, ...settings };
    await store.updateUser(userId, { settings: updatedSettings });
    res.json({ success: true, settings: updatedSettings });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;
