const checkRole = (roles) => {
    // Accept either a single array or multiple arguments
    const requiredRoles = Array.isArray(roles) ? roles : Array.from(arguments);
    
    return (req, res, next) => {
        console.log('CheckRole middleware - Required roles:', requiredRoles);
        console.log('CheckRole middleware - User:', req.user ? req.user.email : 'No user');
        console.log('CheckRole middleware - User roles:', req.user ? req.user.roles : 'No roles');
        
        if (!req.user) {
            console.error('CheckRole: No user object in request');
            return res.status(401).json({ 
                success: false, 
                error: 'Not authorized - no user' 
            });
        }
        
        // Ensure roles is an array
        const userRoles = Array.isArray(req.user.roles) ? req.user.roles : [req.user.roles].filter(Boolean);
        
        console.log('CheckRole middleware - Checking roles:', userRoles, 'against required:', requiredRoles);
        
        const hasRole = userRoles.some(role => requiredRoles.includes(role));
        
        if (!hasRole) {
            console.error('CheckRole: User does not have required role');
            console.error('User has:', userRoles);
            console.error('Needs one of:', requiredRoles);
            return res.status(403).json({ 
                success: false, 
                error: 'You do not have permission to perform this action',
                required: requiredRoles,
                userRoles: userRoles
            });
        }
        
        console.log('CheckRole: Permission granted');
        next();
    };
};

module.exports = { checkRole };
