const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: function () {
      return !this.isEmailVerifiedUser || this.isEmailVerified !== false;
    },
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  surname: {
    type: String,
    required: function () {
      return !this.isEmailVerifiedUser || this.isEmailVerified !== false;
    },
    trim: true,
    maxlength: [50, 'Surname cannot exceed 50 characters']
  },
  phone: {
    type: String,
    required: function () {
      return !this.isEmailVerifiedUser || this.isEmailVerified !== false;
    },
    unique: true,
    sparse: true,
    match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian phone number']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'driver', 'admin'],
    default: 'user'
  },
  isDriver: {
    type: Boolean,
    default: false
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  profileImage: {
    type: String,
    default: ''
  },

  refreshTokens: [{
    token: String,
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 2592000
    }
  }],

  lastLogin: {
    type: Date,
    default: Date.now
  },

  resetPasswordToken: {
    type: String,
    default: undefined
  },
  resetPasswordExpire: {
    type: Date,
    default: undefined
  },

  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isEmailVerifiedUser: {
    type: Boolean,
    default: false
  },
  emailOtp: {
    type: String,
    default: undefined
  },
  emailOtpExpires: {
    type: Date,
    default: undefined
  }
}, {
  timestamps: true
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

userSchema.methods.generateEmailOtp = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  this.emailOtp = crypto
    .createHash('sha256')
    .update(otp)
    .digest('hex');

  this.emailOtpExpires = Date.now() + 5 * 60 * 1000;

  return otp;
};

userSchema.methods.verifyEmailOtp = function (submittedOtp) {
  if (!this.emailOtp || !this.emailOtpExpires) {
    return false;
  }

  if (Date.now() > this.emailOtpExpires) {
    return false;
  }

  const hashedOtp = crypto
    .createHash('sha256')
    .update(submittedOtp)
    .digest('hex');

  const isValid = hashedOtp === this.emailOtp;

  if (isValid) {
    this.emailOtp = undefined;
    this.emailOtpExpires = undefined;
    this.isEmailVerified = true;
  }

  return isValid;
};

userSchema.methods.getProfile = function () {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.refreshTokens;
  delete userObject.resetPasswordToken;
  delete userObject.resetPasswordExpire;
  delete userObject.emailOtp;
  delete userObject.emailOtpExpires;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);