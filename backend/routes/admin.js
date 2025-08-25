/**
 * Admin Routes
 * 
 * Provides administrative functionality including user management,
 * system analytics, case oversight, and platform administration.
 */

const express = require('express');
const User = require('../models/User');
const Case = require('../models/Case');
const Message = require('../models/Message');
const aiSchedulerService = require('../services/aiSchedulerService');
const { authenticate, adminOnly } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get admin dashboard data
 * @access  Private (Admin only)
 */
router.get('/dashboard', authenticate, adminOnly, async (req, res) => {
  try {
    // Get current date ranges for comparison
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // User statistics
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const newUsersThisMonth = await User.countDocuments({
      createdAt: { $gte: startOfMonth }
    });
    const newUsersLastMonth = await User.countDocuments({
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
    });

    // Case statistics
    const totalCases = await Case.countDocuments();
    const activeCases = await Case.countDocuments({
      status: { $nin: ['completed', 'dismissed', 'settled'] }
    });
    const newCasesThisMonth = await Case.countDocuments({
      createdAt: { $gte: startOfMonth }
    });
    const urgentCases = await Case.countDocuments({
      priorityScore: { $gte: 80 },
      status: { $nin: ['completed', 'dismissed', 'settled'] }
    });
    const delayedCases = await Case.countDocuments({
      'delayInfo.isDelayed': true,
      status: { $nin: ['completed', 'dismissed', 'settled'] }
    });

    // Message statistics
    const totalMessages = await Message.countDocuments({ isDeleted: false });
    const messagesThisMonth = await Message.countDocuments({
      createdAt: { $gte: startOfMonth },
      isDeleted: false
    });

    // System performance metrics
    const avgPriorityScore = await Case.aggregate([
      { $match: { status: { $nin: ['completed', 'dismissed', 'settled'] } } },
      { $group: { _id: null, avgScore: { $avg: '$priorityScore' } } }
    ]);

    const caseCompletionRate = await Case.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: {
            $sum: {
              $cond: [
                { $in: ['$status', ['completed', 'settled']] },
                1, 0
              ]
            }
          }
        }
      },
      {
        $project: {
          rate: { $multiply: [{ $divide: ['$completed', '$total'] }, 100] }
        }
      }
    ]);

    // Recent activity
    const recentCases = await Case.find()
      .populate('client', 'name email')
      .populate('assignedLawyer', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentUsers = await User.find()
      .select('name email role createdAt isActive')
      .sort({ createdAt: -1 })
      .limit(5);

    // Growth metrics
    const userGrowth = newUsersLastMonth > 0 
      ? ((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100 
      : 100;

    res.json({
      success: true,
      data: {
        overview: {
          users: {
            total: totalUsers,
            active: activeUsers,
            newThisMonth: newUsersThisMonth,
            growthRate: Math.round(userGrowth * 100) / 100
          },
          cases: {
            total: totalCases,
            active: activeCases,
            urgent: urgentCases,
            delayed: delayedCases,
            newThisMonth: newCasesThisMonth,
            avgPriorityScore: avgPriorityScore[0]?.avgScore || 0,
            completionRate: caseCompletionRate[0]?.rate || 0
          },
          messages: {
            total: totalMessages,
            thisMonth: messagesThisMonth
          }
        },
        recentActivity: {
          cases: recentCases,
          users: recentUsers
        }
      }
    });

  } catch (error) {
    console.error('Error fetching admin dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data'
    });
  }
});

/**
 * @route   GET /api/admin/analytics
 * @desc    Get detailed analytics data
 * @access  Private (Admin only)
 */
