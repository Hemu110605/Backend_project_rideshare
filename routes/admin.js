const express = require('express');
const { body, query } = require('express-validator');
const adminController = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// All routes are protected and require admin role
router.use(protect);
router.use(authorize('admin'));

// Block user validation
const blockUserValidation = [
  body('isBlocked')
    .isBoolean()
    .withMessage('isBlocked must be a boolean'),
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason cannot exceed 500 characters')
];

// Get all users validation
const getAllUsersValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('role')
    .optional()
    .isIn(['user', 'driver', 'admin'])
    .withMessage('Role must be user, driver, or admin'),
  query('isBlocked')
    .optional()
    .isBoolean()
    .withMessage('isBlocked must be a boolean'),
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Search term cannot be empty')
];

// Get all drivers validation
const getAllDriversValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('isBlocked')
    .optional()
    .isBoolean()
    .withMessage('isBlocked must be a boolean'),
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Search term cannot be empty')
];

// Get all rides validation
const getAllRidesValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('status')
    .optional()
    .isIn(['active', 'booked', 'completed', 'cancelled'])
    .withMessage('Status must be active, booked, completed, or cancelled'),
  query('driver')
    .optional()
    .isMongoId()
    .withMessage('Driver must be a valid MongoDB ID'),
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Search term cannot be empty')
];

// Get all bookings validation
const getAllBookingsValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('status')
    .optional()
    .isIn(['pending', 'confirmed', 'cancelled', 'completed'])
    .withMessage('Status must be pending, confirmed, cancelled, or completed'),
  query('passenger')
    .optional()
    .isMongoId()
    .withMessage('Passenger must be a valid MongoDB ID'),
  query('driver')
    .optional()
    .isMongoId()
    .withMessage('Driver must be a valid MongoDB ID'),
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Search term cannot be empty')
];

// Get payment stats validation
const getPaymentStatsValidation = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date')
];

// Routes
router.get('/dashboard', adminController.getDashboardAnalytics);
router.get('/users', getAllUsersValidation, adminController.getAllUsers);
router.get('/drivers', getAllDriversValidation, adminController.getAllDrivers);
router.get('/rides', getAllRidesValidation, adminController.getAllRides);
router.get('/bookings', getAllBookingsValidation, adminController.getAllBookings);
router.put('/users/:id/block', blockUserValidation, handleValidationErrors, adminController.blockUser);
router.delete('/users/:id', adminController.deleteUser);
router.get('/payments/stats', getPaymentStatsValidation, adminController.getPaymentStats);

module.exports = router;
