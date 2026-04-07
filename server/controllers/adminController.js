const User = require('../models/User');
const { createLog } = require('../utils/logger');

/**
 * Create Officer Account (Admin Only)
 * POST /admin/create-officer
 * Allows admin to create officer accounts
 * SECURITY: Only accessible by admin role
 */
exports.createOfficer = async (req, res) => {
  try {
    const { name, email, password, district } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check if user with this email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Create officer account
    // Password will be automatically hashed by User model pre-save hook
    const officer = await User.create({
      name,
      email,
      password,
      role: 'officer',
      district: district || ''
    });

    // Log officer creation
    await createLog('Officer created by admin', req.user._id, { 
      officerId: officer._id, 
      officerEmail: officer.email 
    });

    res.status(201).json({
      message: 'Officer account created successfully',
      officer: {
        id: officer._id,
        name: officer.name,
        email: officer.email,
        role: officer.role,
        district: officer.district,
        isActive: officer.isActive
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get All Officers (Admin Only)
 * GET /admin/officers
 * Returns list of all officer accounts
 */
exports.getAllOfficers = async (req, res) => {
  try {
    const officers = await User.find({ role: 'officer' })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({ officers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
