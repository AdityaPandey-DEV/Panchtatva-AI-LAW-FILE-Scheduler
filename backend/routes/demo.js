/**
 * Demo Routes for Hackathon Presentation
 * 
 * Provides mock authentication and data for demonstration purposes
 * when MongoDB is not available.
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Mock users for demo
const demoUsers = [
  {
    _id: '64f5a1b2c3d4e5f6a7b8c9d0',
    name: 'Admin User',
    email: 'admin@panchtatva.com',
    password: 'admin123', // In real app, this would be hashed
    role: 'admin',
    isActive: true,
    isVerified: true
  },
  {
    _id: '64f5a1b2c3d4e5f6a7b8c9d1',
    name: 'John Lawyer',
    email: 'lawyer@panchtatva.com',
    password: 'lawyer123',
    role: 'lawyer',
    isActive: true,
    isVerified: true,
    specialization: ['Criminal Law', 'Civil Law'],
    experience: 8
  },
  {
    _id: '64f5a1b2c3d4e5f6a7b8c9d2',
    name: 'Jane Client',
    email: 'client@panchtatva.com',
    password: 'client123',
    role: 'client',
    isActive: true,
    isVerified: true
  }
];

// Mock cases for demo
const demoCases = [
  {
    _id: '64f5a1b2c3d4e5f6a7b8c9d3',
    caseNumber: 'CASE/2024/0001',
    title: 'Property Dispute - ABC vs XYZ',
    description: 'Commercial property ownership dispute requiring urgent resolution due to pending sale agreement.',
    caseType: 'Property',
    status: 'in_progress',
    priority: 'urgent',
    priorityScore: 85,
    client: demoUsers[2],
    assignedLawyer: demoUsers[1],
    filingDate: new Date('2024-01-15'),
    hearingDate: new Date('2024-09-15'),
    estimatedValue: 5000000
  },
  {
    _id: '64f5a1b2c3d4e5f6a7b8c9d4',
    caseNumber: 'CASE/2024/0002',
    title: 'Employment Contract Violation',
    description: 'Corporate employment contract dispute involving wrongful termination and compensation claims.',
    caseType: 'Corporate',
    status: 'assigned',
    priority: 'high',
    priorityScore: 78,
    client: demoUsers[2],
    assignedLawyer: demoUsers[1],
    filingDate: new Date('2024-02-20'),
    estimatedValue: 2500000
  },
  {
    _id: '64f5a1b2c3d4e5f6a7b8c9d5',
    caseNumber: 'CASE/2024/0003',
    title: 'Family Custody Case',
    description: 'Child custody arrangement modification with financial support considerations.',
    caseType: 'Family',
    status: 'awaiting_hearing',
    priority: 'medium',
    priorityScore: 65,
    client: demoUsers[2],
    assignedLawyer: demoUsers[1],
    filingDate: new Date('2024-03-10'),
    hearingDate: new Date('2024-10-05'),
    estimatedValue: 0
  }
];

/**
 * Demo login endpoint
 */
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user in demo data
    const user = demoUsers.find(u => u.email === email && u.password === password);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name
      },
      process.env.JWT_SECRET || 'demo_jwt_secret',
      { expiresIn: '7d' }
    );
    
    // Remove password from response
    const userResponse = { ...user };
    delete userResponse.password;
    
    res.json({
      success: true,
      message: 'Login successful (Demo Mode)',
      data: {
        token,
        user: userResponse
      }
    });
    
  } catch (error) {
    console.error('Demo login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * Demo cases endpoint
 */
router.get('/cases', (req, res) => {
  try {
    // In demo mode, return mock cases
    res.json({
      success: true,
      data: {
        cases: demoCases,
        pagination: {
          current: 1,
          pages: 1,
          total: demoCases.length,
          limit: 20
        }
      }
    });
  } catch (error) {
    console.error('Demo cases error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching demo cases'
    });
  }
});

/**
 * Demo user profile endpoint
 */
router.get('/me', (req, res) => {
  try {
    // Extract user ID from token (simplified for demo)
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'demo_jwt_secret');
    
    const user = demoUsers.find(u => u._id === decoded.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const userResponse = { ...user };
    delete userResponse.password;
    
    res.json({
      success: true,
      data: { user: userResponse }
    });
    
  } catch (error) {
    console.error('Demo profile error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

/**
 * Demo dashboard stats
 */
router.get('/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      totalCases: demoCases.length,
      activeCases: demoCases.filter(c => !['completed', 'dismissed'].includes(c.status)).length,
      urgentCases: demoCases.filter(c => c.priority === 'urgent').length,
      completedCases: demoCases.filter(c => c.status === 'completed').length
    }
  });
});

module.exports = router;
