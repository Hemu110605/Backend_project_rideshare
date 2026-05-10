const Negotiation = require('../models/Negotiation');
const Booking = require('../models/Booking');
const Ride = require('../models/Ride');

// @desc    Initiate negotiation
// @route   POST /api/negotiations/initiate
// @access  Private (Passenger only)
const initiateNegotiation = async (req, res) => {
  try {
    const { bookingId, proposedFare, message } = req.body;

    // Get booking
    const booking = await Booking.findById(bookingId).populate('ride driver passenger');

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
        message: 'Only passenger can initiate negotiation'
      });
    }

    // Check booking status
    if (booking.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Negotiation can only be initiated for pending bookings'
      });
    }

    // Check if negotiation already exists
    let negotiation = await Negotiation.findOne({ booking: bookingId });

    if (negotiation) {
      if (negotiation.status !== 'rejected' && negotiation.status !== 'expired') {
        return res.status(400).json({
          success: false,
          message: 'Negotiation already exists for this booking'
        });
      }
    }

    // Validate proposed fare
    if (proposedFare >= booking.totalFare) {
      return res.status(400).json({
        success: false,
        message: 'Proposed fare must be less than original fare'
      });
    }

    if (proposedFare < booking.totalFare * 0.5) {
      return res.status(400).json({
        success: false,
        message: 'Proposed fare cannot be less than 50% of original fare'
      });
    }

    // Create or update negotiation
    if (negotiation) {
      // Reset expired/rejected negotiation
      negotiation.status = 'requested';
      negotiation.originalFare = booking.totalFare;
      negotiation.currentFare = proposedFare;
      negotiation.messages = [];
      negotiation.initiatedBy = req.user._id;
      negotiation.expiresAt = new Date(Date.now() + 3600000); // 1 hour
      negotiation.finalFare = undefined;
      negotiation.acceptedAt = undefined;
      negotiation.rejectedAt = undefined;
      negotiation.rejectedBy = undefined;
      negotiation.rejectionReason = undefined;
    } else {
      negotiation = await Negotiation.create({
        booking: bookingId,
        ride: booking.ride._id,
        passenger: booking.passenger._id,
        driver: booking.driver._id,
        originalFare: booking.totalFare,
        currentFare: proposedFare,
        initiatedBy: req.user._id
      });
    }

    // Add initial message
    await negotiation.addMessage(req.user._id, message || `I would like to propose a fare of ${proposedFare}`, proposedFare);

    // Update booking negotiation status
    booking.negotiationStatus = 'requested';
    booking.negotiationId = negotiation._id;
    await booking.save();

    // Populate negotiation details
    await negotiation.populate([
      { path: 'passenger', select: 'firstName surname phone' },
      { path: 'driver', select: 'firstName surname phone' },
      { path: 'ride', select: 'source destination date time' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Negotiation initiated successfully',
      data: {
        negotiation
      }
    });
  } catch (error) {
    console.error('Initiate negotiation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Respond to negotiation
// @route   POST /api/negotiations/:id/respond
// @access  Private
const respondToNegotiation = async (req, res) => {
  try {
    const { action, message, proposedFare } = req.body;
    const negotiationId = req.params.id;

    const negotiation = await Negotiation.findById(negotiationId)
      .populate('booking passenger driver ride');

    if (!negotiation) {
      return res.status(404).json({
        success: false,
        message: 'Negotiation not found'
      });
    }

    // Check permissions
    const isPassenger = negotiation.passenger._id.toString() === req.user._id.toString();
    const isDriver = negotiation.driver._id.toString() === req.user._id.toString();

    if (!isPassenger && !isDriver) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to respond to this negotiation'
      });
    }

    // Check negotiation status
    if (negotiation.status === 'accepted' || negotiation.status === 'rejected' || negotiation.status === 'expired') {
      return res.status(400).json({
        success: false,
        message: 'Negotiation is already closed'
      });
    }

    // Check if negotiation is expired
    if (negotiation.isExpired()) {
      negotiation.status = 'expired';
      await negotiation.save();
      
      // Update booking status
      negotiation.booking.negotiationStatus = 'expired';
      await negotiation.booking.save();

      return res.status(400).json({
        success: false,
        message: 'Negotiation has expired'
      });
    }

    let responseMessage = '';

    switch (action) {
      case 'accept':
        // Only driver can accept
        if (!isDriver) {
          return res.status(403).json({
            success: false,
            message: 'Only driver can accept negotiation'
          });
        }

        await negotiation.acceptNegotiation();
        responseMessage = 'Negotiation accepted successfully';

        // Update booking fare
        negotiation.booking.totalFare = negotiation.finalFare;
        negotiation.booking.platformFee = Math.round(negotiation.finalFare * 0.05);
        negotiation.booking.gst = Math.round((negotiation.finalFare + negotiation.booking.platformFee) * 0.18);
        negotiation.booking.finalAmount = negotiation.finalFare + negotiation.booking.platformFee + negotiation.booking.gst;
        negotiation.booking.negotiationStatus = 'accepted';
        await negotiation.booking.save();

        // Add acceptance message
        await negotiation.addMessage(req.user._id, message || 'I accept the negotiated fare');
        break;

      case 'reject':
        await negotiation.rejectNegotiation(req.user._id, message || 'Negotiation rejected');
        responseMessage = 'Negotiation rejected successfully';

        // Update booking status
        negotiation.booking.negotiationStatus = 'rejected';
        await negotiation.booking.save();

        // Add rejection message
        await negotiation.addMessage(req.user._id, message || 'I reject this negotiation');
        break;

      case 'counter':
        // Validate counter offer
        if (!proposedFare) {
          return res.status(400).json({
            success: false,
            message: 'Proposed fare is required for counter offer'
          });
        }

        // Validate counter fare logic
        if (isDriver && proposedFare <= negotiation.currentFare) {
          return res.status(400).json({
            success: false,
            message: 'Counter offer must be higher than current proposed fare'
          });
        }

        if (isPassenger && proposedFare >= negotiation.currentFare) {
          return res.status(400).json({
            success: false,
            message: 'Counter offer must be lower than current proposed fare'
          });
        }

        // Check bounds
        if (proposedFare < negotiation.originalFare * 0.5 || proposedFare > negotiation.originalFare) {
          return res.status(400).json({
            success: false,
            message: 'Counter offer must be between 50% and 100% of original fare'
          });
        }

        negotiation.status = 'countered';
        negotiation.currentFare = proposedFare;
        await negotiation.save();

        // Update booking status
        negotiation.booking.negotiationStatus = 'countered';
        await negotiation.booking.save();

        // Add counter message
        await negotiation.addMessage(req.user._id, message || `I propose a fare of ${proposedFare}`, proposedFare);
        responseMessage = 'Counter offer sent successfully';
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid action. Must be accept, reject, or counter'
        });
    }

    // Populate updated negotiation
    await negotiation.populate([
      { path: 'passenger', select: 'firstName surname phone' },
      { path: 'driver', select: 'firstName surname phone' },
      { path: 'ride', select: 'source destination date time' }
    ]);

    res.status(200).json({
      success: true,
      message: responseMessage,
      data: {
        negotiation
      }
    });
  } catch (error) {
    console.error('Respond to negotiation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get negotiation by ID
// @route   GET /api/negotiations/:id
// @access  Private
const getNegotiationById = async (req, res) => {
  try {
    const negotiation = await Negotiation.findById(req.params.id)
      .populate({
        path: 'messages.sender',
        select: 'firstName surname phone role'
      })
      .populate({
        path: 'booking',
        select: 'totalFare platformFee gst finalAmount'
      })
      .populate('passenger', 'firstName surname phone')
      .populate('driver', 'firstName surname phone')
      .populate('ride', 'source destination date time');

    if (!negotiation) {
      return res.status(404).json({
        success: false,
        message: 'Negotiation not found'
      });
    }

    // Check permissions
    const isPassenger = negotiation.passenger._id.toString() === req.user._id.toString();
    const isDriver = negotiation.driver._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isPassenger && !isDriver && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this negotiation'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        negotiation
      }
    });
  } catch (error) {
    console.error('Get negotiation by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get user negotiations
// @route   GET /api/negotiations
// @access  Private
const getUserNegotiations = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    let query = {
      $or: [{ passenger: req.user._id }, { driver: req.user._id }]
    };

    if (status) {
      query.status = status;
    }

    const negotiations = await Negotiation.find(query)
      .populate('passenger', 'firstName surname phone')
      .populate('driver', 'firstName surname phone')
      .populate('ride', 'source destination date time')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Negotiation.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        negotiations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get user negotiations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get active negotiations
// @route   GET /api/negotiations/active
// @access  Private
const getActiveNegotiations = async (req, res) => {
  try {
    const negotiations = await Negotiation.findActiveNegotiations(req.user._id);

    res.status(200).json({
      success: true,
      data: {
        negotiations
      }
    });
  } catch (error) {
    console.error('Get active negotiations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  initiateNegotiation,
  respondToNegotiation,
  getNegotiationById,
  getUserNegotiations,
  getActiveNegotiations
};
