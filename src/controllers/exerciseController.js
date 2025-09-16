const Exercise = require('../models/Exercise');

exports.getExercises = async (req, res) => {
  try {
    const { search, category, equipment, difficulty } = req.query;
    let query = {};
    
    // Build query based on filters
    if (search) {
      query.$text = { $search: search };
    }
    if (category && category !== 'all') {
      query.muscleCategory = category;
    }
    if (equipment && equipment !== 'all') {
      query.equipmentNeeded = equipment;
    }
    if (difficulty && difficulty !== 'all') {
      query.difficulty = difficulty;
    }
    
    const exercises = await Exercise.find(query).sort('name');
    res.json({ data: exercises });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getExerciseById = async (req, res) => {
  try {
    const exercise = await Exercise.findById(req.params.id);
    if (!exercise) {
      return res.status(404).json({ message: 'Exercise not found' });
    }
    res.json({ data: exercise });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createExercise = async (req, res) => {
  try {
    const exercise = await Exercise.create({
      ...req.body,
      createdBy: req.user.id
    });
    res.status(201).json({ data: exercise });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateExercise = async (req, res) => {
  try {
    const exercise = await Exercise.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!exercise) {
      return res.status(404).json({ message: 'Exercise not found' });
    }
    res.json({ data: exercise });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteExercise = async (req, res) => {
  try {
    const exercise = await Exercise.findByIdAndDelete(req.params.id);
    if (!exercise) {
      return res.status(404).json({ message: 'Exercise not found' });
    }
    res.json({ message: 'Exercise deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get exercises by muscle group with variations
exports.getRelatedExercises = async (req, res) => {
  try {
    const exercise = await Exercise.findById(req.params.id);
    if (!exercise) {
      return res.status(404).json({ message: 'Exercise not found' });
    }
    
    // Find similar exercises
    const related = await Exercise.find({
      _id: { $ne: exercise._id },
      $or: [
        { muscleCategory: exercise.muscleCategory },
        { secondaryMuscles: { $in: [exercise.muscleCategory] } }
      ]
    }).limit(6);
    
    res.json({ data: related });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};