router.get('/analytics', authenticate, adminOnly, async (req, res) => {
  try {
    const { period = '30' } = req.query; // days
    const daysBack = parseInt(period);
    const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

    // Case analytics
    const casesByType = await Case.aggregate([
      {
        $group: {
          _id: '$caseType',
          count: { $sum: 1 },
          avgPriority: { $avg: '$priorityScore' },
          completed: {
            $sum: {
              $cond: [
                { $in: ['$status', ['completed', 'settled']] },
                1, 0
              ]
            }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const casesByStatus = await Case.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const casesByPriority = await Case.aggregate([
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 },
          avgScore: { $avg: '$priorityScore' }
        }
      }
    ]);

    // Time-based analytics
    const casesOverTime = await Case.aggregate([
      {
        $match: { createdAt: { $gte: startDate } }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    const usersOverTime = await User.aggregate([
      {
        $match: { createdAt: { $gte: startDate } }
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt'
              }
            },
            role: '$role'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    // Lawyer performance analytics
    const lawyerPerformance = await Case.aggregate([
      {
        $match: { assignedLawyer: { $ne: null } }
      },
      {
        $group: {
          _id: '$assignedLawyer',
          totalCases: { $sum: 1 },
          completedCases: {
            $sum: {
              $cond: [
                { $in: ['$status', ['completed', 'settled']] },
                1, 0
              ]
            }
          },
          avgPriorityScore: { $avg: '$priorityScore' },
          delayedCases: {
            $sum: { $cond: ['$delayInfo.isDelayed', 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'lawyer'
        }
      },
      {
        $unwind: '$lawyer'
      },
      {
        $project: {
          lawyerName: '$lawyer.name',
          lawyerEmail: '$lawyer.email',
          totalCases: 1,
          completedCases: 1,
          successRate: {
            $multiply: [
              { $divide: ['$completedCases', '$totalCases'] },
              100
            ]
          },
          avgPriorityScore: 1,
          delayedCases: 1
        }
      },
      { $sort: { successRate: -1 } }
    ]);

    // Delay analysis
    const delayAnalysis = await Case.aggregate([
      {
        $match: { 'delayInfo.isDelayed': true }
      },
      {
        $group: {
          _id: '$caseType',
          avgDelayDays: { $avg: '$delayInfo.delayDays' },
          maxDelayDays: { $max: '$delayInfo.delayDays' },
          count: { $sum: 1 }
        }
      },
      { $sort: { avgDelayDays: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        caseAnalytics: {
          byType: casesByType,
          byStatus: casesByStatus,
          byPriority: casesByPriority,
          overTime: casesOverTime
        },
        userAnalytics: {
          overTime: usersOverTime
        },
        performance: {
          lawyers: lawyerPerformance,
          delays: delayAnalysis
        }
      }
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics data'
    });
  }
});

/**
 * @route   POST /api/admin/ai/analyze-all
 * @desc    Trigger AI analysis for all active cases
 * @access  Private (Admin only)
 */
router.post('/ai/analyze-all', authenticate, adminOnly, async (req, res) => {
  try {
    // This is a heavy operation, so we'll run it in the background
    aiSchedulerService.runSchedulerAnalysis()
      .then(() => {
        console.log('Admin-triggered AI analysis completed');
      })
      .catch(error => {
        console.error('Admin-triggered AI analysis failed:', error);
      });

    res.json({
      success: true,
      message: 'AI analysis started for all active cases. This may take several minutes to complete.'
    });

  } catch (error) {
    console.error('Error triggering AI analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Error triggering AI analysis'
    });
  }
});

/**
 * @route   GET /api/admin/system-health
 * @desc    Get system health metrics
 * @access  Private (Admin only)
 */
router.get('/system-health', authenticate, adminOnly, async (req, res) => {
  try {
    // Database health
    const dbStats = {
      users: await User.countDocuments(),
      cases: await Case.countDocuments(),
      messages: await Message.countDocuments()
    };

    // AI Scheduler health
    const lastAnalysis = aiSchedulerService.lastRunTime;
    const isSchedulerHealthy = lastAnalysis && 
      (Date.now() - lastAnalysis.getTime()) < 2 * 60 * 60 * 1000; // Less than 2 hours ago

    // Recent errors (this would typically come from a logging system)
    const recentErrors = []; // Placeholder for error tracking

    // Performance metrics
    const performance = {
      avgResponseTime: 'N/A', // Would be tracked by monitoring system
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version
    };

    res.json({
      success: true,
      data: {
        database: {
          status: 'healthy',
          collections: dbStats
        },
        aiScheduler: {
          status: isSchedulerHealthy ? 'healthy' : 'warning',
          lastRun: lastAnalysis,
          isProcessing: aiSchedulerService.isProcessing
        },
        performance,
        errors: recentErrors
      }
    });

  } catch (error) {
    console.error('Error fetching system health:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching system health'
    });
  }
});

/**
 * @route   GET /api/admin/reports/export
 * @desc    Export system reports
 * @access  Private (Admin only)
 */
router.get('/reports/export', authenticate, adminOnly, async (req, res) => {
  try {
    const { type = 'cases', format = 'json' } = req.query;

    let data;
    let filename;

    switch (type) {
      case 'cases':
        data = await Case.find()
          .populate('client', 'name email')
          .populate('assignedLawyer', 'name email')
          .select('-documents.textContent -notes'); // Exclude large text fields
        filename = `cases-export-${Date.now()}`;
        break;

      case 'users':
        data = await User.find()
          .select('-password')
          .lean();
        filename = `users-export-${Date.now()}`;
        break;

      case 'analytics':
        // Generate comprehensive analytics report
        data = {
          generatedAt: new Date(),
          summary: await Case.getCaseStats(),
          userStats: await User.getUserStats()
        };
        filename = `analytics-export-${Date.now()}`;
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid export type'
        });
    }

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
      res.json(data);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Only JSON format is currently supported'
      });
    }

  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting data'
    });
  }
});

/**
 * @route   POST /api/admin/maintenance/cleanup
 * @desc    Run system cleanup tasks
 * @access  Private (Admin only)
 */
router.post('/maintenance/cleanup', authenticate, adminOnly, async (req, res) => {
  try {
    const { type = 'all' } = req.body;
    const results = {};

    if (type === 'all' || type === 'messages') {
      // Clean up deleted messages older than 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const deletedMessages = await Message.deleteMany({
        isDeleted: true,
        deletedAt: { $lt: thirtyDaysAgo }
      });
      results.deletedMessages = deletedMessages.deletedCount;
    }

    if (type === 'all' || type === 'cases') {
      // Update case statistics
      await aiSchedulerService.updateCaseStatistics();
      results.caseStatsUpdated = true;
    }

    if (type === 'all' || type === 'users') {
      // Update user case statistics
      const users = await User.find({ role: { $in: ['client', 'lawyer'] } });
      for (const user of users) {
        if (user.role === 'client') {
          const caseStats = await Case.aggregate([
            { $match: { client: user._id } },
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                active: {
                  $sum: {
                    $cond: [
                      { $nin: ['$status', ['completed', 'dismissed', 'settled']] },
                      1, 0
                    ]
                  }
                },
                completed: {
                  $sum: {
                    $cond: [
                      { $in: ['$status', ['completed', 'settled']] },
                      1, 0
                    ]
                  }
                }
              }
            }
          ]);

          if (caseStats.length > 0) {
            user.caseStats = {
              totalCases: caseStats[0].total,
              activeCases: caseStats[0].active,
              completedCases: caseStats[0].completed,
              successRate: caseStats[0].total > 0 ? 
                (caseStats[0].completed / caseStats[0].total) * 100 : 0
            };
            await user.save();
          }
        }
      }
      results.userStatsUpdated = users.length;
    }

    res.json({
      success: true,
      message: 'Cleanup completed successfully',
      data: results
    });

  } catch (error) {
    console.error('Error running cleanup:', error);
    res.status(500).json({
      success: false,
      message: 'Error running cleanup'
    });
  }
});

module.exports = router;
