const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { createServer } = require('http');
const socketIO = require('socket.io');
require('dotenv').config();

const app = express();
const server = createServer(app);
const io = socketIO(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:5000',
        credentials: true
    }
});

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/coastal-fitness', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('dev'));
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5000',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes - FIXED: Changed plural to singular to match actual filenames
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');           // Changed from 'users' to 'user'
const workoutRoutes = require('./routes/workout');     // Changed from 'workouts' to 'workout'
const measurementRoutes = require('./routes/measurements');
const goalRoutes = require('./routes/goals');
const nutritionRoutes = require('./routes/nutrition');
const messageRoutes = require('./routes/message');     // Changed from 'messages' to 'message'
const testRoutes = require('./routes/test');           // Changed from 'tests' to 'test'

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/measurements', measurementRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/nutrition', nutritionRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/tests', testRoutes);

// Socket.io handlers
require('./utils/socketHandlers')(io);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Coastal Fitness API is running' });
});

// Serve index.html for all non-API routes (SPA support)
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '../public/index.html'));
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = { app, io };