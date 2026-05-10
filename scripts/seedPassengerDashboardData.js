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

// Sample passenger user
const passengerUser = {
  firstName: 'Vaishali',
  surname: 'Bendre',
  email: 'vaishalibendre00@gmail.com',
  phone: '9876543200',
  password: 'password123',
  role: 'user',
  isEmailVerified: true
};

// Sample drivers for passenger rides
const sampleDrivers = [
  {
    firstName: 'Rohit',
    surname: 'Sharma',
    email: 'rohit.driver@example.com',
    phone: '8888888001',
    password: 'password123',
    role: 'driver',
    isDriver: true,
    isEmailVerified: true,
    isBlocked: false
  },
  {
    firstName: 'Amit',
    surname: 'Patel',
    email: 'amit.driver@example.com',
    phone: '8888888002',
    password: 'password123',
    role: 'driver',
    isDriver: true,
    isEmailVerified: true,
    isBlocked: false
  },
  {
    firstName: 'Suresh',
    surname: 'Kumar',
    email: 'suresh.driver@example.com',
    phone: '8888888003',
    password: 'password123',
    role: 'driver',
    isDriver: true,
    isEmailVerified: true,
    isBlocked: false
  }
];

// Sample vehicles for drivers
const sampleVehicles = [
  {
    make: 'Maruti',
    model: 'Swift',
    year: 2022,
    vehicleNumber: 'MH12AB3456',
    vehicleType: 'hatchback',
    totalSeats: 4,
    color: 'White',
    fuelType: 'petrol',
    rcNumber: 'MH1220220003456',
    insuranceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    pucValidUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
  },
  {
    make: 'Hyundai',
    model: 'i20',
    year: 2021,
    vehicleNumber: 'MH12CD7890',
    vehicleType: 'hatchback',
    totalSeats: 4,
    color: 'Silver',
    fuelType: 'petrol',
    rcNumber: 'MH1220210007890',
    insuranceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    pucValidUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
  },
  {
    make: 'Toyota',
    model: 'Innova',
    year: 2023,
    vehicleNumber: 'MH12EF1234',
    vehicleType: 'suv',
    totalSeats: 7,
    color: 'Black',
    fuelType: 'diesel',
    rcNumber: 'MH1220230001234',
    insuranceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    pucValidUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
  }
];

// Sample rides for passenger (Thane, Mumbai, Navi Mumbai only)
const sampleRides = [
  // Upcoming rides (3)
  {
    source: 'Thane Railway Station',
    destination: 'Vashi, Navi Mumbai',
    pickupCoordinates: { type: 'Point', coordinates: [73.0357, 19.1977] },
    dropCoordinates: { type: 'Point', coordinates: [73.0078, 19.0735] },
    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    time: '09:00',
    distance: 15,
    duration: 30,
    pricePerKm: 12,
    totalSeats: 4,
    availableSeats: 3,
    estimatedFare: 180,
    platformFee: 10,
    gst: 18,
    status: 'active'
  },
  {
    source: 'Mumbai Central',
    destination: 'Bandra West, Mumbai',
    pickupCoordinates: { type: 'Point', coordinates: [72.8311, 19.0669] },
    dropCoordinates: { type: 'Point', coordinates: [72.8280, 19.0596] },
    date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    time: '14:30',
    distance: 8,
    duration: 20,
    pricePerKm: 15,
    totalSeats: 4,
    availableSeats: 2,
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
    date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    time: '11:15',
    distance: 12,
    duration: 25,
    pricePerKm: 10,
    totalSeats: 4,
    availableSeats: 1,
    estimatedFare: 120,
    platformFee: 8,
    gst: 12,
    status: 'active'
  },
  // Completed rides (3) - use today's date to pass validation but mark as completed
  {
    source: 'Thane West',
    destination: 'Mumbai Airport',
    pickupCoordinates: { type: 'Point', coordinates: [72.9781, 19.2183] },
    dropCoordinates: { type: 'Point', coordinates: [72.8679, 19.0995] },
    date: new Date(), // Today's date to pass validation
    time: '08:00', // Earlier time to simulate completed
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
    source: 'Mumbai Domestic Airport',
    destination: 'Vashi, Navi Mumbai',
    pickupCoordinates: { type: 'Point', coordinates: [72.8679, 19.0995] },
    dropCoordinates: { type: 'Point', coordinates: [73.0078, 19.0735] },
    date: new Date(), // Today's date to pass validation
    time: '07:30', // Earlier time to simulate completed
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
    source: 'Navi Mumbai CBD Belapur',
    destination: 'Mumbai Dadar',
    pickupCoordinates: { type: 'Point', coordinates: [73.0456, 19.0158] },
    dropCoordinates: { type: 'Point', coordinates: [72.8447, 19.0178] },
    date: new Date(), // Today's date to pass validation
    time: '06:45', // Earlier time to simulate completed
    distance: 20,
    duration: 40,
    pricePerKm: 12,
    totalSeats: 4,
    availableSeats: 2,
    estimatedFare: 240,
    platformFee: 15,
    gst: 24,
    status: 'completed'
  }
];

