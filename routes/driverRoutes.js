const express = require('express');
const router = express.Router();
const { getAvailableVehicles, registerForVehicle, getMyVehicles } = require('../controllers/driverController'); // Import new function
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect, authorize('driver'));

router.get('/available-vehicles', getAvailableVehicles);
router.post('/register-vehicle/:vehicleId', registerForVehicle);
router.get('/my-vehicles', getMyVehicles); // <-- ADD THIS NEW ROUTE

module.exports = router;