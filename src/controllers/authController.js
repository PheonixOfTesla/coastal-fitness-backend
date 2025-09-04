const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const { generateToken } = require('../config/auth');

// ============================================
// TEMPORARY HASH GENERATOR - REMOVE AFTER FIXING
// ============================================
exports.generateHash = async (req, res) => {
  try {
    const password = req.query.password || 'admin123';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    
    console.log('🔐 Generated new hash:');
    console.log('Password:', password);
    console.log('Hash:', hash);
    console.log('Verification:', bcrypt.compareSync(password, hash));
    
    res.json({ 
      success: true,
      password: password,
      hash: hash,
      verified: bcrypt.compareSync(password, hash),
      bcryptVersion: require('bcryptjs/package.json').version,
      instruction: 'Use this hash in MongoDB for the password field'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, roles = ['client'] } = req.body;
    
    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email and password are required' 
      });
    }
    
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ 
        success: false,
        message: 'User already exists' 
      });
    }
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const user = await User.create({
      name: name || email.split('@')[0], // Default name if not provided
      email,
      password: hashedPassword,
      roles
    });
    
    const token = generateToken(user._id);
    
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        roles: user.roles
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

exports.login = async (req, res) => {
  try {
    // Log the entire request body for debugging
    console.log('Login attempt - Request body:', JSON.stringify(req.body));
    
    // Extract only what we need, ignoring extra fields like "name"
    const { email, password } = req.body;
    
    // Validate required fields
    if (!email || !password) {
      console.log('Missing credentials:', { email: !!email, password: !!password });
      return res.status(400).json({ 
        success: false,
        message: 'Email and password are required' 
      });
    }
    
    // Clean the email (trim whitespace)
    const cleanEmail = email.trim().toLowerCase();
    console.log('Looking for user with email:', cleanEmail);
    
    // Find user with password field included
    const user = await User.findOne({ email: cleanEmail }).select('+password');
    
    if (!user) {
      console.log('No user found with email:', cleanEmail);
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }
    
    console.log('User found:', {
      id: user._id,
      email: user.email,
      hasPassword: !!user.password,
      roles: user.roles
    });
    
    // Check password
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    console.log('Password comparison result:', isPasswordMatch);
    
    if (!isPasswordMatch) {
      // Additional debug info
      console.log('Password mismatch for user:', cleanEmail);
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }
    
    // Generate token
    const token = generateToken(user._id);
    
    // Update last active
    user.lastActive = new Date();
    user.online = true;
    await user.save();
    
    console.log('Login successful for:', cleanEmail);
    
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        roles: user.roles
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'An error occurred during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.logout = async (req, res) => {
  try {
    if (req.user && req.user.id) {
      await User.findByIdAndUpdate(req.user.id, {
        online: false,
        lastActive: new Date()
      });
    }
    res.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      success: false,
      message: 'An error occurred during logout' 
    });
  }
};

exports.resetPasswordRequest = async (req, res) => {
  res.json({ 
    success: true, 
    message: 'Password reset functionality not implemented yet' 
  });
};

exports.resetPassword = async (req, res) => {
  res.json({ 
    success: true, 
    message: 'Password reset functionality not implemented yet' 
  });
};
