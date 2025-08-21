const Measurement = require('../models/Measurement');

exports.getMeasurementsByClient = async (req, res) => {
  try {
    const measurements = await Measurement.find({ 
      clientId: req.params.clientId 
    }).sort('-date');
    res.json(measurements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createMeasurement = async (req, res) => {
  try {
    const measurement = await Measurement.create({
      ...req.body,
      clientId: req.params.clientId,
      createdBy: req.user.id
    });
    res.status(201).json(measurement);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateMeasurement = async (req, res) => {
  try {
    const measurement = await Measurement.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!measurement) {
      return res.status(404).json({ message: 'Measurement not found' });
    }
    res.json(measurement);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteMeasurement = async (req, res) => {
  try {
    const measurement = await Measurement.findByIdAndDelete(req.params.id);
    if (!measurement) {
      return res.status(404).json({ message: 'Measurement not found' });
    }
    res.json({ message: 'Measurement deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMeasurementStats = async (req, res) => {
  try {
    const measurements = await Measurement.find({ 
      clientId: req.params.clientId 
    }).sort('date');
    
    if (measurements.length === 0) {
      return res.json({ message: 'No measurements found' });
    }
    
    const latest = measurements[measurements.length - 1];
    const first = measurements[0];
    
    res.json({
      totalMeasurements: measurements.length,
      latestWeight: latest.weight,
      weightChange: latest.weight - first.weight,
      latestBodyFat: latest.bodyFat,
      bodyFatChange: latest.bodyFat - first.bodyFat
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
