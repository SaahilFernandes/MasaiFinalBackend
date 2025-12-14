const Vehicle = require('../models/vehicleModel');
const Trip = require('../models/tripModel');
const redisClient = require('../config/redisClient').getClient();

/**
 * @desc    Create a new vehicle
 * @route   POST /api/vehicles
 * @access  Private/Owner
 */
const createVehicle = async (req, res, next) => {
  const { make, model, year, licensePlate } = req.body;
  if (!make || !model || !year || !licensePlate) {
    return res.status(400).json({ message: 'Please provide all vehicle details' });
  }
  try {
    const vehicle = new Vehicle({
      make, model, year, licensePlate,
      owner: req.user._id,
    });
    const createdVehicle = await vehicle.save();
    res.status(201).json(createdVehicle);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all vehicles for the logged-in owner
 * @route   GET /api/vehicles/my-vehicles
 * @access  Private/Owner
 */
const getMyVehicles = async (req, res, next) => {
  try {
    const vehicles = await Vehicle.find({ owner: req.user._id, isDeleted: false });
    res.status(200).json(vehicles);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Soft delete a vehicle and invalidate the public vehicle cache.
 * @route   DELETE /api/vehicles/:id
 * @access  Private/Owner or Private/Admin
 */
const softDeleteVehicle = async (req, res, next) => {
    const cacheKey = 'public:vehicles';
    try {
        const vehicle = await Vehicle.findById(req.params.id);
        if (!vehicle) {
            return res.status(404).json({ message: 'Vehicle not found' });
        }
        if (vehicle.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to delete this vehicle' });
        }
        
        vehicle.isDeleted = true;
        await vehicle.save();
        
        await Trip.updateMany(
            { vehicle: vehicle._id, startTime: { $gte: new Date() } },
            { $set: { status: 'cancelled' } }
        );

        // --- CACHE INVALIDATION ---
        console.log('Vehicle deleted, invalidating public vehicle cache...');
        await redisClient.del(cacheKey);
        // --- END CACHE INVALIDATION ---

        res.status(200).json({ message: 'Vehicle removed and future trips cancelled' });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get all public, bookable vehicles (with caching).
 *          A vehicle is considered public if it's available and has at least one driver.
 * @route   GET /api/vehicles/public
 * @access  Public
 */
// backend/controllers/vehicleController.js

const getAllPublicVehicles = async (req, res, next) => {
  const cacheKey = 'public:vehicles';
  try {
    const cachedVehicles = await redisClient.get(cacheKey);
    if (cachedVehicles) {
      console.log('Serving public vehicles from cache!');
      return res.status(200).json(JSON.parse(cachedVehicles));
    }
    
    console.log('Serving public vehicles from database and caching result...');
    const vehicles = await Vehicle.find({
        isDeleted: false,
        status: 'available',
        drivers: { $not: { $size: 0 } }
      })
      .populate('owner', 'name')
      // --- THIS IS THE FIX ---
      // We now include the 'drivers' array in the response so the frontend knows who can drive the car.
      .select('make model year owner drivers');
      // --- END OF FIX ---

    await redisClient.set(cacheKey, JSON.stringify(vehicles), { EX: 300 });

    res.status(200).json(vehicles);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get dashboard insights (analytics) for a vehicle owner
 * @route   GET /api/vehicles/my-insights
 * @access  Private/Owner
 */
const getOwnerDashboardInsights = async (req, res, next) => {
    try {
        const ownerId = req.user._id;
        
        const vehicles = await Vehicle.find({ owner: ownerId }).select('_id');
        const vehicleIds = vehicles.map(v => v._id);
        
        const revenueData = await Trip.aggregate([
          { $match: { vehicle: { $in: vehicleIds }, status: 'completed' } },
          { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' }, totalBookings: { $sum: 1 } } },
        ]);
        
        const totalCancellations = await Trip.countDocuments({ vehicle: { $in: vehicleIds }, status: 'cancelled' });
        
        const tripHistory = await Trip.find({ vehicle: { $in: vehicleIds } })
          .populate('customer', 'name').populate('driver', 'name').populate('vehicle', 'make model')
          .sort({ createdAt: -1 }).limit(10);

        res.status(200).json({
          totalRevenue: revenueData[0]?.totalRevenue || 0,
          totalBookings: revenueData[0]?.totalBookings || 0,
          totalCancellations,
          tripHistory,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
  createVehicle,
  getMyVehicles,
  softDeleteVehicle,
  getAllPublicVehicles,
  getOwnerDashboardInsights,
};