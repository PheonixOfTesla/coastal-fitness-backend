const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    target: {
        type: Number,
        required: true
    },
    current: {
        type: Number,
        required: true
    },
    deadline: {
        type: Date,
        required: true
    },
    progressHistory: [{
        date: {
            type: Date,
            default: Date.now
        },
        value: Number,
        notes: String
    }],
    completed: {
        type: Boolean,
        default: false
    },
    completedDate: Date,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Auto-update completed status
goalSchema.pre('save', function(next) {
    if (this.current >= this.target && !this.completed) {
        this.completed = true;
        this.completedDate = new Date();
    }
    next();
});

module.exports = mongoose.model('Goal', goalSchema);