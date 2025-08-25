/**
 * User Management Routes
 * 
 * Handles user profile management, lawyer listings,
 * and user-related operations.
 */

const express = require('express');
const User = require('../models/User');
const Case = require('../models/Case');
const { authenticate, authorize, adminOnly } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   GET /api/users/lawyers
 * @desc    Get list of available lawyers
 * @access  Private
 */
router.get('/lawyers', authenticate, async (req, res) => {
  try {
    const { specialization, experience, search, limit = 20 } = req.query;
    
    let filter = { 
      role: 'lawyer', 
      isActive: true 
    };

    // Filter by specialization
    if (specialization) {
      filter.specialization = { $in: [specialization] };
    }

    // Filter by minimum experience
    if (experience) {
      filter.experience = { $gte: parseInt(experience) };
    }

    // Search by name or email
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const lawyers = await User.find(filter)
      .select('name email specialization experience caseStats bio avatar')
      .limit(parseInt(limit))
      .sort({ experience: -1, 'caseStats.successRate': -1 });

    res.json({
      success: true,
      data: { lawyers }
    });

  } catch (error) {
    console.error('Error fetching lawyers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching lawyers'
    });
  }
});

/**
 * @route   GET /api/users/:id
 * @desc    Get user profile by ID
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check permissions (users can view their own profile, lawyers/admins can view others)
    const canView = 
      req.user._id.equals(user._id) ||
      req.user.role === 'admin' ||
      (req.user.role === 'lawyer' && user.role === 'client');

    if (!canView) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { user: user.getPublicProfile() }
    });

  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user'
    });
  }
});

/**
 * @route   GET /api/users/:id/cases
 * @desc    Get cases for a specific user
 * @access  Private
 */
router.get('/:id/cases', authenticate, async (req, res) => {
  try {
    const { status, limit = 20, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    // Check permissions
    const canView = 
      req.user._id.toString() === req.params.id ||
      req.user.role === 'admin';

    if (!canView) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Build filter based on user role
    let filter = {};
    if (user.role === 'client') {
      filter.client = user._id;
    } else if (user.role === 'lawyer') {
      filter.assignedLawyer = user._id;
    }

    if (status) {
      filter.status = status;
    }

    const cases = await Case.find(filter)
      .populate('client', 'name email')
      .populate('assignedLawyer', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Case.countDocuments(filter);

    res.json({
      success: true,
      data: {
        cases,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching user cases:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user cases'
    });
  }
});

/**
 * @route   PUT /api/users/:id/status
 * @desc    Update user account status (activate/deactivate)
 * @access  Private (Admin only)
 */
router.put('/:id/status', authenticate, adminOnly, async (req, res) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean value'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent admin from deactivating themselves
    if (req.user._id.equals(user._id) && !isActive) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account'
      });
    }

    user.isActive = isActive;
    await user.save();

    res.json({
      success: true,
      message: `User account ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: { user: user.getPublicProfile() }
    });

  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user status'
    });
  }
});

/**
 * @route   PUT /api/users/:id/verify
 * @desc    Verify user account
 * @access  Private (Admin only)
 */
router.put('/:id/verify', authenticate, adminOnly, async (req, res) => {
  try {
    const { isVerified } = req.body;

    if (typeof isVerified !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isVerified must be a boolean value'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isVerified = isVerified;
    await user.save();

    res.json({
      success: true,
      message: `User account ${isVerified ? 'verified' : 'unverified'} successfully`,
      data: { user: user.getPublicProfile() }
    });

  } catch (error) {
    console.error('Error updating user verification:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user verification'
    });
  }
});

/**
 * @route   GET /api/users/stats/overview
 * @desc    Get user statistics overview
 * @access  Private (Admin only)
 */
router.get('/stats/overview', authenticate, adminOnly, async (req, res) => {
  try {
    const stats = await User.getUserStats();
    
    // Get additional statistics
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const verifiedUsers = await User.countDocuments({ isVerified: true });
    
    // Recent registrations (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentRegistrations = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Lawyers by specialization
    const lawyersBySpecialization = await User.aggregate([
      { $match: { role: 'lawyer' } },
      { $unwind: '$specialization' },
      {
        $group: {
          _id: '$specialization',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          activeUsers,
          verifiedUsers,
          recentRegistrations
        },
        byRole: stats,
        lawyersBySpecialization
      }
    });

  } catch (error) {
    console.error('Error fetching user statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user statistics'
    });
  }
});

/**
 * @route   GET /api/users
 * @desc    Get all users (Admin only)
 * @access  Private (Admin only)
 */
router.get('/', authenticate, adminOnly, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      role, 
      isActive, 
      isVerified, 
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (page - 1) * limit;
    
    // Build filter
    let filter = {};
    
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (isVerified !== undefined) filter.isVerified = isVerified === 'true';
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const users = await User.find(filter)
      .select('-password')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: {
        users: users.map(user => user.getPublicProfile()),
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users'
    });
  }
});

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user account (Admin only)
 * @access  Private (Admin only)
 */
router.delete('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent admin from deleting themselves
    if (req.user._id.equals(user._id)) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    // Check for associated cases
    const caseCount = await Case.countDocuments({
      $or: [
        { client: user._id },
        { assignedLawyer: user._id }
      ]
    });

    if (caseCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete user with ${caseCount} associated case(s). Please reassign or close cases first.`
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user'
    });
  }
});

module.exports = router;
