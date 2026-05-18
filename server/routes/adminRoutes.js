const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { createOfficer, getAllOfficers, deleteOfficer, toggleOfficerStatus } = require('../controllers/adminController');

/**
 * Admin Routes
 * All routes require authentication and admin role
 * SECURITY: Protected by JWT and role-based authorization
 */

// Create officer account (admin only)
router.post('/create-officer', authenticate, authorize('admin'), createOfficer);

// Get all officers (admin only)
router.get('/officers', authenticate, authorize('admin'), getAllOfficers);

// Delete officer (admin only)
router.delete('/officers/:id', authenticate, authorize('admin'), deleteOfficer);

// Toggle officer active/disabled status (admin only)
router.patch('/officers/:id/toggle-status', authenticate, authorize('admin'), toggleOfficerStatus);

module.exports = router;
