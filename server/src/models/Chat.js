const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  type: { type: String, enum: ['direct', 'group'], required: true },
  roomId: { type: String, unique: true, required: true },

  // For direct chats
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // For groups
  name: { type: String, default: null },
  description: { type: String, default: '', maxlength: 512 },
  avatar: { type: String, default: null },
  avatarColor: { type: String, default: '#128C7E' },
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  // Last message info (for sidebar preview)
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
  lastMessageAt: { type: Date, default: null },
  lastMessageText: { type: String, default: '' },
  lastMessageSender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  lastMessageType: { type: String, default: 'text' },

  // Muted / archived per user
  mutedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  archivedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  pinnedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // Unread counts per user
  unreadCounts: {
    type: Map,
    of: Number,
    default: {}
  },

  isActive: { type: Boolean, default: true }
}, { timestamps: true });

chatSchema.index({ participants: 1 });
chatSchema.index({ roomId: 1 });
chatSchema.index({ lastMessageAt: -1 });

module.exports = mongoose.model('Chat', chatSchema);
