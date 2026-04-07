const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { createLog } = require('../utils/logger');

/**
 * Generate JWT Token
 * Creates a signed token with user ID and role
 */
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

/**
 * Register New User (Citizens Only)
 * POST /auth/register
 * Creates a new citizen account with hashed password
 * SECURITY: Only allows registration of 'user' role
 * Admin and Officer roles cannot be registered publicly
 */
exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // SECURITY: Reject any attempt to register as admin or officer
    if (role && (role === 'admin' || role === 'officer')) {
      return res.status(403).json({ 
        error: 'Only citizens can register publicly. Admin and Officer accounts must be created by system administrators.' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Force role to be 'user' (citizen) - ignore any role provided
    const user = await User.create({
      name,
      email,
      password,
      role: 'user' // Always set to 'user' for public registration
    });

    // Generate token
    const token = generateToken(user._id);

    // Log registration
    await createLog('User registered', user._id, { email: user.email, role: user.role });

    res.status(201).json({
      message: 'Citizen account registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        district: user.district,
        isActive: user.isActive
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Login User
 * POST /auth/login
 * Authenticates user and returns JWT token
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (user.isActive === false) {
      return res.status(403).json({ error: 'Account is disabled. Contact administrator.' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user._id);

    // Log login
    await createLog('User logged in', user._id, { email: user.email });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        district: user.district,
        isActive: user.isActive
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
