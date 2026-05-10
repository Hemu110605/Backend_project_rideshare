const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Driver reference is required']
  },
  make: {
    type: String,
    required: [true, 'Vehicle make is required'],
    trim: true,
    maxlength: [50, 'Make cannot exceed 50 characters']
  },
  model: {
    type: String,
    required: [true, 'Vehicle model is required'],
    trim: true,
    maxlength: [50, 'Model cannot exceed 50 characters']
  },
  year: {
    type: Number,
    required: [true, 'Vehicle year is required'],
    min: [2000, 'Vehicle year must be 2000 or newer'],
    max: [new Date().getFullYear() + 1, 'Vehicle year cannot be in the distant future']
  },
  color: {
    type: String,
    required: [true, 'Vehicle color is required'],
    trim: true,
    maxlength: [30, 'Color cannot exceed 30 characters']
  },
  vehicleNumber: {
    type: String,
    required: [true, 'Vehicle number is required'],
    uppercase: true,
    trim: true,
    match: [/^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/, 'Please enter a valid vehicle number (e.g., MH12AB1234)']
  },
  vehicleType: {
    type: String,
    required: [true, 'Vehicle type is required'],
    enum: ['sedan', 'suv', 'hatchback', 'compact'],
    default: 'sedan'
  },
  totalSeats: {
    type: Number,
    required: [true, 'Total seats is required'],
    enum: [4, 5, 7],
    default: 4
  },
  fuelType: {
    type: String,
    required: [true, 'Fuel type is required'],
    enum: ['petrol', 'diesel', 'cng', 'electric'],
    default: 'petrol'
  },
  rcNumber: {
    type: String,
    required: [true, 'RC number is required'],
    trim: true
  },
  insuranceValidUntil: {
    type: Date,
    required: [true, 'Insurance validity is required']
  },
  pucValidUntil: {
    type: Date,
    required: [true, 'PUC validity is required']
  },
  vehicleImage: {
    type: String,
    default: ''
  },
  rcImage: {
    type: String,
    default: ''
  },
  insuranceImage: {
    type: String,
    default: ''
  },
  pucImage: {
    type: String,
    default: ''
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
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

// Index for efficient queries
vehicleSchema.index({ driver: 1, isActive: 1 });
vehicleSchema.index({ vehicleNumber: 1 });

// Method to check if vehicle documents are valid
vehicleSchema.methods.areDocumentsValid = function() {
  const now = new Date();
  return this.insuranceValidUntil > now && this.pucValidUntil > now;
};

// Method to update rating
vehicleSchema.methods.updateRating = function(newRating) {
  const currentTotal = this.averageRating * this.totalRatings;
  this.totalRatings += 1;
  this.averageRating = (currentTotal + newRating) / this.totalRatings;
  return this.save();
};

module.exports = mongoose.model('Vehicle', vehicleSchema);
