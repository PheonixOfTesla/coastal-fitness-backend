const Workout = require('../models/Workout');

exports.getWorkoutsByClient = async (req, res) => {
  try {
    const workouts = await Workout.find({ 
      clientId: req.params.clientId 
    }).sort('-createdAt');
    res.json(workouts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createWorkout = async (req, res) => {
  try {
    const workout = await Workout.create({
      ...req.body,
      clientId: req.params.clientId,
      assignedBy: req.user.id,
      createdBy: req.user.id
    });
    res.status(201).json(workout);
  } catch (error) {
    res.status(500).json({ message: error.message });
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
      return res.status(404).json({ message: 'Workout not found' });
    }
    res.json(workout);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.completeWorkout = async (req, res) => {
  try {
    const workout = await Workout.findById(req.params.id);
    if (!workout) {
      return res.status(404).json({ message: 'Workout not found' });
    }
    
    workout.completed = true;
    workout.completedDate = new Date();
    workout.completionData = req.body;
    
    await workout.save();
    res.json(workout);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteWorkout = async (req, res) => {
  try {
    const workout = await Workout.findByIdAndDelete(req.params.id);
    if (!workout) {
      return res.status(404).json({ message: 'Workout not found' });
    }
    res.json({ message: 'Workout deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getWorkoutStats = async (req, res) => {
  try {
    const workouts = await Workout.find({ 
      clientId: req.params.clientId 
    });
    
    const completed = workouts.filter(w => w.completed);
    
    res.json({
      totalWorkouts: workouts.length,
      completedWorkouts: completed.length,
      completionRate: workouts.length > 0 
        ? (completed.length / workouts.length * 100).toFixed(1) 
        : 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
