const express = require('express');
const router = express.Router();
const {
  createBooking,
  getMyBookingHistory,
  getAssignedTrips,
  updateTripStatus,
  acceptTrip,   // Import new
  cancelTrip,   // Import new
} = require('../controllers/tripController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

// Customer routes
router.post('/book', authorize('customer'), createBooking);
router.get('/my-history', authorize('customer'), getMyBookingHistory);

// Driver routes
router.get('/assigned', authorize('driver'), getAssignedTrips);

// Driver and Admin routes
router.patch('/:id/status', authorize('driver', 'admin'), updateTripStatus);

// New Driver route for accepting a trip
router.patch('/:id/accept', authorize('driver'), acceptTrip);

// New Shared route for cancelling a trip
router.patch('/:id/cancel', authorize('driver', 'customer'), cancelTrip);

module.exports = router;