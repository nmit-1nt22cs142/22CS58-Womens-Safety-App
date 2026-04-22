const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');           // ⭐ NEW
const { Server } = require('socket.io'); // ⭐ NEW
require('dotenv').config();

const db = require('./config/db'); // ⭐ NEW - Import DB for socket handlers

const aadhaarRoutes = require('./routes/aadhaarRoutes');
const authRoutes = require('./routes/authRoutes');
const guardianRoutes = require('./routes/guardianRoutes');
const routeRoutes = require('./routes/routeRoutes');

const app = express();

// ── Middleware ──────────────────────────────────────────────
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ── REST Routes ─────────────────────────────────────────────
app.use('/api/aadhaar', aadhaarRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/guardian', guardianRoutes);
app.use('/api/routes', routeRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Women Safety API Server is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ── Create HTTP server & attach Socket.io ───────────────────
const httpServer = http.createServer(app);  // ⭐ wrap express in http server

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// ── Socket.io Logic ─────────────────────────────────────────
//
// ROOM NAMING CONVENTION:
//   Each user gets a private room named  "user_<userId>"
//   The sharing user joins this room and emits location to it.
//   Guardians join the same room to receive updates.
//
// EVENTS:
//   Client → Server:
//     "join_as_user"      { userId }           — user joins their own room
//     "join_as_guardian"  { userId }           — guardian joins user's room
//     "location_update"   { userId, latitude, longitude, accuracy, timestamp }
//     "stop_sharing"      { userId }
//
//   Server → Guardians (broadcast to room):
//     "location_update"   { latitude, longitude, accuracy, timestamp, userId }
//     "sharing_stopped"   { userId }
//     "sharing_started"   { userId }

io.on('connection', (socket) => {
  console.log('🔌 Socket connected:', socket.id);

  // ── User starts sharing — joins their own room ──
  socket.on('join_as_user', ({ userId }) => {
    const room = `user_${userId}`;
    socket.join(room);
    socket.userId = userId;
    socket.role = 'user';
    console.log(`✅ User ${userId} joined room: ${room} (socket: ${socket.id})`);

    // Notify any guardians already in the room that sharing started
    socket.to(room).emit('sharing_started', { userId });
    socket.emit('join_success', { message: `Joined room ${room}` });
  });

  // ── Guardian joins user's room to receive updates ──
  socket.on('join_as_guardian', ({ userId }) => {
    const room = `user_${userId}`;
    socket.join(room);
    socket.watchingUserId = userId;
    socket.role = 'guardian';
    console.log(`✅ Guardian ${socket.id} joined room: ${room}`);
    socket.emit('join_success', { message: `Joined room ${room}` });
  });

  // ── User pushes a new location ──
  socket.on('location_update', async ({ userId, latitude, longitude, accuracy, timestamp }) => {
    const room = `user_${userId}`;
    
    if (!latitude || !longitude) {
      console.warn('⚠️ Invalid location data received');
      return;
    }

    console.log(`📍 Location from user ${userId}: ${parseFloat(latitude).toFixed(5)}, ${parseFloat(longitude).toFixed(5)}`);

    // ── 1. Save to database so it persists for REST API ──
    try {
      const [result] = await db.query(
        `UPDATE live_location_sessions
         SET latitude = ?, longitude = ?, accuracy = ?, updated_at = NOW()
         WHERE user_id = ? AND is_active = 1
         ORDER BY started_at DESC LIMIT 1`,
        [parseFloat(latitude), parseFloat(longitude), parseFloat(accuracy || 0), userId]
      );
      
      if (result.affectedRows > 0) {
        console.log(`✅ Location saved for user ${userId}`);
      } else {
        console.warn(`⚠️ No active session found for user ${userId}`);
      }
    } catch (dbErr) {
      console.error('❌ Database error saving location:', dbErr.message);
    }

    // ── 2. Broadcast to guardians in real-time ──
    socket.to(room).emit('location_update', {
      userId,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      accuracy: parseFloat(accuracy || 0),
      timestamp: timestamp || new Date().toISOString()
    });
  });

  // ── User stops sharing ──
  socket.on('stop_sharing', ({ userId }) => {
    const room = `user_${userId}`;
    socket.to(room).emit('sharing_stopped', { userId });
    console.log(`🛑 User ${userId} stopped sharing`);
  });

  // ── Disconnect ──
  socket.on('disconnect', () => {
    console.log('❌ Socket disconnected:', socket.id);
    // If a sharing user disconnects, notify guardians
    if (socket.role === 'user' && socket.userId) {
      const room = `user_${socket.userId}`;
      socket.to(room).emit('sharing_stopped', { userId: socket.userId });
    }
  });
});

// Make io accessible in controllers if needed
app.set('io', io);

// ── Start Server ────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

httpServer.listen(PORT, HOST, () => {   // ⭐ listen on httpServer, not app
  console.log('\n🚀 ================================');
  console.log('🚀 Server is running successfully!');
  console.log('🚀 ================================');
  console.log(`📍 Local:   http://localhost:${PORT}`);
  console.log(`📍 Network: http://${process.env.YOUR_IP_ADDRESS || '0.0.0.0'}:${PORT}`);
  console.log(`🔌 Socket.io is active on the same port`);
  console.log('🚀 ================================\n');
});