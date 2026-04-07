const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getSummary, getPathAnalysis } = require('../controllers/analyticsController');

/**
 * Analytics Routes
 * Handles analytics and reporting (admin only)
 */

// Get analytics summary
router.get('/summary', authenticate, authorize('admin'), getSummary);

// Alias for dashboard widgets
router.get('/dashboard', authenticate, authorize('admin'), getSummary);

// Get path-based analysis
router.get('/paths', authenticate, authorize('admin'), getPathAnalysis);

module.exports = router;
