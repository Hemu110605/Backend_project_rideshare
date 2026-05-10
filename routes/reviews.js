const express = require('express');
const { body, query } = require('express-validator');
const reviewController = require('../controllers/reviewController');
const { protect, optionalAuth } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// Create review validation
const createReviewValidation = [
  body('bookingId')
    .isMongoId()
    .withMessage('Valid booking ID is required'),
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Comment cannot exceed 1000 characters'),
  body('aspects.punctuality')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Punctuality rating must be between 1 and 5'),
  body('aspects.driving')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Driving rating must be between 1 and 5'),
  body('aspects.cleanliness')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Cleanliness rating must be between 1 and 5'),
  body('aspects.communication')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Communication rating must be between 1 and 5'),
  body('aspects.safety')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Safety rating must be between 1 and 5'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .isIn([
      'on-time', 'friendly', 'safe-driver', 'clean-car', 'good-music', 'smooth-ride',
      'helpful', 'professional', 'late', 'rude', 'messy', 'dangerous', 'unprofessional'
    ])
    .withMessage('Invalid tag value')
];

// Respond to review validation
const respondToReviewValidation = [
  body('text')
    .trim()
    .notEmpty()
    .withMessage('Response text is required')
    .isLength({ max: 1000 })
    .withMessage('Response cannot exceed 1000 characters')
];

// Report review validation
const reportReviewValidation = [
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Report reason is required')
    .isLength({ max: 500 })
    .withMessage('Report reason cannot exceed 500 characters')
];

// Update review privacy validation
const updateReviewPrivacyValidation = [
  body('isPublic')
    .isBoolean()
    .withMessage('isPublic must be a boolean')
];

// Get reviews validation
const getReviewsValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5')
];

// Get my reviews validation
const getMyReviewsValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
];

// Routes
router.post('/', protect, createReviewValidation, handleValidationErrors, reviewController.createReview);
router.get('/my-reviews', protect, getMyReviewsValidation, reviewController.getMyReviews);
router.get('/user/:userId', optionalAuth, getReviewsValidation, reviewController.getUserReviews);
router.get('/vehicle/:vehicleId', optionalAuth, getReviewsValidation, reviewController.getVehicleReviews);
router.get('/:id', optionalAuth, reviewController.getReviewById);
router.post('/:id/respond', protect, respondToReviewValidation, handleValidationErrors, reviewController.respondToReview);
router.post('/:id/report', protect, reportReviewValidation, handleValidationErrors, reviewController.reportReview);
router.put('/:id/privacy', protect, updateReviewPrivacyValidation, handleValidationErrors, reviewController.updateReviewPrivacy);

module.exports = router;
