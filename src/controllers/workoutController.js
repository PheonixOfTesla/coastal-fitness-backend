const Workout = require('../models/Workout');
const Exercise = require('../models/Exercise');

exports.getWorkoutsByClient = async (req, res) => {
  try {
    const workouts = await Workout.find({ 
      clientId: req.params.clientId 
    })
    .populate('exercises.exerciseId')  // Populate exercise details from library
    .sort('-createdAt');
    
    res.json({
      success: true,
      data: workouts
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

exports.getWorkoutById = async (req, res) => {
  try {
    const workout = await Workout.findById(req.params.id)
      .populate('exercises.exerciseId')  // Get full exercise details
      .populate('clientId', 'name email')
      .populate('assignedBy', 'name');
    
    if (!workout) {
      return res.status(404).json({ 
        success: false,
        message: 'Workout not found' 
      });
    }
    
    res.json({
      success: true,
      data: workout
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

exports.startWorkout = async (req, res) => {
  try {
    const workout = await Workout.findById(req.params.id)
      .populate({
        path: 'exercises.exerciseId',
        select: 'name description instructions tips commonMistakes imageUrl videoUrl muscleCategory secondaryMuscles difficulty equipmentNeeded'
      });
    
    if (!workout) {
      return res.status(404).json({ 
        success: false,
        message: 'Workout not found' 
      });
    }
    
    // Mark workout as in progress
    workout.startedAt = new Date();
    await workout.save();
    
    res.json({
      success: true,
      data: workout,
      message: 'Workout session started'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

exports.updateExerciseProgress = async (req, res) => {
  try {
    const { workoutId, exerciseIndex, setData } = req.body;
    
    const workout = await Workout.findById(workoutId);
    if (!workout) {
      return res.status(404).json({ 
        success: false,
        message: 'Workout not found' 
      });
    }
    
    // Update the specific exercise's actual performance
    if (workout.exercises[exerciseIndex]) {
      workout.exercises[exerciseIndex].actualSets.push(setData);
      workout.exercises[exerciseIndex].completed = true;
    }
    
    await workout.save();
    
    res.json({
      success: true,
      data: workout,
      message: 'Exercise progress updated'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};
