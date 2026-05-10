require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Ride = require('../models/Ride');
const Vehicle = require('../models/Vehicle');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Sample data
const sampleUsers = [
  {
    firstName: 'Raj',
    surname: 'Kumar',
    email: 'raj.kumar@example.com',
    phone: '9876543210',
    password: 'password123',
    role: 'user',
    isEmailVerified: true
  },
  {
    firstName: 'Priya',
    surname: 'Sharma',
    email: 'priya.sharma@example.com',
    phone: '9876543211',
    password: 'password123',
    role: 'user',
    isEmailVerified: true
  },
  {
    firstName: 'Amit',
    surname: 'Patel',
    email: 'amit.patel@example.com',
    phone: '9876543212',
    password: 'password123',
    role: 'user',
    isEmailVerified: true
  },
  {
    firstName: 'Neha',
    surname: 'Singh',
    email: 'neha.singh@example.com',
    phone: '9876543213',
    password: 'password123',
    role: 'user',
    isEmailVerified: true
  },
  {
    firstName: 'Vikram',
    surname: 'Malhotra',
    email: 'vikram.malhotra@example.com',
    phone: '9876543214',
    password: 'password123',
    role: 'user',
    isEmailVerified: true
  },
  {
    firstName: 'Anjali',
    surname: 'Verma',
    email: 'anjali.verma@example.com',
    phone: '9876543215',
    password: 'password123',
    role: 'user',
    isEmailVerified: true
  },
  {
    firstName: 'Rahul',
    surname: 'Gupta',
    email: 'rahul.gupta@example.com',
    phone: '9876543216',
    password: 'password123',
    role: 'user',
    isEmailVerified: true
  },
  {
    firstName: 'Pooja',
    surname: 'Reddy',
    email: 'pooja.reddy@example.com',
    phone: '9876543217',
    password: 'password123',
    role: 'user',
    isEmailVerified: true
  },
  {
    firstName: 'Karan',
    surname: 'Joshi',
    email: 'karan.joshi@example.com',
    phone: '9876543218',
    password: 'password123',
    role: 'user',
    isEmailVerified: true
  },
  {
    firstName: 'Sneha',
    surname: 'Nair',
    email: 'sneha.nair@example.com',
    phone: '9876543219',
    password: 'password123',
    role: 'user',
    isEmailVerified: true
  }
];

const sampleDrivers = [
  {
    firstName: 'Ramesh',
    surname: 'Kumar',
    email: 'ramesh.driver@example.com',
    phone: '8888888881',
    password: 'password123',
    role: 'driver',
    isDriver: true,
    isEmailVerified: true,
    isBlocked: false
  },
  {
    firstName: 'Suresh',
    surname: 'Patel',
    email: 'suresh.driver@example.com',
    phone: '8888888882',
    password: 'password123',
    role: 'driver',
    isDriver: true,
    isEmailVerified: true,
    isBlocked: false
  },
  {
    firstName: 'Mahesh',
    surname: 'Singh',
    email: 'mahesh.driver@example.com',
    phone: '8888888883',
    password: 'password123',
    role: 'driver',
    isDriver: true,
    isEmailVerified: true,
    isBlocked: false
  },
  {
    firstName: 'Dinesh',
    surname: 'Sharma',
    email: 'dinesh.driver@example.com',
    phone: '8888888884',
    password: 'password123',
    role: 'driver',
    isDriver: true,
    isEmailVerified: true,
    isBlocked: false
  },
  {
    firstName: 'Ganesh',
    surname: 'Verma',
    email: 'ganesh.driver@example.com',
    phone: '8888888885',
    password: 'password123',
    role: 'driver',
    isDriver: true,
    isEmailVerified: true,
    isBlocked: false
  }
];

