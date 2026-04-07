const Alert = require('../models/Alert');
const { createLog } = require('../utils/logger');

/**
 * Create Alert
 * POST /alerts
 * Allows officers to publish alerts visible to all users
 */
exports.createAlert = async (req, res) => {
  try {
    const { message, riskLevel, coordinates } = req.body;

    // Validate required fields
    if (!message || !riskLevel || !coordinates) {
      return res.status(400).json({ error: 'Message, risk level, and coordinates are required' });
    }

    const alert = await Alert.create({
      message,
      riskLevel,
      coordinates: {
        lat: parseFloat(coordinates.lat),
        lng: parseFloat(coordinates.lng)
      },
      publishedBy: req.user._id
    });

    // Log alert creation
    await createLog('Alert published', req.user._id, { alertId: alert._id, riskLevel });

    res.status(201).json({
      message: 'Alert published successfully',
      alert
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get All Alerts
 * GET /alerts
 * Returns all alerts, sorted by most recent first
 */
exports.getAllAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find()
      .populate('publishedBy', 'name')
      .sort({ timestamp: -1 });

    res.json({ alerts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Broadcast alerts to one or many coordinates
 * POST /alerts/broadcast
 */
exports.broadcastAlert = async (req, res) => {
  try {
    const { message, riskLevel, targets } = req.body;
    if (!message || !riskLevel) {
      return res.status(400).json({ error: 'Message and risk level are required' });
    }

    let targetList = Array.isArray(targets) ? targets : [];
    if (targetList.length === 0 && req.body.coordinates) {
      targetList = [req.body.coordinates];
    }
    if (targetList.length === 0) {
      return res.status(400).json({ error: 'At least one target coordinate is required' });
    }

    const alerts = await Promise.all(targetList.map((coord) => Alert.create({
      message,
      riskLevel,
      coordinates: {
        lat: parseFloat(coord.lat),
        lng: parseFloat(coord.lng)
      },
      publishedBy: req.user._id
    })));

    await createLog('Alert broadcast', req.user._id, { count: alerts.length, riskLevel });
    res.status(201).json({ message: 'Alert broadcast successfully', alerts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
