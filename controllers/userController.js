const User = require('../models/User');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Ride = require('../models/Ride');

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: user.getProfile()
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { firstName, surname, profileImage } = req.body;
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update allowed fields
    if (firstName) user.firstName = firstName;
    if (surname) user.surname = surname;
    if (profileImage !== undefined) user.profileImage = profileImage;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: user.getProfile()
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get passenger dashboard stats
// @route   GET /api/users/dashboard
// @access  Private
const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));

    // Get passenger stats
    const [
      totalRides,
      upcomingRides,
      completedRides,
      totalMoneySaved,
      upcomingRidesList
    ] = await Promise.allSettled([
      // Total rides (all bookings)
      Booking.countDocuments({ passenger: userId }).catch(() => 0),
      // Upcoming rides (confirmed/booked rides)
      Booking.countDocuments({ 
        passenger: userId, 
        status: { $in: ['confirmed', 'booked'] },
        'ride.date': { $gte: startOfDay }
      }).catch(() => 0),
      // Completed rides
      Booking.countDocuments({ 
        passenger: userId, 
        status: 'completed' 
      }).catch(() => 0),
      // Total money saved (calculated from completed rides)
      Payment.aggregate([
        { $match: { passenger: userId, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]).catch(() => [{ total: 0 }]),
      // Upcoming rides list
      Booking.find({ 
        passenger: userId, 
        status: { $in: ['confirmed', 'booked'] },
        'ride.date': { $gte: startOfDay }
      })
        .populate({
          path: 'ride',
          populate: {
            path: 'driver vehicle',
            select: 'firstName surname phone make model vehicleNumber'
          }
        })
        .sort({ 'ride.date': 1, 'ride.time': 1 })
        .limit(5)
        .catch(() => [])
    ]);

    const stats = {
      totalRides: totalRides.status === 'fulfilled' ? totalRides.value : 0,
      upcoming: upcomingRides.status === 'fulfilled' ? upcomingRides.value : 0,
      completed: completedRides.status === 'fulfilled' ? completedRides.value : 0,
      moneySaved: totalMoneySaved.status === 'fulfilled' ? totalMoneySaved.value[0]?.total || 0 : 0,
      upcomingRides: upcomingRidesList.status === 'fulfilled' ? upcomingRidesList.value : []
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get ride history
// @route   GET /api/users/rides
// @access  Private
const getRideHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    let query = { passenger: req.user._id };
    
    if (status) {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      .populate({
        path: 'ride',
        populate: {
          path: 'driver vehicle',
          select: 'firstName surname phone make model vehicleNumber'
        }
      })
      .populate('payment')
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
    console.error('Get ride history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get payment history
// @route   GET /api/users/payments
// @access  Private
const getPaymentHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    let query = { passenger: req.user._id };
    
    if (status) {
      query.status = status;
    }

    const payments = await Payment.find(query)
      .populate({
        path: 'booking',
        populate: {
          path: 'ride',
          select: 'source destination date time'
        }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Payment.countDocuments(query);

    // Calculate statistics
    const stats = await Payment.aggregate([
      { $match: { passenger: req.user._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        payments,
        stats: stats.reduce((acc, stat) => {
          acc[stat._id] = {
            count: stat.count,
            totalAmount: stat.totalAmount
          };
          return acc;
        }, {}),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get user notifications (placeholder)
// @route   GET /api/users/notifications
// @access  Private
const getNotifications = async (req, res) => {
  try {
    // This is a placeholder - in a real app, you'd have a Notification model
    const notifications = [
      {
        id: 1,
        type: 'booking_confirmed',
        title: 'Booking Confirmed',
        message: 'Your ride booking has been confirmed',
        timestamp: new Date(),
        read: false
      },
      {
        id: 2,
        type: 'payment_completed',
        title: 'Payment Completed',
        message: 'Your payment has been processed successfully',
        timestamp: new Date(Date.now() - 3600000),
        read: true
      }
    ];

    res.status(200).json({
      success: true,
      data: {
        notifications,
        unreadCount: notifications.filter(n => !n.read).length
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Mark notification as read (placeholder)
// @route   PUT /api/users/notifications/:id/read
// @access  Private
const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    
    // This is a placeholder - in a real app, you'd update the notification in database
    
    res.status(200).json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete user account
// @route   DELETE /api/users/account
// @access  Private
const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;
    
    const user = await User.findById(req.user._id).select('+password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Check for active bookings
    const activeBookings = await Booking.find({
      passenger: user._id,
      status: { $in: ['pending', 'confirmed'] }
    });

    if (activeBookings.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete account with active bookings'
      });
    }

    // Soft delete - mark as blocked instead of deleting
    user.isBlocked = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getDashboardStats,
  getRideHistory,
  getPaymentHistory,
  getNotifications,
  markNotificationRead,
  deleteAccount
};
