// src/routes/workout.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');
const workoutController = require('../controllers/workoutController');

// Existing routes...
router.get('/client/:clientId', protect, workoutController.getWorkoutsByClient);
router.post('/client/:clientId', protect, checkRole(['specialist', 'admin', 'owner']), workoutController.createWorkout);

// New routes for workout session
router.get('/:id', protect, workoutController.getWorkoutById);
router.post('/:id/start', protect, workoutController.startWorkout);
router.put('/:id/progress', protect, workoutController.updateExerciseProgress);
router.post('/:id/complete', protect, workoutController.completeWorkout);

module.exports = router;
