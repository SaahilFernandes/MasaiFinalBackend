// backend/utils/generateToken.js
const jwt = require('jsonwebtoken');
const config = require('../config'); // <-- IMPORT THE CONFIG FILE

// Generates the short-lived access token
const generateAccessToken = (id) => {
  // Use the variables from the config object
  return jwt.sign({ id }, config.jwtAccessSecret, {
    expiresIn: config.jwtAccessExpiresIn,
  });
};

// Generates the long-lived refresh token
const generateRefreshToken = (id) => {
  // Use the variables from the config object
  return jwt.sign({ id }, config.jwtRefreshSecret, {
    expiresIn: config.jwtRefreshExpiresIn,
  });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
};