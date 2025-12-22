const Trip = require('../models/tripModel');
const Vehicle = require('../models/vehicleModel');
const User = require('../models/userModel');
const sendEmail = require('../utils/emailService');

/**
 * @desc    Create a new booking/trip REQUEST. Status will be 'pending'.
 * @route   POST /api/trips/book
 * @access  Private/Customer
 */
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
      customer: req.user._id,
      vehicle: vehicleId,
      driver: driverId,
      startTime,
      endTime,
      totalAmount,
      status: 'pending', // New trips are now pending approval
    });

    const createdTrip = await trip.save();
    
    // Optional: Email driver about the new request.
    // await sendEmail({ ... });

    res.status(201).json(createdTrip);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get booking history for the logged-in customer
 * @route   GET /api/trips/my-history
 * @access  Private/Customer
 */
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

/**
 * @desc    Get assigned trips for the logged-in driver
 * @route   GET /api/trips/assigned
 * @access  Private/Driver
 */
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

/**
 * @desc    Update trip status (for ongoing/completed)
 * @route   PATCH /api/trips/:id/status
 * @access  Private/Driver or Private/Admin
 */
const updateTripStatus = async (req, res, next) => {
  const { status } = req.body;
  const validStatuses = ['ongoing', 'completed']; // 'cancelled' is now a separate action
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status provided for this action' });
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

/**
 * @desc    Accept a pending trip
 * @route   PATCH /api/trips/:id/accept
 * @access  Private/Driver
 */
const acceptTrip = async (req, res, next) => {
  try {
    const trip = await Trip.findById(req.params.id)
      .populate('customer', 'name email')
      .populate('vehicle', 'make model');

    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }
    if (trip.driver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to accept this trip' });
    }
    if (trip.status !== 'pending') {
      return res.status(400).json({ message: 'Trip is not in a pending state' });
    }

    trip.status = 'confirmed';
    await trip.save();
    
    await sendEmail({
      email: trip.customer.email,
      subject: 'Your Trip has been Confirmed!',
      message: `Your booking for the ${trip.vehicle.make} ${trip.vehicle.model} starting at ${new Date(trip.startTime).toLocaleString()} has been confirmed by the driver.`,
    });

    res.status(200).json(trip);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel a pending or confirmed trip
 * @route   PATCH /api/trips/:id/cancel
 * @access  Private/Customer or Private/Driver
 */
const cancelTrip = async (req, res, next) => {
    try {
        const trip = await Trip.findById(req.params.id)
          .populate('customer', 'name email');

        if (!trip) {
            return res.status(404).json({ message: 'Trip not found' });
        }
        
        const isCustomer = trip.customer._id.toString() === req.user._id.toString();
        const isDriver = trip.driver.toString() === req.user._id.toString();

        if (!isCustomer && !isDriver) {
            return res.status(403).json({ message: 'Not authorized to cancel this trip' });
        }

        if (trip.status !== 'pending' && trip.status !== 'confirmed') {
            return res.status(400).json({ message: `Cannot cancel a trip that is ${trip.status}` });
        }

        trip.status = 'cancelled';
        await trip.save();

        await sendEmail({
          email: trip.customer.email,
          subject: 'Your Trip has been Cancelled',
          message: `Your booking for a trip starting at ${new Date(trip.startTime).toLocaleString()} has been cancelled.`,
        });

        res.status(200).json({ message: 'Trip successfully cancelled' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
  createBooking,
  getMyBookingHistory,
  getAssignedTrips,
  updateTripStatus,
  acceptTrip,
  cancelTrip,
};