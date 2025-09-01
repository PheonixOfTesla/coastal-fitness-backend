const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const socketIO = require('socket.io');
require('dotenv').config();

// ============================================
// INITIALIZATION
// ============================================
const app = express();
const server = createServer(app);
const isDevelopment = process.env.NODE_ENV !== 'production';
const PORT = process.env.PORT || 5000;

// ============================================
// CORS CONFIGURATION
// ============================================
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5000',
    'http://localhost:5173',
    'https://coastal-fitness.vercel.app',
    'https://coastal-fitness.netlify.app',
    process.env.FRONTEND_URL
].filter(Boolean);

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc)
        if (!origin) return callback(null, true);
        
        // Check if origin matches allowed patterns
        const isAllowed = allowedOrigins.some(allowed => {
            if (!allowed) return false;
            if (allowed.includes('*')) {
                // Handle wildcard domains
                const pattern = allowed.replace('*', '.*');
                return new RegExp(pattern).test(origin);
            }
            return allowed === origin;
        });
        
        if (isAllowed) {
            callback(null, true);
        } else {
            console.warn(`CORS blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    maxAge: 86400 // 24 hours
};

// ============================================
// SOCKET.IO CONFIGURATION
// ============================================
const io = socketIO(server, {
    cors: corsOptions,
    pingTimeout: 60000,
    transports: ['websocket', 'polling']
});

// Store io instance globally for use in controllers
app.set('io', io);
global.io = io; // Alternative global access

// ============================================
// DATABASE CONNECTION
// ============================================
const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/coastal-fitness';
        
        const options = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        };
        
        await mongoose.connect(mongoUri, options);
        
        console.log('✅ MongoDB connected successfully');
        console.log(`📦 Database: ${mongoose.connection.name}`);
        
        // Handle connection events
        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err);
        });
        
        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
        });
        
        mongoose.connection.on('reconnected', () => {
            console.log('✅ MongoDB reconnected');
        });
        
    } catch (err) {
        console.error('❌ MongoDB initial connection failed:', err);
        // Don't exit in production, try to recover
        if (!isDevelopment) {
            setTimeout(connectDB, 5000);
        } else {
            process.exit(1);
        }
    }
};

// ============================================
// SECURITY MIDDLEWARE
// ============================================
// Helmet for security headers
app.use(helmet({
    contentSecurityPolicy: isDevelopment ? false : {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https:"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "ws:", "wss:", "https:"],
        },
    },
    crossOriginEmbedderPolicy: !isDevelopment
}));

// Rate limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isDevelopment ? 1000 : 100, // Limit requests per IP
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit auth attempts
    message: 'Too many authentication attempts, please try again later.',
    skipSuccessfulRequests: true,
});

// Apply rate limiting
app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ============================================
// GENERAL MIDDLEWARE
// ============================================
app.use(compression());
app.use(morgan(isDevelopment ? 'dev' : 'combined'));
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request ID for tracking
app.use((req, res, next) => {
    req.id = Math.random().toString(36).substr(2, 9);
    res.setHeader('X-Request-Id', req.id);
    next();
});

// ============================================
// STATIC FILES (Frontend)
// ============================================
if (!isDevelopment) {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, 'public')));
}

// ============================================
// API ROUTES
// ============================================
// Import route modules
const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/user');
const workoutRoutes = require('./src/routes/workout');
const measurementRoutes = require('./src/routes/measurements');
const goalRoutes = require('./src/routes/goals');
const nutritionRoutes = require('./src/routes/nutrition');
const messageRoutes = require('./src/routes/message');
const testRoutes = require('./src/routes/test');

// Mount routes with /api prefix
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/measurements', measurementRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/nutrition', nutritionRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/tests', testRoutes);

// ============================================
// HEALTH & MONITORING ENDPOINTS
// ============================================
app.get('/api/health', async (req, res) => {
    const healthcheck = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        service: 'Coastal Fitness API',
        version: process.env.npm_package_version || '1.0.0',
        checks: {
            database: 'checking',
            memory: 'checking'
        }
    };
    
    try {
        // Check database connection
        if (mongoose.connection.readyState === 1) {
            healthcheck.checks.database = 'connected';
            // Ping database
            await mongoose.connection.db.admin().ping();
        } else {
            healthcheck.checks.database = 'disconnected';
            healthcheck.status = 'DEGRADED';
        }
        
        // Check memory usage
        const memUsage = process.memoryUsage();
        healthcheck.checks.memory = {
            rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`
        };
        
        const statusCode = healthcheck.status === 'OK' ? 200 : 503;
        res.status(statusCode).json(healthcheck);
    } catch (error) {
        healthcheck.status = 'ERROR';
        healthcheck.checks.database = 'error';
        healthcheck.error = error.message;
        res.status(503).json(healthcheck);
    }
});

