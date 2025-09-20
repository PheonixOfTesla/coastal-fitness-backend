const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    exerciseId: {  // Reference to Exercise Library
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Exercise'
    },
    sets: Number,
    reps: Number,
    weight: Number,
    restTime: { type: Number, default: 60 },
    tempo: String,  // e.g., "2-1-2-1" 
    notes: String,
    youtubeLink: String,
    grouping: {
        type: String,
        enum: ['none', 'superset', 'triset'],
        default: 'none'
    },
    groupId: Number,
    // Track actual performance
    completed: { type: Boolean, default: false },
    actualSets: [{
        reps: Number,
        weight: Number,
        difficulty: { type: Number, min: 1, max: 5 }
    }]
});

const workoutSchema = new mongoose.Schema({
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
    scheduledDate: Date,
    exercises: [exerciseSchema],
    restBetweenSets: {
        type: Number,
        default: 60
    },
    restBetweenExercises: {
        type: Number,
        default: 90
    },
    completed: {
        type: Boolean,
        default: false
    },
    completedDate: Date,
    duration: Number,  // in minutes
    moodFeedback: {
        type: Number,
        min: 1,
        max: 5
    },
    notes: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Workout', workoutSchema);
