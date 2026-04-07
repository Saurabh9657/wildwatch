const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { createOfficer, getAllOfficers } = require('../controllers/adminController');

/**
 * Admin Routes
 * All routes require authentication and admin role
 * SECURITY: Protected by JWT and role-based authorization
 */

// Create officer account (admin only)
router.post('/create-officer', authenticate, authorize('admin'), createOfficer);

// Get all officers (admin only)
router.get('/officers', authenticate, authorize('admin'), getAllOfficers);

module.exports = router;
