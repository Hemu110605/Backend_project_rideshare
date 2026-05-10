const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: [true, 'Booking reference is required'],
    unique: true
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
  ride: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride',
    required: [true, 'Ride reference is required']
  },
  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
    min: [0, 'Amount cannot be negative']
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
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative']
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['upi', 'card', 'cash', 'wallet'],
    default: 'upi'
  },
  transactionId: {
    type: String,
    sparse: true,
    index: true
  },
  gatewayTransactionId: {
    type: String,
    sparse: true
  },
  gateway: {
    type: String,
    enum: ['razorpay', 'upi', 'cash'],
    default: 'upi'
  },
  upiDetails: {
    upiId: {
      type: String,
      trim: true
    },
    qrCode: {
      type: String,
      trim: true
    },
    paymentIntentId: {
      type: String,
      trim: true
    }
  },
  cardDetails: {
    last4: {
      type: String,
      trim: true
    },
    brand: {
      type: String,
      trim: true
    },
    expMonth: {
      type: Number,
      min: 1,
      max: 12
    },
    expYear: {
      type: Number,
      min: new Date().getFullYear()
    }
  },
  processingAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  failedAt: {
    type: Date
  },
  refundedAt: {
    type: Date
  },
  failureReason: {
    type: String,
    maxlength: [500, 'Failure reason cannot exceed 500 characters'],
    trim: true
  },
  refundReason: {
    type: String,
    maxlength: [500, 'Refund reason cannot exceed 500 characters'],
    trim: true
  },
  refundAmount: {
    type: Number,
    min: 0
  },
  razorpayDetails: {
    orderId: {
      type: String,
      trim: true
    },
    paymentId: {
      type: String,
      trim: true
    },
    signature: {
      type: String,
      trim: true
    }
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
paymentSchema.index({ passenger: 1, status: 1 });
paymentSchema.index({ driver: 1, status: 1 });
paymentSchema.index({ status: 1, createdAt: -1 });

// Pre-save middleware to generate transaction ID
paymentSchema.pre('save', function(next) {
  if (!this.transactionId && this.status === 'pending') {
    this.transactionId = this.generateTransactionId();
  }

  if (this.isModified('amount') || this.isModified('platformFee') || this.isModified('gst')) {
    this.totalAmount = this.amount + this.platformFee + this.gst;
  }

  next();
});

// Method to generate transaction ID
paymentSchema.methods.generateTransactionId = function() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `TXN_${timestamp}_${random}`.toUpperCase();
};

// Method to process payment
paymentSchema.methods.processPayment = function() {
  this.status = 'processing';
  this.processingAt = new Date();
  return this.save();
};

// Method to complete payment
paymentSchema.methods.completePayment = function(gatewayTransactionId) {
  this.status = 'completed';
  this.completedAt = new Date();
  if (gatewayTransactionId) {
    this.gatewayTransactionId = gatewayTransactionId;
  }
  return this.save();
};

// Method to fail payment
paymentSchema.methods.failPayment = function(reason) {
  this.status = 'failed';
  this.failedAt = new Date();
  this.failureReason = reason;
  return this.save();
};

// Method to refund payment
paymentSchema.methods.refundPayment = function(reason, amount) {
  this.status = 'refunded';
  this.refundedAt = new Date();
  this.refundReason = reason;
  this.refundAmount = amount || this.totalAmount;
  return this.save();
};

// Method to cancel payment
paymentSchema.methods.cancelPayment = function() {
  this.status = 'cancelled';
  return this.save();
};

// Static method to get payment statistics
paymentSchema.statics.getPaymentStats = async function(startDate, endDate) {
  const matchStage = {
    createdAt: {
      $gte: startDate,
      $lte: endDate
    }
  };

  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' }
      }
    }
  ]);

  return stats.reduce((acc, stat) => {
    acc[stat._id] = {
      count: stat.count,
      totalAmount: stat.totalAmount
    };
    return acc;
  }, {});
};

module.exports = mongoose.model('Payment', paymentSchema);