const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');
const workoutController = require('../controllers/workoutController');

// Get all workouts for a client
router.get('/client/:clientId', protect, workoutController.getWorkoutsByClient);

// Get workout stats for a client
router.get('/client/:clientId/stats', protect, workoutController.getWorkoutStats);

// Create workout (specialists/admins only)
router.post('/client/:clientId', protect, checkRole('specialist', 'admin', 'owner'), workoutController.createWorkout);

// Update workout
router.put('/:id', protect, workoutController.updateWorkout);

// Complete workout (client marks as done)
router.post('/:id/complete', protect, workoutController.completeWorkout);

// Delete workout (specialists/admins only)
router.delete('/:id', protect, checkRole('specialist', 'admin', 'owner'), workoutController.deleteWorkout);

module.exports = router;