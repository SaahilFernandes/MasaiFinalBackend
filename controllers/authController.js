const User = require('../models/userModel');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateToken');
const jwt = require('jsonwebtoken');
const redisClient = require('../config/redisClient').getClient(); // <-- ADD THIS LINE

// @desc    Register a new user (No changes needed here)
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
    // ... This function remains exactly the same
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Please enter all fields' });
    }
    if (!['customer', 'driver', 'owner'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    try {
      const userExists = await User.findOne({ email });
      if (userExists) {
        return res.status(400).json({ message: 'User already exists' });
      }
      const user = await User.create({ name, email, password, role });
      if (user) {
        // For simplicity, we can log the user in directly after registration
        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        // Send refresh token in secure cookie
        res.cookie('refreshToken', refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV !== 'development', // Use secure cookies in production
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.status(201).json({
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          accessToken: accessToken, // Send access token
        });
      } else {
        res.status(400).json({ message: 'Invalid user data' });
      }
    } catch (error) {
      next(error);
    }
};

// @desc    Authenticate user & get tokens
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email, isDeleted: false }).select('+password');
    if (user && (await user.matchPassword(password))) {
      const accessToken = generateAccessToken(user._id);
      const refreshToken = generateRefreshToken(user._id);

      // Send refresh token in secure HttpOnly cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days (must match refresh token expiry)
      });
      
      // Send access token and user info in response body
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        accessToken: accessToken,
        refreshToken: refreshToken // Renamed from 'token' to 'refreshToken'
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get a new access token using a refresh token
// @route   POST /api/auth/refresh
// @access  Public (via cookie)
const refreshToken = async (req, res, next) => {
    const token = req.cookies.refreshToken;
    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no refresh token' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        const accessToken = generateAccessToken(user._id);
        res.json({ accessToken });

    } catch (error) {
        return res.status(403).json({ message: 'Invalid refresh token' });
    }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Public
// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Public
const logoutUser = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (token) {
      // Decode token to get its expiration time
      const decodedToken = jwt.decode(token);
      if (decodedToken && decodedToken.exp) {
        const expirationTime = decodedToken.exp;
        const currentTime = Math.floor(Date.now() / 1000);
        const remainingTime = expirationTime - currentTime;

        // Only add to blacklist if it has time remaining
        if (remainingTime > 0) {
          // This line will now work because redisClient is defined
          await redisClient.set(token, 'blacklisted', {
            EX: remainingTime,
          });
        }
      }
    }
    
    // Clear the refresh token cookie
    res.cookie('refreshToken', '', {
        httpOnly: true,
        expires: new Date(0),
    });

    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error during logout', error: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  refreshToken,
  logoutUser,
};