const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getMyProfile,
  upsertMyProfile,
  updateMySettings,
  disableOfficer
} = require('../controllers/userController');

router.get('/profile', authenticate, getMyProfile);
router.post('/profile', authenticate, upsertMyProfile);
router.put('/settings', authenticate, updateMySettings);
router.put('/:id/disable', authenticate, authorize('admin'), disableOfficer);

module.exports = router;
