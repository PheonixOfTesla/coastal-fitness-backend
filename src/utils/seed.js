require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const seedData = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL || 'mongodb://localhost:27017/coastal_fitness');
    
    await User.deleteMany();
    
    const password = await bcrypt.hash('password123', 10);
    
    const users = [
      {
        name: 'John Anderson',
        email: 'john.client@example.com',
        password,
        roles: ['client']
      },
      {
        name: 'Dr. Sarah Mitchell',
        email: 'sarah.specialist@coastal.com',
        password,
        roles: ['specialist']
      },
      {
        name: 'Admin User',
        email: 'admin@coastal.com',
        password,
        roles: ['admin', 'specialist']
      }
    ];
    
    await User.insertMany(users);
    
    console.log('Seed data created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedData();
