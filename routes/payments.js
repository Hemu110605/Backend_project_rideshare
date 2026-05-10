const express = require('express');
const { body, query } = require('express-validator');
const paymentController = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// All routes are protected
router.use(protect);

// Process payment validation
const processPaymentValidation = [
  body('bookingId')
    .isMongoId()
    .withMessage('Valid booking ID is required'),
  body('paymentMethod')
    .optional()
    .isIn(['upi', 'card', 'cash', 'wallet'])
    .withMessage('Payment method must be upi, card, cash, or wallet'),
  body('upiDetails.upiId')
    .optional()
    .isEmail()
    .withMessage('UPI ID must be a valid email format'),
  body('upiDetails.qrCode')
    .optional()
    .isURL()
    .withMessage('QR code must be a valid URL')
];

// Refund payment validation
const refundPaymentValidation = [
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Refund reason is required')
    .isLength({ max: 500 })
    .withMessage('Refund reason cannot exceed 500 characters'),
  body('amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Refund amount must be positive')
];

// Get payment history validation
const getPaymentHistoryValidation = [
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
    .isIn(['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'])
    .withMessage('Status must be pending, processing, completed, failed, refunded, or cancelled'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date')
];

// Create Razorpay order validation
const createRazorpayOrderValidation = [
  body('bookingId')
    .optional()
    .isMongoId()
    .withMessage('Valid booking ID is required'),
  body('rideId')
    .optional()
    .isMongoId()
    .withMessage('Valid ride ID is required'),
  body().custom((value, { req }) => {
    if (!req.body.bookingId && !req.body.rideId) {
      throw new Error('Either bookingId or rideId is required');
    }
    return true;
  })
];

// Verify Razorpay payment validation
const verifyRazorpayPaymentValidation = [
  body('razorpay_order_id')
    .notEmpty()
    .withMessage('Razorpay order ID is required'),
  body('razorpay_payment_id')
    .notEmpty()
    .withMessage('Razorpay payment ID is required'),
  body('razorpay_signature')
    .notEmpty()
    .withMessage('Razorpay signature is required'),
  body('bookingId')
    .optional()
    .isMongoId()
    .withMessage('Valid booking ID is required')
];

// Routes
router.post('/process', processPaymentValidation, handleValidationErrors, paymentController.processPayment);
router.post('/create-order', createRazorpayOrderValidation, handleValidationErrors, paymentController.createRazorpayOrder);
router.post('/verify-payment', verifyRazorpayPaymentValidation, handleValidationErrors, paymentController.verifyRazorpayPayment);
// Routes
router.post('/process', processPaymentValidation, handleValidationErrors, paymentController.processPayment);
router.get('/history', getPaymentHistoryValidation, paymentController.getPaymentHistory);
router.get('/:id', paymentController.getPaymentById);
router.get('/:id/qrcode', paymentController.generateQRCode);
router.get('/:id/status', paymentController.verifyPaymentStatus);
router.post('/:id/refund', refundPaymentValidation, handleValidationErrors, paymentController.refundPayment);

module.exports = router;
