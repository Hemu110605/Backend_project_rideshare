const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const Razorpay = require('razorpay');
const crypto = require('crypto');


// @desc    Process payment
// @route   POST /api/payments/process
// @access  Private
const processPayment = async (req, res) => {
  try {
    const { bookingId, paymentMethod, upiDetails } = req.body;

    // Get booking
    const booking = await Booking.findById(bookingId).populate('ride passenger driver');

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
        message: 'Not authorized to process payment for this booking'
      });
    }

    // Check booking status
    if (booking.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: 'Payment can only be processed for confirmed bookings'
      });
    }

    // Check if payment already exists
    let payment = await Payment.findOne({ booking: bookingId });

    if (payment) {
      if (payment.status === 'completed') {
        return res.status(400).json({
          success: false,
          message: 'Payment already completed'
        });
      }
    } else {
      // Create new payment
      payment = await Payment.create({
        booking: bookingId,
        passenger: booking.passenger._id,
        driver: booking.driver._id,
        ride: booking.ride._id,
        amount: booking.totalFare,
        platformFee: booking.platformFee,
        gst: booking.gst,
        totalAmount: booking.finalAmount,
        paymentMethod: paymentMethod || 'upi',
        upiDetails: upiDetails || {}
      });

      // Update booking with payment reference
      booking.paymentId = payment._id;
      await booking.save();
    }

    // Process payment (simulate UPI payment)
    await payment.processPayment();

    // Simulate payment completion (in production, integrate with actual payment gateway)
    setTimeout(async () => {
      try {
        // Simulate successful payment
        await payment.completePayment(`UPI_TXN_${Date.now()}`);
      } catch (error) {
        console.error('Payment completion error:', error);
      }
    }, 2000);

    res.status(200).json({
      success: true,
      message: 'Payment processing initiated',
      data: {
        payment,
        upiQrCode: generateUPIQRCode(payment)
      }
    });
  } catch (error) {
    console.error('Process payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get payment by ID
// @route   GET /api/payments/:id
// @access  Private
const getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate({
        path: 'booking',
        populate: {
          path: 'ride',
          select: 'source destination date time'
        }
      })
      .populate('passenger', 'firstName surname phone')
      .populate('driver', 'firstName surname phone');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check permissions
    const isPassenger = payment.passenger._id.toString() === req.user._id.toString();
    const isDriver = payment.driver._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isPassenger && !isDriver && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this payment'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        payment
      }
    });
  } catch (error) {
    console.error('Get payment by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get payment history
// @route   GET /api/payments/history
// @access  Private
const getPaymentHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, startDate, endDate } = req.query;
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

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
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

    // Get payment statistics
    const stats = await Payment.getPaymentStats(
      startDate ? new Date(startDate) : new Date(0),
      endDate ? new Date(endDate) : new Date()
    );

    res.status(200).json({
      success: true,
      data: {
        payments,
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
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Refund payment
// @route   POST /api/payments/:id/refund
// @access  Private (Admin or Driver for their rides)
const refundPayment = async (req, res) => {
  try {
    const { reason, amount } = req.body;
    const paymentId = req.params.id;

    const payment = await Payment.findById(paymentId).populate('booking');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check permissions
    const isAdmin = req.user.role === 'admin';
    const isDriver = payment.driver.toString() === req.user._id.toString() &&
      payment.booking.driver.toString() === req.user._id.toString();

    if (!isAdmin && !isDriver) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to refund this payment'
      });
    }

    // Check payment status
    if (payment.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Only completed payments can be refunded'
      });
    }

    // Process refund
    await payment.refundPayment(reason, amount);

    res.status(200).json({
      success: true,
      message: 'Payment refunded successfully',
      data: {
        payment
      }
    });
  } catch (error) {
    console.error('Refund payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Generate UPI QR code (placeholder)
// @route   GET /api/payments/:id/qrcode
// @access  Private
const generateQRCode = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check permissions
    const isPassenger = payment.passenger.toString() === req.user._id.toString();
    const isDriver = payment.driver.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isPassenger && !isDriver && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to generate QR code for this payment'
      });
    }

    if (payment.status !== 'pending' && payment.status !== 'processing') {
      return res.status(400).json({
        success: false,
        message: 'QR code can only be generated for pending payments'
      });
    }

    const qrCode = generateUPIQRCode(payment);

    res.status(200).json({
      success: true,
      data: {
        qrCode,
        paymentId: payment._id,
        amount: payment.totalAmount,
        transactionId: payment.transactionId
      }
    });
  } catch (error) {
    console.error('Generate QR code error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Verify payment status
// @route   GET /api/payments/:id/status
// @access  Private
const verifyPaymentStatus = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check permissions
    const isPassenger = payment.passenger.toString() === req.user._id.toString();
    const isDriver = payment.driver.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isPassenger && !isDriver && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to verify this payment'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        paymentId: payment._id,
        status: payment.status,
        transactionId: payment.transactionId,
        gatewayTransactionId: payment.gatewayTransactionId,
        amount: payment.totalAmount,
        completedAt: payment.completedAt
      }
    });
  } catch (error) {
    console.error('Verify payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};


// @desc    Create Razorpay order
// @route   POST /api/payments/create-order
// @access  Private
const createRazorpayOrder = async (req, res) => {
  try {
    const { bookingId, rideId } = req.body;

    let booking = null;
    let amount = 0;

    // Get booking amount from database
    if (bookingId) {
      booking = await Booking.findById(bookingId).populate('ride');
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      // Check permissions
      if (booking.passenger.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to create order for this booking'
        });
      }

      // Use amount from booking (convert to paise)
      amount = Math.round(booking.finalAmount * 100);
    } else if (rideId) {
      // Get ride directly if no booking
      const ride = await Ride.findById(rideId);
      if (!ride) {
        return res.status(404).json({
          success: false,
          message: 'Ride not found'
        });
      }

      // Check if user is the driver (can't pay for their own ride)
      if (ride.driver.toString() === req.user._id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Cannot pay for your own ride'
        });
      }

      // Use estimated fare (convert to paise)
      amount = Math.round((ride.estimatedFare || 100) * 100);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Either bookingId or rideId is required'
      });
    }

    // Validate amount (minimum 100 paise = ₹1)
    if (amount < 100) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be at least ₹1'
      });
    }

    // Check Razorpay credentials
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'Payment service not configured'
      });
    }

    // Initialize Razorpay
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });

    // Create order options
    const options = {
      amount: amount, // amount in paise
      currency: 'INR',
      receipt: bookingId ? `booking_${bookingId}` : `ride_${rideId}`,
      payment_capture: 1,
      notes: {
        bookingId: bookingId || null,
        rideId: rideId || null,
        userId: req.user._id.toString()
      }
    };

    // Create order
    const order = await razorpay.orders.create(options);

    res.status(200).json({
      success: true,
      message: 'Order created successfully',
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID,
        bookingId: bookingId || null,
        rideId: rideId || null
      }
    });
  } catch (error) {
    console.error('Create Razorpay order error:', error);

    if (error.statusCode === 401) {
      return res.status(401).json({
        success: false,
        message: 'Razorpay authentication failed'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create order'
    });
  }
};

