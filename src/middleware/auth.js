const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;
    
    // Allow OPTIONS requests to pass through
    if (req.method === 'OPTIONS') {
        return next();
    }
    
    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Extract token
            token = req.headers.authorization.split(' ')[1];
            
            console.log('Token received:', token ? 'Yes' : 'No');
            
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-this');
            
            console.log('Decoded token:', decoded);
            
            // Find user - the token has userId field
            req.user = await User.findById(decoded.userId).select('-password');
            
            // Check if user was found
            if (!req.user) {
                console.error('User not found for userId:', decoded.userId);
                return res.status(401).json({ 
                    success: false, 
                    error: 'User not found' 
                });
            }
            
            // Add the user ID in both formats for compatibility
            req.user.id = req.user._id;
            
            console.log('Auth successful for user:', req.user.email);
            next();
        } catch (error) {
            console.error('Auth middleware error:', error.message);
            return res.status(401).json({ 
                success: false, 
                error: 'Not authorized, token failed',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    } else {
        console.log('No token provided in request');
        return res.status(401).json({ 
            success: false, 
            error: 'Not authorized, no token' 
        });
    }
};

module.exports = { protect };
