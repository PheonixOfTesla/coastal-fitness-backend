const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');
const userController = require('../controllers/userController');

// Public routes
router.post('/register', userController.createUser);

// Protected routes
router.get('/profile', protect, userController.getProfile);
router.put('/profile', protect, userController.updateProfile);

// Admin/Owner only routes
router.get('/', protect, checkRole('admin', 'owner'), userController.getAllUsers);
router.post('/', protect, checkRole('admin', 'owner'), userController.createUser);
router.put('/:id', protect, checkRole('admin', 'owner'), userController.updateUser);
router.delete('/:id', protect, checkRole('admin', 'owner'), userController.deleteUser);

// Specialist routes
router.get('/specialist/:specialistId/clients', protect, userController.getClientsBySpecialist);
router.post('/specialist/:specialistId/assign', protect, checkRole('admin', 'owner'), userController.assignClientToSpecialist);
router.delete('/specialist/:specialistId/unassign', protect, checkRole('admin', 'owner'), userController.unassignClientFromSpecialist);

module.exports = router;