// @desc    Verify Razorpay payment
// @route   POST /api/payments/verify-payment
// @access  Private
const verifyRazorpayPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body;

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment details'
      });
    }

    // Get booking if bookingId is provided
    let booking = null;
    if (bookingId) {
      booking = await Booking.findById(bookingId);
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      // Check permissions
      if (booking.passenger.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to verify payment for this booking'
        });
      }
    }

    // Generate signature
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    // Compare signatures
    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed - signature mismatch'
      });
    }

    // If booking exists, create payment record and update booking
    if (booking) {
      // Check if payment already exists
      let payment = await Payment.findOne({ booking: bookingId });

      if (!payment) {
        // Create new payment record
        payment = await Payment.create({
          booking: bookingId,
          passenger: booking.passenger,
          driver: booking.driver,
          ride: booking.ride,
          amount: booking.totalFare,
          platformFee: booking.platformFee,
          gst: booking.gst,
          totalAmount: booking.finalAmount,
          paymentMethod: 'razorpay',
          status: 'completed',
          transactionId: razorpay_payment_id,
          gatewayTransactionId: razorpay_order_id,
          completedAt: new Date()
        });

        // Update booking with payment reference
        booking.paymentId = payment._id;
        await booking.save();
      } else {
        // Update existing payment
        payment.status = 'completed';
        payment.transactionId = razorpay_payment_id;
        payment.gatewayTransactionId = razorpay_order_id;
        payment.completedAt = new Date();
        await payment.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        payment_id: booking?.paymentId || null
      }
    });
  } catch (error) {
    console.error('Verify Razorpay payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed'
    });
  }
};

// Helper function to generate UPI QR code (placeholder)
const generateUPIQRCode = (payment) => {
  // This is a placeholder - in production, integrate with actual UPI payment gateway
  return {
    upiId: 'rideshare@ybl',
    merchantName: 'RideShare Carpooling',
    amount: payment.totalAmount,
    transactionId: payment.transactionId,
    qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=rideshare@ybl&pn=RideShare&am=${payment.totalAmount}&cu=INR&tn=${payment.transactionId}`
  };
};

module.exports = {
  processPayment,
  getPaymentById,
  getPaymentHistory,
  refundPayment,
  generateQRCode,
  verifyPaymentStatus,
  createRazorpayOrder,
  verifyRazorpayPayment,
  verifyPaymentStatus
};
