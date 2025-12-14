// backend/config/index.js
const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  port: process.env.PORT,
  mongoURI: process.env.MONGO_URI,

  // --- ADD/UPDATE THIS SECTION ---
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  // --- END OF SECTION ---

  redisHost: process.env.REDIS_HOST,
  redisPort: process.env.REDIS_PORT,
  emailHost: process.env.EMAIL_HOST,
  emailPort: process.env.EMAIL_PORT,
  emailUser: process.env.EMAIL_USER,
  emailPass: process.env.EMAIL_PASS,
  emailFrom: process.env.EMAIL_FROM,
};