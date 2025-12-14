const express = require('express');
const router = express.Router();
const { registerUser, loginUser, refreshToken, logoutUser } = require('../controllers/authController');
const apiLimiter = require('../middleware/rateLimiter');

router.post('/register', apiLimiter, registerUser);
router.post('/login', apiLimiter, loginUser);

// Add these new routes
router.post('/refresh', refreshToken); // No rate limit needed as it's cookie-based
router.post('/logout', logoutUser);

module.exports = router;