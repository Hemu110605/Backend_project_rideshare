const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const Ride = require('../models/Ride');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Review = require('../models/Review');

// @desc    Get dashboard analytics
// @route   GET /api/admin/dashboard
// @access  Private (Admin only)
const getDashboardAnalytics = async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Safe aggregation with fallbacks
    const [
      totalUsers,
      totalDrivers,
      totalRides,
      totalBookings,
      totalRevenue,
      activeRides,
      pendingBookings,
      completedRides,
      cancelledBookings,
      todayRides,
      todayRevenue,
      todayUsers,
      weeklyRevenue,
      monthlyRevenue,
      topCities,
      vehicleDistribution,
      monthlyTrend,
      growthStats
    ] = await Promise.allSettled([
      User.countDocuments({ role: 'user' }).catch(() => 0),
      User.countDocuments({ role: 'driver' }).catch(() => 0),
      Ride.countDocuments().catch(() => 0),
      Booking.countDocuments().catch(() => 0),
      Payment.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]).catch(() => [{ total: 0 }]),
      Ride.countDocuments({ status: 'ongoing' }).catch(() => 0),
      Booking.countDocuments({ status: 'pending' }).catch(() => 0),
      Ride.countDocuments({ status: 'completed' }).catch(() => 0),
      Booking.countDocuments({ status: 'cancelled' }).catch(() => 0),
      Ride.countDocuments({ createdAt: { $gte: startOfDay } }).catch(() => 0),
      Payment.aggregate([
        { $match: { status: 'completed', completedAt: { $gte: startOfDay } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]).catch(() => [{ total: 0 }]),
      User.countDocuments({ createdAt: { $gte: startOfDay }, role: 'user' }).catch(() => 0),
      Payment.aggregate([
        { $match: { status: 'completed', completedAt: { $gte: startOfWeek } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]).catch(() => [{ total: 0 }]),
      Payment.aggregate([
        { $match: { status: 'completed', completedAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]).catch(() => [{ total: 0 }]),
      Ride.aggregate([
        { $group: { _id: '$source', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $project: { name: '$_id', rides: '$count', _id: 0 } }
      ]).catch(() => []),
      Ride.aggregate([
        { $group: { _id: '$vehicleType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { name: '$_id', value: '$count', _id: 0 } }
      ]).catch(() => []),
      getMonthlyTrend().catch(() => []),
      getGrowthStats().catch(() => ({ users: 0, drivers: 0, rides: 0, revenue: 0 }))
    ]);

    // Extract values with safe fallbacks
    const data = {
      totalUsers: totalUsers.status === 'fulfilled' ? totalUsers.value : 0,
      totalDrivers: totalDrivers.status === 'fulfilled' ? totalDrivers.value : 0,
      totalRides: totalRides.status === 'fulfilled' ? totalRides.value : 0,
      totalBookings: totalBookings.status === 'fulfilled' ? totalBookings.value : 0,
      totalRevenue: totalRevenue.status === 'fulfilled' && totalRevenue.value[0] ? totalRevenue.value[0].total : 0,
      activeRides: activeRides.status === 'fulfilled' ? activeRides.value : 0,
      pendingBookings: pendingBookings.status === 'fulfilled' ? pendingBookings.value : 0,
      completedRides: completedRides.status === 'fulfilled' ? completedRides.value : 0,
      cancelledBookings: cancelledBookings.status === 'fulfilled' ? cancelledBookings.value : 0,
      todayRides: todayRides.status === 'fulfilled' ? todayRides.value : 0,
      todayRevenue: todayRevenue.status === 'fulfilled' && todayRevenue.value[0] ? todayRevenue.value[0].total : 0,
      todayUsers: todayUsers.status === 'fulfilled' ? todayUsers.value : 0,
      weeklyRevenue: weeklyRevenue.status === 'fulfilled' && weeklyRevenue.value[0] ? weeklyRevenue.value[0].total : 0,
      monthlyRevenue: monthlyRevenue.status === 'fulfilled' && monthlyRevenue.value[0] ? monthlyRevenue.value[0].total : 0,
      topCities: topCities.status === 'fulfilled' ? topCities.value : [],
      vehicleTypes: vehicleDistribution.status === 'fulfilled' ? vehicleDistribution.value : [],
      monthlyTrend: monthlyTrend.status === 'fulfilled' ? monthlyTrend.value : [],
      growth: growthStats.status === 'fulfilled' ? growthStats.value : { users: 0, drivers: 0, rides: 0, revenue: 0 }
    };

    // Get recent activity with safe fallbacks
    const [recentUsers, recentBookings, recentPayments] = await Promise.allSettled([
      User.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('firstName surname email role createdAt')
        .catch(() => []),
      Booking.find()
        .populate('passenger driver', 'firstName surname')
        .populate('rideId', 'source destination')
        .sort({ createdAt: -1 })
        .limit(5)
        .catch(() => []),
      Payment.find()
        .populate('passenger driver', 'firstName surname')
        .sort({ createdAt: -1 })
        .limit(5)
        .catch(() => [])
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalUsers: data.totalUsers,
          totalDrivers: data.totalDrivers,
          totalRides: data.totalRides,
          totalBookings: data.totalBookings,
          totalRevenue: data.totalRevenue,
          activeRides: data.activeRides,
          pendingBookings: data.pendingBookings,
          completedRides: data.completedRides,
          cancelledBookings: data.cancelledBookings,
          todayRides: data.todayRides,
          todayRevenue: data.todayRevenue,
          activeNow: data.activeRides,
          pendingApprovals: data.pendingBookings,
          completedToday: data.todayRides,
          cancelledToday: Booking.countDocuments({ 
            status: 'cancelled', 
            createdAt: { $gte: startOfDay } 
          }).catch(() => 0)
        },
        recentActivity: {
          users: recentUsers.status === 'fulfilled' ? recentUsers.value : [],
          bookings: recentBookings.status === 'fulfilled' ? recentBookings.value : [],
          payments: recentPayments.status === 'fulfilled' ? recentPayments.value : []
        },
        analytics: {
          monthlyTrend: data.monthlyTrend,
          rideVolume: data.monthlyTrend,
          vehicleTypes: data.vehicleTypes
        },
        topCities: data.topCities,
        growth: data.growth
      }
    });
  } catch (error) {
    console.error('Get dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin only)
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, isBlocked, search } = req.query;
    const skip = (page - 1) * limit;

    let query = {};

    if (role) {
      query.role = role;
    }

    if (isBlocked !== undefined) {
      query.isBlocked = isBlocked === 'true';
    }

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { surname: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get all drivers
// @route   GET /api/admin/drivers
// @access  Private (Admin only)
const getAllDrivers = async (req, res) => {
  try {
    const { page = 1, limit = 10, isBlocked, search } = req.query;
    const skip = (page - 1) * limit;

    let query = { role: 'driver' };

    if (isBlocked !== undefined) {
      query.isBlocked = isBlocked === 'true';
    }

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { surname: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const drivers = await User.find(query)
      .populate('vehicles', 'make model vehicleNumber isActive')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        drivers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all drivers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get all rides
// @route   GET /api/admin/rides
// @access  Private (Admin only)
const getAllRides = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, driver, search } = req.query;
    const skip = (page - 1) * limit;

    let query = {};

    if (status) {
      query.status = status;
    }

    if (driver) {
      query.driver = driver;
    }

    if (search) {
      query.$or = [
        { source: { $regex: search, $options: 'i' } },
        { destination: { $regex: search, $options: 'i' } }
      ];
    }

    const rides = await Ride.find(query)
      .populate('driver', 'firstName surname phone')
      .populate('vehicle', 'make model vehicleNumber')
      .sort({ createdAt: -1 })
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
    console.error('Get all rides error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get all bookings
// @route   GET /api/admin/bookings
// @access  Private (Admin only)
const getAllBookings = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, passenger, driver, search } = req.query;
    const skip = (page - 1) * limit;

    let query = {};

    if (status) {
      query.status = status;
    }

    if (passenger) {
      query.passenger = passenger;
    }

    if (driver) {
      query.driver = driver;
    }

    if (search) {
      query.$or = [
        { pickupLocation: { $regex: search, $options: 'i' } },
        { dropLocation: { $regex: search, $options: 'i' } }
      ];
    }

    const bookings = await Booking.find(query)
      .populate('passenger', 'firstName surname phone')
      .populate('driver', 'firstName surname phone')
      .populate('ride', 'source destination date time')
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
    console.error('Get all bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Block/unblock user
// @route   PUT /api/admin/users/:id/block
// @access  Private (Admin only)
const blockUser = async (req, res) => {
  try {
    const { isBlocked, reason } = req.body;
    const userId = req.params.id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent admin from blocking themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot block yourself'
      });
    }

    user.isBlocked = isBlocked;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${isBlocked ? 'blocked' : 'unblocked'} successfully`,
      data: {
        user: user.getProfile()
      }
    });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin only)
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete yourself'
      });
    }

    // Check for active bookings
    const activeBookings = await Booking.countDocuments({
      $or: [{ passenger: userId }, { driver: userId }],
      status: { $in: ['pending', 'confirmed'] }
    });

    if (activeBookings > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete user with active bookings'
      });
    }

    // Soft delete - mark as blocked
    user.isBlocked = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get payment statistics
// @route   GET /api/admin/payments/stats
// @access  Private (Admin only)
const getPaymentStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const stats = await Payment.getPaymentStats(
      startDate ? new Date(startDate) : new Date(0),
      endDate ? new Date(endDate) : new Date()
    );

    // Get revenue trends
    const revenueTrends = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          completedAt: {
            $gte: startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 12)),
            $lte: endDate ? new Date(endDate) : new Date()
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$completedAt' },
            month: { $month: '$completedAt' }
          },
          revenue: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        stats,
        revenueTrends
      }
    });
  } catch (error) {
    console.error('Get payment stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Helper function to get monthly trend
const getMonthlyTrend = async () => {
  const currentYear = new Date().getFullYear();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const monthlyData = await Promise.all(
    Array.from({ length: 6 }, async (_, i) => {
      const monthIndex = new Date().getMonth() - i;
      const targetDate = new Date(currentYear, monthIndex, 1);
      const nextMonth = new Date(currentYear, monthIndex + 1, 1);
      
      const [rides, revenue] = await Promise.all([
        Ride.countDocuments({
          createdAt: { $gte: targetDate, $lt: nextMonth }
        }).catch(() => 0),
        Payment.aggregate([
          { $match: { status: 'completed', completedAt: { $gte: targetDate, $lt: nextMonth } } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]).catch(() => [{ total: 0 }])
      ]);
      
      return {
        month: months[monthIndex] || `Month ${i + 1}`,
        rides: rides,
        revenue: revenue[0]?.total || 0
      };
    })
  );
  
  return monthlyData.reverse();
};

// Helper function to get growth statistics
const getGrowthStats = async () => {
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  
  const [
    currentUsers,
    lastMonthUsers,
    currentDrivers,
    lastMonthDrivers,
    currentRides,
    lastMonthRides,
    currentRevenue,
    lastMonthRevenue
  ] = await Promise.all([
    User.countDocuments({ 
      createdAt: { $gte: lastMonth },
      role: 'user' 
    }).catch(() => 0),
    User.countDocuments({ 
      createdAt: { $gte: twoMonthsAgo, $lt: lastMonth },
      role: 'user' 
    }).catch(() => 0),
    User.countDocuments({ 
      createdAt: { $gte: lastMonth },
      role: 'driver' 
    }).catch(() => 0),
    User.countDocuments({ 
      createdAt: { $gte: twoMonthsAgo, $lt: lastMonth },
      role: 'driver' 
    }).catch(() => 0),
    Ride.countDocuments({ 
      createdAt: { $gte: lastMonth } 
    }).catch(() => 0),
    Ride.countDocuments({ 
      createdAt: { $gte: twoMonthsAgo, $lt: lastMonth } 
    }).catch(() => 0),
    Payment.aggregate([
      { $match: { status: 'completed', completedAt: { $gte: lastMonth } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]).catch(() => [{ total: 0 }]),
    Payment.aggregate([
      { $match: { status: 'completed', completedAt: { $gte: twoMonthsAgo, $lt: lastMonth } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]).catch(() => [{ total: 0 }])
  ]);
  
  const calculateGrowth = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };
  
  return {
    users: calculateGrowth(currentUsers, lastMonthUsers),
    drivers: calculateGrowth(currentDrivers, lastMonthDrivers),
    rides: calculateGrowth(currentRides, lastMonthRides),
    revenue: calculateGrowth(
      currentRevenue[0]?.total || 0, 
      lastMonthRevenue[0]?.total || 0
    )
  };
};

// Helper function to get monthly statistics
const getMonthlyStats = async () => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [
    monthlyUsers,
    monthlyRides,
    monthlyBookings,
    monthlyRevenue
  ] = await Promise.all([
    User.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(currentYear, currentMonth - 1, 1),
            $lt: new Date(currentYear, currentMonth, 1)
          }
        }
      },
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]),
    Ride.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(currentYear, currentMonth - 1, 1),
            $lt: new Date(currentYear, currentMonth, 1)
          }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]),
    Booking.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(currentYear, currentMonth - 1, 1),
            $lt: new Date(currentYear, currentMonth, 1)
          }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]),
    Payment.aggregate([
      {
        $match: {
          status: 'completed',
          completedAt: {
            $gte: new Date(currentYear, currentMonth - 1, 1),
            $lt: new Date(currentYear, currentMonth, 1)
          }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' }
        }
      }
    ])
  ]);

  return {
    users: monthlyUsers.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {}),
    rides: monthlyRides.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {}),
    bookings: monthlyBookings.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {}),
    revenue: monthlyRevenue[0]?.total || 0
  };
};

module.exports = {
  getDashboardAnalytics,
  getAllUsers,
  getAllDrivers,
  getAllRides,
  getAllBookings,
  blockUser,
  deleteUser,
  getPaymentStats
};
