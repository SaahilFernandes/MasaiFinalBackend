const express = require('express');
const router = express.Router();
const { getAvailableVehicles, registerForVehicle } = require('../controllers/driverController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect, authorize('driver'));

router.get('/available-vehicles', getAvailableVehicles);
router.post('/register-vehicle/:vehicleId', registerForVehicle);

module.exports = router;