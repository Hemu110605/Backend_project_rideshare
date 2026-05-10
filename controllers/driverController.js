const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const Ride = require('../models/Ride');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Review = require('../models/Review');

// @desc    Get driver profile
// @route   GET /api/drivers/profile
// @access  Private (Driver only)
const getDriverProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user || !user.isDriver) {
      return res.status(403).json({
        success: false,
        message: 'Driver profile not found'
      });
    }

    // Get driver's vehicles
    const vehicles = await Vehicle.find({ driver: user._id, isActive: true });
    
    // Get driver stats
    const stats = await getDriverStats(user._id);

    res.status(200).json({
      success: true,
      data: {
        user: user.getProfile(),
        vehicles,
        stats
      }
    });
  } catch (error) {
    console.error('Get driver profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Add vehicle
// @route   POST /api/drivers/vehicles
// @access  Private (Driver only)
const addVehicle = async (req, res) => {
  try {
    const vehicleData = {
      ...req.body,
      driver: req.user._id
    };

    const vehicle = await Vehicle.create(vehicleData);

    res.status(201).json({
      success: true,
      message: 'Vehicle added successfully',
      data: {
        vehicle
      }
    });
  } catch (error) {
    console.error('Add vehicle error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update vehicle
// @route   PUT /api/drivers/vehicles/:id
// @access  Private (Driver only)
const updateVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      driver: req.user._id
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    const updatedVehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

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
};

// @desc    List driver vehicles
// @route   GET /api/drivers/vehicles
// @access  Private (Driver only)
const listVehicles = async (req, res) => {
  try {
    const { page = 1, limit = 10, isActive } = req.query;
    const skip = (page - 1) * limit;

    let query = { driver: req.user._id };
    
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const vehicles = await Vehicle.find(query)
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
    console.error('List vehicles error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Post rides
// @route   POST /api/drivers/rides
// @access  Private (Driver only)
const postRide = async (req, res) => {
  try {
    const rideData = {
      ...req.body,
      driver: req.user._id
    };

    // Calculate fare if not provided
    const ride = new Ride(rideData);
    ride.calculateFare();
    await ride.save();

    res.status(201).json({
      success: true,
      message: 'Ride posted successfully',
      data: {
        ride
      }
    });
  } catch (error) {
    console.error('Post ride error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get driver rides
// @route   GET /api/drivers/rides
// @access  Private (Driver only)
const getDriverRides = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    let query = { driver: req.user._id };
    
    if (status) {
      query.status = status;
    }

    const rides = await Ride.find(query)
      .populate('vehicle')
      .populate('bookings')
      .sort({ date: -1, time: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Ride.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        rides,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get driver rides error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Manage bookings
// @route   GET /api/drivers/bookings
// @access  Private (Driver only)
const getDriverBookings = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    let query = { driver: req.user._id };
    
    if (status) {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      .populate({
        path: 'ride',
        select: 'source destination date time vehicle'
      })
      .populate('passenger', 'firstName surname phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Booking.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        bookings,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get driver bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get earnings summary
// @route   GET /api/drivers/earnings
// @access  Private (Driver only)
const getEarningsSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        completedAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }

    const earnings = await Payment.aggregate([
      {
        $match: {
          driver: req.user._id,
          status: 'completed',
          ...dateFilter
        }
      },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$amount' },
          totalRides: { $sum: 1 },
          averagePerRide: { $avg: '$amount' },
          totalPlatformFee: { $sum: '$platformFee' },
          totalGST: { $sum: '$gst' }
        }
      }
    ]);

    const monthlyEarnings = await Payment.aggregate([
      {
        $match: {
          driver: req.user._id,
          status: 'completed'
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$completedAt' },
            month: { $month: '$completedAt' }
          },
          earnings: { $sum: '$amount' },
          rides: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': -1, '_id.month': -1 }
      },
      {
        $limit: 12
      }
    ]);

    const summary = earnings[0] || {
      totalEarnings: 0,
      totalRides: 0,
      averagePerRide: 0,
      totalPlatformFee: 0,
      totalGST: 0
    };

    res.status(200).json({
      success: true,
      data: {
        summary,
        monthlyEarnings
      }
    });
  } catch (error) {
    console.error('Get earnings summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get dashboard stats
// @route   GET /api/drivers/dashboard
// @access  Private (Driver only)
const getDashboardStats = async (req, res) => {
  try {
    const stats = await getDriverStats(req.user._id);

    // Get recent rides
    const recentRides = await Ride.find({ driver: req.user._id })
      .populate('vehicle')
      .sort({ date: -1, time: -1 })
      .limit(5);

    // Get recent bookings
    const recentBookings = await Booking.find({ driver: req.user._id })
      .populate('passenger', 'firstName surname')
      .populate('ride', 'source destination date time')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        stats,
        recentRides,
        recentBookings
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Helper function to get driver stats
const getDriverStats = async (driverId) => {
  const [
    totalRides,
    activeRides,
    completedRides,
    totalBookings,
    pendingBookings,
    confirmedBookings,
    totalEarnings,
    averageRating,
    totalReviews
  ] = await Promise.all([
    Ride.countDocuments({ driver: driverId }),
    Ride.countDocuments({ driver: driverId, status: 'active' }),
    Ride.countDocuments({ driver: driverId, status: 'completed' }),
    Booking.countDocuments({ driver: driverId }),
    Booking.countDocuments({ driver: driverId, status: 'pending' }),
    Booking.countDocuments({ driver: driverId, status: 'confirmed' }),
    Payment.aggregate([
      { $match: { driver: driverId, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    Review.aggregate([
      { $match: { reviewee: driverId, isPublic: true, reported: false } },
      { $group: { _id: null, avgRating: { $avg: '$rating' } } }
    ]),
    Review.countDocuments({ reviewee: driverId, isPublic: true, reported: false })
  ]);

  return {
    totalRides,
    activeRides,
    completedRides,
    totalBookings,
    pendingBookings,
    confirmedBookings,
    totalEarnings: totalEarnings[0]?.total || 0,
    averageRating: averageRating[0]?.avgRating || 0,
    totalReviews
  };
};

module.exports = {
  getDriverProfile,
  addVehicle,
  updateVehicle,
  listVehicles,
  postRide,
  getDriverRides,
  getDriverBookings,
  getEarningsSummary,
  getDashboardStats
};
