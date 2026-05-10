const Booking = require('../models/Booking');
const Ride = require('../models/Ride');
const Payment = require('../models/Payment');
const Negotiation = require('../models/Negotiation');

// @desc    Book ride
// @route   POST /api/bookings
// @access  Private
const bookRide = async (req, res) => {
  try {
    const {
      rideId,
      seatsBooked,
      pickupLocation,
      dropLocation,
      pickupTime,
      specialRequests
    } = req.body;

    // Get ride details
    const ride = await Ride.findById(rideId).populate('driver vehicle');

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found'
      });
    }

    // Check ride status
    if (ride.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Ride is not available for booking'
      });
    }

    // Check if user is trying to book their own ride
    if (ride.driver._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot book your own ride'
      });
    }

    // Check if seats are available
    if (ride.availableSeats < seatsBooked) {
      return res.status(400).json({
        success: false,
        message: `Only ${ride.availableSeats} seats available`
      });
    }

    // Check if user already has a booking for this ride
    const existingBooking = await Booking.findOne({
      rideId: rideId,
      passenger: req.user._id,
      status: { $in: ['pending', 'confirmed'] }
    });

    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message: 'You already have a booking for this ride'
      });
    }

    // Calculate fare
    const farePerSeat = ride.estimatedFare / ride.totalSeats;
    const totalFare = farePerSeat * seatsBooked;
    const platformFee = Math.round(totalFare * 0.05);
    const gst = Math.round((totalFare + platformFee) * 0.18);
    const finalAmount = totalFare + platformFee + gst;

    // Create booking
    const booking = await Booking.create({
      rideId: rideId,
      passenger: req.user._id,
      driver: ride.driver._id,
      seatsBooked,
      farePerSeat,
      totalFare,
      platformFee,
      gst,
      finalAmount,
      pickupLocation,
      dropLocation,
      pickupTime,
      specialRequests
    });

    // Update ride available seats
    await ride.updateAvailableSeats(seatsBooked);

    // Generate OTP for ride confirmation
    await booking.generateOTP();

    // Populate booking details
    await booking.populate([
      { path: 'rideId', populate: { path: 'driver vehicle' } },
      { path: 'passenger', select: 'firstName surname phone' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Ride booked successfully',
      data: {
        booking
      }
    });
  } catch (error) {
    console.error('Book ride error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Cancel booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private
const cancelBooking = async (req, res) => {
  try {
    const { reason } = req.body;
    const bookingId = req.params.id;

    const booking = await Booking.findById(bookingId).populate('rideId');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check permissions
    const isPassenger = booking.passenger.toString() === req.user._id.toString();
    const isDriver = booking.driver.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isPassenger && !isDriver && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this booking'
      });
    }

    // Check if booking can be cancelled
    if (booking.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel completed booking'
      });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Booking is already cancelled'
      });
    }

    // Cancel booking
    await booking.cancelBooking(reason, req.user._id);

    // Restore available seats
    if (booking.rideId && typeof booking.rideId.updateAvailableSeats === 'function') {
      await booking.rideId.updateAvailableSeats(-booking.seatsBooked);
    }

    // Handle payment refund if payment was completed
    if (booking.paymentId) {
      const payment = await Payment.findById(booking.paymentId);
      if (payment && payment.status === 'completed') {
        await payment.refundPayment('Booking cancelled', payment.totalAmount);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      data: {
        booking
      }
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Confirm booking
// @route   PUT /api/bookings/:id/confirm
// @access  Private (Driver only)
const confirmBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user is the driver
    if (booking.driver.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only driver can confirm booking'
      });
    }

    // Check booking status
    if (booking.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending bookings can be confirmed'
      });
    }

    // Confirm booking
    await booking.confirmBooking();

    // Create payment record
    const payment = await Payment.create({
      booking: booking._id,
      passenger: booking.passenger,
      driver: booking.driver,
      ride: booking.rideId,
      amount: booking.totalFare,
      platformFee: booking.platformFee,
      gst: booking.gst,
      totalAmount: booking.finalAmount,
      paymentMethod: 'upi'
    });

    // Update booking with payment reference
    booking.paymentId = payment._id;
    await booking.save();

    await booking.populate([
      { path: 'rideId', populate: { path: 'driver vehicle' } },
      { path: 'passenger', select: 'firstName surname phone' },
      { path: 'paymentId' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Booking confirmed successfully',
      data: {
        booking
      }
    });
  } catch (error) {
    console.error('Confirm booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Complete booking
// @route   PUT /api/bookings/:id/complete
// @access  Private (Driver only)
const completeBooking = async (req, res) => {
  try {
    const { otp } = req.body;
    const bookingId = req.params.id;

    const booking = await Booking.findById(bookingId).select('+otp +otpExpires');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user is the driver
    if (booking.driver.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only driver can complete booking'
      });
    }

    // Check booking status
    if (booking.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: 'Only confirmed bookings can be completed'
      });
    }

    // Verify OTP
    if (!otp) {
      return res.status(400).json({
        success: false,
        message: 'OTP is required to complete booking'
      });
    }

    const isOTPValid = await booking.verifyOTP(otp);
    if (!isOTPValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Complete booking
    await booking.completeBooking();

    // Update payment status
    if (booking.paymentId) {
      const payment = await Payment.findById(booking.paymentId);
      if (payment && payment.status === 'pending') {
        await payment.completePayment();
      }
    }

    // Update ride status if all bookings are completed
    const ride = await Ride.findById(booking.rideId);
    const pendingBookings = await Booking.countDocuments({
      rideId: booking.rideId,
      status: { $in: ['pending', 'confirmed'] }
    });

    if (ride && pendingBookings === 0) {
      ride.status = 'completed';
      await ride.save();
    }

    await booking.populate([
      { path: 'rideId', populate: { path: 'driver vehicle' } },
      { path: 'passenger', select: 'firstName surname phone' },
      { path: 'paymentId' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Booking completed successfully',
      data: {
        booking
      }
    });
  } catch (error) {
    console.error('Complete booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get booking history
// @route   GET /api/bookings/history
// @access  Private
const getBookingHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    let query = {};

    // Filter based on user role
    if (req.user.role === 'driver') {
      query.driver = req.user._id;
    } else {
      query.passenger = req.user._id;
    }

    if (status) {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      .populate({
        path: 'rideId',
        populate: {
          path: 'driver vehicle',
          select: 'firstName surname phone make model vehicleNumber vehicleType'
        }
      })
      .populate('paymentId')
      .populate('negotiationId')
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
    console.error('Get booking history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get my bookings
// @route   GET /api/bookings/my-bookings
// @access  Private
const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ passenger: req.user._id })
      .populate({
        path: 'rideId',
        populate: {
          path: 'driver vehicle',
          select: 'firstName surname phone make model vehicleNumber vehicleType'
        }
      })
      .populate('paymentId')
      .populate('negotiationId')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: {
        bookings
      }
    });
  } catch (error) {
    console.error('Get my bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get booking by ID
// @route   GET /api/bookings/:id
// @access  Private
const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate({
        path: 'rideId',
        populate: {
          path: 'driver vehicle',
          select: 'firstName surname phone make model vehicleNumber vehicleType averageRating'
        }
      })
      .populate('passenger', 'firstName surname phone profileImage')
      .populate('paymentId')
      .populate('negotiationId');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check permissions
    const isPassenger = booking.passenger._id.toString() === req.user._id.toString();
    const isDriver = booking.driver.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isPassenger && !isDriver && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this booking'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        booking
      }
    });
  } catch (error) {
    console.error('Get booking by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Regenerate OTP
// @route   POST /api/bookings/:id/regenerate-otp
// @access  Private (Driver only)
const regenerateOTP = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user is the driver
    if (booking.driver.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only driver can regenerate OTP'
      });
    }

    // Check booking status
    if (booking.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: 'OTP can only be generated for confirmed bookings'
      });
    }

    // Generate new OTP
    await booking.generateOTP();

    res.status(200).json({
      success: true,
      message: 'OTP regenerated successfully',
      data: {
        otpExpires: booking.otpExpires
      }
    });
  } catch (error) {
    console.error('Regenerate OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  bookRide,
  cancelBooking,
  confirmBooking,
  completeBooking,
  getBookingHistory,
  getMyBookings,
  getBookingById,
  regenerateOTP
};