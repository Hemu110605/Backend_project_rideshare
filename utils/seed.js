const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const Ride = require('../models/Ride');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Review = require('../models/Review');
const Negotiation = require('../models/Negotiation');

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected for seeding...');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Clear all data
const clearData = async () => {
  try {
    await User.deleteMany({});
    await Vehicle.deleteMany({});
    await Ride.deleteMany({});
    await Booking.deleteMany({});
    await Payment.deleteMany({});
    await Review.deleteMany({});
    await Negotiation.deleteMany({});
    console.log('All data cleared');
  } catch (error) {
    console.error('Error clearing data:', error);
  }
};

// Seed data
const seedData = async () => {
  try {
    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 12);
    const admin = await User.create({
      firstName: 'Admin',
      surname: 'User',
      phone: '9876543210',
      email: 'admin@rideshare.com',
      password: adminPassword,
      role: 'admin'
    });

    // Create sample users
    const userPassword = await bcrypt.hash('user123', 12);
    const users = await User.create([
      {
        firstName: 'John',
        surname: 'Doe',
        phone: '9876543211',
        email: 'john@example.com',
        password: userPassword,
        role: 'user'
      },
      {
        firstName: 'Jane',
        surname: 'Smith',
        phone: '9876543212',
        email: 'jane@example.com',
        password: userPassword,
        role: 'user'
      },
      {
        firstName: 'Mike',
        surname: 'Wilson',
        phone: '9876543213',
        email: 'mike@example.com',
        password: userPassword,
        role: 'user'
      }
    ]);

    // Create sample drivers
    const driverPassword = await bcrypt.hash('driver123', 12);
    const drivers = await User.create([
      {
        firstName: 'Robert',
        surname: 'Johnson',
        phone: '9876543214',
        email: 'robert@example.com',
        password: driverPassword,
        role: 'driver',
        isDriver: true
      },
      {
        firstName: 'Sarah',
        surname: 'Williams',
        phone: '9876543215',
        email: 'sarah@example.com',
        password: driverPassword,
        role: 'driver',
        isDriver: true
      },
      {
        firstName: 'David',
        surname: 'Brown',
        phone: '9876543216',
        email: 'david@example.com',
        password: driverPassword,
        role: 'driver',
        isDriver: true
      }
    ]);

    // Create vehicles for drivers
    const vehicles = await Vehicle.create([
      {
        driver: drivers[0]._id,
        make: 'Maruti',
        model: 'Swift',
        year: 2020,
        color: 'White',
        vehicleNumber: 'MH12AB1234',
        vehicleType: 'hatchback',
        totalSeats: 4,
        fuelType: 'petrol',
        rcNumber: 'MH12AB1234RC',
        insuranceValidUntil: new Date('2025-12-31'),
        pucValidUntil: new Date('2024-12-31'),
        isVerified: true
      },
      {
        driver: drivers[1]._id,
        make: 'Hyundai',
        model: 'Creta',
        year: 2021,
        color: 'Silver',
        vehicleNumber: 'MH12CD5678',
        vehicleType: 'suv',
        totalSeats: 5,
        fuelType: 'diesel',
        rcNumber: 'MH12CD5678RC',
        insuranceValidUntil: new Date('2025-06-30'),
        pucValidUntil: new Date('2024-06-30'),
        isVerified: true
      },
      {
        driver: drivers[2]._id,
        make: 'Honda',
        model: 'City',
        year: 2022,
        color: 'Red',
        vehicleNumber: 'MH12EF9012',
        vehicleType: 'sedan',
        totalSeats: 4,
        fuelType: 'petrol',
        rcNumber: 'MH12EF9012RC',
        insuranceValidUntil: new Date('2026-03-31'),
        pucValidUntil: new Date('2025-03-31'),
        isVerified: true
      }
    ]);

    // Create sample rides
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);

    const rideData = [
      {
        driver: drivers[0]._id,
        vehicle: vehicles[0]._id,
        source: 'Mumbai',
        destination: 'Pune',
        pickupCoordinates: { lat: 19.0760, lng: 72.8777 },
        dropCoordinates: { lat: 18.5204, lng: 73.8567 },
        date: tomorrow,
        time: '09:00',
        distance: 150,
        duration: 180,
        pricePerKm: 8,
        totalSeats: 4,
        availableSeats: 3,
        preferences: {
          smokingAllowed: false,
          petsAllowed: false,
          musicAllowed: true,
          luggageAllowed: true
        }
      },
      {
        driver: drivers[1]._id,
        vehicle: vehicles[1]._id,
        source: 'Pune',
        destination: 'Mumbai',
        pickupCoordinates: { lat: 18.5204, lng: 73.8567 },
        dropCoordinates: { lat: 19.0760, lng: 72.8777 },
        date: tomorrow,
        time: '14:00',
        distance: 150,
        duration: 180,
        pricePerKm: 10,
        totalSeats: 5,
        availableSeats: 2,
        preferences: {
          smokingAllowed: false,
          petsAllowed: true,
          musicAllowed: true,
          luggageAllowed: true
        }
      },
      {
        driver: drivers[2]._id,
        vehicle: vehicles[2]._id,
        source: 'Mumbai',
        destination: 'Nashik',
        pickupCoordinates: { lat: 19.0760, lng: 72.8777 },
        dropCoordinates: { lat: 19.9975, lng: 73.7898 },
        date: dayAfter,
        time: '08:00',
        distance: 185,
        duration: 240,
        pricePerKm: 7,
        totalSeats: 4,
        availableSeats: 4,
        preferences: {
          smokingAllowed: false,
          petsAllowed: false,
          musicAllowed: false,
          luggageAllowed: true
        }
      }
    ];

    // Calculate fares and create rides
    const rides = [];
    for (const rideDataItem of rideData) {
      const ride = new Ride(rideDataItem);
      ride.calculateFare();
      await ride.save();
      rides.push(ride);
    }

    // Create sample bookings
    const bookings = await Booking.create([
      {
        ride: rides[0]._id,
        passenger: users[0]._id,
        driver: drivers[0]._id,
        seatsBooked: 1,
        farePerSeat: rides[0].estimatedFare / rides[0].totalSeats,
        totalFare: rides[0].estimatedFare / rides[0].totalSeats,
        platformFee: Math.round((rides[0].estimatedFare / rides[0].totalSeats) * 0.05),
        gst: Math.round(((rides[0].estimatedFare / rides[0].totalSeats) * 1.05) * 0.18),
        pickupLocation: 'Andheri, Mumbai',
        dropLocation: 'Koregaon Park, Pune',
        pickupTime: '09:15',
        status: 'confirmed'
      },
      {
        ride: rides[1]._id,
        passenger: users[1]._id,
        driver: drivers[1]._id,
        seatsBooked: 2,
        farePerSeat: rides[1].estimatedFare / rides[1].totalSeats,
        totalFare: (rides[1].estimatedFare / rides[1].totalSeats) * 2,
        platformFee: Math.round((rides[1].estimatedFare / rides[1].totalSeats) * 0.05),
        gst: Math.round(((rides[1].estimatedFare / rides[1].totalSeats) * 1.05) * 0.18),
        pickupLocation: 'Kothrud, Pune',
        dropLocation: 'Bandra, Mumbai',
        pickupTime: '14:30',
        status: 'pending'
      },
      {
        ride: rides[2]._id,
        passenger: users[2]._id,
        driver: drivers[2]._id,
        seatsBooked: 1,
        farePerSeat: rides[2].estimatedFare / rides[2].totalSeats,
        totalFare: rides[2].estimatedFare / rides[2].totalSeats,
        platformFee: Math.round((rides[2].estimatedFare / rides[2].totalSeats) * 0.05),
        gst: Math.round(((rides[2].estimatedFare / rides[2].totalSeats) * 1.05) * 0.18),
        pickupLocation: 'Thane, Mumbai',
        dropLocation: 'Nashik',
        pickupTime: '08:00',
        status: 'pending'
      }
    ]);

    // Update ride available seats
    await rides[0].updateAvailableSeats(1);
    await rides[1].updateAvailableSeats(2);

    // Create sample payments
    const payments = await Payment.create([
      {
        booking: bookings[0]._id,
        passenger: users[0]._id,
        driver: drivers[0]._id,
        ride: rides[0]._id,
        amount: bookings[0].totalFare,
        platformFee: bookings[0].platformFee,
        gst: bookings[0].gst,
        totalAmount: bookings[0].finalAmount,
        status: 'completed',
        paymentMethod: 'upi',
        transactionId: 'TXN_SAMPLE_001',
        gatewayTransactionId: 'UPI_TXN_SAMPLE_001',
        completedAt: new Date()
      }
    ]);

    // Create sample reviews
    const reviews = await Review.create([
      {
        ride: rides[0]._id,
        booking: bookings[0]._id,
        reviewer: users[0]._id,
        reviewee: drivers[0]._id,
        vehicle: vehicles[0]._id,
        rating: 5,
        comment: 'Great ride! Driver was very professional and the car was clean.',
        aspects: {
          punctuality: 5,
          driving: 5,
          cleanliness: 5,
          communication: 5,
          safety: 5
        },
        tags: ['on-time', 'friendly', 'safe-driver', 'clean-car', 'professional']
      }
    ]);

    // Create sample negotiations
    const negotiations = await Negotiation.create([
      {
        booking: bookings[1]._id,
        ride: rides[1]._id,
        passenger: users[1]._id,
        driver: drivers[1]._id,
        originalFare: bookings[1].totalFare,
        currentFare: bookings[1].totalFare * 0.9,
        status: 'requested',
        initiatedBy: users[1]._id,
        messages: [
          {
            sender: users[1]._id,
            message: 'Can you offer a discount? I can pay 10% less.',
            proposedFare: bookings[1].totalFare * 0.9,
            timestamp: new Date()
          }
        ]
      }
    ]);

    console.log('Sample data created successfully!');
    console.log('\n=== Login Credentials ===');
    console.log('Admin: admin@rideshare.com / admin123');
    console.log('User: john@example.com / user123');
    console.log('Driver: robert@example.com / driver123');
    console.log('\n=== Created Records ===');
    console.log(`Users: ${users.length + drivers.length + 1}`);
    console.log(`Vehicles: ${vehicles.length}`);
    console.log(`Rides: ${rides.length}`);
    console.log(`Bookings: ${bookings.length}`);
    console.log(`Payments: ${payments.length}`);
    console.log(`Reviews: ${reviews.length}`);
    console.log(`Negotiations: ${negotiations.length}`);

  } catch (error) {
    console.error('Error seeding data:', error);
  }
};

// Main function
const seed = async () => {
  try {
    await connectDB();
    
    // Ask user if they want to clear existing data
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    readline.question('Do you want to clear existing data? (y/n): ', async (answer) => {
      if (answer.toLowerCase() === 'y') {
        await clearData();
      }
      
      await seedData();
      
      readline.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  seed();
}

module.exports = { clearData, seedData };
