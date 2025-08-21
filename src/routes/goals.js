const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');
const goalController = require('../controllers/goalController');

// Get all goals for a client
router.get('/client/:clientId', protect, goalController.getGoalsByClient);

// Create goal
router.post('/client/:clientId', protect, goalController.createGoal);

// Update goal (including progress updates)
router.put('/:id', protect, goalController.updateGoal);

// Delete goal
router.delete('/:id', protect, goalController.deleteGoal);

module.exports = router;