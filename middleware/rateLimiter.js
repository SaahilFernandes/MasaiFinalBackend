const rateLimit = require('express-rate-limit');
const { createClient } = require('redis');
const { RateLimiterRedis } = require('rate-limit-redis');
const config = require('../config');

let redisClient;
let limiter;

try {
  // Create a Redis client
  redisClient = createClient({
    url: `redis://${config.redisHost}:${config.redisPort}`,
  });
  redisClient.on('error', (err) => console.log('Redis Client Error', err));
  
  // Connect to Redis before using it
  (async () => {
    await redisClient.connect();
  })();
  
  // Create a rate limiter that uses the Redis store
  limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true, 
    legacyHeaders: false,
    store: new RateLimiterRedis({
      sendCommand: (...args) => redisClient.sendCommand(args),
    }),
    message: 'Too many requests from this IP, please try again after 15 minutes',
  });

} catch (error) {
    console.log("Could not connect to Redis. Rate limiting will be disabled.");
    // Fallback to a simple in-memory limiter if Redis fails
    limiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 100,
    });
}


module.exports = limiter;