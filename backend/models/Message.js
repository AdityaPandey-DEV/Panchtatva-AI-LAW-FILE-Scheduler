/**
 * Message Model
 * 
 * Defines the messaging schema for lawyer-client communication
 * with support for attachments, read receipts, and message threading.
 */

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  // Message participants
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sender is required']
  },
  
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Recipient is required']
  },
  
  // Message content
  content: {
    type: String,
    required: [true, 'Message content is required'],
    maxlength: [2000, 'Message cannot exceed 2000 characters']
  },
  
  // Message type
  messageType: {
    type: String,
    enum: ['text', 'file', 'case_update', 'system'],
    default: 'text'
  },
  
  // Related case (optional)
  relatedCase: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Case',
    default: null
  },
  
  // File attachments
  attachments: [{
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    cloudinaryUrl: String,
    uploadDate: { type: Date, default: Date.now }
  }],
  
  // Message status
  isRead: {
    type: Boolean,
    default: false
  },
  
  readAt: {
    type: Date,
    default: null
  },
  
  // Message priority
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  
  // Thread support (for grouping related messages)
  threadId: {
    type: String,
    default: null
  },
  
  // Reply to specific message
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  
  // Message reactions/acknowledgments
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reaction: {
      type: String,
      enum: ['like', 'acknowledge', 'important', 'question']
    },
    createdAt: { type: Date, default: Date.now }
  }],
  
  // Soft delete support
  isDeleted: {
    type: Boolean,
    default: false
  },
  
  deletedAt: {
    type: Date,
    default: null
  },
  
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
messageSchema.index({ sender: 1, recipient: 1 });
messageSchema.index({ recipient: 1, isRead: 1 });
messageSchema.index({ relatedCase: 1 });
messageSchema.index({ threadId: 1 });
messageSchema.index({ createdAt: -1 });

// Compound indexes
messageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

// Virtual for conversation participants (sorted)
messageSchema.virtual('conversationId').get(function() {
  const participants = [this.sender.toString(), this.recipient.toString()].sort();
  return participants.join('_');
});

// Pre-save middleware to generate thread ID if not provided
messageSchema.pre('save', function(next) {
  if (!this.threadId && this.relatedCase) {
    this.threadId = `case_${this.relatedCase}`;
  } else if (!this.threadId) {
    this.threadId = this.conversationId;
  }
  
  next();
});

// Method to mark message as read
messageSchema.methods.markAsRead = function() {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to add reaction
messageSchema.methods.addReaction = function(userId, reactionType) {
  // Remove existing reaction from same user
  this.reactions = this.reactions.filter(
    reaction => !reaction.user.equals(userId)
  );
  
  // Add new reaction
  this.reactions.push({
    user: userId,
    reaction: reactionType,
    createdAt: new Date()
  });
  
  return this.save();
};

// Method to soft delete message
messageSchema.methods.softDelete = function(deletedBy) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  return this.save();
};

// Static method to get conversation between two users
messageSchema.statics.getConversation = function(user1Id, user2Id, limit = 50, page = 1) {
  const skip = (page - 1) * limit;
  
  return this.find({
    $or: [
      { sender: user1Id, recipient: user2Id },
      { sender: user2Id, recipient: user1Id }
    ],
    isDeleted: false
  })
  .populate('sender', 'name avatar role')
  .populate('recipient', 'name avatar role')
  .populate('relatedCase', 'caseNumber title')
  .sort({ createdAt: -1 })
  .limit(limit)
  .skip(skip);
};

// Static method to get unread message count for user
messageSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({
    recipient: userId,
    isRead: false,
    isDeleted: false
  });
};

// Static method to get recent conversations for user
messageSchema.statics.getRecentConversations = async function(userId, limit = 20) {
  const conversations = await this.aggregate([
    {
      $match: {
        $or: [
          { sender: mongoose.Types.ObjectId(userId) },
          { recipient: mongoose.Types.ObjectId(userId) }
        ],
        isDeleted: false
      }
    },
    {
      $sort: { createdAt: -1 }
    },
    {
      $group: {
        _id: {
          $cond: [
            { $eq: ['$sender', mongoose.Types.ObjectId(userId)] },
            '$recipient',
            '$sender'
          ]
        },
        lastMessage: { $first: '$$ROOT' },
        unreadCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$recipient', mongoose.Types.ObjectId(userId)] },
                  { $eq: ['$isRead', false] }
                ]
              },
              1,
              0
            ]
          }
        }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'otherUser'
      }
    },
    {
      $unwind: '$otherUser'
    },
    {
      $project: {
        otherUser: {
          _id: 1,
          name: 1,
          email: 1,
          avatar: 1,
          role: 1
        },
        lastMessage: 1,
        unreadCount: 1
      }
    },
    {
      $sort: { 'lastMessage.createdAt': -1 }
    },
    {
      $limit: limit
    }
  ]);
  
  return conversations;
};

// Static method to mark all messages in conversation as read
messageSchema.statics.markConversationAsRead = function(senderId, recipientId) {
  return this.updateMany(
    {
      sender: senderId,
      recipient: recipientId,
      isRead: false,
      isDeleted: false
    },
    {
      $set: {
        isRead: true,
        readAt: new Date()
      }
    }
  );
};

// Static method to search messages
messageSchema.statics.searchMessages = function(userId, query, limit = 20) {
  return this.find({
    $or: [
      { sender: userId },
      { recipient: userId }
    ],
    content: { $regex: query, $options: 'i' },
    isDeleted: false
  })
  .populate('sender', 'name avatar role')
  .populate('recipient', 'name avatar role')
  .populate('relatedCase', 'caseNumber title')
  .sort({ createdAt: -1 })
  .limit(limit);
};

module.exports = mongoose.model('Message', messageSchema);
