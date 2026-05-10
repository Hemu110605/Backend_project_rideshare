const Review = require('../models/Review');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');

// @desc    Create review
// @route   POST /api/reviews
// @access  Private
const createReview = async (req, res) => {
  try {
    const { bookingId, rating, comment, aspects, tags } = req.body;

    // Get booking
    const booking = await Booking.findById(bookingId).populate('ride passenger driver vehicle');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check permissions
    if (booking.passenger._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only passenger can review'
      });
    }

    // Check booking status
    if (booking.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Can only review completed bookings'
      });
    }

    // Check if review already exists
    const existingReview = await Review.findOne({ booking: bookingId });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'Review already exists for this booking'
      });
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    // Create review
    const review = await Review.create({
      ride: booking.ride._id,
      booking: bookingId,
      reviewer: req.user._id,
      reviewee: booking.driver._id,
      vehicle: booking.vehicle._id,
      rating,
      comment,
      aspects,
      tags
    });

    // Update driver rating
    const driver = await User.findById(booking.driver._id);
    const driverStats = await Review.calculateAverageRating(booking.driver._id);
    // In a real implementation, you would store these stats in the user model
    // For now, we'll just update the review count

    // Update vehicle rating
    await booking.vehicle.updateRating(rating);

    // Update ride rating
    await booking.ride.updateRating(rating);

    // Populate review details
    await review.populate([
      { path: 'ride', select: 'source destination date time' },
      { path: 'reviewer', select: 'firstName surname profileImage' },
      { path: 'reviewee', select: 'firstName surname phone' },
      { path: 'vehicle', select: 'make model vehicleNumber' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: {
        review
      }
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get review by ID
// @route   GET /api/reviews/:id
// @access  Public
const getReviewById = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate({
        path: 'ride',
        select: 'source destination date time'
      })
      .populate({
        path: 'reviewer',
        select: 'firstName surname profileImage'
      })
      .populate({
        path: 'reviewee',
        select: 'firstName surname phone averageRating'
      })
      .populate({
        path: 'vehicle',
        select: 'make model vehicleNumber vehicleType'
      });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Don't show private reviews to public
    if (!review.isPublic && (!req.user || req.user._id.toString() !== review.reviewer._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'This review is private'
      });
    }

    // Don't show reported reviews
    if (review.reported && (!req.user || req.user.role !== 'admin')) {
      return res.status(403).json({
        success: false,
        message: 'This review has been reported'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        review
      }
    });
  } catch (error) {
    console.error('Get review by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get reviews for user
// @route   GET /api/reviews/user/:userId
// @access  Public
const getUserReviews = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10, rating } = req.query;
    const skip = (page - 1) * limit;

    let query = {
      reviewee: userId,
      isPublic: true,
      reported: false
    };

    if (rating) {
      query.rating = parseInt(rating);
    }

    const reviews = await Review.find(query)
      .populate({
        path: 'ride',
        select: 'source destination date time'
      })
      .populate({
        path: 'reviewer',
        select: 'firstName surname profileImage'
      })
      .populate({
        path: 'vehicle',
        select: 'make model vehicleNumber vehicleType'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Review.countDocuments(query);

    // Get rating statistics
    const stats = await Review.calculateAverageRating(userId);

    res.status(200).json({
      success: true,
      data: {
        reviews,
        stats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get user reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get reviews for vehicle
// @route   GET /api/reviews/vehicle/:vehicleId
// @access  Public
const getVehicleReviews = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { page = 1, limit = 10, rating } = req.query;
    const skip = (page - 1) * limit;

    let query = {
      vehicle: vehicleId,
      isPublic: true,
      reported: false
    };

    if (rating) {
      query.rating = parseInt(rating);
    }

    const reviews = await Review.find(query)
      .populate({
        path: 'ride',
        select: 'source destination date time'
      })
      .populate({
        path: 'reviewer',
        select: 'firstName surname profileImage'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Review.countDocuments(query);

    // Get vehicle rating statistics
    const vehicleStats = await Review.getVehicleRatings(vehicleId);

    res.status(200).json({
      success: true,
      data: {
        reviews,
        vehicleStats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get vehicle reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get user's own reviews
// @route   GET /api/reviews/my-reviews
// @access  Private
const getMyReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const reviews = await Review.find({ reviewer: req.user._id })
      .populate({
        path: 'ride',
        select: 'source destination date time'
      })
      .populate({
        path: 'reviewee',
        select: 'firstName surname phone'
      })
      .populate({
        path: 'vehicle',
        select: 'make model vehicleNumber vehicleType'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Review.countDocuments({ reviewer: req.user._id });

    res.status(200).json({
      success: true,
      data: {
        reviews,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get my reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Add response to review
// @route   POST /api/reviews/:id/respond
// @access  Private (Driver only)
const respondToReview = async (req, res) => {
  try {
    const { text } = req.body;
    const reviewId = req.params.id;

    const review = await Review.findById(reviewId).populate('reviewee');

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user is the reviewee (driver)
    if (review.reviewee._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the reviewed user can respond'
      });
    }

    // Check if response already exists
    if (review.response && review.response.text) {
      return res.status(400).json({
        success: false,
        message: 'Response already exists'
      });
    }

    // Add response
    await review.addResponse(text);

    await review.populate([
      { path: 'reviewer', select: 'firstName surname profileImage' },
      { path: 'reviewee', select: 'firstName surname phone' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Response added successfully',
      data: {
        review
      }
    });
  } catch (error) {
    console.error('Respond to review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Report review
// @route   POST /api/reviews/:id/report
// @access  Private
const reportReview = async (req, res) => {
  try {
    const { reason } = req.body;
    const reviewId = req.params.id;

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Don't allow reporting own reviews
    if (review.reviewer.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot report your own review'
      });
    }

    // Report review
    await review.reportReview(reason, req.user._id);

    res.status(200).json({
      success: true,
      message: 'Review reported successfully'
    });
  } catch (error) {
    console.error('Report review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update review privacy
// @route   PUT /api/reviews/:id/privacy
// @access  Private (Reviewer only)
const updateReviewPrivacy = async (req, res) => {
  try {
    const { isPublic } = req.body;
    const reviewId = req.params.id;

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user is the reviewer
    if (review.reviewer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the reviewer can update privacy'
      });
    }

    review.isPublic = isPublic;
    await review.save();

    res.status(200).json({
      success: true,
      message: `Review is now ${isPublic ? 'public' : 'private'}`,
      data: {
        review
      }
    });
  } catch (error) {
    console.error('Update review privacy error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  createReview,
  getReviewById,
  getUserReviews,
  getVehicleReviews,
  getMyReviews,
  respondToReview,
  reportReview,
  updateReviewPrivacy
};
