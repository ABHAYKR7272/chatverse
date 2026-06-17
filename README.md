# CHATRIX v2.0 — Industry-Level WhatsApp Clone

A production-ready, full-stack real-time messaging app.

## Features
- Real-time messaging with Socket.IO
- Voice & Video calls (WebRTC P2P)
- Send Images, Videos, Files, Voice Notes
- Message reactions (👍❤️😂😮😢🙏)
- Read receipts with blue ticks (✓✓)
- Typing indicators & online status
- Reply to messages & delete for everyone
- Group chats with member management
- Profile photo, name, about editing
- Privacy settings (read receipts, last seen)
- Exact WhatsApp dark UI
- Mobile responsive

## Tech Stack
- Frontend: React 18 + Vite + Custom CSS
- Backend: Node.js + Express + Socket.IO
- Auth: JWT + bcryptjs
- Calls: WebRTC (STUN/ICE)
- DB: MongoDB (in-memory fallback for demo)
- Files: Multer (64MB)
- Security: Helmet, CORS, Rate Limiting

## Quick Start

### 1. Start Server
cd server
npm install
node index.js
# Runs on http://localhost:3001

### 2. Start Frontend
cd client/chatrix-ui
npm install
npm run dev
# Opens at http://localhost:5173

## Usage
1. Register at /register
2. Login at /login
3. Click chat icon to search & add contacts
4. Click contact to open chat
5. Hold mic button for voice notes
6. Click phone/video icons for calls
7. Click attach icon for files/photos
8. Hover message for reactions & delete
9. Click your avatar for profile settings

## Production Env (server/.env)
PORT=3001
MONGODB_URI=mongodb://localhost:27017/chatrix
JWT_SECRET=change_this_to_random_secret

## Production Upgrade
- Replace in-memory store with MongoDB
- Add Redis for socket scaling
- Use TURN server for WebRTC behind NAT
- Deploy server on Railway/Render
- Deploy frontend on Vercel/Netlify
