const express = require('express');
const { body, query } = require('express-validator');
const Vehicle = require('../models/Vehicle');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// @desc    Get all vehicles (public)
// @route   GET /api/vehicles
// @access  Public
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, vehicleType, totalSeats, driver } = req.query;
    const skip = (page - 1) * limit;

    let query = { isActive: true, isVerified: true };
    
    if (vehicleType) {
      query.vehicleType = vehicleType;
    }
    
    if (totalSeats) {
      query.totalSeats = parseInt(totalSeats);
    }
    
    if (driver) {
      query.driver = driver;
    }

    const vehicles = await Vehicle.find(query)
      .populate('driver', 'firstName surname phone averageRating')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Vehicle.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        vehicles,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get vehicles error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get vehicle by ID
// @route   GET /api/vehicles/:id
// @access  Public
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id)
      .populate('driver', 'firstName surname phone averageRating');

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        vehicle
      }
    });
  } catch (error) {
    console.error('Get vehicle error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Create vehicle (driver only)
// @route   POST /api/vehicles
// @access  Private (Driver only)
router.post('/', protect, authorize('driver'), [
  body('make')
    .trim()
    .notEmpty()
    .withMessage('Vehicle make is required')
    .isLength({ max: 50 })
    .withMessage('Make cannot exceed 50 characters'),
  body('model')
    .trim()
    .notEmpty()
    .withMessage('Vehicle model is required')
    .isLength({ max: 50 })
    .withMessage('Model cannot exceed 50 characters'),
  body('year')
    .isInt({ min: 2000, max: new Date().getFullYear() + 1 })
    .withMessage('Year must be between 2000 and next year'),
  body('color')
    .trim()
    .notEmpty()
    .withMessage('Vehicle color is required')
    .isLength({ max: 30 })
    .withMessage('Color cannot exceed 30 characters'),
  body('vehicleNumber')
    .matches(/^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/)
    .withMessage('Please enter a valid vehicle number (e.g., MH12AB1234)'),
  body('vehicleType')
    .isIn(['sedan', 'suv', 'hatchback', 'compact'])
    .withMessage('Vehicle type must be sedan, suv, hatchback, or compact'),
  body('totalSeats')
    .isIn([4, 7])
    .withMessage('Total seats must be either 4 or 7'),
  body('fuelType')
    .isIn(['petrol', 'diesel', 'cng', 'electric'])
    .withMessage('Fuel type must be petrol, diesel, cng, or electric'),
  body('rcNumber')
    .trim()
    .notEmpty()
    .withMessage('RC number is required'),
  body('insuranceValidUntil')
    .isISO8601()
    .withMessage('Please provide a valid insurance expiry date'),
  body('pucValidUntil')
    .isISO8601()
    .withMessage('Please provide a valid PUC expiry date')
], handleValidationErrors, async (req, res) => {
  try {
    const vehicleData = {
      ...req.body,
      driver: req.user._id
    };

    const vehicle = await Vehicle.create(vehicleData);

    res.status(201).json({
      success: true,
      message: 'Vehicle created successfully',
      data: {
        vehicle
      }
    });
  } catch (error) {
    console.error('Create vehicle error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Update vehicle (driver only)
// @route   PUT /api/vehicles/:id
// @access  Private (Driver only)
router.put('/:id', protect, authorize('driver'), [
  body('make')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Make cannot be empty')
    .isLength({ max: 50 })
    .withMessage('Make cannot exceed 50 characters'),
  body('model')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Model cannot be empty')
    .isLength({ max: 50 })
    .withMessage('Model cannot exceed 50 characters'),
  body('year')
    .optional()
    .isInt({ min: 2000, max: new Date().getFullYear() + 1 })
    .withMessage('Year must be between 2000 and next year'),
  body('color')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Color cannot be empty')
    .isLength({ max: 30 })
    .withMessage('Color cannot exceed 30 characters'),
  body('vehicleNumber')
    .optional()
    .matches(/^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/)
    .withMessage('Please enter a valid vehicle number (e.g., MH12AB1234)'),
  body('vehicleType')
    .optional()
    .isIn(['sedan', 'suv', 'hatchback', 'compact'])
    .withMessage('Vehicle type must be sedan, suv, hatchback, or compact'),
  body('totalSeats')
    .optional()
    .isIn([4, 7])
    .withMessage('Total seats must be either 4 or 7'),
  body('fuelType')
    .optional()
    .isIn(['petrol', 'diesel', 'cng', 'electric'])
    .withMessage('Fuel type must be petrol, diesel, cng, or electric'),
  body('rcNumber')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('RC number cannot be empty'),
  body('insuranceValidUntil')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid insurance expiry date'),
  body('pucValidUntil')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid PUC expiry date'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('Active status must be a boolean')
], handleValidationErrors, async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      driver: req.user._id
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found or you do not have permission to update it'
      });
    }

    const updatedVehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('driver', 'firstName surname phone');

    res.status(200).json({
      success: true,
      message: 'Vehicle updated successfully',
      data: {
        vehicle: updatedVehicle
      }
    });
  } catch (error) {
    console.error('Update vehicle error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Delete vehicle (driver only)
// @route   DELETE /api/vehicles/:id
// @access  Private (Driver only)
router.delete('/:id', protect, authorize('driver'), async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      driver: req.user._id
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found or you do not have permission to delete it'
      });
    }

    // Check if vehicle has active rides
    const Ride = require('../models/Ride');
    const activeRides = await Ride.countDocuments({
      vehicle: vehicle._id,
      status: { $in: ['active', 'booked'] }
    });

    if (activeRides > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete vehicle with active rides'
      });
    }

    // Soft delete - mark as inactive
    vehicle.isActive = false;
    await vehicle.save();

    res.status(200).json({
      success: true,
      message: 'Vehicle deleted successfully'
    });
  } catch (error) {
    console.error('Delete vehicle error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
