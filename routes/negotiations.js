const express = require('express');
const { body, query } = require('express-validator');
const negotiationController = require('../controllers/negotiationController');
const { protect } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// All routes are protected
router.use(protect);

// Initiate negotiation validation
const initiateNegotiationValidation = [
  body('bookingId')
    .isMongoId()
    .withMessage('Valid booking ID is required'),
  body('proposedFare')
    .isFloat({ min: 0 })
    .withMessage('Proposed fare must be positive'),
  body('message')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Message cannot exceed 500 characters')
];

// Respond to negotiation validation
const respondToNegotiationValidation = [
  body('action')
    .isIn(['accept', 'reject', 'counter'])
    .withMessage('Action must be accept, reject, or counter'),
  body('message')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Message cannot exceed 500 characters'),
  body('proposedFare')
    .if(body('action').equals('counter'))
    .isFloat({ min: 0 })
    .withMessage('Proposed fare is required for counter offer')
];

// Get user negotiations validation
const getUserNegotiationsValidation = [
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
    .isIn(['requested', 'countered', 'accepted', 'rejected', 'expired'])
    .withMessage('Status must be requested, countered, accepted, rejected, or expired')
];

// Routes
router.post('/initiate', initiateNegotiationValidation, handleValidationErrors, negotiationController.initiateNegotiation);
router.post('/:id/respond', respondToNegotiationValidation, handleValidationErrors, negotiationController.respondToNegotiation);
router.get('/active', negotiationController.getActiveNegotiations);
router.get('/', getUserNegotiationsValidation, negotiationController.getUserNegotiations);
router.get('/:id', negotiationController.getNegotiationById);

module.exports = router;
