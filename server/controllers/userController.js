const User = require('../models/User');
const { createLog } = require('../utils/logger');

/**
 * Get current user's profile preferences
 * GET /users/profile
 */
exports.getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      profile: user.profile || {},
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
 * Create/update current user's profile preferences
 * POST /users/profile
 */
exports.upsertMyProfile = async (req, res) => {
  try {
    const { mobile, district, village, alertRadius, receiveAlerts } = req.body;
    const update = {
      profile: {
        mobile: mobile || '',
        district: district || '',
        village: village || '',
        alertRadius: Number(alertRadius) || 10,
        receiveAlerts: receiveAlerts !== undefined ? Boolean(receiveAlerts) : true
      }
    };

    if (district) update.district = district;

    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    await createLog('User profile updated', req.user._id, { userId: req.user._id });
    res.json({ message: 'Profile saved successfully', profile: user.profile, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update partial user settings
 * PUT /users/settings
 */
exports.updateMySettings = async (req, res) => {
  try {
    const allowed = ['mobile', 'district', 'village', 'alertRadius', 'receiveAlerts'];
    const incoming = req.body || {};
    const profileUpdate = {};

    allowed.forEach((field) => {
      if (incoming[field] !== undefined) profileUpdate[`profile.${field}`] = incoming[field];
    });

    if (incoming.alertRadius !== undefined) {
      profileUpdate['profile.alertRadius'] = Number(incoming.alertRadius) || 10;
    }
    if (incoming.receiveAlerts !== undefined) {
      profileUpdate['profile.receiveAlerts'] = Boolean(incoming.receiveAlerts);
    }
    if (incoming.district !== undefined) {
      profileUpdate.district = incoming.district;
    }

    const user = await User.findByIdAndUpdate(req.user._id, { $set: profileUpdate }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    await createLog('User settings updated', req.user._id, { userId: req.user._id });
    res.json({ message: 'Settings updated successfully', profile: user.profile });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Disable officer account
 * PUT /users/:id/disable
 */
exports.disableOfficer = async (req, res) => {
  try {
    const { id } = req.params;
    const officer = await User.findOne({ _id: id, role: 'officer' });
    if (!officer) return res.status(404).json({ error: 'Officer not found' });
    if (officer.isActive === false) {
      return res.json({ message: 'Officer account already disabled' });
    }

    officer.isActive = false;
    await officer.save();

    await createLog('Officer account disabled', req.user._id, { officerId: id, officerEmail: officer.email });
    res.json({ message: 'Officer account disabled successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
