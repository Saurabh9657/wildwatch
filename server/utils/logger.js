const Log = require('../models/Log');

/**
 * Logger Utility
 * Creates log entries in database for audit trail
 * Used to track all important actions in the system
 */
const createLog = async (action, performedBy, details = {}) => {
  try {
    await Log.create({
      action,
      performedBy,
      details
    });
  } catch (error) {
    console.error('Error creating log:', error);
    // Don't throw error - logging failure shouldn't break main functionality
  }
};

module.exports = { createLog };
