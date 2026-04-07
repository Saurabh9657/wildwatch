const mongoose = require('mongoose');

/**
 * Zone Schema
 * Stores geographic zones defined by admin
 * Zone types: 'Normal', 'Sensitive', 'Restricted'
 * Polygon coordinates define the zone boundaries on the map
 */
const zoneSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  polygonCoordinates: {
    type: [[Number]], // Array of [lat, lng] pairs forming polygon
    default: undefined
  },
  zoneType: {
    type: String,
    enum: ['Normal', 'Sensitive', 'Restricted', 'Danger'],
    default: 'Normal'
  },
  animalType: {
    type: String,
    trim: true,
    default: ''
  },
  riskLevel: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Low'
  },
  radius: {
    type: Number,
    default: 0
  },
  expiry: {
    type: Date
  },
  alertMessage: {
    type: String,
    trim: true,
    default: ''
  },
  notifyOfficers: {
    type: Boolean,
    default: false
  },
  geometry: {
    type: mongoose.Schema.Types.Mixed
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdByRole: {
    type: String,
    enum: ['admin', 'officer', 'system'],
    default: 'admin'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Zone', zoneSchema);
