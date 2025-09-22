const Workout = require('../models/Workout');
const Exercise = require('../models/Exercise');

exports.getWorkoutsByClient = async (req, res) => {
  try {
    const workouts = await Workout.find({ 
      clientId: req.params.clientId  // FIXED: Using clientId to match model
    })
    .populate('exercises.exerciseId')
    .sort('-createdAt');
    
    // Return array directly for frontend compatibility
    res.json(workouts);
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

exports.updateWorkout = async (req, res) => {
  try {
    const workout = await Workout.findOneAndUpdate(
      { 
        _id: req.params.workoutId,
        clientId: req.params.clientId  // FIXED: Using clientId
      },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!workout) {
      return res.status(404).json({ 
        success: false,
        message: 'Workout not found' 
      });
    }
    
    res.json({
      success: true,
      data: workout,
      message: 'Workout updated successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

exports.deleteWorkout = async (req, res) => {
  try {
    const workout = await Workout.findOneAndDelete({
      _id: req.params.workoutId,
      clientId: req.params.clientId  // FIXED: Using clientId
    });
    
    if (!workout) {
      return res.status(404).json({ 
        success: false,
        message: 'Workout not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Workout deleted successfully',
      data: workout
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
      .populate('exercises.exerciseId')
      .populate('clientId', 'name email')  // FIXED: Changed from 'client' to 'clientId'
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

exports.createWorkout = async (req, res) => {
  try {
    const workoutData = {
      ...req.body,
      clientId: req.params.clientId,  // Already correct in your model
      assignedBy: req.user.id
    };
    
    const workout = await Workout.create(workoutData);
    
    res.status(201).json({
      success: true,
      data: workout,
      message: 'Workout created successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

exports.completeWorkout = async (req, res) => {
  try {
    const workoutId = req.params.id || req.params.workoutId;
    
    const workout = await Workout.findById(workoutId);
    
    if (!workout) {
      return res.status(404).json({ 
        success: false,
        message: 'Workout not found' 
      });
    }
    
    workout.completed = true;
    workout.completedDate = new Date();
    workout.duration = req.body.duration || 0;
    workout.moodFeedback = req.body.moodFeedback || 3;
    workout.notes = req.body.notes || '';
    
    await workout.save();
    
    res.json({
      success: true,
      data: workout,
      message: 'Workout completed successfully'
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
