const mongoose = require('mongoose');

const nutritionSchema = new mongoose.Schema({
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    protein: {
        target: Number,
        current: Number
    },
    carbs: {
        target: Number,
        current: Number
    },
    fat: {
        target: Number,
        current: Number
    },
    calories: {
        target: Number,
        current: Number
    },
    dailyLogs: [{
        date: {
            type: Date,
            default: Date.now
        },
        protein: Number,
        carbs: Number,
        fat: Number,
        calories: Number,
        notes: String
    }],
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Nutrition', nutritionSchema);