const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  animalType: {
    type: String,
    required: true,
    trim: true
  },
  locationName: {
    type: String,
    required: true,
    trim: true
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
  riskLevel: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    required: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  imagePath: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  officerRemarks: {
    type: String,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Report', reportSchema);