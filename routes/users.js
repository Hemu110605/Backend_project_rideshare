const express = require('express');
const { body } = require('express-validator');
const userController = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// All routes are protected
router.use(protect);

// Update profile validation
const updateProfileValidation = [
  body('firstName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('First name cannot be empty')
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters'),
  body('surname')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Surname cannot be empty')
    .isLength({ max: 50 })
    .withMessage('Surname cannot exceed 50 characters'),
  body('profileImage')
    .optional()
    .isURL()
    .withMessage('Profile image must be a valid URL')
];

// Delete account validation
const deleteAccountValidation = [
  body('password')
    .notEmpty()
    .withMessage('Password is required to delete account')
];

// Routes
router.get('/profile', userController.getProfile);
router.put('/profile', updateProfileValidation, handleValidationErrors, userController.updateProfile);
router.get('/dashboard', userController.getDashboardStats);
router.get('/rides', userController.getRideHistory);
router.get('/payments', userController.getPaymentHistory);
router.get('/notifications', userController.getNotifications);
router.put('/notifications/:id/read', userController.markNotificationRead);
router.delete('/account', deleteAccountValidation, handleValidationErrors, userController.deleteAccount);

module.exports = router;
