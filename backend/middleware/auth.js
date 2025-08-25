/**
 * Authentication Middleware
 * 
 * Provides JWT token verification and role-based access control
 * for protecting API routes in the Panchtatva application.
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Verify JWT token and attach user to request object
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }
    
    // Extract token (format: "Bearer <token>")
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Invalid token format.'
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database (excluding password)
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. User not found.'
      });
    }
    
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Account is deactivated.'
      });
    }
    
    // Attach user to request object
    req.user = user;
    next();
    
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Invalid token.'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Token expired.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error during authentication.'
    });
  }
};

/**
 * Role-based access control middleware
 * @param {Array} allowedRoles - Array of roles that can access the route
 */
const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    // Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Authentication required.'
      });
    }
    
    // Check if user role is allowed
    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.',
        requiredRoles: allowedRoles,
        userRole: req.user.role
      });
    }
    
    next();
  };
};

/**
 * Admin-only access middleware
 */
const adminOnly = authorize(['admin']);

/**
 * Lawyer-only access middleware
 */
const lawyerOnly = authorize(['lawyer']);

/**
 * Client-only access middleware
 */
const clientOnly = authorize(['client']);

/**
 * Lawyer or Admin access middleware
 */
const lawyerOrAdmin = authorize(['lawyer', 'admin']);

/**
 * Client or Lawyer access middleware (for case-related operations)
 */
const clientOrLawyer = authorize(['client', 'lawyer']);

/**
 * Check if user owns the resource or is admin/lawyer
 * Used for protecting user-specific resources
 */
const ownerOrAuthorized = (resourceUserField = 'userId') => {
  return (req, res, next) => {
    const resourceUserId = req.params[resourceUserField] || req.body[resourceUserField];
    
    // Admin can access everything
    if (req.user.role === 'admin') {
      return next();
    }
    
    // User can access their own resources
    if (req.user._id.toString() === resourceUserId) {
      return next();
    }
    
    // Lawyers can access client resources (with additional checks in route handlers)
    if (req.user.role === 'lawyer') {
      return next();
    }
    
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only access your own resources.'
    });
  };
};

/**
 * Optional authentication middleware
 * Attaches user to request if token is provided, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return next();
    }
    
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;
    
    if (!token) {
      return next();
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (user && user.isActive) {
      req.user = user;
    }
    
    next();
    
  } catch (error) {
    // Ignore authentication errors in optional auth
    next();
  }
};

/**
 * Rate limiting for sensitive operations
 */
const sensitiveOperationLimit = (req, res, next) => {
  // This would typically use redis or memory store for production
  // For now, we'll implement a simple in-memory rate limiter
  
  const key = `${req.ip}:${req.user ? req.user._id : 'anonymous'}`;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;
  
  // In production, use Redis for distributed rate limiting
  if (!global.rateLimitStore) {
    global.rateLimitStore = new Map();
  }
  
  const attempts = global.rateLimitStore.get(key) || [];
  const recentAttempts = attempts.filter(time => now - time < windowMs);
  
  if (recentAttempts.length >= maxAttempts) {
    return res.status(429).json({
      success: false,
      message: 'Too many attempts. Please try again later.',
      retryAfter: Math.ceil((recentAttempts[0] + windowMs - now) / 1000)
    });
  }
  
  recentAttempts.push(now);
  global.rateLimitStore.set(key, recentAttempts);
  
  next();
};

module.exports = {
  authenticate,
  authorize,
  adminOnly,
  lawyerOnly,
  clientOnly,
  lawyerOrAdmin,
  clientOrLawyer,
  ownerOrAuthorized,
  optionalAuth,
  sensitiveOperationLimit
};
