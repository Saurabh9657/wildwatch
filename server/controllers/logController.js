const Log = require('../models/Log');

/**
 * Get system logs with pagination
 * GET /logs?page=1&limit=20
 */
exports.getLogs = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const skip = (page - 1) * limit;
    const action = req.query.action;

    const query = {};
    if (action) query.action = new RegExp(action, 'i');

    const [logs, total] = await Promise.all([
      Log.find(query)
        .populate('performedBy', 'name email role')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit),
      Log.countDocuments(query)
    ]);

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
