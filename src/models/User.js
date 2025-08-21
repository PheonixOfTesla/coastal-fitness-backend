const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a name'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please add a valid email']
    },
    password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: 6,
        select: false
    },
    roles: [{
        type: String,
        enum: ['client', 'specialist', 'admin', 'owner', 'engineer'],
        default: 'client'
    }],
    specialistIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    clientIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    online: {
        type: Boolean,
        default: false
    },
    lastActive: {
        type: Date,
        default: Date.now
    },
    profileImage: String,
    phoneNumber: String,
    address: {
        street: String,
        city: String,
        state: String,
        zip: String
    },
    emergencyContact: {
        name: String,
        relationship: String,
        phone: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Encrypt password
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Match password
userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);