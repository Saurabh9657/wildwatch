const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  createReport,
  getAllReports,
  getPendingReports,
  getMyReports,
  verifyReport,
  getAnimalTracking
} = require('../controllers/reportController');

// Create new report (authenticated users only)
// Use upload.single('image') to handle file uploads
router.post('/', authenticate, upload.single('image'), createReport);

// Get all reports (filtered by role)
router.get('/', authenticate, getAllReports);

// Get user's own reports
router.get('/my-reports', authenticate, getMyReports);

// Get pending reports (officer only)
router.get('/pending', authenticate, authorize('officer'), getPendingReports);

// Verify/reject report (officer only)
router.put('/:id/verify', authenticate, authorize('officer'), verifyReport);

// Get animal movement tracking (officer only)
router.get('/tracking/:animalType', authenticate, authorize('officer'), getAnimalTracking);

module.exports = router;