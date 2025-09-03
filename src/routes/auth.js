const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// TEMPORARY - Generate hash endpoint (REMOVE AFTER FIXING)
router.get('/generate-hash', authController.generateHash);

// Auth routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/reset-password', authController.resetPasswordRequest);
router.put('/reset-password/:resetToken', authController.resetPassword);

module.exports = router;
