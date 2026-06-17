const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    trim: true,
    minlength: [2, 'Username must be at least 2 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  phone: {
    type: String,
    trim: true,
    default: null
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  avatar: { type: String, default: null },
  avatarColor: {
    type: String,
    default: () => {
      const colors = ['#25D366','#128C7E','#075E54','#34B7F1','#ECE5DD','#00BCD4','#9C27B0','#FF5722'];
      return colors[Math.floor(Math.random() * colors.length)];
    }
  },
  about: { type: String, default: 'Hey there! I am using CHATRIX.', maxlength: 139 },
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  contacts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  pushToken: { type: String, default: null },
  settings: {
    readReceipts: { type: Boolean, default: true },
    lastSeenVisible: { type: String, enum: ['everyone','contacts','nobody'], default: 'everyone' },
    onlineStatusVisible: { type: Boolean, default: true },
    notificationsEnabled: { type: Boolean, default: true },
    wallpaper: { type: String, default: null }
  }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove sensitive fields from output
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

// Index for search
userSchema.index({ username: 'text', email: 'text' });
userSchema.index({ email: 1 });
userSchema.index({ isOnline: 1 });

module.exports = mongoose.model('User', userSchema);