const sampleVehicles = [
  {
    make: 'Maruti',
    model: 'Swift',
    year: 2022,
    vehicleNumber: 'MH01AB1234',
    vehicleType: 'hatchback',
    totalSeats: 4,
    color: 'White',
    fuelType: 'petrol',
    rcNumber: 'MH0120220001234',
    insuranceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    pucValidUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
  },
  {
    make: 'Hyundai',
    model: 'i20',
    year: 2021,
    vehicleNumber: 'MH02CD5678',
    vehicleType: 'hatchback',
    totalSeats: 4,
    color: 'Silver',
    fuelType: 'petrol',
    rcNumber: 'MH0220210005678',
    insuranceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    pucValidUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
  },
  {
    make: 'Toyota',
    model: 'Innova',
    year: 2023,
    vehicleNumber: 'MH03EF9012',
    vehicleType: 'suv',
    totalSeats: 7,
    color: 'Black',
    fuelType: 'diesel',
    rcNumber: 'MH0320230009012',
    insuranceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    pucValidUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
  },
  {
    make: 'Honda',
    model: 'City',
    year: 2022,
    vehicleNumber: 'MH04GH3456',
    vehicleType: 'sedan',
    totalSeats: 5,
    color: 'Red',
    fuelType: 'petrol',
    rcNumber: 'MH0420220003456',
    insuranceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    pucValidUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
  },
  {
    make: 'Tata',
    model: 'Nexon',
    year: 2023,
    vehicleNumber: 'MH05IJ7890',
    vehicleType: 'suv',
    totalSeats: 5,
    color: 'Blue',
    fuelType: 'diesel',
    rcNumber: 'MH0520230007890',
    insuranceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    pucValidUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
  }
];

const sampleRides = [
  {
    source: 'Thane Railway Station',
    destination: 'Vashi, Navi Mumbai',
    pickupCoordinates: { type: 'Point', coordinates: [73.0357, 19.1977] },
    dropCoordinates: { type: 'Point', coordinates: [73.0078, 19.0735] },
    date: new Date(),
    time: '09:00',
    distance: 15,
    duration: 30,
    pricePerKm: 12,
    totalSeats: 4,
    availableSeats: 2,
    estimatedFare: 180,
    platformFee: 10,
    gst: 18,
    status: 'completed'
  },
  {
    source: 'Mumbai Central',
    destination: 'Bandra West, Mumbai',
    pickupCoordinates: { type: 'Point', coordinates: [72.8311, 19.0669] },
    dropCoordinates: { type: 'Point', coordinates: [72.8280, 19.0596] },
    date: new Date(),
    time: '14:30',
    distance: 8,
    duration: 20,
    pricePerKm: 15,
    totalSeats: 4,
    availableSeats: 3,
    estimatedFare: 120,
    platformFee: 8,
    gst: 12,
    status: 'active'
  },
  {
    source: 'Navi Mumbai Mall',
    destination: 'Kharghar, Navi Mumbai',
    pickupCoordinates: { type: 'Point', coordinates: [73.0233, 19.0380] },
    dropCoordinates: { type: 'Point', coordinates: [73.0845, 19.0738] },
    date: new Date(),
    time: '11:15',
    distance: 12,
    duration: 25,
    pricePerKm: 10,
    totalSeats: 4,
    availableSeats: 1,
    estimatedFare: 120,
    platformFee: 8,
    gst: 12,
    status: 'ongoing'
  },
  {
    source: 'Thane West',
    destination: 'Mumbai Airport',
    pickupCoordinates: { type: 'Point', coordinates: [72.9781, 19.2183] },
    dropCoordinates: { type: 'Point', coordinates: [72.8679, 19.0995] },
    date: new Date(),
    time: '16:45',
    distance: 22,
    duration: 45,
    pricePerKm: 14,
    totalSeats: 4,
    availableSeats: 2,
    estimatedFare: 308,
    platformFee: 15,
    gst: 30,
    status: 'completed'
  },
  {
    source: 'Mumbai CST',
    destination: 'Panvel, Navi Mumbai',
    pickupCoordinates: { type: 'Point', coordinates: [72.8354, 18.9402] },
    dropCoordinates: { type: 'Point', coordinates: [73.1087, 19.0005] },
    date: new Date(),
    time: '10:30',
    distance: 28,
    duration: 50,
    pricePerKm: 11,
    totalSeats: 4,
    availableSeats: 3,
    estimatedFare: 308,
    platformFee: 18,
    gst: 30,
    status: 'booked'
  },
  {
    source: 'Thane Ghodbunder Road',
    destination: 'Andheri, Mumbai',
    pickupCoordinates: { type: 'Point', coordinates: [72.9768, 19.2445] },
    dropCoordinates: { type: 'Point', coordinates: [72.8280, 19.1135] },
    date: new Date(),
    time: '13:00',
    distance: 25,
    duration: 55,
    pricePerKm: 13,
    totalSeats: 4,
    availableSeats: 2,
    estimatedFare: 325,
    platformFee: 20,
    gst: 35,
    status: 'active'
  },
  {
    source: 'Mumbai Domestic Airport',
    destination: 'Vashi, Navi Mumbai',
    pickupCoordinates: { type: 'Point', coordinates: [72.8679, 19.0995] },
    dropCoordinates: { type: 'Point', coordinates: [73.0078, 19.0735] },
    date: new Date(),
    time: '15:30',
    distance: 18,
    duration: 35,
    pricePerKm: 16,
    totalSeats: 4,
    availableSeats: 4,
    estimatedFare: 288,
    platformFee: 18,
    gst: 27,
    status: 'completed'
  },
  {
    source: 'Navi Mumbai Sector 17',
    destination: 'Thane Creek',
    pickupCoordinates: { type: 'Point', coordinates: [73.0156, 19.0456] },
    dropCoordinates: { type: 'Point', coordinates: [72.9502, 19.1548] },
    date: new Date(),
    time: '12:00',
    distance: 14,
    duration: 28,
    pricePerKm: 11,
    totalSeats: 4,
    availableSeats: 3,
    estimatedFare: 154,
    platformFee: 10,
    gst: 14,
    status: 'ongoing'
  },
  {
    source: 'Mumbai Marine Lines',
    destination: 'Thane Station',
    pickupCoordinates: { type: 'Point', coordinates: [72.8206, 18.9441] },
    dropCoordinates: { type: 'Point', coordinates: [73.0357, 19.1977] },
    date: new Date(),
    time: '17:00',
    distance: 30,
    duration: 60,
    pricePerKm: 15,
    totalSeats: 4,
    availableSeats: 1,
    estimatedFare: 450,
    platformFee: 27,
    gst: 45,
    status: 'booked'
  },
  {
    source: 'Navi Mumbai CBD Belapur',
    destination: 'Mumbai Dadar',
    pickupCoordinates: { type: 'Point', coordinates: [73.0456, 19.0158] },
    dropCoordinates: { type: 'Point', coordinates: [72.8447, 19.0178] },
    date: new Date(),
    time: '09:30',
    distance: 20,
    duration: 40,
    pricePerKm: 12,
    totalSeats: 4,
    availableSeats: 2,
    estimatedFare: 240,
    platformFee: 15,
    gst: 24,
    status: 'completed'
  },
  {
    source: 'Thane Manpada',
    destination: 'Navi Mumbai Airoli',
    pickupCoordinates: { type: 'Point', coordinates: [72.9989, 19.2367] },
    dropCoordinates: { type: 'Point', coordinates: [73.0256, 19.1589] },
    date: new Date(),
    time: '11:00',
    distance: 10,
    duration: 20,
    pricePerKm: 14,
    totalSeats: 4,
    availableSeats: 4,
    estimatedFare: 140,
    platformFee: 8,
    gst: 12,
    status: 'active'
  },
  {
    source: 'Mumbai Worli',
    destination: 'Navi Mumbai Seawoods',
    pickupCoordinates: { type: 'Point', coordinates: [72.8254, 19.0170] },
    dropCoordinates: { type: 'Point', coordinates: [73.0123, 19.0234] },
    date: new Date(),
    time: '16:00',
    distance: 16,
    duration: 32,
    pricePerKm: 15,
    totalSeats: 4,
    availableSeats: 2,
    estimatedFare: 240,
    platformFee: 15,
    gst: 22,
    status: 'completed'
  }
];

