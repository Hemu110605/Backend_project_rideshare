const Ride = require('../models/Ride');
const Booking = require('../models/Booking');
const Vehicle = require('../models/Vehicle');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// @desc    Create ride
// @route   POST /api/rides
// @access  Private (Driver only)
const createRide = async (req, res) => {
  try {
    const rideData = {
      ...req.body,
      driver: req.user._id
    };

    // Handle vehicle - if no vehicle provided, create a default one or find existing
    let vehicle;
    if (rideData.vehicle && rideData.vehicle !== 'default-vehicle-id') {
      // Verify vehicle belongs to driver
      vehicle = await Vehicle.findOne({
        _id: rideData.vehicle,
        driver: req.user._id,
        isActive: true
      });

      if (!vehicle) {
        return res.status(400).json({
          success: false,
          message: 'Invalid vehicle or vehicle does not belong to you'
        });
      }
    } else {
      // Create or find a default vehicle for the driver
      vehicle = await Vehicle.findOne({
        driver: req.user._id,
        isActive: true
      });

      if (!vehicle) {
        // Create a default vehicle for testing
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 5);
        
        vehicle = new Vehicle({
          driver: req.user._id,
          make: 'Default',
          model: 'Test Vehicle',
          year: 2020,
          color: 'White',
          vehicleNumber: 'MH12AB1234',
          vehicleType: 'sedan',
          totalSeats: 4,
          fuelType: 'petrol',
          rcNumber: 'RC123456789',
          insuranceValidUntil: futureDate,
          pucValidUntil: futureDate,
          isActive: true
        });
        await vehicle.save();
      }
      
      rideData.vehicle = vehicle._id;
    }

    // Create and calculate fare
    const ride = new Ride(rideData);
    ride.calculateFare();
    await ride.save();

    // Populate ride details
    await ride.populate([
      { path: 'driver', select: 'firstName surname phone averageRating' },
      { path: 'vehicle', select: 'make model vehicleNumber vehicleType totalSeats' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Ride created successfully',
      data: {
        ride
      }
    });
  } catch (error) {
    console.error('Create ride error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get all rides (with filtering)
// @route   GET /api/rides
// @access  Public
const getAllRides = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      source,
      destination,
      date,
      seats,
      vehicleType,
      minPrice,
      maxPrice,
      status = 'active'
    } = req.query;

    const skip = (page - 1) * limit;

    // Build query
    let query = { status };

    if (source) {
      query.source = { $regex: source, $options: 'i' };
    }

    if (destination) {
      query.destination = { $regex: destination, $options: 'i' };
    }

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.date = {
        $gte: startDate,
        $lt: endDate
      };
    }

    if (seats) {
      query.availableSeats = { $gte: parseInt(seats) };
    }

    if (vehicleType) {
      // Need to join with vehicle collection
      const vehicles = await Vehicle.find({ vehicleType, isActive: true }).select('_id');
      query.vehicle = { $in: vehicles.map(v => v._id) };
    }

    if (minPrice || maxPrice) {
      query.pricePerKm = {};
      if (minPrice) query.pricePerKm.$gte = parseFloat(minPrice);
      if (maxPrice) query.pricePerKm.$lte = parseFloat(maxPrice);
    }

    // Only show future rides for public
    if (!req.user || req.user.role !== 'admin') {
      query.date = { $gte: new Date() };
    }

    const rides = await Ride.find(query)
      .populate({
        path: 'driver',
        select: 'firstName surname phone averageRating totalRatings'
      })
      .populate({
        path: 'vehicle',
        select: 'make model vehicleNumber vehicleType totalSeats averageRating'
      })
      .sort({ date: 1, time: 1 })
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

// @desc    Get ride by ID
// @route   GET /api/rides/:id
// @access  Public
const getRideById = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate({
        path: 'driver',
        select: 'firstName surname phone averageRating totalRatings profileImage'
      })
      .populate({
        path: 'vehicle',
        select: 'make model vehicleNumber vehicleType totalSeats fuelType color averageRating vehicleImage'
      })
      .populate({
        path: 'bookings',
        populate: {
          path: 'passenger',
          select: 'firstName surname profileImage'
        },
        match: { status: 'confirmed' }
      });

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        ride
      }
    });
  } catch (error) {
    console.error('Get ride by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update ride
// @route   PUT /api/rides/:id
// @access  Private (Driver or Admin)
const updateRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && ride.driver.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this ride'
      });
    }

    // Don't allow updates if ride has confirmed bookings
    if (ride.status === 'booked' && req.user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update ride with confirmed bookings'
      });
    }

    const updatedRide = await Ride.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate([
      { path: 'driver', select: 'firstName surname phone' },
      { path: 'vehicle', select: 'make model vehicleNumber' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Ride updated successfully',
      data: {
        ride: updatedRide
      }
    });
  } catch (error) {
    console.error('Update ride error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete ride
// @route   DELETE /api/rides/:id
// @access  Private (Driver or Admin)
const deleteRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && ride.driver.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this ride'
      });
    }

    // Check if there are confirmed bookings
    const confirmedBookings = await Booking.countDocuments({
      ride: ride._id,
      status: 'confirmed'
    });

    if (confirmedBookings > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete ride with confirmed bookings'
      });
    }

    await Ride.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Ride deleted successfully'
    });
  } catch (error) {
    console.error('Delete ride error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Search rides by location
// @route   GET /api/rides/search
// @access  Public
const searchRides = async (req, res) => {
  try {
    const {
      pickupLat,
      pickupLng,
      dropLat,
      dropLng,
      radius = 50, // radius in km
      date,
      seats
    } = req.query;

    if (!pickupLat || !pickupLng || !dropLat || !dropLng) {
      return res.status(400).json({
        success: false,
        message: 'Pickup and drop coordinates are required'
      });
    }

    // Build query for location-based search
    let query = {
      status: 'active',
      date: { $gte: new Date() }
    };

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.date = {
        $gte: startDate,
        $lt: endDate
      };
    }

    if (seats) {
      query.availableSeats = { $gte: parseInt(seats) };
    }

    // Find rides within radius (simplified - in production, use proper geospatial queries)
    const rides = await Ride.find(query)
      .populate({
        path: 'driver',
        select: 'firstName surname phone averageRating'
      })
      .populate({
        path: 'vehicle',
        select: 'make model vehicleNumber vehicleType totalSeats'
      })
      .sort({ date: 1, time: 1 });

    // Filter by distance (simplified calculation)
    const filteredRides = rides.filter(ride => {
      const pickupDistance = calculateDistance(
        parseFloat(pickupLat),
        parseFloat(pickupLng),
        ride.pickupCoordinates.lat,
        ride.pickupCoordinates.lng
      );
      
      const dropDistance = calculateDistance(
        parseFloat(dropLat),
        parseFloat(dropLng),
        ride.dropCoordinates.lat,
        ride.dropCoordinates.lng
      );

      return pickupDistance <= radius && dropDistance <= radius;
    });

    res.status(200).json({
      success: true,
      data: {
        rides: filteredRides,
        searchRadius: radius
      }
    });
  } catch (error) {
    console.error('Search rides error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Helper function to calculate distance between two points (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// @desc    Accept ride (for drivers)
// @route   PUT /api/rides/:id/accept
// @access  Private (Driver only)
const acceptRide = async (req, res) => {
  try {
    const { id } = req.params;
    const driverId = req.user._id;

    const ride = await Ride.findById(id);

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found'
      });
    }

    if (ride.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Ride is not available for acceptance'
      });
    }

    // If ride has no driver, assign this driver
    if (!ride.driver) {
      ride.driver = driverId;
    } else {
      // Get the driver ID from the ride (handle both string and populated object)
      const rideDriverId = ride.driver._id ? ride.driver._id.toString() : ride.driver.toString();
      
      // Convert driverId to string if it's an ObjectId
      const requestDriverId = driverId.toString ? driverId.toString() : driverId;
      
      if (rideDriverId !== requestDriverId) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to accept this ride'
        });
      }
    }

    // Update ride status to booked (accepted by driver)
    ride.status = 'booked';
    ride.acceptedAt = new Date();
    await ride.save();

    // Populate ride details
    await ride.populate([
      { path: 'driver', select: 'firstName surname phone averageRating' },
      { path: 'vehicle', select: 'make model vehicleNumber vehicleType totalSeats' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Ride accepted successfully',
      data: {
        ride
      }
    });
  } catch (error) {
    console.error('Accept ride error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Start ride (for assigned drivers)
// @route   PATCH /api/rides/:id/start
// @access  Private (Driver only)
const startRide = async (req, res) => {
  try {
    const { id } = req.params;
    const driverId = req.user._id;

    const ride = await Ride.findById(id);

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found'
      });
    }

    // Check if ride is in accepted state
    if (ride.status !== 'booked') {
      return res.status(400).json({
        success: false,
        message: 'Ride must be accepted before starting'
      });
    }

    // Verify this is the assigned driver
    const rideDriverId = ride.driver._id ? ride.driver._id.toString() : ride.driver.toString();
    const requestDriverId = driverId.toString ? driverId.toString() : driverId;
    
    if (rideDriverId !== requestDriverId) {
      return res.status(403).json({
        success: false,
        message: 'Only assigned driver can start this ride'
      });
    }

    // Update ride status and timestamps
    ride.status = 'ongoing';
    ride.startedAt = new Date();
    await ride.save();

    logger.info('Ride started', {
      rideId: id,
      driverId: driverId,
      startedAt: ride.startedAt
    });

    res.status(200).json({
      success: true,
      message: 'Ride started successfully',
      data: {
        ride
      }
    });
  } catch (error) {
    console.error('Start ride error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Complete ride (for assigned drivers)
// @route   PATCH /api/rides/:id/complete
// @access  Private (Driver only)
const completeRide = async (req, res) => {
  try {
    const { id } = req.params;
    const driverId = req.user._id;

    const ride = await Ride.findById(id);

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found'
      });
    }

    // Check if ride is in ongoing state
    if (ride.status !== 'ongoing') {
      return res.status(400).json({
        success: false,
        message: 'Ride must be ongoing before completing'
      });
    }

    // Verify this is the assigned driver
    const rideDriverId = ride.driver._id ? ride.driver._id.toString() : ride.driver.toString();
    const requestDriverId = driverId.toString ? driverId.toString() : driverId;
    
    if (rideDriverId !== requestDriverId) {
      return res.status(403).json({
        success: false,
        message: 'Only assigned driver can complete this ride'
      });
    }

    // Update ride status and timestamps
    ride.status = 'completed';
    ride.completedAt = new Date();
    await ride.save();

    logger.info('Ride completed', {
      rideId: id,
      driverId: driverId,
      completedAt: ride.completedAt
    });

    res.status(200).json({
      success: true,
      message: 'Ride completed successfully',
      data: {
        ride
      }
    });
  } catch (error) {
    console.error('Complete ride error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Cancel ride (driver or passenger)
// @route   PATCH /api/rides/:id/cancel
// @access  Private
const cancelRide = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user._id;
    const userRole = req.user.role;

    const ride = await Ride.findById(id);

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found'
      });
    }

    // Check if ride can be cancelled (not completed)
    if (ride.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a completed ride'
      });
    }

    let cancelledBy = 'system';
    
    // Determine who is cancelling
    if (userRole === 'driver') {
      // Driver can cancel their assigned rides
      const rideDriverId = ride.driver._id ? ride.driver._id.toString() : ride.driver.toString();
      const requestDriverId = userId.toString ? userId.toString() : userId;
      
      if (rideDriverId !== requestDriverId) {
        return res.status(403).json({
          success: false,
          message: 'Only assigned driver can cancel this ride'
        });
      }
      cancelledBy = 'driver';
    } else if (userRole === 'user') {
      // Passengers can cancel rides they've booked
      // For now, allow passengers to cancel any active/booked ride
      if (ride.status === 'ongoing') {
        return res.status(400).json({
          success: false,
          message: 'Cannot cancel an ongoing ride'
        });
      }
      cancelledBy = 'passenger';
    }

    // Update ride status and cancellation details
    ride.status = 'cancelled';
    ride.cancelledAt = new Date();
    ride.cancelledBy = cancelledBy;
    ride.cancellationReason = reason || 'No reason provided';
    await ride.save();

    logger.info('Ride cancelled', {
      rideId: id,
      cancelledBy: cancelledBy,
      userId: userId,
      cancelledAt: ride.cancelledAt,
      cancellationReason: ride.cancellationReason
    });

    res.status(200).json({
      success: true,
      message: 'Ride cancelled successfully',
      data: {
        ride
      }
    });
  } catch (error) {
    console.error('Cancel ride error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  createRide,
  getAllRides,
  getRideById,
  updateRide,
  deleteRide,
  searchRides,
  acceptRide,
  startRide,
  completeRide,
  cancelRide
};
