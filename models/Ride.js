const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Driver reference is required']
  },
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: [true, 'Vehicle reference is required']
  },
  source: {
    type: String,
    required: [true, 'Source location is required'],
    trim: true,
    maxlength: [200, 'Source cannot exceed 200 characters']
  },
  destination: {
    type: String,
    required: [true, 'Destination location is required'],
    trim: true,
    maxlength: [200, 'Destination cannot exceed 200 characters']
  },
  pickupCoordinates: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [lng, lat]
      required: true
    }
  },
  dropCoordinates: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [lng, lat]
      required: true
    }
  },
  date: {
    type: Date,
    required: [true, 'Ride date is required'],
    validate: {
      validator: function(value) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return value >= today;
      },
      message: 'Ride date cannot be in the past'
    }
  },
  time: {
    type: String,
    required: [true, 'Ride time is required'],
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time in HH:MM format']
  },
  distance: {
    type: Number,
    required: [true, 'Distance is required'],
    min: [1, 'Distance must be at least 1 km']
  },
  duration: {
    type: Number,
    required: [true, 'Duration is required'],
    min: [5, 'Duration must be at least 5 minutes']
  },
  pricePerKm: {
    type: Number,
    required: [true, 'Price per km is required'],
    min: [1, 'Price per km must be at least 1']
  },
  totalSeats: {
    type: Number,
    required: [true, 'Total seats is required'],
    min: [1, 'Total seats must be at least 1'],
    max: [7, 'Total seats cannot exceed 7']
  },
  availableSeats: {
    type: Number,
    required: [true, 'Available seats is required'],
    min: [0, 'Available seats cannot be negative'],
    validate: {
      validator: function(value) {
        return value <= this.totalSeats;
      },
      message: 'Available seats cannot exceed total seats'
    }
  },
  estimatedFare: {
    type: Number,
    required: [true, 'Estimated fare is required'],
    min: [0, 'Estimated fare cannot be negative']
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
  status: {
    type: String,
    enum: ['active', 'booked', 'ongoing', 'completed', 'cancelled'],
    default: 'active'
  },
  startedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  cancelledAt: {
    type: Date,
    default: null
  },
  cancelledBy: {
    type: String,
    enum: ['driver', 'passenger', 'system'],
    default: null
  },
  cancellationReason: {
    type: String,
    maxlength: [500, 'Cancellation reason cannot exceed 500 characters'],
    trim: true,
    default: null
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    trim: true
  },
  preferences: {
    smokingAllowed: {
      type: Boolean,
      default: false
    },
    petsAllowed: {
      type: Boolean,
      default: false
    },
    musicAllowed: {
      type: Boolean,
      default: true
    },
    luggageAllowed: {
      type: Boolean,
      default: true
    }
  },
  route: [{
    point: String,
    coordinates: {
      lat: Number,
      lng: Number
    },
    estimatedTime: Number
  }],
  bookings: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  }],
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalRatings: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes
rideSchema.index({ driver: 1, status: 1 });
rideSchema.index({ date: 1, status: 1 });
rideSchema.index({ source: 'text', destination: 'text' });
rideSchema.index({ pickupCoordinates: '2dsphere' });
rideSchema.index({ dropCoordinates: '2dsphere' });

// Virtual
rideSchema.virtual('totalFare').get(function() {
  return this.estimatedFare + this.platformFee + this.gst;
});

// Methods
rideSchema.methods.calculateFare = function() {
  this.estimatedFare = this.distance * this.pricePerKm;
  this.platformFee = Math.round(this.estimatedFare * 0.05);
  this.gst = Math.round((this.estimatedFare + this.platformFee) * 0.18);
  return this;
};

rideSchema.methods.updateAvailableSeats = function(seatsBooked) {
  if (seatsBooked > this.availableSeats) {
    throw new Error('Not enough seats available');
  }

  this.availableSeats -= seatsBooked;

  if (this.availableSeats === 0) {
    this.status = 'booked';
  }

  return this.save();
};

rideSchema.methods.updateRating = function(newRating) {
  const currentTotal = this.averageRating * this.totalRatings;
  this.totalRatings += 1;
  this.averageRating = (currentTotal + newRating) / this.totalRatings;
  return this.save();
};

rideSchema.pre('save', function(next) {
  if (this.isModified('distance') || this.isModified('pricePerKm')) {
    this.calculateFare();
  }
  next();
});

module.exports = mongoose.model('Ride', rideSchema);