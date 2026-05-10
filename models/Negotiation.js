const mongoose = require('mongoose');

const negotiationMessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sender reference is required']
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  proposedFare: {
    type: Number,
    min: [0, 'Proposed fare cannot be negative']
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const negotiationSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: [true, 'Booking reference is required'],
    unique: true
  },
  ride: {
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
  originalFare: {
    type: Number,
    required: [true, 'Original fare is required'],
    min: [0, 'Original fare cannot be negative']
  },
  currentFare: {
    type: Number,
    required: [true, 'Current fare is required'],
    min: [0, 'Current fare cannot be negative']
  },
  status: {
    type: String,
    enum: ['requested', 'countered', 'accepted', 'rejected', 'expired'],
    default: 'requested'
  },
  messages: [negotiationMessageSchema],
  initiatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Initiator reference is required']
  },
  expiresAt: {
    type: Date,
    default: Date.now,
    expires: 3600
  },
  finalFare: {
    type: Number,
    min: [0, 'Final fare cannot be negative']
  },
  acceptedAt: {
    type: Date
  },
  rejectedAt: {
    type: Date
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectionReason: {
    type: String,
    maxlength: [300, 'Rejection reason cannot exceed 300 characters'],
    trim: true
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
negotiationSchema.index({ passenger: 1, status: 1 });
negotiationSchema.index({ driver: 1, status: 1 });
negotiationSchema.index({ status: 1, createdAt: -1 });

// Method to add message
negotiationSchema.methods.addMessage = function(sender, message, proposedFare) {
  this.messages.push({
    sender,
    message,
    proposedFare,
    timestamp: new Date()
  });

  if (proposedFare !== undefined && proposedFare !== null) {
    this.currentFare = proposedFare;
  }

  return this.save();
};

// Method to accept negotiation
negotiationSchema.methods.acceptNegotiation = function() {
  this.status = 'accepted';
  this.finalFare = this.currentFare;
  this.acceptedAt = new Date();
  return this.save();
};

// Method to reject negotiation
negotiationSchema.methods.rejectNegotiation = function(rejectedBy, reason) {
  this.status = 'rejected';
  this.rejectedBy = rejectedBy;
  this.rejectionReason = reason;
  this.rejectedAt = new Date();
  return this.save();
};

// Method to check if negotiation is expired
negotiationSchema.methods.isExpired = function() {
  return Date.now() > this.expiresAt.getTime();
};

// Pre-save middleware to handle expiration
negotiationSchema.pre('save', function(next) {
  if (this.isExpired() && this.status === 'requested') {
    this.status = 'expired';
  }
  next();
});

// Static method to find active negotiations
negotiationSchema.statics.findActiveNegotiations = function(userId) {
  return this.find({
    $or: [{ passenger: userId }, { driver: userId }],
    status: { $in: ['requested', 'countered'] },
    expiresAt: { $gt: new Date() }
  }).populate('passenger driver ride booking');
};

module.exports = mongoose.model('Negotiation', negotiationSchema);