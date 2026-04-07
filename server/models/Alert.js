const mongoose = require('mongoose');

/**
 * Alert Schema
 * Stores alerts published by officers
 * Alerts are visible to all users and help warn about high-risk situations
 */
const alertSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
    trim: true
  },
  riskLevel: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    required: true
  },
  coordinates: {
    lat: {
      type: Number,
      required: true
    },
    lng: {
      type: Number,
      required: true
    }
  },
  publishedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Alert', alertSchema);
