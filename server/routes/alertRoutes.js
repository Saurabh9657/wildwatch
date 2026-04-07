const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { createAlert, getAllAlerts, broadcastAlert } = require('../controllers/alertController');

/**
 * Alert Routes
 * Handles alerts published by officers
 */

// Create alert (officer only - admin should not publish alerts)
router.post('/', authenticate, authorize('officer'), createAlert);

// Get all alerts (all authenticated users)
router.get('/', authenticate, getAllAlerts);

// Broadcast alert to multiple locations (officer only)
router.post('/broadcast', authenticate, authorize('officer'), broadcastAlert);

module.exports = router;
