const { verifyToken } = require('../config/auth');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;
    
// Allow OPTIONS requests to pass through
    if (req.method === 'OPTIONS') {
        return next();
    }
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = verifyToken(token);
            
            // FIX: Use userId not id
            req.user = await User.findById(decoded.userId).select('-password');
            
            // Check if user was found
            if (!req.user) {
                console.error('User not found for userId:', decoded.userId);
                return res.status(401).json({ 
                    success: false, 
                    error: 'User not found' 
                });
            }
            
            console.log('Auth successful for user:', req.user.email);
            next();
        } catch (error) {
            console.error('Auth middleware error:', error);
            return res.status(401).json({ 
                success: false, 
                error: 'Not authorized, token failed' 
            });
        }
    } else {
        return res.status(401).json({ 
            success: false, 
            error: 'Not authorized, no token' 
        });
    }
};

module.exports = { protect };
