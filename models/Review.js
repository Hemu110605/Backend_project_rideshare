const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  ride: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride',
    required: [true, 'Ride reference is required']
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: [true, 'Booking reference is required'],
    unique: true
  },
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Reviewer reference is required']
  },
  reviewee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Reviewee reference is required']
  },
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: [true, 'Vehicle reference is required']
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot be more than 5']
  },
  comment: {
    type: String,
    maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    trim: true
  },
  aspects: {
    punctuality: {
      type: Number,
      min: 1,
      max: 5
    },
    driving: {
      type: Number,
      min: 1,
      max: 5
    },
    cleanliness: {
      type: Number,
      min: 1,
      max: 5
    },
    communication: {
      type: Number,
      min: 1,
      max: 5
    },
    safety: {
      type: Number,
      min: 1,
      max: 5
    }
  },
  tags: [{
    type: String,
    enum: [
      'on-time',
      'friendly',
      'safe-driver',
      'clean-car',
      'good-music',
      'smooth-ride',
      'helpful',
      'professional',
      'late',
      'rude',
      'messy',
      'dangerous',
      'unprofessional'
    ]
  }],
  isPublic: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  response: {
    text: {
      type: String,
      maxlength: [1000, 'Response cannot exceed 1000 characters'],
      trim: true
    },
    respondedAt: {
      type: Date
    }
  },
  reported: {
    type: Boolean,
    default: false
  },
  reportReason: {
    type: String,
    maxlength: [500, 'Report reason cannot exceed 500 characters'],
    trim: true
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reportedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
reviewSchema.index({ ride: 1, reviewer: 1 });
reviewSchema.index({ reviewee: 1, rating: -1 });
reviewSchema.index({ vehicle: 1, rating: -1 });
reviewSchema.index({ reviewer: 1, createdAt: -1 });

// Compound index to ensure one review per booking per reviewer
reviewSchema.index({ booking: 1, reviewer: 1 }, { unique: true });

// Pre-save middleware to verify booking completion
reviewSchema.pre('save', async function(next) {
  if (this.isNew) {
    const Booking = mongoose.model('Booking');
    const booking = await Booking.findById(this.booking);
    
    if (!booking || booking.status !== 'completed') {
      return next(new Error('Can only review completed bookings'));
    }
    
    // Prevent self-review
    if (this.reviewer.toString() === this.reviewee.toString()) {
      return next(new Error('Cannot review yourself'));
    }
  }
  next();
});

// Static method to calculate average rating
reviewSchema.statics.calculateAverageRating = async function(revieweeId) {
  const stats = await this.aggregate([
    { $match: { reviewee: revieweeId, isPublic: true, reported: false } },
    {
      $group: {
        _id: '$reviewee',
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        ratingDistribution: {
          $push: '$rating'
        }
      }
    }
  ]);

  if (stats.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: [0, 0, 0, 0, 0]
    };
  }

  const result = stats[0];
  result.ratingDistribution = [1, 2, 3, 4, 5].map(rating => 
    result.ratingDistribution.filter(r => r === rating).length
  );

  return result;
};

// Static method to get vehicle ratings
reviewSchema.statics.getVehicleRatings = async function(vehicleId) {
  const stats = await this.aggregate([
    { $match: { vehicle: vehicleId, isPublic: true, reported: false } },
    {
      $group: {
        _id: '$vehicle',
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        averageAspects: {
          avgPunctuality: { $avg: '$aspects.punctuality' },
          avgDriving: { $avg: '$aspects.driving' },
          avgCleanliness: { $avg: '$aspects.cleanliness' },
          avgCommunication: { $avg: '$aspects.communication' },
          avgSafety: { $avg: '$aspects.safety' }
        }
      }
    }
  ]);

  return stats.length > 0 ? stats[0] : null;
};

// Method to add response to review
reviewSchema.methods.addResponse = function(responseText) {
  this.response = {
    text: responseText,
    respondedAt: new Date()
  };
  return this.save();
};

// Method to report review
reviewSchema.methods.reportReview = function(reportReason, reportedBy) {
  this.reported = true;
  this.reportReason = reportReason;
  this.reportedBy = reportedBy;
  this.reportedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Review', reviewSchema);
