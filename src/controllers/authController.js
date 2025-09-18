const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// STANDARDIZED JWT Token Generation
const generateToken = (userId, email, roles) => {
  return jwt.sign(
    { 
      id: userId.toString(),        // ALWAYS include 'id'
      userId: userId.toString(),    // ALWAYS include 'userId'
      email: email,
      roles: roles 
    },
    process.env.JWT_SECRET || 'your-secret-key-change-this',
    { expiresIn: '24h' }
  );
};

// REGISTER NEW USER
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
    
    // Check if user exists
    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({ 
        success: false,
        message: 'User already exists' 
      });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user
    const user = await User.create({
      name: name || email.split('@')[0],
      email: email.toLowerCase(),
      password: hashedPassword,
      roles: roles
    });
    
    // Generate token with standardized format
    const token = generateToken(user._id, user.email, user.roles);
    
    // Send response (without password)
    res.status(201).json({
      success: true,
      token: token,
      user: {
        _id: user._id,
        id: user._id, // Both formats for compatibility
        name: user.name,
        email: user.email,
        roles: user.roles
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// LOGIN USER
exports.login = async (req, res) => {
  try {
    // Only extract email and password, ignore any other fields
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email and password are required' 
      });
    }
    
    // Find user and explicitly include password field
    const user = await User.findOne({ 
      email: email.toLowerCase() 
    }).select('+password');
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }
    
    // Check password using the model's method
    const isPasswordValid = await user.matchPassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }
    
    // Generate token with standardized format
    const token = generateToken(user._id, user.email, user.roles);
    
    // Update user status
    user.lastActive = new Date();
    user.online = true;
    await user.save();
    
    // Send response (without password)
    res.json({
      success: true,
      token: token,
      user: {
        _id: user._id,
        id: user._id, // Both formats for compatibility
        name: user.name,
        email: user.email,
        roles: user.roles
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// LOGOUT USER
exports.logout = async (req, res) => {
  try {
    // Update user status if authenticated
    if (req.user && req.user.userId) {
      await User.findByIdAndUpdate(req.user.userId, {
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
      message: 'Logout failed' 
    });
  }
};

// REQUEST PASSWORD RESET
exports.resetPasswordRequest = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false,
        message: 'Email is required' 
      });
    }
    
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      // Don't reveal if user exists or not
      return res.json({ 
        success: true,
        message: 'If the email exists, a reset link has been sent' 
      });
    }
    
    // TODO: Implement actual password reset logic here
    // 1. Generate reset token
    // 2. Save token to user with expiry
    // 3. Send email with reset link
    
    res.json({ 
      success: true,
      message: 'If the email exists, a reset link has been sent' 
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Password reset request failed' 
    });
  }
};

// RESET PASSWORD WITH TOKEN
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ 
        success: false,
        message: 'Token and new password are required' 
      });
    }
    
    // TODO: Implement actual password reset logic here
    // 1. Verify reset token
    // 2. Check token expiry
    // 3. Hash new password
    // 4. Update user password
    // 5. Clear reset token
    
    res.json({ 
      success: true,
      message: 'Password reset functionality coming soon' 
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Password reset failed' 
    });
  }
};

// VERIFY TOKEN (for checking if user is still authenticated)
exports.verifyToken = async (req, res) => {
  try {
    // The auth middleware should have already verified the token
    const user = await User.findById(req.user.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'User not found' 
      });
    }
    
    res.json({
      success: true,
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        roles: user.roles
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ 
      success: false,
      message: 'Token verification failed' 
    });
  }
};
