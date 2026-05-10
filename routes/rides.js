const express = require('express');
const { body, query } = require('express-validator');
const rideController = require('../controllers/rideController');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// Create ride validation
const createRideValidation = [
  body('vehicle')
    .optional({ checkFalsy: true })
    .isMongoId()
    .withMessage('Valid vehicle ID is required'),
  body('source')
    .trim()
    .notEmpty()
    .withMessage('Source location is required')
    .isLength({ max: 200 })
    .withMessage('Source cannot exceed 200 characters'),
  body('destination')
    .trim()
    .notEmpty()
    .withMessage('Destination location is required')
    .isLength({ max: 200 })
    .withMessage('Destination cannot exceed 200 characters'),
  body('pickupCoordinates.coordinates')
    .isArray({ min: 2, max: 2 })
    .withMessage('Pickup coordinates must be [longitude, latitude]'),
  body('pickupCoordinates.coordinates.0')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Pickup longitude must be between -180 and 180'),
  body('pickupCoordinates.coordinates.1')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Pickup latitude must be between -90 and 90'),
  body('dropCoordinates.coordinates')
    .isArray({ min: 2, max: 2 })
    .withMessage('Drop coordinates must be [longitude, latitude]'),
  body('dropCoordinates.coordinates.0')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Drop longitude must be between -180 and 180'),
  body('dropCoordinates.coordinates.1')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Drop latitude must be between -90 and 90'),
  body('date')
    .isISO8601()
    .withMessage('Please provide a valid ride date')
    .custom(value => {
      if (new Date(value) < new Date()) {
        throw new Error('Ride date cannot be in the past');
      }
      return true;
    }),
  body('time')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Please enter a valid time in HH:MM format'),
  body('distance')
    .isFloat({ min: 1 })
    .withMessage('Distance must be at least 1 km'),
  body('duration')
    .isInt({ min: 5 })
    .withMessage('Duration must be at least 5 minutes'),
  body('pricePerKm')
    .isFloat({ min: 1 })
    .withMessage('Price per km must be at least 1'),
  body('totalSeats')
    .isInt({ min: 1, max: 7 })
    .withMessage('Total seats must be between 1 and 7'),
  body('availableSeats')
    .isInt({ min: 0 })
    .withMessage('Available seats cannot be negative')
    .custom((value, { req }) => {
      if (value > req.body.totalSeats) {
        throw new Error('Available seats cannot be more than total seats');
      }
      return true;
    }),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('preferences.smokingAllowed')
    .optional()
    .isBoolean()
    .withMessage('Smoking allowed must be a boolean'),
  body('preferences.petsAllowed')
    .optional()
    .isBoolean()
    .withMessage('Pets allowed must be a boolean'),
  body('preferences.musicAllowed')
    .optional()
    .isBoolean()
    .withMessage('Music allowed must be a boolean'),
  body('preferences.luggageAllowed')
    .optional()
    .isBoolean()
    .withMessage('Luggage allowed must be a boolean')
];

// Update ride validation
const updateRideValidation = [
  body('source')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Source cannot be empty')
    .isLength({ max: 200 })
    .withMessage('Source cannot exceed 200 characters'),
  body('destination')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Destination cannot be empty')
    .isLength({ max: 200 })
    .withMessage('Destination cannot exceed 200 characters'),
  body('pickupCoordinates.coordinates')
    .optional()
    .isArray({ min: 2, max: 2 })
    .withMessage('Pickup coordinates must be [longitude, latitude]'),
  body('pickupCoordinates.coordinates.0')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Pickup longitude must be between -180 and 180'),
  body('pickupCoordinates.coordinates.1')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Pickup latitude must be between -90 and 90'),
  body('dropCoordinates.coordinates')
    .optional()
    .isArray({ min: 2, max: 2 })
    .withMessage('Drop coordinates must be [longitude, latitude]'),
  body('dropCoordinates.coordinates.0')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Drop longitude must be between -180 and 180'),
  body('dropCoordinates.coordinates.1')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Drop latitude must be between -90 and 90'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid ride date'),
  body('time')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Please enter a valid time in HH:MM format'),
  body('distance')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('Distance must be at least 1 km'),
  body('duration')
    .optional()
    .isInt({ min: 5 })
    .withMessage('Duration must be at least 5 minutes'),
  body('pricePerKm')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('Price per km must be at least 1'),
  body('totalSeats')
    .optional()
    .isInt({ min: 1, max: 7 })
    .withMessage('Total seats must be between 1 and 7'),
  body('availableSeats')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Available seats cannot be negative'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('status')
    .optional()
    .isIn(['active', 'booked', 'completed', 'cancelled'])
    .withMessage('Status must be active, booked, completed, or cancelled')
];

// Search rides validation
const searchRidesValidation = [
  query('pickupLat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Pickup latitude must be between -90 and 90'),
  query('pickupLng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Pickup longitude must be between -180 and 180'),
  query('dropLat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Drop latitude must be between -90 and 90'),
  query('dropLng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Drop longitude must be between -180 and 180'),
  query('radius')
    .optional()
    .isFloat({ min: 1, max: 500 })
    .withMessage('Radius must be between 1 and 500 km'),
  query('date')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date'),
  query('seats')
    .optional()
    .isInt({ min: 1, max: 7 })
    .withMessage('Seats must be between 1 and 7')
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
  query('seats')
    .optional()
    .isInt({ min: 1, max: 7 })
    .withMessage('Seats must be between 1 and 7'),
  query('vehicleType')
    .optional()
    .isIn(['sedan', 'suv', 'hatchback', 'compact'])
    .withMessage('Vehicle type must be sedan, suv, hatchback, or compact'),
  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum price must be positive'),
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum price must be positive'),
  query('status')
    .optional()
    .isIn(['active', 'booked', 'ongoing', 'completed', 'cancelled'])
    .withMessage('Status must be active, booked, ongoing, completed, or cancelled'),
  query('date')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date')
];

// Routes
router.post('/', protect, authorize('driver'), createRideValidation, handleValidationErrors, rideController.createRide);
router.get('/', optionalAuth, getAllRidesValidation, rideController.getAllRides);
router.get('/search', optionalAuth, searchRidesValidation, rideController.searchRides);
router.get('/:id', optionalAuth, rideController.getRideById);
router.put('/:id', protect, updateRideValidation, handleValidationErrors, rideController.updateRide);
router.put('/:id/accept', protect, authorize('driver'), rideController.acceptRide);
router.patch('/:id/start', protect, authorize('driver'), rideController.startRide);
router.patch('/:id/complete', protect, authorize('driver'), rideController.completeRide);
router.patch('/:id/cancel', protect, rideController.cancelRide);
router.delete('/:id', protect, rideController.deleteRide);

module.exports = router;
