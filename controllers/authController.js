const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const sendEmail = require('../utils/emailotp');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken
} = require('../utils/jwtUtils');

// REGISTER
const register = async (req, res) => {
  try {
    const { firstName, phone, email, password, role } = req.body;
    const surname = req.body.surname || req.body.lastName;

    if (!firstName || !surname || !phone || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please fill all fields'
      });
    }

    let existingUser = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Please verify your email first'
      });
    }

    if (!existingUser.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Please verify your email first'
      });
    }

    if (existingUser.phone && existingUser.password) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    const phoneUser = await User.findOne({
      phone,
      _id: { $ne: existingUser._id }
    });

    if (phoneUser) {
      return res.status(400).json({
        success: false,
        message: 'Phone number already exists'
      });
    }

    existingUser.firstName = firstName;
    existingUser.surname = surname;
    existingUser.phone = phone;
    existingUser.password = password;
    existingUser.role = role || 'user';
    existingUser.isDriver = role === 'driver';

    if (!existingUser.refreshTokens) {
      existingUser.refreshTokens = [];
    }

    await existingUser.save();

    const payload = {
      id: existingUser._id,
      email: existingUser.email,
      role: existingUser.role
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    existingUser.refreshTokens.push({ token: refreshToken });
    existingUser.lastLogin = new Date();

    await existingUser.save();

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: existingUser.getProfile(),
        accessToken,
        refreshToken
      }
    });

  } catch (error) {
    console.error('Registration error FULL:', error);

    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: error.message
    });
  }
};

// LOGIN
const login = async (req, res) => {
  try {
    const { email, phone, password, rememberMe } = req.body;

    if ((!email && !phone) || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email or phone and password are required'
      });
    }

    const query = [];
    if (email) query.push({ email: email.toLowerCase() });
    if (phone) query.push({ phone });

    const user = await User.findOne({ $or: query }).select('+password +refreshTokens');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (user.isBlocked) {
      return res.status(401).json({
        success: false,
        message: 'Account is blocked. Contact support.'
      });
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const payload = { id: user._id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    if (!user.refreshTokens) {
      user.refreshTokens = [];
    }

    user.refreshTokens.push({ token: refreshToken });

    if (!rememberMe && user.refreshTokens.length > 1) {
      user.refreshTokens = [user.refreshTokens[user.refreshTokens.length - 1]];
    }

    user.lastLogin = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.getProfile(),
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message
    });
  }
};

// REFRESH TOKEN
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    const decoded = verifyRefreshToken(refreshToken);

    const user = await User.findOne({
      _id: decoded.id,
      'refreshTokens.token': refreshToken
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    const payload = { id: user._id, email: user.email, role: user.role };
    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    user.refreshTokens = user.refreshTokens.filter(
      (rt) => rt.token !== refreshToken
    );

    user.refreshTokens.push({ token: newRefreshToken });
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
};

// LOGOUT
const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      req.user.refreshTokens = req.user.refreshTokens.filter(
        (rt) => rt.token !== refreshToken
      );
      await req.user.save();
    }

    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
};

