/**
 * Messaging Routes
 * 
 * Handles real-time messaging between lawyers and clients,
 * message history, and notification management.
 */

const express = require('express');
const Message = require('../models/Message');
const User = require('../models/User');
const fileService = require('../services/fileService');
const { authenticate, clientOrLawyer } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   GET /api/messages/conversations
 * @desc    Get recent conversations for current user
 * @access  Private
 */
router.get('/conversations', authenticate, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const conversations = await Message.getRecentConversations(
      req.user._id, 
      parseInt(limit)
    );

    res.json({
      success: true,
      data: { conversations }
    });

  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching conversations'
    });
  }
});

/**
 * @route   GET /api/messages/conversation/:userId
 * @desc    Get conversation with specific user
 * @access  Private
 */
router.get('/conversation/:userId', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const otherUserId = req.params.userId;

    // Verify other user exists
    const otherUser = await User.findById(otherUserId).select('name email role avatar');
    if (!otherUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if users can message each other
    const canMessage = 
      req.user.role === 'admin' ||
      (req.user.role === 'lawyer' && otherUser.role === 'client') ||
      (req.user.role === 'client' && otherUser.role === 'lawyer') ||
      (req.user.role === 'client' && otherUser.role === 'admin');

    if (!canMessage) {
      return res.status(403).json({
        success: false,
        message: 'You cannot message this user'
      });
    }

    const messages = await Message.getConversation(
      req.user._id,
      otherUserId,
      parseInt(limit),
      parseInt(page)
    );

    // Mark messages as read
    await Message.markConversationAsRead(otherUserId, req.user._id);

    res.json({
      success: true,
      data: {
        messages: messages.reverse(), // Reverse to show oldest first
        otherUser,
        pagination: {
          current: parseInt(page),
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching conversation'
    });
  }
});

/**
 * @route   POST /api/messages
 * @desc    Send a new message
 * @access  Private
 */
router.post('/', authenticate, clientOrLawyer, async (req, res) => {
  try {
    const { recipientId, content, messageType = 'text', relatedCase, priority = 'normal' } = req.body;

    if (!recipientId || !content) {
      return res.status(400).json({
        success: false,
        message: 'Recipient ID and content are required'
      });
    }

    // Verify recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Recipient not found'
      });
    }

    // Check if users can message each other
    const canMessage = 
      req.user.role === 'admin' ||
      (req.user.role === 'lawyer' && recipient.role === 'client') ||
      (req.user.role === 'client' && recipient.role === 'lawyer') ||
      (req.user.role === 'client' && recipient.role === 'admin');

    if (!canMessage) {
      return res.status(403).json({
        success: false,
        message: 'You cannot message this user'
      });
    }

    // Create message
    const message = new Message({
      sender: req.user._id,
      recipient: recipientId,
      content: content.trim(),
      messageType,
      relatedCase: relatedCase || null,
      priority
    });

    await message.save();

    // Populate message for response
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name avatar role')
      .populate('recipient', 'name avatar role')
      .populate('relatedCase', 'caseNumber title');

    // Emit real-time message via Socket.IO (handled in server.js)
    // The client will handle the socket emission

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: { message: populatedMessage }
    });

  } catch (error) {
    console.error('Error sending message:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: Object.values(error.errors).map(e => e.message)
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error sending message'
    });
  }
});

/**
 * @route   POST /api/messages/:id/read
 * @desc    Mark message as read
 * @access  Private
 */
router.post('/:id/read', authenticate, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Only recipient can mark message as read
    if (!message.recipient.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only mark messages sent to you as read'
      });
    }

    await message.markAsRead();

    res.json({
      success: true,
      message: 'Message marked as read',
      data: { message }
    });

  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking message as read'
    });
  }
});

/**
 * @route   POST /api/messages/:id/react
 * @desc    Add reaction to message
 * @access  Private
 */
router.post('/:id/react', authenticate, async (req, res) => {
  try {
    const { reaction } = req.body;

    if (!reaction) {
      return res.status(400).json({
        success: false,
        message: 'Reaction type is required'
      });
    }

    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is part of the conversation
    const isPartOfConversation = 
      message.sender.equals(req.user._id) || 
      message.recipient.equals(req.user._id);

    if (!isPartOfConversation) {
      return res.status(403).json({
        success: false,
        message: 'You can only react to messages in your conversations'
      });
    }

    await message.addReaction(req.user._id, reaction);

    const updatedMessage = await Message.findById(message._id)
      .populate('reactions.user', 'name avatar');

    res.json({
      success: true,
      message: 'Reaction added successfully',
      data: { message: updatedMessage }
    });

  } catch (error) {
    console.error('Error adding reaction:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding reaction'
    });
  }
});

/**
 * @route   DELETE /api/messages/:id
 * @desc    Delete message (soft delete)
 * @access  Private
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Only sender can delete their message
    if (!message.sender.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own messages'
      });
    }

    await message.softDelete(req.user._id);

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting message'
    });
  }
});

/**
 * @route   GET /api/messages/unread-count
 * @desc    Get unread message count for current user
 * @access  Private
 */
router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const unreadCount = await Message.getUnreadCount(req.user._id);

    res.json({
      success: true,
      data: { unreadCount }
    });

  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching unread count'
    });
  }
});

/**
 * @route   GET /api/messages/search
 * @desc    Search messages
 * @access  Private
 */
router.get('/search', authenticate, async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    const messages = await Message.searchMessages(
      req.user._id,
      q.trim(),
      parseInt(limit)
    );

    res.json({
      success: true,
      data: { messages }
    });

  } catch (error) {
    console.error('Error searching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching messages'
    });
  }
});

/**
 * @route   POST /api/messages/upload
 * @desc    Upload file for message attachment
 * @access  Private
 */
router.post('/upload', authenticate, clientOrLawyer, fileService.getUploadMiddleware().single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Validate file
    const validation = fileService.validateFile(req.file);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'File validation failed',
        errors: validation.errors
      });
    }

    // Process file
    const fileRecord = await fileService.processUploadedFile(req.file, req.user._id);

    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: { file: fileRecord }
    });

  } catch (error) {
    console.error('Error uploading message file:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading file'
    });
  }
});

/**
 * @route   PUT /api/messages/conversation/:userId/read-all
 * @desc    Mark all messages in conversation as read
 * @access  Private
 */
router.put('/conversation/:userId/read-all', authenticate, async (req, res) => {
  try {
    const otherUserId = req.params.userId;

    // Verify other user exists
    const otherUser = await User.findById(otherUserId);
    if (!otherUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await Message.markConversationAsRead(otherUserId, req.user._id);

    res.json({
      success: true,
      message: 'All messages marked as read'
    });

  } catch (error) {
    console.error('Error marking conversation as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking conversation as read'
    });
  }
});

module.exports = router;
