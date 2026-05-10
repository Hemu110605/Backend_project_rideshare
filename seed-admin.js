require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@rideshare.com' });
    if (existingAdmin) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Create admin user
    const admin = new User({
      firstName: 'Admin',
      surname: 'User',
      email: 'admin@rideshare.com',
      phone: '9998887774',
      password: 'admin123',
      role: 'admin',
      isDriver: false
    });

    await admin.save();
    console.log('Admin user created successfully');
    console.log('Email: admin@rideshare.com');
    console.log('Password: admin123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
};

createAdmin();
