require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Import routes
const authRoutes = require('./routes/authRoutes');
const reportRoutes = require('./routes/reportRoutes');
const alertRoutes = require('./routes/alertRoutes');
const zoneRoutes = require('./routes/zoneRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const logRoutes = require('./routes/logRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// CORS Configuration - Allow all origins (for ngrok & mobile)
// ============================================
const corsOptions = {
    origin: '*', // Allow all origins
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'Origin'],
    credentials: true,
    optionsSuccessStatus: 200,
    preflightContinue: false
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests for all routes
app.options('*', cors(corsOptions));

// Body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Disable caching for API responses so clients always receive fresh dynamic data
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: 0, etag: false }));

// Serve static files from client directory
app.use(express.static(path.join(__dirname, '../client'), { maxAge: 0, etag: false }));

// Import User model for admin creation
const User = require('./models/User');
const bcrypt = require('bcryptjs');

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/wildlife_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    
    // Auto-create admin account if it doesn't exist
    await createAdminIfNotExists();
  })
  .catch(err => console.error('❌ MongoDB connection error:', err));

/**
 * Auto-create admin account on server startup
 * Uses credentials from environment variables
 * Only creates if admin doesn't already exist
 */
async function createAdminIfNotExists() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@gmail.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPass@123';
    
    // Find existing admin by role
    const existingAdmin = await User.findOne({ role: 'admin' });
    
    if (existingAdmin) {
      if (existingAdmin.email === adminEmail) {
        const isMatch = await existingAdmin.comparePassword(adminPassword);
        if (!isMatch) {
          existingAdmin.password = adminPassword;
          await existingAdmin.save();
          console.log('✅ Admin password updated from env configuration');
        }
      }
      console.log('✅ Admin account already exists');
      return;
    }
    
    // Create admin user using plain password so pre-save hashing runs once
    const admin = await User.create({
      name: 'System Administrator',
      email: adminEmail,
      password: adminPassword,
      role: 'admin'
    });
    
    console.log(`✅ Admin account created successfully`);
    console.log(`   Email: ${adminEmail}`);
    console.log(`   ⚠️  Please change the default password in production!`);
  } catch (error) {
    console.error('❌ Error creating admin account:', error.message);
  }
}

// ============================================
// API Routes
// ============================================
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/logs', logRoutes);

// ============================================
// Health check endpoint
// ============================================
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    cors: 'enabled'
  });
});

// ============================================
// Catch-all route for SPA (optional)
// ============================================
app.get('*', (req, res) => {
  // Don't interfere with API routes
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  // Serve index.html for all other routes (for client-side routing)
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// ============================================
// Error handling middleware
// ============================================
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Client files served from: ${path.join(__dirname, '../client')}`);
  console.log(`🌐 CORS enabled for all origins`);
  console.log(`📱 Access from mobile via ngrok: http://localhost:${PORT} -> ngrok URL`);
});