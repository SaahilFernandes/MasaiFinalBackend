const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const config = require('../config');
const redisClient = require('../config/redisClient').getClient(); // Import the Redis client

/**
 * Middleware to protect routes that require authentication.
 * It verifies the JWT and checks if it has been blacklisted.
 */
const protect = async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // --- NEW BLACKLIST CHECK ---
      // Check if the token exists in our Redis blacklist
      const isBlacklisted = await redisClient.get(token);
      if (isBlacklisted) {
        return res.status(401).json({ message: 'Not authorized, token revoked' });
      }
      // --- END OF NEW CHECK ---

      // Verify the token using the access secret
      const decoded = jwt.verify(token, config.jwtAccessSecret);

      // Get user from the token and attach it to the request object
      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user || req.user.isDeleted) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }
      
      next();
    } catch (error) {
      // This will catch expired tokens or invalid signatures
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

/**
 * Middleware to grant access to specific roles.
 * Must be used AFTER the `protect` middleware.
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Role '${req.user.role}' is not authorized to access this route`,
      });
    }
    next();
  };
};

module.exports = { protect, authorize };