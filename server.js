require('dotenv').config();
require('./config/passport');
const { getEnvironmentConfig } = require('./config/env');

// Gmail SMTP transporter is verified on first email send

const express = require('express');
const passport = require('passport');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

// Import database connection
const connectDB = require('./config/database');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const driverRoutes = require('./routes/drivers');
const vehicleRoutes = require('./routes/vehicles');
const rideRoutes = require('./routes/rides');
const bookingRoutes = require('./routes/bookings');
const paymentRoutes = require('./routes/payments');
const negotiationRoutes = require('./routes/negotiations');
const adminRoutes = require('./routes/admin');
const reviewRoutes = require('./routes/reviews');

// Connect to database
connectDB();

// Create Express app
const app = express();

// Middleware
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(passport.initialize());

// Cookie configuration for cross-domain support
app.use((req, res, next) => {
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Set cookie options based on environment
    const cookieOptions = {
        httpOnly: true,
        secure: isProduction, // Secure=true in production
        sameSite: isProduction ? 'none' : 'lax', // SameSite=None for cross-domain in production
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        domain: isProduction ? undefined : 'localhost' // Domain for localhost in dev
    };
    
    // Store cookie options in request for use in routes
    req.cookieOptions = cookieOptions;
    
    next();
});

// Get environment configuration
const envConfig = getEnvironmentConfig();

const allowedOrigins = [
  "http://localhost:5173",
  "https://frontend-ride-share-pxzh.vercel.app",
  "https://frontend-ride-share-pxzh-hgzoisioi-hemu110605s-projects.vercel.app",
  "https://frontend-ride-share-pxzh-rk71oukvq-hemu110605s-projects.vercel.app"
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Safe preflight middleware
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

// Root route
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'RideShare API is running'
    });
});

// Health check route
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Favicon route - prevent 404 errors
app.get('/favicon.ico', (req, res) => {
    res.status(204).end(); // No content
});

// API welcome route
app.get('/api', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Welcome to RideShare Carpooling API',
        version: '1.0.0',
        documentation: {
            auth: '/api/auth',
            users: '/api/users',
            drivers: '/api/drivers',
            vehicles: '/api/vehicles',
            rides: '/api/rides',
            bookings: '/api/bookings',
            payments: '/api/payments',
            negotiations: '/api/negotiations',
            reviews: '/api/reviews',
            admin: '/api/admin'
        },
        endpoints: {
            root: 'GET /',
            health: 'GET /health',
            authentication: {
                register: 'POST /api/auth/register',
                login: 'POST /api/auth/login',
                refresh: 'POST /api/auth/refresh',
                logout: 'POST /api/auth/logout',
                profile: 'GET /api/auth/me'
            },
            rides: {
                getAll: 'GET /api/rides',
                getById: 'GET /api/rides/:id',
                create: 'POST /api/rides',
                search: 'GET /api/rides/search',
                update: 'PUT /api/rides/:id',
                delete: 'DELETE /api/rides/:id'
            },
            driver: {
                profile: 'GET /api/drivers/profile',
                addVehicle: 'POST /api/drivers/vehicles',
                listVehicles: 'GET /api/drivers/vehicles',
                updateVehicle: 'PUT /api/drivers/vehicles/:id',
                postRide: 'POST /api/drivers/rides',
                getDriverRides: 'GET /api/drivers/rides',
                getDriverBookings: 'GET /api/drivers/bookings',
                earnings: 'GET /api/drivers/earnings',
                dashboard: 'GET /api/drivers/dashboard'
            },
            bookings: {
                book: 'POST /api/bookings',
                history: 'GET /api/bookings/history',
                getById: 'GET /api/bookings/:id',
                cancel: 'PUT /api/bookings/:id/cancel',
                confirm: 'PUT /api/bookings/:id/confirm',
                complete: 'PUT /api/bookings/:id/complete'
            }
        }
    });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/negotiations', negotiationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reviews', reviewRoutes);

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5002;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ["websocket", "polling"],
  pingTimeout: 60000,
  pingInterval: 25000
});

io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    socket.on('join-ride-room', (rideId) => {
        socket.join(rideId);
        console.log('Joined ride room:', rideId);
    });

    socket.on('driver-location-update', (data) => {
        console.log('Driver location:', data);
        io.to(data.rideId).emit('receive-driver-location', data);
    });

    socket.on('disconnect', () => {
        console.log('Socket disconnected:', socket.id);
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(
        `Server running on port ${PORT} in ${process.env.NODE_ENV || 'production'} mode`
    );
    console.log('Socket.IO enabled');
    console.log('Root: /');
    console.log('API Documentation: /api');
    console.log('Health Check: /health');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.log(`Error: ${err.message}`);
    server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.log(`Error: ${err.message}`);
    console.log('Shutting down due to uncaught exception');
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
    });
});

// Handle SIGINT
process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
    });
});

module.exports = app;