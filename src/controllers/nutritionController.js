const Nutrition = require('../models/Nutrition');

exports.getNutritionByClient = async (req, res) => {
  try {
    const nutrition = await Nutrition.findOne({ 
      clientId: req.params.clientId 
    });
    res.json(nutrition || {});
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createOrUpdateNutrition = async (req, res) => {
  try {
    const nutrition = await Nutrition.findOneAndUpdate(
      { clientId: req.params.clientId },
      {
        ...req.body,
        clientId: req.params.clientId,
        assignedBy: req.user.id,
        updatedAt: new Date()
      },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(nutrition);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.logDailyNutrition = async (req, res) => {
  try {
    const nutrition = await Nutrition.findOne({ clientId: req.params.clientId });
    if (!nutrition) {
      return res.status(404).json({ message: 'Nutrition plan not found' });
    }
    
    nutrition.dailyLogs.push({
      date: new Date(),
      ...req.body
    });
    
    // Update current values
    nutrition.protein.current = req.body.protein || nutrition.protein.current;
    nutrition.carbs.current = req.body.carbs || nutrition.carbs.current;
    nutrition.fat.current = req.body.fat || nutrition.fat.current;
    nutrition.calories.current = req.body.calories || nutrition.calories.current;
    
    await nutrition.save();
    res.json(nutrition);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};