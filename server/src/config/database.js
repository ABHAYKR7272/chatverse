const mongoose = require('mongoose');
const storeSwitcher = require('../utils/store');

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI;

  if (!mongoURI) {
    console.log('⚠️  No MONGODB_URI set — running in DEMO mode (in-memory storage)');
    console.log('⚠️  Data will be LOST on server restart. Set MONGODB_URI for persistence.');
    return null;
  }

  try {
    const conn = await mongoose.connect(mongoURI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Switch active store to MongoDB-backed implementation
    const mongoStore = require('../utils/mongoStore');
    storeSwitcher._setStore(mongoStore);
    console.log('💾 Storage: MongoDB (Persistent)');

    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.log('⚠️  Falling back to DEMO mode (in-memory storage)');
    return null;
  }
};

module.exports = connectDB;
