const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const measurementController = require('../controllers/measurementController');

router.get('/client/:clientId', protect, measurementController.getMeasurementsByClient);
router.post('/client/:clientId', protect, measurementController.createMeasurement);
router.put('/:id', protect, measurementController.updateMeasurement);
router.delete('/:id', protect, measurementController.deleteMeasurement);
router.get('/client/:clientId/stats', protect, measurementController.getMeasurementStats);

module.exports = router;