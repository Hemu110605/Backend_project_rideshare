const express = require('express');
const { body, query } = require('express-validator');
const bookingController = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// All routes are protected
router.use(protect);

// Book ride validation
const bookRideValidation = [
  body('rideId')
    .isMongoId()
    .withMessage('Valid ride ID is required'),
  body('seatsBooked')
    .isInt({ min: 1, max: 7 })
    .withMessage('Seats booked must be between 1 and 7'),
  body('pickupLocation')
    .trim()
    .notEmpty()
    .withMessage('Pickup location is required'),
  body('dropLocation')
    .trim()
    .notEmpty()
    .withMessage('Drop location is required'),
  body('pickupTime')
    .trim()
    .notEmpty()
    .withMessage('Pickup time is required'),
  body('specialRequests')
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage('Special requests cannot exceed 300 characters')
];

// Cancel booking validation
const cancelBookingValidation = [
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage('Cancellation reason cannot exceed 300 characters')
];

// Complete booking validation
const completeBookingValidation = [
  body('otp')
    .matches(/^\d{6}$/)
    .withMessage('OTP must be a 6-digit number')
];

// Get booking history validation
const getBookingHistoryValidation = [
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
    .withMessage('Status must be pending, confirmed, cancelled, or completed')
];

// Routes
router.post('/', bookRideValidation, handleValidationErrors, bookingController.bookRide);
router.get('/my-bookings', bookingController.getMyBookings);
router.put('/:id/cancel', cancelBookingValidation, handleValidationErrors, bookingController.cancelBooking);
router.put('/:id/confirm', authorize('driver', 'admin'), bookingController.confirmBooking);
router.put('/:id/complete', authorize('driver', 'admin'), completeBookingValidation, handleValidationErrors, bookingController.completeBooking);
router.get('/history', getBookingHistoryValidation, handleValidationErrors, bookingController.getBookingHistory);
router.get('/:id', bookingController.getBookingById);
router.post('/:id/regenerate-otp', authorize('driver', 'admin'), bookingController.regenerateOTP);

module.exports = router;