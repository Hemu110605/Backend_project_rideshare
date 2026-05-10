const express = require('express');
const { body } = require('express-validator');
const driverController = require('../controllers/driverController');
const { protect, authorize } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// All routes are protected and require driver or admin role
router.use(protect);
router.use(authorize('driver', 'admin'));

// Add vehicle validation
const addVehicleValidation = [
  body('make')
    .trim()
    .notEmpty()
    .withMessage('Vehicle make is required')
    .isLength({ max: 50 })
    .withMessage('Make cannot exceed 50 characters'),

  body('model')
    .trim()
    .notEmpty()
    .withMessage('Vehicle model is required')
    .isLength({ max: 50 })
    .withMessage('Model cannot exceed 50 characters'),

  body('year')
    .isInt({ min: 2000, max: new Date().getFullYear() + 1 })
    .withMessage('Year must be between 2000 and next year'),

  body('color')
    .trim()
    .notEmpty()
    .withMessage('Vehicle color is required')
    .isLength({ max: 30 })
    .withMessage('Color cannot exceed 30 characters'),

  body('vehicleNumber')
    .matches(/^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/)
    .withMessage('Please enter a valid vehicle number (e.g., MH12AB1234)'),

  body('vehicleType')
    .isIn(['sedan', 'suv', 'hatchback', 'compact'])
    .withMessage('Vehicle type must be sedan, suv, hatchback, or compact'),

  body('totalSeats')
    .isIn([4, 7])
    .withMessage('Total seats must be either 4 or 7'),

  body('fuelType')
    .isIn(['petrol', 'diesel', 'cng', 'electric'])
    .withMessage('Fuel type must be petrol, diesel, cng, or electric'),

  body('rcNumber')
    .trim()
    .notEmpty()
    .withMessage('RC number is required'),

  body('insuranceValidUntil')
    .isISO8601()
    .withMessage('Please provide a valid insurance expiry date'),

  body('pucValidUntil')
    .isISO8601()
    .withMessage('Please provide a valid PUC expiry date')
];

// Update vehicle validation
const updateVehicleValidation = [
  body('make')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Make cannot be empty')
    .isLength({ max: 50 })
    .withMessage('Make cannot exceed 50 characters'),

  body('model')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Model cannot be empty')
    .isLength({ max: 50 })
    .withMessage('Model cannot exceed 50 characters'),

  body('year')
    .optional()
    .isInt({ min: 2000, max: new Date().getFullYear() + 1 })
    .withMessage('Year must be between 2000 and next year'),

  body('color')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Color cannot be empty')
    .isLength({ max: 30 })
    .withMessage('Color cannot exceed 30 characters'),

  body('vehicleNumber')
    .optional()
    .matches(/^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/)
    .withMessage('Please enter a valid vehicle number (e.g., MH12AB1234)'),

  body('vehicleType')
    .optional()
    .isIn(['sedan', 'suv', 'hatchback', 'compact'])
    .withMessage('Vehicle type must be sedan, suv, hatchback, or compact'),

  body('totalSeats')
    .optional()
    .isIn([4, 7])
    .withMessage('Total seats must be either 4 or 7'),

  body('fuelType')
    .optional()
    .isIn(['petrol', 'diesel', 'cng', 'electric'])
    .withMessage('Fuel type must be petrol, diesel, cng, or electric'),

  body('rcNumber')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('RC number cannot be empty'),

  body('insuranceValidUntil')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid insurance expiry date'),

  body('pucValidUntil')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid PUC expiry date')
];

// Post ride validation
const postRideValidation = [
  body('vehicle')
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

  body('pickupCoordinates.type')
    .equals('Point')
    .withMessage('Pickup coordinates type must be Point'),

  body('pickupCoordinates.coordinates')
    .isArray({ min: 2, max: 2 })
    .withMessage('Pickup coordinates must be an array of [lng, lat]'),

  body('pickupCoordinates.coordinates.0')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Pickup longitude must be between -180 and 180'),

  body('pickupCoordinates.coordinates.1')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Pickup latitude must be between -90 and 90'),

  body('dropCoordinates.type')
    .equals('Point')
    .withMessage('Drop coordinates type must be Point'),

  body('dropCoordinates.coordinates')
    .isArray({ min: 2, max: 2 })
    .withMessage('Drop coordinates must be an array of [lng, lat]'),

  body('dropCoordinates.coordinates.0')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Drop longitude must be between -180 and 180'),

  body('dropCoordinates.coordinates.1')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Drop latitude must be between -90 and 90'),

  body('date')
    .isISO8601()
    .withMessage('Please provide a valid ride date'),

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
];

// Routes
router.get('/profile', driverController.getDriverProfile);

router.post(
  '/vehicles',
  addVehicleValidation,
  handleValidationErrors,
  driverController.addVehicle
);

router.put(
  '/vehicles/:id',
  updateVehicleValidation,
  handleValidationErrors,
  driverController.updateVehicle
);

router.get('/vehicles', driverController.listVehicles);

router.post(
  '/rides',
  postRideValidation,
  handleValidationErrors,
  driverController.postRide
);

router.get('/rides', driverController.getDriverRides);
router.get('/bookings', driverController.getDriverBookings);
router.get('/earnings', driverController.getEarningsSummary);
router.get('/dashboard', driverController.getDashboardStats);

module.exports = router;