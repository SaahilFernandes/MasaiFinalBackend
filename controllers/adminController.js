const User = require('../models/userModel');
const Vehicle = require('../models/vehicleModel');
const Trip = require('../models/tripModel');

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({ isDeleted: false });
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};

// @desc    Soft delete a user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
const softDeleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    user.isDeleted = true;
    await user.save();
    res.status(200).json({ message: 'User successfully soft-deleted' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get dashboard analytics
// @route   GET /api/admin/analytics
// @access  Private/Admin
const getDashboardAnalytics = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments({ isDeleted: false });
    const totalVehicles = await Vehicle.countDocuments({ isDeleted: false });
    const totalTrips = await Trip.countDocuments({ isDeleted: false });
    
    const revenueData = await Trip.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

    res.status(200).json({ totalUsers, totalVehicles, totalTrips, totalRevenue });
  } catch (error) {
    next(error);
  }
};
const getAllVehicles = async (req, res, next) => {
  try {
    const vehicles = await Vehicle.find({})
      .populate('owner', 'name email')
      .populate('drivers', 'name email');
    res.status(200).json(vehicles);
  } catch (error) {
    next(error);
  }
};

// --- NEW FUNCTION ---
// @desc    Get all trips in the system
// @route   GET /api/admin/trips
// @access  Private/Admin
const getAllTrips = async (req, res, next) => {
  try {
    const trips = await Trip.find({})
      .populate('customer', 'name email')
      .populate('driver', 'name email')
      .populate('vehicle', 'make model licensePlate');
    res.status(200).json(trips);
  } catch (error) {
    next(error);
  }
};

// --- NEW FUNCTION ---
// @desc    Soft delete a trip
// @route   DELETE /api/admin/trips/:id
// @access  Private/Admin
const softDeleteTrip = async (req, res, next) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }
    trip.isDeleted = true;
    await trip.save();
    res.status(200).json({ message: 'Trip successfully soft-deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  softDeleteUser,
  getDashboardAnalytics,
  getAllVehicles,
  getAllTrips,
  softDeleteTrip,
};