const { verifyToken } = require('../config/auth');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = verifyToken(token);
            req.user = await User.findById(decoded.id).select('-password');
            next();
        } catch (error) {
            return res.status(401).json({ 
                success: false, 
                error: 'Not authorized, token failed' 
            });
        }
    }
    
    if (!token) {
        return res.status(401).json({ 
            success: false, 
            error: 'Not authorized, no token' 
        });
    }
};

module.exports = { protect };
