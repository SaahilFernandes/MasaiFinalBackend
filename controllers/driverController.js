const Vehicle = require('../models/vehicleModel');
const redisClient = require('../config/redisClient').getClient();

/**
 * @desc    Get all vehicles that a driver can register for.
 *          It finds vehicles where the current driver's ID is not already in the `drivers` array.
 * @route   GET /api/driver/available-vehicles
 * @access  Private/Driver
 */
const getAvailableVehicles = async (req, res, next) => {
  try {
    const vehicles = await Vehicle.find({
      drivers: { $ne: req.user._id }, // $ne means "not equal to"
      isDeleted: false,
    }).populate('owner', 'name');
    
    res.status(200).json(vehicles);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Register the current authenticated driver for a selected vehicle.
 *          After registration, it invalidates the Redis cache for the public vehicle list.
 * @route   POST /api/driver/register-vehicle/:vehicleId
 * @access  Private/Driver
 */
const registerForVehicle = async (req, res, next) => {
  const cacheKey = 'public:vehicles'; // The cache key for the public vehicle list
  try {
    const vehicle = await Vehicle.findById(req.params.vehicleId);
    
    if (!vehicle || vehicle.isDeleted) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }
    
    if (vehicle.drivers.includes(req.user._id)) {
      return res.status(400).json({ message: 'Driver is already registered for this vehicle' });
    }

    vehicle.drivers.push(req.user._id);
    await vehicle.save();

    // --- CACHE INVALIDATION ---
    // A driver registration can make a vehicle publicly available.
    // We must delete the old, stale cache to force a refresh on the next request.
    console.log('Driver registered, invalidating public vehicle cache...');
    await redisClient.del(cacheKey);
    // --- END CACHE INVALIDATION ---

    res.status(200).json({ message: 'Successfully registered for vehicle', vehicle });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAvailableVehicles,
  registerForVehicle,
};