const express = require('express');
const passport = require('passport');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');
const {
  rateLimiter,
  authLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  otpLimiter
} = require('../middleware/rateLimiter');

const router = express.Router();

// Register validation
const registerValidation = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters'),

  body('surname')
    .custom((value, { req }) => {
      const surnameValue = value || req.body.lastName;

      if (!surnameValue || surnameValue.trim() === '') {
        throw new Error('Surname is required');
      }

      if (surnameValue.length > 50) {
        throw new Error('Surname cannot exceed 50 characters');
      }

      req.body.surname = surnameValue.trim();
      return true;
    }),

  body('phone')
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please enter a valid 10-digit Indian phone number'),

  body('email')
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail(),

  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),

  body('role')
    .optional()
    .isIn(['user', 'driver', 'passenger'])
    .withMessage('Role must be user, passenger, or driver')
];

// Login validation
const loginValidation = [
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail(),

  body('phone')
    .optional()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please enter a valid 10-digit Indian phone number'),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),

  body('rememberMe')
    .optional()
    .isBoolean()
    .withMessage('Remember me must be a boolean')
];

// Refresh token validation
const refreshTokenValidation = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
];

// Logout validation
const logoutValidation = [
  body('refreshToken')
    .optional()
    .notEmpty()
    .withMessage('Refresh token cannot be empty')
];

// Forgot password validation
const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail(),

  body('role')
    .optional()
    .isIn(['user', 'driver', 'passenger'])
    .withMessage('Role must be user, passenger, or driver')
];

// Reset password validation
const resetPasswordValidation = [
  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),

  body('newPassword')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

// Send email OTP validation
const sendEmailOtpValidation = [
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail()
];

// Verify email OTP validation
const verifyEmailOtpValidation = [
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail(),

  body('otp')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('OTP must be a 6-digit number')
];

// Routes
router.post('/register', registerLimiter, registerValidation, handleValidationErrors, authController.register);
router.post('/login', authLimiter, loginValidation, handleValidationErrors, authController.login);
router.post('/refresh', refreshTokenValidation, handleValidationErrors, authController.refreshToken);
router.post('/logout', protect, logoutValidation, handleValidationErrors, authController.logout);
router.post('/logout-all', protect, authController.logoutAll);
router.get('/me', protect, authController.getMe);

// Debug test route
router.get('/test', (req, res) => {
  res.status(200).send('Auth routes working');
});

// Google Auth - Step 1
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })
);

// Google Auth - Step 2
router.get(
  '/google/callback',
  (req, res, next) => {
    passport.authenticate('google', {
      failureRedirect: `${process.env.FRONTEND_URL}/?error=google_auth_failed`,
      session: false
    })(req, res, (err) => {
      if (err) {
        console.error('Google callback error:', err);
        return res.redirect(`${process.env.FRONTEND_URL}/?error=google_auth_error`);
      }
      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.user) {
        console.error('No user in Google callback');
        return res.redirect(`${process.env.FRONTEND_URL}/?error=no_user`);
      }

      console.log('Google auth successful for user:', req.user.email);
      
      // Generate JWT tokens
      const jwt = require('jsonwebtoken');
      const accessToken = jwt.sign(
        { id: req.user._id, email: req.user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE }
      );
      
      const refreshToken = jwt.sign(
        { id: req.user._id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRE }
      );

      // Store refresh token in user document
      req.user.refreshTokens.push({ token: refreshToken });
      await req.user.save();

      // Redirect to frontend with tokens
      const redirectUrl = `${process.env.FRONTEND_URL}/?page=passenger-dashboard&token=${accessToken}&refreshToken=${refreshToken}`;
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Google callback processing error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/?error=callback_processing_failed`);
    }
  }
);

// Forgot Password Routes
router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  forgotPasswordValidation,
  handleValidationErrors,
  authController.forgotPassword
);

router.put(
  '/reset-password/:token',
  resetPasswordValidation,
  handleValidationErrors,
  authController.resetPassword
);

// Email OTP Routes
router.post(
  '/send-code',
  otpLimiter,
  sendEmailOtpValidation,
  handleValidationErrors,
  authController.sendEmailOtp
);

router.post(
  '/send-email-otp',
  otpLimiter,
  sendEmailOtpValidation,
  handleValidationErrors,
  authController.sendEmailOtp
);

router.post(
  '/verify-email-otp',
  otpLimiter,
  verifyEmailOtpValidation,
  handleValidationErrors,
  authController.verifyEmailOtp
);

module.exports = router;