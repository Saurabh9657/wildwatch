const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getLogs } = require('../controllers/logController');

// Admin-only system logs
router.get('/', authenticate, authorize('admin'), getLogs);

module.exports = router;