// Seed function
const seedData = async () => {
  try {
    console.log('🌱 Starting to seed admin dashboard data...');

    // Clear existing test data (optional - remove if you want to keep existing data)
    console.log('🗑️  Clearing existing test data...');
    await User.deleteMany({ email: { $in: [...sampleUsers.map(u => u.email), ...sampleDrivers.map(d => d.email)] } });
    await Vehicle.deleteMany({ licensePlate: { $in: sampleVehicles.map(v => v.licensePlate) } });
    await Ride.deleteMany({});
    await Booking.deleteMany({});
    await Payment.deleteMany({});

    // Create users
    console.log('👥 Creating users...');
    const createdUsers = [];
    for (const userData of sampleUsers) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = new User({ ...userData, password: hashedPassword });
      await user.save();
      createdUsers.push(user);
      console.log(`✅ Created user: ${user.email}`);
    }

    // Create drivers
    console.log('🚗 Creating drivers...');
    const createdDrivers = [];
    for (const driverData of sampleDrivers) {
      const hashedPassword = await bcrypt.hash(driverData.password, 10);
      const driver = new User({ ...driverData, password: hashedPassword });
      await driver.save();
      createdDrivers.push(driver);
      console.log(`✅ Created driver: ${driver.email}`);
    }

    // Create vehicles
    console.log('🚙 Creating vehicles...');
    const createdVehicles = [];
    for (let i = 0; i < sampleVehicles.length; i++) {
      const vehicle = new Vehicle({
        ...sampleVehicles[i],
        driver: createdDrivers[i]._id,
        isVerified: true,
        isActive: true
      });
      await vehicle.save();
      createdVehicles.push(vehicle);
      console.log(`✅ Created vehicle: ${vehicle.vehicleNumber}`);
    }

    // Create rides
    console.log('🛣️  Creating rides...');
    const createdRides = [];
    for (let i = 0; i < sampleRides.length; i++) {
      const rideData = sampleRides[i];
      const driverIndex = i % createdDrivers.length;
      const vehicleIndex = i % createdVehicles.length;
      
      const ride = new Ride({
        ...rideData,
        driver: createdDrivers[driverIndex]._id,
        vehicle: createdVehicles[vehicleIndex]._id,
        createdAt: new Date(),
        ...(rideData.status === 'completed' && {
          startedAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
          completedAt: new Date()
        }),
        ...(rideData.status === 'ongoing' && {
          startedAt: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
        })
      });
      await ride.save();
      createdRides.push(ride);
      console.log(`✅ Created ride: ${ride.source} to ${ride.destination}`);
    }

    // Create bookings
    console.log('📋 Creating bookings...');
    const createdBookings = [];
    for (let i = 0; i < 8; i++) {
      const ride = createdRides[i % createdRides.length];
      const passenger = createdUsers[i % createdUsers.length];
      
      const booking = new Booking({
        rideId: ride._id,
        passenger: passenger._id,
        driver: ride.driver,
        seatsBooked: Math.floor(Math.random() * 2) + 1, // 1 or 2 seats
        farePerSeat: ride.estimatedFare / ride.totalSeats,
        totalFare: ride.estimatedFare,
        platformFee: Math.floor(ride.estimatedFare * 0.1),
        gst: Math.floor(ride.estimatedFare * 0.18),
        finalAmount: ride.estimatedFare,
        status: ride.status === 'completed' ? 'completed' : ride.status === 'ongoing' ? 'confirmed' : 'confirmed',
        pickupLocation: ride.source,
        dropLocation: ride.destination,
        pickupTime: ride.time,
        paymentStatus: ride.status === 'completed' ? 'completed' : 'pending',
        ...(ride.status === 'completed' && {
          completedAt: new Date()
        })
      });
      await booking.save();
      createdBookings.push(booking);
      console.log(`✅ Created booking for ${passenger.firstName}`);
    }

    // Create payments
    console.log('💳 Creating payments...');
    for (let i = 0; i < createdBookings.length; i++) {
      const booking = createdBookings[i];
      const ride = createdRides.find(r => r._id.toString() === booking.rideId.toString());
      
      const payment = new Payment({
        booking: booking._id,
        passenger: booking.passenger,
        driver: booking.driver,
        ride: booking.rideId,
        amount: booking.totalFare,
        platformFee: Math.floor(booking.totalFare * 0.1),
        gst: Math.floor(booking.totalFare * 0.18),
        totalAmount: booking.totalFare,
        status: ride.status === 'completed' ? 'completed' : 'pending',
        paymentMethod: ['upi', 'card', 'cash', 'wallet'][Math.floor(Math.random() * 4)],
        transactionId: `TXN${Date.now()}${i}`,
        ...(ride.status === 'completed' && {
          completedAt: new Date()
        })
      });
      await payment.save();
      console.log(`✅ Created payment: ₹${payment.totalAmount}`);
    }

    console.log('\n🎉 Admin dashboard data seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`   👥 Users: ${createdUsers.length}`);
    console.log(`   🚗 Drivers: ${createdDrivers.length}`);
    console.log(`   🛣️  Rides: ${createdRides.length}`);
    console.log(`   📋 Bookings: ${createdBookings.length}`);
    console.log(`   💳 Payments: ${createdBookings.length}`);
    
    // Calculate total revenue
    const totalRevenue = await Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    console.log(`   💰 Total Revenue: ₹${totalRevenue[0]?.total || 0}`);

  } catch (error) {
    console.error('❌ Error seeding data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Database connection closed');
  }
};

// Run the seed script
if (require.main === module) {
  connectDB().then(() => {
    seedData();
  });
}

module.exports = seedData;
