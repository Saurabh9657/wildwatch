const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { createZone, getAllZones, drawZone, deleteZone, getNearbyZones } = require('../controllers/zoneController');

/**
 * Zone Routes
 * Handles geographic zone management (admin only)
 */

// Create zone (admin, officer limited)
router.post('/', authenticate, authorize('admin', 'officer'), createZone);

// Create zone via drawing tools payload (admin, officer limited)
router.post('/draw', authenticate, authorize('admin', 'officer'), drawZone);

// Get all zones (all authenticated users)
router.get('/', authenticate, getAllZones);

// Get nearby zones by coordinates
router.get('/nearby', authenticate, getNearbyZones);

// Delete zone (admin only)
router.delete('/:id', authenticate, authorize('admin'), deleteZone);

module.exports = router;
