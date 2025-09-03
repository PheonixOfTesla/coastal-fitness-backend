const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// User Model (inline to avoid import issues)
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    roles: [{ 
        type: String, 
        enum: ['client', 'specialist', 'admin', 'owner', 'engineer'],
        default: 'client'
    }],
    phone: String,
    address: {
        street: String,
        city: String,
        state: String,
        zip: String
    },
    specialistIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    clientIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    online: { type: Boolean, default: false },
    lastActive: { type: Date, default: Date.now }
}, { timestamps: true });

// Get or create User model
const User = mongoose.models.User || mongoose.model('User', userSchema);

// Auth Middleware (inline to avoid import issues)
const authenticateToken = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ 
                success: false,
                message: 'Access token required' 
            });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ 
            success: false,
            message: 'Invalid token' 
        });
    }
};

const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        const userRoles = req.user?.roles || [];
        const hasRole = roles.some(role => userRoles.includes(role));
        
        if (!hasRole) {
            return res.status(403).json({ 
                success: false,
                message: 'Insufficient permissions' 
            });
        }
        next();
    };
};

// ============================================
// GET ALL USERS - FIXED FOR CLIENT DROPDOWN
// ============================================
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { role } = req.query;
        
        let filter = {};
        if (role) {
            // THIS IS THE FIX - Find users where role is IN their roles array
            // This will find:
            // - Users with roles: ['client'] 
            // - Users with roles: ['client', 'specialist']
            // - Users with roles: ['owner', 'admin', 'client'] etc.
            filter = { roles: { $in: [role] } };
            
            console.log(`[USER ROUTE] Searching for users with role '${role}' in their roles array`);
        }
        
        const users = await User.find(filter)
            .select('-password')
            .sort({ createdAt: -1 });
        
        console.log(`[USER ROUTE] Found ${users.length} users${role ? ` with role '${role}'` : ''}`);
        
        // Log the users found for debugging
        if (role === 'client' && users.length > 0) {
            console.log('[USER ROUTE] Client users found:', users.map(u => ({
                name: u.name,
                email: u.email,
                roles: u.roles
            })));
        }
        
        res.json({ 
            success: true, 
            data: users,
            count: users.length
        });
    } catch (error) {
        console.error('[USER ROUTE] Error fetching users:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to fetch users',
            error: error.message 
        });
    }
});

// ============================================
// GET CURRENT USER PROFILE
// ============================================
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId)
            .select('-password')
            .populate('specialistIds', 'name email')
            .populate('clientIds', 'name email');
        
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }
        
        res.json({ 
            success: true,
            data: user 
        });
    } catch (error) {
        console.error('[USER ROUTE] Profile fetch error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to fetch profile' 
        });
    }
});

// ============================================
// UPDATE CURRENT USER PROFILE
// ============================================
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const updates = req.body;
        delete updates.password; // Don't allow password updates through this route
        
        const user = await User.findByIdAndUpdate(
            req.user.userId,
            { $set: updates },
            { new: true, runValidators: true }
        ).select('-password');
        
        res.json({ 
            success: true,
            data: user,
            message: 'Profile updated successfully' 
        });
    } catch (error) {
        console.error('[USER ROUTE] Profile update error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to update profile' 
        });
    }
});

// ============================================
// GET USER BY ID
// ============================================
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('-password')
            .populate('specialistIds', 'name email')
            .populate('clientIds', 'name email');
        
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }
        
        res.json({ 
            success: true,
            data: user 
        });
    } catch (error) {
        console.error('[USER ROUTE] Get user error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to fetch user' 
        });
    }
});

// ============================================
// CREATE USER (Admin/Owner only)
// ============================================
router.post('/', authenticateToken, authorizeRoles('admin', 'owner'), async (req, res) => {
    try {
        const { name, email, password, roles } = req.body;
        
        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ 
                success: false,
                message: 'User with this email already exists' 
            });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password || 'TempPass123!', 10);
        
        // Create user with default client role if no roles specified
        const user = new User({
            name,
            email,
            password: hashedPassword,
            roles: roles && roles.length > 0 ? roles : ['client']
        });
        
        await user.save();
        
        console.log(`[USER ROUTE] Created new user: ${user.email} with roles: ${user.roles}`);
        
        const newUser = await User.findById(user._id).select('-password');
        
        res.status(201).json({ 
            success: true,
            data: newUser,
            message: 'User created successfully' 
        });
    } catch (error) {
        console.error('[USER ROUTE] Create user error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to create user' 
        });
    }
});

// ============================================
// UPDATE USER (Admin/Owner only)
// ============================================
router.put('/:id', authenticateToken, authorizeRoles('admin', 'owner'), async (req, res) => {
    try {
        const { password, ...updates } = req.body;
        
        // If password is being updated, hash it
        if (password) {
            updates.password = await bcrypt.hash(password, 10);
        }
        
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { $set: updates },
            { new: true, runValidators: true }
        ).select('-password');
        
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }
        
        console.log(`[USER ROUTE] Updated user: ${user.email}`);
        
        res.json({ 
            success: true,
            data: user,
            message: 'User updated successfully' 
        });
    } catch (error) {
        console.error('[USER ROUTE] Update user error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to update user' 
        });
    }
});

// ============================================
// DELETE USER (Admin/Owner only)
// ============================================
router.delete('/:id', authenticateToken, authorizeRoles('admin', 'owner'), async (req, res) => {
    try {
        // Don't allow self-deletion
        if (req.params.id === req.user.userId) {
            return res.status(400).json({ 
                success: false,
                message: 'Cannot delete your own account' 
            });
        }
        
        const user = await User.findByIdAndDelete(req.params.id);
        
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }
        
        console.log(`[USER ROUTE] Deleted user: ${user.email}`);
        
        res.json({ 
            success: true,
            message: 'User deleted successfully' 
        });
    } catch (error) {
        console.error('[USER ROUTE] Delete user error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to delete user' 
        });
    }
});

module.exports = router;