// Seed function
const seedData = async () => {
  try {
    console.log('🌱 Starting to seed passenger dashboard data...');

    // Create or find passenger user
    console.log('👤 Creating passenger user...');
    let passenger = await User.findOne({ email: passengerUser.email });
    
    if (!passenger) {
      const hashedPassword = await bcrypt.hash(passengerUser.password, 10);
      passenger = new User({ ...passengerUser, password: hashedPassword });
      await passenger.save();
      console.log(`✅ Created passenger: ${passenger.email}`);
    } else {
      console.log(`✅ Passenger already exists: ${passenger.email}`);
    }

    // Create drivers if they don't exist
    console.log('🚗 Creating drivers...');
    const createdDrivers = [];
    for (const driverData of sampleDrivers) {
      let driver = await User.findOne({ email: driverData.email });
      
      if (!driver) {
        const hashedPassword = await bcrypt.hash(driverData.password, 10);
        driver = new User({ ...driverData, password: hashedPassword });
        await driver.save();
        console.log(`✅ Created driver: ${driver.email}`);
      } else {
        console.log(`✅ Driver already exists: ${driver.email}`);
      }
      
      createdDrivers.push(driver);
    }

    // Create vehicles if they don't exist
    console.log('🚙 Creating vehicles...');
    const createdVehicles = [];
    for (let i = 0; i < sampleVehicles.length; i++) {
      let vehicle = await Vehicle.findOne({ vehicleNumber: sampleVehicles[i].vehicleNumber });
      
      if (!vehicle) {
        const vehicle = new Vehicle({
          ...sampleVehicles[i],
          driver: createdDrivers[i]._id,
          isVerified: true,
          isActive: true
        });
        await vehicle.save();
        createdVehicles.push(vehicle);
        console.log(`✅ Created vehicle: ${vehicle.vehicleNumber}`);
      } else {
        createdVehicles.push(vehicle);
        console.log(`✅ Vehicle already exists: ${vehicle.vehicleNumber}`);
      }
    }

    // Clear existing passenger rides and bookings
    console.log('🗑️  Clearing existing passenger data...');
    await Booking.deleteMany({ passenger: passenger._id });
    await Ride.deleteMany({ driver: { $in: createdDrivers.map(d => d._id) } });

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
          startedAt: new Date(Date.now() - 60 * 60 * 1000),
          completedAt: new Date()
        })
      });
      await ride.save();
      createdRides.push(ride);
      console.log(`✅ Created ride: ${ride.source} to ${ride.destination}`);
    }

    // Create bookings for passenger
    console.log('📋 Creating bookings for passenger...');
    const createdBookings = [];
    for (let i = 0; i < createdRides.length; i++) {
      const ride = createdRides[i];
      
      const booking = new Booking({
        rideId: ride._id,
        passenger: passenger._id,
        driver: ride.driver,
        seatsBooked: 1,
        farePerSeat: ride.estimatedFare / ride.totalSeats,
        totalFare: ride.estimatedFare / ride.totalSeats,
        platformFee: Math.floor((ride.estimatedFare / ride.totalSeats) * 0.1),
        gst: Math.floor((ride.estimatedFare / ride.totalSeats) * 0.18),
        finalAmount: ride.estimatedFare / ride.totalSeats,
        status: ride.status === 'completed' ? 'completed' : 'confirmed',
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

    // Create payments for completed rides
    console.log('💳 Creating payments...');
    for (const booking of createdBookings) {
      const ride = createdRides.find(r => r._id.toString() === booking.rideId.toString());
      
      if (ride.status === 'completed') {
        const payment = new Payment({
          booking: booking._id,
          passenger: booking.passenger,
          driver: booking.driver,
          ride: booking.rideId,
          amount: booking.totalFare,
          platformFee: booking.platformFee,
          gst: booking.gst,
          totalAmount: booking.finalAmount,
          status: 'completed',
          paymentMethod: ['upi', 'card', 'cash', 'wallet'][Math.floor(Math.random() * 4)],
          transactionId: `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`,
          completedAt: new Date()
        });
        await payment.save();
        console.log(`✅ Created payment: ₹${payment.totalAmount}`);
      }
    }

    console.log('\n🎉 Passenger dashboard data seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`   👤 Passenger: ${passenger.firstName} ${passenger.surname} (${passenger.email})`);
    console.log(`   🚗 Drivers: ${createdDrivers.length}`);
    console.log(`   🚙 Vehicles: ${createdVehicles.length}`);
    console.log(`   🛣️  Rides: ${createdRides.length}`);
    console.log(`   📋 Bookings: ${createdBookings.length}`);
    
    // Calculate stats
    const totalRides = createdBookings.length;
    const upcomingRides = createdBookings.filter(b => b.status === 'confirmed').length;
    const completedRides = createdBookings.filter(b => b.status === 'completed').length;
    const totalMoneySaved = createdBookings
      .filter(b => b.status === 'completed')
      .reduce((sum, b) => sum + b.finalAmount, 0);
    
    console.log(`   📈 Total Rides: ${totalRides}`);
    console.log(`   📅 Upcoming: ${upcomingRides}`);
    console.log(`   ✅ Completed: ${completedRides}`);
    console.log(`   💰 Money Saved: ₹${totalMoneySaved}`);

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
