const express = require('express');
const router = express.Router();
const {
  createBooking,
  getMyBookingHistory,
  getAssignedTrips,
  updateTripStatus,
} = require('../controllers/tripController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/book', authorize('customer'), createBooking);
router.get('/my-history', authorize('customer'), getMyBookingHistory);
router.get('/assigned', authorize('driver'), getAssignedTrips);
router.patch('/:id/status', authorize('driver', 'admin'), updateTripStatus);

module.exports = router;