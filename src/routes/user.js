const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// ============================================
// GET ALL USERS (With role filtering)
// ============================================
// GET /api/users?role=client
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { role } = req.query;
        
        // FIXED: Use $in operator to find users who HAVE the role
        // This finds users where 'client' is IN their roles array
        const filter = role ? { roles: { $in: [role] } } : {};
        
        const users = await User.find(filter)
            .select('-password')
            .sort({ createdAt: -1 });
        
        console.log(`[USER ROUTE] Query role: ${role}, Found ${users.length} users`);
        
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
// GET /api/users/profile
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
        console.error('[USER ROUTE] Error fetching profile:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to fetch profile',
            error: error.message 
        });
    }
});

// ============================================
// UPDATE CURRENT USER PROFILE
// ============================================
// PUT /api/users/profile
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { name, email, phone, address, emergencyContact } = req.body;
        
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }
        
        // Update fields if provided
        if (name) user.name = name;
        if (email) user.email = email;
        if (phone) user.phone = phone;
        if (address) user.address = address;
        if (emergencyContact) user.emergencyContact = emergencyContact;
        
        await user.save();
        
        const updatedUser = await User.findById(user._id).select('-password');
        
        res.json({ 
            success: true,
            data: updatedUser,
            message: 'Profile updated successfully' 
        });
    } catch (error) {
        console.error('[USER ROUTE] Error updating profile:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to update profile',
            error: error.message 
        });
    }
});

// ============================================
// GET SINGLE USER BY ID (Admin/Owner only)
// ============================================
// GET /api/users/:id
router.get('/:id', authenticateToken, authorizeRoles('admin', 'owner', 'specialist'), async (req, res) => {
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
        console.error('[USER ROUTE] Error fetching user:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to fetch user',
            error: error.message 
        });
    }
});

// ============================================
// CREATE USER (Admin/Owner only)
// ============================================
// POST /api/users
router.post('/', authenticateToken, authorizeRoles('admin', 'owner'), async (req, res) => {
    try {
        const { name, email, password, roles, phone, address } = req.body;
        
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ 
                success: false,
                message: 'User with this email already exists' 
            });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create new user
        const user = new User({
            name,
            email,
            password: hashedPassword,
            roles: roles || ['client'],
            phone,
            address,
            createdBy: req.user.userId
        });
        
        await user.save();
        
        const newUser = await User.findById(user._id).select('-password');
        
        res.status(201).json({ 
            success: true,
            data: newUser,
            message: 'User created successfully' 
        });
    } catch (error) {
        console.error('[USER ROUTE] Error creating user:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to create user',
            error: error.message 
        });
    }
});

// ============================================
// UPDATE USER (Admin/Owner only)
// ============================================
// PUT /api/users/:id
router.put('/:id', authenticateToken, authorizeRoles('admin', 'owner'), async (req, res) => {
    try {
        const { name, email, roles, phone, address, password } = req.body;
        
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }
        
        // Update fields if provided
        if (name) user.name = name;
        if (email) user.email = email;
        if (roles) user.roles = roles;
        if (phone) user.phone = phone;
        if (address) user.address = address;
        
        // Update password if provided
        if (password) {
            user.password = await bcrypt.hash(password, 10);
        }
        
        await user.save();
        
        const updatedUser = await User.findById(user._id).select('-password');
        
        res.json({ 
            success: true,
            data: updatedUser,
            message: 'User updated successfully' 
        });
    } catch (error) {
        console.error('[USER ROUTE] Error updating user:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to update user',
            error: error.message 
        });
    }
});

// ============================================
// DELETE USER (Admin/Owner only)
// ============================================
// DELETE /api/users/:id
router.delete('/:id', authenticateToken, authorizeRoles('admin', 'owner'), async (req, res) => {
    try {
        // Prevent self-deletion
        if (req.params.id === req.user.userId) {
            return res.status(400).json({ 
                success: false,
                message: 'Cannot delete your own account' 
            });
        }
        
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }
        
        // Don't delete the last owner
        if (user.roles.includes('owner')) {
            const ownerCount = await User.countDocuments({ roles: 'owner' });
            if (ownerCount <= 1) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Cannot delete the last owner account' 
                });
            }
        }
        
        await user.deleteOne();
        
        res.json({ 
            success: true,
            message: 'User deleted successfully' 
        });
    } catch (error) {
        console.error('[USER ROUTE] Error deleting user:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to delete user',
            error: error.message 
        });
    }
});

