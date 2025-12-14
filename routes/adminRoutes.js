const express = require('express');
const router = express.Router();
const { 
  getAllUsers, 
  softDeleteUser, 
  getDashboardAnalytics,
  getAllVehicles, // Import
  getAllTrips,    // Import
  softDeleteTrip, // Import
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { softDeleteVehicle } = require('../controllers/vehicleController'); // We can reuse this

router.use(protect, authorize('admin'));

// Existing Routes
router.get('/analytics', getDashboardAnalytics);
router.get('/users', getAllUsers);
router.delete('/users/:id', softDeleteUser);

// --- NEW ROUTES ---
router.get('/vehicles', getAllVehicles);
router.delete('/vehicles/:id', softDeleteVehicle); // Re-using the logic from vehicleController is efficient
router.get('/trips', getAllTrips);
router.delete('/trips/:id', softDeleteTrip);

module.exports = router;