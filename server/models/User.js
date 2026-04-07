const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Schema
 * Stores user information including name, email, password, and role
 * Roles: 'user' (citizen), 'officer', 'admin'
 */
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['user', 'officer', 'admin'],
    default: 'user'
  },
  district: {
    type: String,
    trim: true,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  profile: {
    mobile: {
      type: String,
      trim: true,
      default: ''
    },
    district: {
      type: String,
      trim: true,
      default: ''
    },
    village: {
      type: String,
      trim: true,
      default: ''
    },
    alertRadius: {
      type: Number,
      default: 10
    },
    receiveAlerts: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

/**
 * Hash password before saving to database
 * This ensures passwords are never stored in plain text
 */
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

/**
 * Compare provided password with stored hash
 * Used during login authentication
 */
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
