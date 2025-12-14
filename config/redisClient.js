const { createClient } = require('redis');
const config = require('./index');

let redisClient;
let isRedisConnected = false;

(async () => {
  redisClient = createClient({
    url: `redis://${config.redisHost}:${config.redisPort}`,
  });

  redisClient.on('error', (err) => console.log('Redis Client Error', err));

  redisClient.on('connect', () => {
    isRedisConnected = true;
    console.log('Redis connected successfully.');
  });

  try {
    await redisClient.connect();
  } catch (error) {
    console.log('Could not connect to Redis:', error.message);
  }
})();

module.exports = {
  getClient: () => redisClient,
  isConnected: () => isRedisConnected,
};