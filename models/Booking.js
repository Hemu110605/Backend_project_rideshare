const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  rideId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride',
    required: [true, 'Ride reference is required']
  },
  passenger: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Passenger reference is required']
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Driver reference is required']
  },
  seatsBooked: {
    type: Number,
    required: [true, 'Number of seats booked is required'],
    min: [1, 'At least 1 seat must be booked'],
    max: [7, 'Cannot book more than 7 seats']
  },
  farePerSeat: {
    type: Number,
    required: [true, 'Fare per seat is required'],
    min: [0, 'Fare per seat cannot be negative']
  },
  totalFare: {
    type: Number,
    required: [true, 'Total fare is required'],
    min: [0, 'Total fare cannot be negative']
  },
  platformFee: {
    type: Number,
    default: 0,
    min: 0
  },
  gst: {
    type: Number,
    default: 0,
    min: 0
  },
  finalAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },
  pickupLocation: {
    type: String,
    required: [true, 'Pickup location is required'],
    trim: true
  },
  dropLocation: {
    type: String,
    required: [true, 'Drop location is required'],
    trim: true
  },
  pickupTime: {
    type: String,
    required: [true, 'Pickup time is required']
  },
  specialRequests: {
    type: String,
    maxlength: [300, 'Special requests cannot exceed 300 characters'],
    trim: true
  },
  negotiationStatus: {
    type: String,
    enum: ['none', 'requested', 'accepted', 'rejected', 'countered'],
    default: 'none'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  },
  negotiationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Negotiation'
  },
  cancellationReason: {
    type: String,
    maxlength: [300, 'Cancellation reason cannot exceed 300 characters'],
    trim: true
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancelledAt: {
    type: Date
  },
  confirmedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  otp: {
    type: String,
    select: false
  },
  otpExpires: {
    type: Date,
    select: false
  }
}, {
  timestamps: true
});

// Indexes
bookingSchema.index({ rideId: 1, passenger: 1 });
bookingSchema.index({ passenger: 1, status: 1 });
bookingSchema.index({ driver: 1, status: 1 });
bookingSchema.index({ status: 1, createdAt: -1 });

// Virtual for total amount including fees
bookingSchema.virtual('totalAmount').get(function () {
  return this.totalFare + this.platformFee + this.gst;
});

// Pre-save middleware to calculate final amount
bookingSchema.pre('save', function (next) {
  if (
    this.isModified('totalFare') ||
    this.isModified('platformFee') ||
    this.isModified('gst')
  ) {
    this.finalAmount = this.totalFare + this.platformFee + this.gst;
  }
  next();
});

// Method to generate OTP
bookingSchema.methods.generateOTP = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = otp;
  this.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
  return this.save();
};

// Method to verify OTP
bookingSchema.methods.verifyOTP = function (enteredOTP) {
  if (this.otp !== enteredOTP) {
    return false;
  }
  if (Date.now() > this.otpExpires) {
    return false;
  }
  this.otp = undefined;
  this.otpExpires = undefined;
  return this.save();
};

// Method to confirm booking
bookingSchema.methods.confirmBooking = function () {
  this.status = 'confirmed';
  this.confirmedAt = new Date();
  return this.save();
};

// Method to cancel booking
bookingSchema.methods.cancelBooking = function (reason, cancelledBy) {
  this.status = 'cancelled';
  this.cancellationReason = reason;
  this.cancelledBy = cancelledBy;
  this.cancelledAt = new Date();
  return this.save();
};

// Method to complete booking
bookingSchema.methods.completeBooking = function () {
  this.status = 'completed';
  this.completedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Booking', bookingSchema);