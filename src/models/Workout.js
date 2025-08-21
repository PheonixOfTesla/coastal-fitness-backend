const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    sets: Number,
    reps: Number,
    weight: Number,
    actualSets: Number,
    actualReps: Number,
    actualWeight: Number,
    painLevel: {
        type: Number,
        min: 0,
        max: 5
    },
    specialistNote: String,
    imageUrl: String,
    videoUrl: String
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
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    scheduledDate: String,
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