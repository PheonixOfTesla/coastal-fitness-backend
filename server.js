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

// CORS configuration for production
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:5000',
            'http://localhost:5173', // Vite default
            'https://coastal-fitness.vercel.app',
            'https://*.vercel.app'
        ];
        
        // Allow requests with no origin (mobile apps, Postman, etc)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.some(allowed => 
            allowed.includes('*') 
                ? origin.match(allowed.replace('*', '.*'))
                : allowed === origin
        )) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

// Socket.io setup with CORS
const io = socketIO(server, {
    cors: corsOptions
});

// Store io instance for use in controllers
app.set('io', io);

// Database connection with error handling
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/coastal-fitness', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('✅ MongoDB connected successfully');
}).catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
});

// Middleware
app.use(helmet({
    contentSecurityPolicy: false, // Disable for development
    crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Import routes - Fixed paths to include src/
const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/user');
const workoutRoutes = require('./src/routes/workout');
const measurementRoutes = require('./src/routes/measurements');
const goalRoutes = require('./src/routes/goals');
const nutritionRoutes = require('./src/routes/nutrition');
const messageRoutes = require('./src/routes/message');
const testRoutes = require('./src/routes/test');
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
require('./src/utils/socketHandlers')(io);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Coastal Fitness API is running',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
    });
});

// API documentation endpoint
app.get('/api', (req, res) => {
    res.json({
        message: 'Coastal Fitness API',
        version: '1.0.0',
        endpoints: {
            auth: {
                'POST /api/auth/register': 'Register new user',
                'POST /api/auth/login': 'Login user',
                'POST /api/auth/logout': 'Logout user'
            },
            users: {
                'GET /api/users/profile': 'Get current user profile',
                'PUT /api/users/profile': 'Update profile',
                'GET /api/users': 'Get all users (admin only)'
            },
            workouts: {
                'GET /api/workouts/client/:clientId': 'Get client workouts',
                'POST /api/workouts/client/:clientId': 'Create workout',
                'PUT /api/workouts/:id': 'Update workout',
                'POST /api/workouts/:id/complete': 'Mark workout complete'
            },
            measurements: {
                'GET /api/measurements/client/:clientId': 'Get client measurements',
                'POST /api/measurements/client/:clientId': 'Create measurement'
            },
            goals: {
                'GET /api/goals/client/:clientId': 'Get client goals',
                'POST /api/goals/client/:clientId': 'Create goal',
                'PUT /api/goals/:id': 'Update goal progress'
            },
            nutrition: {
                'GET /api/nutrition/client/:clientId': 'Get nutrition plan',
                'POST /api/nutrition/client/:clientId': 'Create/update plan',
                'POST /api/nutrition/client/:clientId/log': 'Log daily nutrition'
            }
        }
    });
});

// 404 handler for unknown API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ 
        error: 'API endpoint not found',
        path: req.originalUrl 
    });
});

// Global error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    
    // CORS error
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({ error: 'CORS policy violation' });
    }
    
    // MongoDB errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({ 
            error: 'Validation Error', 
            details: err.message 
        });
    }
    
    if (err.name === 'CastError') {
        return res.status(400).json({ 
            error: 'Invalid ID format' 
        });
    }
    
    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
            error: 'Invalid token' 
        });
    }
    
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ 
            error: 'Token expired' 
        });
    }
    
    // Default error
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Closing HTTP server...');
    server.close(() => {
        console.log('HTTP server closed');
        mongoose.connection.close(false, () => {
            console.log('MongoDB connection closed');
            process.exit(0);
        });
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`
    🚀 Coastal Fitness Backend Server
    ================================
    🌐 Server:     http://localhost:${PORT}
    📚 API Docs:   http://localhost:${PORT}/api
    💚 Health:     http://localhost:${PORT}/api/health
    🔧 Environment: ${process.env.NODE_ENV || 'development'}
    📦 Database:   ${process.env.MONGODB_URI || 'mongodb://localhost:27017/coastal-fitness'}
    ================================
    `);
});

module.exports = { app, io };
