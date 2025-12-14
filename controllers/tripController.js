const Trip = require('../models/tripModel');
const Vehicle = require('../models/vehicleModel');
const User = require('../models/userModel');
const sendEmail = require('../utils/emailService');

// @desc    Create a new booking/trip
// @route   POST /api/trips/book
// @access  Private/Customer
const createBooking = async (req, res, next) => {
  const { vehicleId, driverId, startTime, endTime, totalAmount } = req.body;
  if (!vehicleId || !driverId || !startTime || !endTime || !totalAmount) {
    return res.status(400).json({ message: 'Please provide all booking details' });
  }
  try {
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle || vehicle.isDeleted) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }
    const driver = await User.findById(driverId);
    if (!driver || driver.role !== 'driver' || driver.isDeleted) {
        return res.status(404).json({ message: 'Driver not found' });
    }
    const trip = new Trip({
      customer: req.user._id, vehicle: vehicleId, driver: driverId,
      startTime, endTime, totalAmount, status: 'confirmed',
    });
    const createdTrip = await trip.save();

    await sendEmail({
      email: req.user.email,
      subject: 'Booking Confirmation',
      message: `Your booking for the ${vehicle.make} ${vehicle.model} from ${new Date(startTime).toLocaleString()} to ${new Date(endTime).toLocaleString()} is confirmed.`,
    });
    res.status(201).json(createdTrip);
  } catch (error) {
    next(error);
  }
};

// @desc    Get booking history for a customer
// @route   GET /api/trips/my-history
// @access  Private/Customer
const getMyBookingHistory = async (req, res, next) => {
  try {
    const trips = await Trip.find({ customer: req.user._id })
      .populate('vehicle', 'make model licensePlate')
      .populate('driver', 'name');
    res.status(200).json(trips);
  } catch (error) {
    next(error);
  }
};

// @desc    Get assigned trips for a driver
// @route   GET /api/trips/assigned
// @access  Private/Driver
const getAssignedTrips = async (req, res, next) => {
  try {
    const trips = await Trip.find({ driver: req.user._id, isDeleted: false })
      .populate('vehicle', 'make model licensePlate')
      .populate('customer', 'name');
    res.status(200).json(trips);
  } catch (error) {
    next(error);
  }
};

// @desc    Update trip status
// @route   PATCH /api/trips/:id/status
// @access  Private/Driver or Private/Admin
const updateTripStatus = async (req, res, next) => {
  const { status } = req.body;
  const validStatuses = ['ongoing', 'completed', 'cancelled'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status provided' });
  }
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }
    if (trip.driver.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this trip' });
    }
    trip.status = status;
    await trip.save();
    res.status(200).json(trip);
  } catch (error) {
    next(error);
  }
};

module.exports = { createBooking, getMyBookingHistory, getAssignedTrips, updateTripStatus };