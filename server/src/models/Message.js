const mongoose = require('mongoose');

const reactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  emoji: { type: String, required: true }
}, { _id: false });

const messageSchema = new mongoose.Schema({
  roomId: { type: String, required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, default: '' },
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'voice', 'file', 'document', 'location', 'deleted', 'system'],
    default: 'text'
  },
  // For media
  mediaUrl: { type: String, default: null },
  mediaThumbnail: { type: String, default: null },
  mediaSize: { type: Number, default: null },
  mediaDuration: { type: Number, default: null }, // seconds for audio/video
  mediaName: { type: String, default: null },
  mediaMimeType: { type: String, default: null },
  mediaWidth: { type: Number, default: null },
  mediaHeight: { type: Number, default: null },

  // Reply
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },

  // Delivery & Read
  deliveredTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  readBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    readAt: { type: Date, default: Date.now }
  }],

  // Reactions (like WhatsApp)
  reactions: [reactionSchema],

  // Starred
  starredBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // Forward
  forwardedFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },

  isEdited: { type: Boolean, default: false },
  editedAt: { type: Date, default: null },
  deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  deletedForEveryone: { type: Boolean, default: false }
}, { timestamps: true });

messageSchema.index({ roomId: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ 'readBy.user': 1 });

module.exports = mongoose.model('Message', messageSchema);