// LOGOUT ALL
const logoutAll = async (req, res) => {
  try {
    req.user.refreshTokens = [];
    await req.user.save();

    res.status(200).json({
      success: true,
      message: 'Logged out from all devices'
    });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
};

// GET ME
const getMe = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        user: req.user.getProfile()
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// FORGOT PASSWORD
const forgotPassword = async (req, res) => {
  try {
    const { email, role } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return res.status(500).json({
        success: false,
        message: 'Email service is not configured properly'
      });
    }

    if (!process.env.FRONTEND_URL) {
      return res.status(500).json({
        success: false,
        message: 'Frontend URL is missing in server configuration'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const searchQuery = role
      ? { email: normalizedEmail, role }
      : { email: normalizedEmail };

    // Search for user in User collection
    let user = await User.findOne(searchQuery);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email'
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');

    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    // Wrap only sendEmail in try-catch
    try {
      await sendEmail({
        email: user.email,
        subject: 'RideShare Password Reset',
        html: `
          <h2>RideShare Password Reset</h2>
          <p>You requested to reset your password.</p>
          <p>Click below to create a new password.</p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 20px;background:#00d4c7;color:white;text-decoration:none;border-radius:8px;">
            Reset Password
          </a>
          <p>This link will expire in 15 minutes.</p>
          <p>If you did not request this, ignore this email.</p>
        `
      });

      // Return success immediately after sendEmail
      return res.status(200).json({
        success: true,
        message: "Password reset link sent to your email"
      });
    } catch (error) {
      console.error("Forgot password email error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Email could not be sent"
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// RESET PASSWORD
const resetPassword = async (req, res) => {
  try {
    const { password, newPassword } = req.body;
    const finalPassword = password || newPassword;

    if (!finalPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password is required'
      });
    }

    if (finalPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    }).select('+password +refreshTokens');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset link'
      });
    }

    user.password = finalPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    user.refreshTokens = [];

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully. Please login again.'
    });
  } catch (error) {
    console.error('Reset password error:', error);

    res.status(500).json({
      success: false,
      message: 'Server error during password reset',
      error: error.message
    });
  }
};

// SEND EMAIL OTP
const sendEmailOtp = async (req, res) => {
  try {
    const { email, firstName = 'User' } = req.body;

    // Trim and validate email
    const trimmedEmail = email ? email.trim() : '';
    
    if (!trimmedEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address'
      });
    }

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.error("❌ Missing email configuration");
      return res.status(500).json({
        success: false,
        message: 'Email service is not configured properly'
      });
    }

    let user = await User.findOne({ email: trimmedEmail.toLowerCase() });

    if (user && user.phone && user.password) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    if (!user) {
      user = new User({
        email: trimmedEmail.toLowerCase(),
        firstName,
        surname: 'Temp',
        phone: undefined,
        password: crypto.randomBytes(16).toString('hex'),
        isEmailVerified: false,
        role: 'user',
        refreshTokens: []
      });
    }

    const otp = user.generateEmailOtp();
    await user.save({ validateBeforeSave: false });

    try {
      await sendEmail({
        email: user.email,
        subject: 'RideShare Email Verification OTP',
        html: `
          <div style="max-width:600px;margin:0 auto;padding:20px;font-family:Arial,sans-serif;">
            <h2>Email Verification</h2>
            <p>Hi ${user.firstName || 'User'},</p>
            <p>Your 6 digit OTP for RideShare email verification is:</p>
            <div style="background:#f0f0f0;padding:15px;text-align:center;font-size:28px;font-weight:bold;letter-spacing:4px;margin:20px 0;">
              ${otp}
            </div>
            <p>This OTP will expire in 5 minutes.</p>
            <p>If you did not request this, please ignore this email.</p>
            <br />
            <p>Thanks,<br />RideShare Team</p>
          </div>
        `
      });

      return res.status(200).json({ 
        success: true, 
        message: "OTP sent" 
      });
    } catch (error) {
      console.error("Email error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Failed to send email"
      });
    }
  } catch (error) {
    console.error('Send email OTP error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// VERIFY EMAIL OTP
const verifyEmailOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Trim and validate email
    const trimmedEmail = email ? email.trim() : '';
    
    if (!trimmedEmail || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address'
      });
    }

    const user = await User.findOne({ email: trimmedEmail.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No OTP found for this email'
      });
    }

    const isValidOtp = user.verifyEmailOtp(otp);

    if (!isValidOtp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      data: {
        isEmailVerified: user.isEmailVerified
      }
    });
  } catch (error) {
    console.error('Verify email OTP error:', error);

    res.status(500).json({
      success: false,
      message: 'Server error during OTP verification',
      error: error.message
    });
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  logoutAll,
  getMe,
  forgotPassword,
  resetPassword,
  sendEmailOtp,
  verifyEmailOtp
};