// ============================================
// ASSIGN SPECIALIST TO CLIENT
// ============================================
// POST /api/users/:clientId/assign-specialist
router.post('/:clientId/assign-specialist', authenticateToken, authorizeRoles('admin', 'owner'), async (req, res) => {
    try {
        const { specialistId } = req.body;
        
        const client = await User.findById(req.params.clientId);
        const specialist = await User.findById(specialistId);
        
        if (!client || !specialist) {
            return res.status(404).json({ 
                success: false,
                message: 'Client or specialist not found' 
            });
        }
        
        if (!client.roles.includes('client')) {
            return res.status(400).json({ 
                success: false,
                message: 'User is not a client' 
            });
        }
        
        if (!specialist.roles.includes('specialist')) {
            return res.status(400).json({ 
                success: false,
                message: 'User is not a specialist' 
            });
        }
        
        // Add specialist to client's specialistIds
        if (!client.specialistIds.includes(specialistId)) {
            client.specialistIds.push(specialistId);
        }
        
        // Add client to specialist's clientIds
        if (!specialist.clientIds.includes(req.params.clientId)) {
            specialist.clientIds.push(req.params.clientId);
        }
        
        await client.save();
        await specialist.save();
        
        res.json({ 
            success: true,
            message: 'Specialist assigned successfully',
            data: {
                client: await User.findById(client._id).select('-password'),
                specialist: await User.findById(specialist._id).select('-password')
            }
        });
    } catch (error) {
        console.error('[USER ROUTE] Error assigning specialist:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to assign specialist',
            error: error.message 
        });
    }
});

// ============================================
// REMOVE SPECIALIST FROM CLIENT
// ============================================
// DELETE /api/users/:clientId/remove-specialist/:specialistId
router.delete('/:clientId/remove-specialist/:specialistId', authenticateToken, authorizeRoles('admin', 'owner'), async (req, res) => {
    try {
        const client = await User.findById(req.params.clientId);
        const specialist = await User.findById(req.params.specialistId);
        
        if (!client || !specialist) {
            return res.status(404).json({ 
                success: false,
                message: 'Client or specialist not found' 
            });
        }
        
        // Remove specialist from client's specialistIds
        client.specialistIds = client.specialistIds.filter(
            id => id.toString() !== req.params.specialistId
        );
        
        // Remove client from specialist's clientIds
        specialist.clientIds = specialist.clientIds.filter(
            id => id.toString() !== req.params.clientId
        );
        
        await client.save();
        await specialist.save();
        
        res.json({ 
            success: true,
            message: 'Specialist removed successfully' 
        });
    } catch (error) {
        console.error('[USER ROUTE] Error removing specialist:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to remove specialist',
            error: error.message 
        });
    }
});

// ============================================
// GET SPECIALIST'S CLIENTS
// ============================================
// GET /api/users/specialist/clients
router.get('/specialist/clients', authenticateToken, authorizeRoles('specialist', 'admin', 'owner'), async (req, res) => {
    try {
        const specialist = await User.findById(req.user.userId)
            .populate({
                path: 'clientIds',
                select: '-password',
                options: { sort: { name: 1 } }
            });
        
        if (!specialist) {
            return res.status(404).json({ 
                success: false,
                message: 'Specialist not found' 
            });
        }
        
        res.json({ 
            success: true,
            data: specialist.clientIds || [],
            count: specialist.clientIds?.length || 0
        });
    } catch (error) {
        console.error('[USER ROUTE] Error fetching specialist clients:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to fetch clients',
            error: error.message 
        });
    }
});

module.exports = router;
