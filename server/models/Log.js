const mongoose = require('mongoose');

/**
 * Log Schema
 * Stores system activity logs for audit trail
 * Tracks actions like report creation, verification, alert publishing
 */
const logSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    trim: true
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed // Can store any additional data
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Log', logSchema);
