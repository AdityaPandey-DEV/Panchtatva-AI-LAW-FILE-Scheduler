/**
 * User Model
 * 
 * Defines the user schema for the application with support for
 * three user roles: client, lawyer, and admin. Includes password
 * hashing and JWT token generation methods.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  // Basic user information
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't return password in queries by default
  },
  
  // User role: client, lawyer, or admin
  role: {
    type: String,
    enum: ['client', 'lawyer', 'admin'],
    default: 'client'
  },
  
  // Contact information
  phone: {
    type: String,
    match: [/^\+?[\d\s-()]+$/, 'Please provide a valid phone number']
  },
  
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'India' }
  },
  
  // Professional information (for lawyers)
  barNumber: {
    type: String,
    sparse: true, // Allows null values but ensures uniqueness when present
    index: true
  },
  
  specialization: [{
    type: String,
    enum: [
      'Criminal Law',
      'Civil Law',
      'Corporate Law',
      'Family Law',
      'Property Law',
      'Labor Law',
      'Tax Law',
      'Constitutional Law',
      'Environmental Law',
      'Intellectual Property',
      'Other'
    ]
  }],
  
  experience: {
    type: Number,
    min: [0, 'Experience cannot be negative']
  },
  
  // Profile information
  avatar: {
    type: String, // URL to profile picture
    default: null
  },
  
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot exceed 500 characters']
  },
  
  // Account status
  isActive: {
    type: Boolean,
    default: true
  },
  
  isVerified: {
    type: Boolean,
    default: false
  },
  
  // Timestamps for account management
  lastLogin: {
    type: Date,
    default: Date.now
  },
  
  // Case statistics (updated by triggers)
  caseStats: {
    totalCases: { type: Number, default: 0 },
    activeCases: { type: Number, default: 0 },
    completedCases: { type: Number, default: 0 },
    successRate: { type: Number, default: 0 }
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ 'specialization': 1 });
userSchema.index({ createdAt: -1 });

// Virtual for full address
userSchema.virtual('fullAddress').get(function() {
  if (!this.address) return '';
  
  const { street, city, state, zipCode, country } = this.address;
  return [street, city, state, zipCode, country]
    .filter(Boolean)
    .join(', ');
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash password if it's modified
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Method to generate JWT token
userSchema.methods.generateAuthToken = function() {
  const payload = {
    id: this._id,
    email: this.email,
    role: this.role,
    name: this.name
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '7d' // Token expires in 7 days
  });
};

// Method to get public profile (removes sensitive data)
userSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  
  // Remove sensitive fields
  delete userObject.password;
  delete userObject.__v;
  
  return userObject;
};

// Static method to find users by role
userSchema.statics.findByRole = function(role) {
  return this.find({ role, isActive: true });
};

// Static method to get user statistics
userSchema.statics.getUserStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 },
        active: {
          $sum: { $cond: ['$isActive', 1, 0] }
        },
        verified: {
          $sum: { $cond: ['$isVerified', 1, 0] }
        }
      }
    }
  ]);
  
  return stats;
};

module.exports = mongoose.model('User', userSchema);