// API Documentation endpoint
app.get('/api', (req, res) => {
    res.json({
        name: 'Coastal Fitness API',
        version: '1.0.0',
        description: 'Backend API for Coastal Fitness & Correction Platform',
        documentation: '/api/docs',
        health: '/api/health',
        endpoints: {
            auth: {
                'POST /api/auth/register': 'Register new user',
                'POST /api/auth/login': 'Login user',
                'POST /api/auth/logout': 'Logout user',
                'POST /api/auth/reset-password': 'Request password reset',
                'PUT /api/auth/reset-password/:token': 'Reset password with token'
            },
            users: {
                'GET /api/users/profile': 'Get current user profile',
                'PUT /api/users/profile': 'Update user profile',
                'GET /api/users': 'Get all users (admin only)',
                'POST /api/users': 'Create user (admin only)',
                'PUT /api/users/:id': 'Update user (admin only)',
                'DELETE /api/users/:id': 'Delete user (admin only)'
            },
            workouts: {
                'GET /api/workouts/client/:clientId': 'Get client workouts',
                'GET /api/workouts/client/:clientId/stats': 'Get workout statistics',
                'POST /api/workouts/client/:clientId': 'Create workout',
                'PUT /api/workouts/:id': 'Update workout',
                'POST /api/workouts/:id/complete': 'Mark workout complete',
                'DELETE /api/workouts/:id': 'Delete workout'
            },
            measurements: {
                'GET /api/measurements/client/:clientId': 'Get client measurements',
                'GET /api/measurements/client/:clientId/stats': 'Get measurement statistics',
                'POST /api/measurements/client/:clientId': 'Create measurement',
                'PUT /api/measurements/:id': 'Update measurement',
                'DELETE /api/measurements/:id': 'Delete measurement'
            },
            goals: {
                'GET /api/goals/client/:clientId': 'Get client goals',
                'POST /api/goals/client/:clientId': 'Create goal',
                'PUT /api/goals/:id': 'Update goal',
                'DELETE /api/goals/:id': 'Delete goal'
            },
            nutrition: {
                'GET /api/nutrition/client/:clientId': 'Get nutrition plan',
                'POST /api/nutrition/client/:clientId': 'Create/update nutrition plan',
                'POST /api/nutrition/client/:clientId/log': 'Log daily nutrition'
            },
            messages: {
                'GET /api/messages': 'Get user messages',
                'POST /api/messages': 'Send message',
                'PUT /api/messages/read': 'Mark messages as read'
            },
            tests: {
                'GET /api/tests/client/:clientId': 'Get client tests',
                'POST /api/tests/client/:clientId': 'Create test',
                'PUT /api/tests/:id': 'Update test',
                'DELETE /api/tests/:id': 'Delete test'
            }
        }
    });
});

// ============================================
// SOCKET.IO HANDLERS
// ============================================
require('./src/utils/socketHandlers')(io);

// ============================================
// ERROR HANDLING
// ============================================
// 404 handler for unknown API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ 
        success: false,
        error: 'API endpoint not found',
        path: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
    });
});

// Serve frontend for all other routes (SPA support)
if (!isDevelopment) {
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });
}

// Global error handling middleware
app.use((err, req, res, next) => {
    // Log error details
    console.error(`[${new Date().toISOString()}] Error:`, {
        message: err.message,
        stack: isDevelopment ? err.stack : undefined,
        path: req.path,
        method: req.method,
        ip: req.ip,
        requestId: req.id
    });
    
    // Prepare error response
    let status = err.status || err.statusCode || 500;
    let message = err.message || 'Internal server error';
    let error = { success: false };
    
    // Handle specific error types
    if (err.message === 'Not allowed by CORS') {
        status = 403;
        message = 'Cross-origin request blocked';
    } else if (err.name === 'ValidationError') {
        status = 400;
        message = 'Validation error';
        error.details = Object.values(err.errors).map(e => e.message);
    } else if (err.name === 'CastError') {
        status = 400;
        message = 'Invalid ID format';
    } else if (err.name === 'JsonWebTokenError') {
        status = 401;
        message = 'Invalid authentication token';
    } else if (err.name === 'TokenExpiredError') {
        status = 401;
        message = 'Authentication token expired';
    } else if (err.code === 11000) {
        status = 409;
        message = 'Duplicate entry';
        error.field = Object.keys(err.keyPattern)[0];
    }
    
    // Send error response
    error.message = message;
    error.requestId = req.id;
    
    if (isDevelopment) {
        error.stack = err.stack;
        error.originalError = err.message;
    }
    
    res.status(status).json(error);
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================
const gracefulShutdown = (signal) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);
    
    // Stop accepting new connections
    server.close(() => {
        console.log('✅ HTTP server closed');
        
        // Close database connections
        mongoose.connection.close(false, () => {
            console.log('✅ MongoDB connection closed');
            
            // Close socket.io connections
            io.close(() => {
                console.log('✅ Socket.io connections closed');
                process.exit(0);
            });
        });
    });
    
    // Force shutdown after 10 seconds
    setTimeout(() => {
        console.error('⚠️ Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
};

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit in production, just log
    if (isDevelopment) {
        gracefulShutdown('UNHANDLED_REJECTION');
    }
});

// ============================================
// START SERVER
// ============================================
const startServer = async () => {
    try {
        // Connect to database first
        await connectDB();
        
        // Start listening
        server.listen(PORT, () => {
            console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║     🚀 COASTAL FITNESS BACKEND SERVER STARTED 🚀      ║
║                                                        ║
╠════════════════════════════════════════════════════════╣
║                                                        ║
║  🌐 Server:      http://localhost:${PORT}                 ║
║  📚 API Docs:    http://localhost:${PORT}/api             ║
║  💚 Health:      http://localhost:${PORT}/api/health      ║
║  🔧 Environment: ${process.env.NODE_ENV || 'development'}                        ║
║  📦 Database:    ${mongoose.connection.name || 'connecting...'}              ║
║  🔌 Socket.io:   Enabled                               ║
║  🛡️  CORS:        Configured                            ║
║  ⚡ Rate Limit:  Active                                ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
            `);
        });
        
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Initialize server
startServer();

// Export for testing
module.exports = { app, server, io };