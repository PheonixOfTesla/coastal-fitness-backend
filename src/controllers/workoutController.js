const Workout = require('../models/Workout');

exports.getWorkoutsByClient = async (req, res) => {
  try {
    const workouts = await Workout.find({ 
      clientId: req.params.clientId 
    }).sort('-createdAt');
    
    // FIXED: Consistent response format
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

exports.createWorkout = async (req, res) => {
  try {
    const workout = await Workout.create({
      ...req.body,
      clientId: req.params.clientId,
      assignedBy: req.user.id,  // FIXED: Use consistent .id
      createdBy: req.user.id    // FIXED: Use consistent .id
    });
    
    // FIXED: Consistent response format
    res.status(201).json({
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

exports.updateWorkout = async (req, res) => {
  try {
    const workout = await Workout.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!workout) {
      return res.status(404).json({ 
        success: false,
        message: 'Workout not found' 
      });
    }
    
    // FIXED: Consistent response format
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

exports.completeWorkout = async (req, res) => {
  try {
    // FIXED: Use params.id directly, no clientId needed
    const workout = await Workout.findById(req.params.id);
    
    if (!workout) {
      return res.status(404).json({ 
        success: false,
        message: 'Workout not found' 
      });
    }
    
    // Update workout with completion data
    workout.completed = true;
    workout.completedDate = new Date();
    workout.moodFeedback = req.body.moodFeedback || null;
    workout.notes = req.body.notes || '';
    
    // Store any additional completion data if provided
    if (req.body.completionData) {
      workout.completionData = req.body.completionData;
    }
    
    await workout.save();
    
    // FIXED: Consistent response format
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

exports.deleteWorkout = async (req, res) => {
  try {
    const workout = await Workout.findByIdAndDelete(req.params.id);
    
    if (!workout) {
      return res.status(404).json({ 
        success: false,
        message: 'Workout not found' 
      });
    }
    
    // FIXED: Consistent response format
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

exports.getWorkoutStats = async (req, res) => {
  try {
    const workouts = await Workout.find({ 
      clientId: req.params.clientId 
    });
    
    const completed = workouts.filter(w => w.completed);
    
    // FIXED: Consistent response format with data wrapper
    res.json({
      success: true,
      data: {
        totalWorkouts: workouts.length,
        completedWorkouts: completed.length,
        completionRate: workouts.length > 0 
          ? parseFloat((completed.length / workouts.length * 100).toFixed(1))
          : 0
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};
