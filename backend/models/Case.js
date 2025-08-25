/**
 * Case Model
 * 
 * Defines the legal case schema with AI-powered priority scoring,
 * delay prediction, and comprehensive case management features.
 * This is the core model for the scheduling system.
 */

const mongoose = require('mongoose');

const caseSchema = new mongoose.Schema({
  // Case identification
  caseNumber: {
    type: String,
    unique: true,
    required: [true, 'Case number is required'],
    uppercase: true,
    match: [/^[A-Z0-9-\/]+$/, 'Invalid case number format']
  },
  
  title: {
    type: String,
    required: [true, 'Case title is required'],
    trim: true,
    maxlength: [200, 'Case title cannot exceed 200 characters']
  },
  
  description: {
    type: String,
    required: [true, 'Case description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  
  // Case categorization
  caseType: {
    type: String,
    required: [true, 'Case type is required'],
    enum: [
      'Criminal',
      'Civil',
      'Corporate',
      'Family',
      'Property',
      'Labor',
      'Tax',
      'Constitutional',
      'Environmental',
      'Intellectual Property',
      'Immigration',
      'Banking',
      'Insurance',
      'Consumer Protection',
      'Other'
    ]
  },
  
  subCategory: {
    type: String,
    maxlength: [100, 'Sub-category cannot exceed 100 characters']
  },
  
  // Parties involved
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Client is required']
  },
  
  assignedLawyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  opposingParty: {
    name: { type: String, required: true },
    lawyer: String,
    contact: String
  },
  
  // Case status and timeline
  status: {
    type: String,
    enum: [
      'pending_assignment',
      'assigned',
      'in_progress',
      'under_review',
      'awaiting_hearing',
      'in_court',
      'completed',
      'dismissed',
      'settled',
      'appealed'
    ],
    default: 'pending_assignment'
  },
  
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent', 'critical'],
    default: 'medium'
  },
  
  // AI-generated priority score (0-100)
  priorityScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },
  
  // Important dates
  filingDate: {
    type: Date,
    required: [true, 'Filing date is required']
  },
  
  hearingDate: {
    type: Date,
    default: null
  },
  
  deadlineDate: {
    type: Date,
    default: null
  },
  
  expectedCompletionDate: {
    type: Date,
    default: null
  },
  
  // Court information
  court: {
    name: { type: String, required: true },
    level: {
      type: String,
      enum: ['District', 'High Court', 'Supreme Court', 'Tribunal', 'Other'],
      required: true
    },
    judge: String,
    courtroom: String
  },
  
  // Financial information
  estimatedValue: {
    type: Number,
    min: 0,
    default: 0
  },
  
  legalFees: {
    agreed: { type: Number, default: 0 },
    paid: { type: Number, default: 0 },
    pending: { type: Number, default: 0 }
  },
  
  // Case documents
  documents: [{
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: String,
    size: Number,
    uploadDate: { type: Date, default: Date.now },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    cloudinaryUrl: String,
    documentType: {
      type: String,
      enum: [
        'petition',
        'evidence',
        'contract',
        'correspondence',
        'court_order',
        'judgment',
        'appeal',
        'other'
      ],
      default: 'other'
    }
  }],
  
  // AI Analysis Results
  aiAnalysis: {
    complexityScore: { type: Number, min: 0, max: 100, default: 50 },
    urgencyFactors: [String],
    delayRiskFactors: [String],
    estimatedDuration: Number, // in days
    similarCasesCount: { type: Number, default: 0 },
    successProbability: { type: Number, min: 0, max: 100, default: 50 },
    lastAnalyzed: { type: Date, default: Date.now }
  },
  
  // Delay tracking
  delayInfo: {
    isDelayed: { type: Boolean, default: false },
    delayDays: { type: Number, default: 0 },
    delayReasons: [String],
    delayImpact: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low'
    }
  },
  
  // Case progress tracking
  milestones: [{
    title: { type: String, required: true },
    description: String,
    dueDate: Date,
    completedDate: Date,
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'overdue'],
      default: 'pending'
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  // Case notes and updates
  notes: [{
    content: { type: String, required: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: { type: Date, default: Date.now },
    isPrivate: { type: Boolean, default: false },
    category: {
      type: String,
      enum: ['general', 'strategy', 'evidence', 'client_communication', 'court_update'],
      default: 'general'
    }
  }],
  
  // Tags for easy categorization and search
  tags: [String],
  
  // Case closure information
  outcome: {
    result: {
      type: String,
      enum: ['won', 'lost', 'settled', 'dismissed', 'withdrawn', 'pending'],
      default: 'pending'
    },
    summary: String,
    finalDate: Date,
    appealable: { type: Boolean, default: false }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance optimization
caseSchema.index({ caseNumber: 1 });
caseSchema.index({ client: 1 });
caseSchema.index({ assignedLawyer: 1 });
caseSchema.index({ status: 1 });
caseSchema.index({ priority: 1 });
caseSchema.index({ priorityScore: -1 });
caseSchema.index({ caseType: 1 });
caseSchema.index({ filingDate: -1 });
caseSchema.index({ hearingDate: 1 });
caseSchema.index({ deadlineDate: 1 });
caseSchema.index({ createdAt: -1 });

// Compound indexes for complex queries
caseSchema.index({ status: 1, priorityScore: -1 });
caseSchema.index({ assignedLawyer: 1, status: 1 });
caseSchema.index({ caseType: 1, status: 1 });

// Virtual for case age in days
caseSchema.virtual('caseAge').get(function() {
  return Math.floor((Date.now() - this.filingDate) / (1000 * 60 * 60 * 24));
});

// Virtual for days until hearing
caseSchema.virtual('daysUntilHearing').get(function() {
  if (!this.hearingDate) return null;
  return Math.floor((this.hearingDate - Date.now()) / (1000 * 60 * 60 * 24));
});

// Virtual for case urgency level
caseSchema.virtual('urgencyLevel').get(function() {
  if (this.priorityScore >= 90) return 'critical';
  if (this.priorityScore >= 75) return 'urgent';
  if (this.priorityScore >= 60) return 'high';
  if (this.priorityScore >= 40) return 'medium';
  return 'low';
});

// Pre-save middleware to generate case number if not provided
caseSchema.pre('save', async function(next) {
  if (!this.caseNumber) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({
      createdAt: {
        $gte: new Date(year, 0, 1),
        $lt: new Date(year + 1, 0, 1)
      }
    });
    
    this.caseNumber = `CASE/${year}/${String(count + 1).padStart(4, '0')}`;
  }
  
  // Update delay information
  this.updateDelayInfo();
  
  next();
});

// Method to update delay information
caseSchema.methods.updateDelayInfo = function() {
  const now = new Date();
  let isDelayed = false;
  let delayDays = 0;
  
  // Check if case is delayed based on expected completion date
  if (this.expectedCompletionDate && now > this.expectedCompletionDate) {
    isDelayed = true;
    delayDays = Math.floor((now - this.expectedCompletionDate) / (1000 * 60 * 60 * 24));
  }
  
  // Check if hearing date has passed without status update
  if (this.hearingDate && now > this.hearingDate && this.status === 'awaiting_hearing') {
    isDelayed = true;
    const hearingDelay = Math.floor((now - this.hearingDate) / (1000 * 60 * 60 * 24));
    delayDays = Math.max(delayDays, hearingDelay);
  }
  
  this.delayInfo.isDelayed = isDelayed;
  this.delayInfo.delayDays = delayDays;
  
  // Determine delay impact
  if (delayDays > 180) this.delayInfo.delayImpact = 'critical';
  else if (delayDays > 90) this.delayInfo.delayImpact = 'high';
  else if (delayDays > 30) this.delayInfo.delayImpact = 'medium';
  else this.delayInfo.delayImpact = 'low';
};

// Method to add a note
caseSchema.methods.addNote = function(content, createdBy, isPrivate = false, category = 'general') {
  this.notes.push({
    content,
    createdBy,
    isPrivate,
    category,
    createdAt: new Date()
  });
  return this.save();
};

// Method to update case status
caseSchema.methods.updateStatus = function(newStatus, updatedBy) {
  const oldStatus = this.status;
  this.status = newStatus;
  
  // Add automatic note about status change
  this.addNote(
    `Case status changed from ${oldStatus} to ${newStatus}`,
    updatedBy,
    false,
    'general'
  );
  
  return this.save();
};

// Static method to get cases by priority
caseSchema.statics.getCasesByPriority = function(minScore = 0) {
  return this.find({
    priorityScore: { $gte: minScore },
    status: { $nin: ['completed', 'dismissed', 'settled'] }
  }).sort({ priorityScore: -1 });
};

// Static method to get delayed cases
caseSchema.statics.getDelayedCases = function() {
  return this.find({
    'delayInfo.isDelayed': true,
    status: { $nin: ['completed', 'dismissed', 'settled'] }
  }).sort({ 'delayInfo.delayDays': -1 });
};

// Static method to get case statistics
caseSchema.statics.getCaseStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalCases: { $sum: 1 },
        activeCases: {
          $sum: {
            $cond: [
              { $nin: ['$status', ['completed', 'dismissed', 'settled']] },
              1, 0
            ]
          }
        },
        delayedCases: {
          $sum: { $cond: ['$delayInfo.isDelayed', 1, 0] }
        },
        averagePriorityScore: { $avg: '$priorityScore' }
      }
    }
  ]);
  
  return stats[0] || {
    totalCases: 0,
    activeCases: 0,
    delayedCases: 0,
    averagePriorityScore: 0
  };
};

module.exports = mongoose.model('Case', caseSchema);
