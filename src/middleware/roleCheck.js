const checkRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                error: 'Not authorized' 
            });
        }
        
        const hasRole = req.user.roles.some(role => roles.includes(role));
        
        if (!hasRole) {
            return res.status(403).json({ 
                success: false, 
                error: 'You do not have permission to perform this action' 
            });
        }
        
        next();
    };
};

module.exports = { checkRole };