const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const aadhaarRoutes = require('./routes/aadhaarRoutes');
const authRoutes = require('./routes/authRoutes');
const guardianRoutes = require('./routes/guardianRoutes');
const routeRoutes = require('./routes/routeRoutes'); // ⭐ NEW

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/aadhaar', aadhaarRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/guardian', guardianRoutes);
app.use('/api/routes', routeRoutes); // ⭐ NEW

// Health check route
app.get('/', (req, res) => {
  res.json({ 
    success: true,
    message: 'Aadhaar Registration API Server is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log('\n🚀 ================================');
  console.log('🚀 Server is running successfully!');
  console.log('🚀 ================================');
  console.log(`📍 Local: http://localhost:${PORT}`);
  console.log(`📍 Network: http://${process.env.YOUR_IP_ADDRESS || '172.16.13.95'}:${PORT}`);
  console.log(`✅ Mobile access: http://${process.env.YOUR_IP_ADDRESS || '172.16.13.95'}:${PORT}`);
  console.log('🚀 ================================\n');
});