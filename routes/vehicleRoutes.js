const express = require('express');
const router = express.Router();
const {
  createVehicle,
  getMyVehicles,
  softDeleteVehicle,
  getAllPublicVehicles, // Import the new controller function
  getOwnerDashboardInsights,
} = require('../controllers/vehicleController');
const { protect, authorize } = require('../middleware/authMiddleware');

// --- NEW PUBLIC ROUTE ---
// This route is for public access and does not require a token.
// It MUST be defined before router.use(protect).
router.get('/public', getAllPublicVehicles);
// --- END OF NEW ROUTE ---


// All routes below this line are protected and require a valid token.
router.use(protect);

// Routes for Vehicle Owners
router.route('/').post(authorize('owner'), createVehicle);
router.route('/my-vehicles').get(authorize('owner'), getMyVehicles);
router.route('/my-insights').get(authorize('owner', 'admin'), getOwnerDashboardInsights);

// Routes for Owners and Admins
router.route('/:id').delete(authorize('owner', 'admin'), softDeleteVehicle);


module.exports = router;