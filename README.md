# RideShare Carpooling Backend

A complete production-ready backend for a carpooling platform similar to Sride/Uber Pool where users can share rides, split fare based on distance and duration, negotiate pricing, manage bookings, and support user, driver, and admin roles.

## Features

### Core Features
- **Authentication**: JWT-based auth with refresh tokens, role-based access (user/driver/admin)
- **User Management**: Profile management, ride history, payment history
- **Driver Management**: Driver profile, vehicle management, ride posting, earnings dashboard
- **Ride Management**: Create rides, search/filter rides, real-time seat availability
- **Booking System**: Book rides, manage bookings, OTP-based ride confirmation
- **Payment System**: UPI-ready payment structure, transaction management, refund support
- **Negotiation System**: Chat-style fare negotiation between passengers and drivers
- **Review System**: Rating and review system with detailed aspects and tags
- **Admin Dashboard**: Complete admin panel with analytics and user management

### Technical Features
- RESTful API design
- MongoDB Atlas with Mongoose ODM
- JWT authentication with refresh tokens
- Comprehensive validation and error handling
- Scalable MVC architecture
- Production-ready with deployment configuration

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB Atlas with Mongoose
- **Authentication**: JWT (access + refresh tokens)
- **Security**: bcryptjs, express-validator
- **Development**: nodemon, morgan
- **Environment**: dotenv, cors, cookie-parser

## Project Structure

```
RideShare-carpooling/
|-- config/
|   |-- database.js          # MongoDB connection
|-- controllers/
|   |-- authController.js    # Authentication logic
|   |-- userController.js    # User operations
|   |-- driverController.js  # Driver operations
|   |-- rideController.js    # Ride management
|   |-- bookingController.js # Booking operations
|   |-- paymentController.js # Payment processing
|   |-- negotiationController.js # Fare negotiation
|   |-- adminController.js   # Admin operations
|   |-- reviewController.js  # Review system
|-- middleware/
|   |-- auth.js              # Authentication middleware
|   |-- validation.js        # Request validation
|   |-- errorHandler.js      # Error handling
|   |-- notFound.js          # 404 handler
|-- models/
|   |-- User.js              # User schema
|   |-- Vehicle.js           # Vehicle schema
|   |-- Ride.js              # Ride schema
|   |-- Booking.js           # Booking schema
|   |-- Payment.js           # Payment schema
|   |-- Negotiation.js       # Negotiation schema
|   |-- Review.js            # Review schema
|-- routes/
|   |-- auth.js              # Auth routes
|   |-- users.js             # User routes
|   |-- drivers.js           # Driver routes
|   |-- vehicles.js          # Vehicle routes
|   |-- rides.js             # Ride routes
|   |-- bookings.js          # Booking routes
|   |-- payments.js          # Payment routes
|   |-- negotiations.js      # Negotiation routes
|   |-- admin.js             # Admin routes
|   |-- reviews.js           # Review routes
|-- utils/
|   |-- jwtUtils.js          # JWT utilities
|   |-- seed.js              # Database seeding
|-- .env.example             # Environment variables template
|-- server.js                # Main server file
|-- package.json             # Dependencies and scripts
```

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB Atlas account
- Git

### Setup Steps

1. **Clone the repository**
```bash
git clone <repository-url>
cd RideShare-carpooling
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` file with your configuration:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Atlas Connection
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/rideshare?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random
JWT_REFRESH_SECRET=your_super_secret_refresh_jwt_key_here_make_it_long_and_random
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d

# CORS Configuration
FRONTEND_URL=http://localhost:3000

# Payment Configuration (for future Razorpay integration)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

4. **Run the application**
```bash
# Development mode
npm run dev

# Production mode
npm start
```

5. **Seed the database (optional)**
```bash
npm run seed
```

## API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "firstName": "John",
  "surname": "Doe",
  "phone": "9876543210",
  "email": "john@example.com",
  "password": "password123",
  "role": "user" // optional: "user", "driver", "admin"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com", // or phone
  "password": "password123",
  "rememberMe": true // optional
}
```

#### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your_refresh_token"
}
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "refreshToken": "your_refresh_token" // optional
}
```

### Ride Endpoints

#### Get All Rides
```http
GET /api/rides?page=1&limit=10&source=Mumbai&destination=Pune&vehicleType=sedan
```

#### Create Ride (Driver Only)
```http
POST /api/rides
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "vehicle": "vehicle_id",
  "source": "Mumbai",
  "destination": "Pune",
  "pickupCoordinates": { "lat": 19.0760, "lng": 72.8777 },
  "dropCoordinates": { "lat": 18.5204, "lng": 73.8567 },
  "date": "2024-01-15",
  "time": "09:00",
  "distance": 150,
  "duration": 180,
  "pricePerKm": 8,
  "totalSeats": 4,
  "availableSeats": 3
}
```

#### Search Rides
```http
GET /api/rides/search?pickupLat=19.0760&pickupLng=72.8777&dropLat=18.5204&dropLng=73.8567&radius=50
```

### Booking Endpoints

#### Book Ride
```http
POST /api/bookings
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "rideId": "ride_id",
  "seatsBooked": 1,
  "pickupLocation": "Andheri, Mumbai",
  "dropLocation": "Koregaon Park, Pune",
  "pickupTime": "09:15"
}
```

#### Confirm Booking (Driver Only)
```http
PUT /api/bookings/:id/confirm
Authorization: Bearer <access_token>
```

#### Complete Booking (Driver Only)
```http
PUT /api/bookings/:id/complete
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "otp": "123456"
}
```

### Payment Endpoints

#### Process Payment
```http
POST /api/payments/process
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "bookingId": "booking_id",
  "paymentMethod": "upi",
  "upiDetails": {
    "upiId": "user@ybl"
  }
}
```

#### Get Payment History
```http
GET /api/payments/history?page=1&limit=10&status=completed
Authorization: Bearer <access_token>
```

### Negotiation Endpoints

#### Initiate Negotiation
```http
POST /api/negotiations/initiate
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "bookingId": "booking_id",
  "proposedFare": 900,
  "message": "Can you offer a discount?"
}
```

#### Respond to Negotiation
```http
POST /api/negotiations/:id/respond
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "action": "accept", // "accept", "reject", "counter"
  "message": "I accept your offer"
}
```

### Review Endpoints

#### Create Review
```http
POST /api/reviews
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "bookingId": "booking_id",
  "rating": 5,
  "comment": "Great ride!",
  "aspects": {
    "punctuality": 5,
    "driving": 5,
    "cleanliness": 5,
    "communication": 5,
    "safety": 5
  },
  "tags": ["on-time", "friendly", "safe-driver"]
}
```

## Database Models

### User
- Personal information (name, phone, email)
- Authentication (password, refresh tokens)
- Role-based access (user/driver/admin)
- Profile management

### Vehicle
- Vehicle details (make, model, year, color)
- Registration and documents
- Verification status
- Rating system

### Ride
- Route information (source, destination, coordinates)
- Schedule (date, time, duration)
- Pricing (fare calculation, platform fees)
- Seat management
- Status tracking

### Booking
- Booking details (seats, fare calculation)
- Status management (pending, confirmed, completed)
- OTP verification
- Payment integration

### Payment
- Transaction details
- Payment methods (UPI, card, cash)
- Status tracking
- Refund management

### Negotiation
- Fare negotiation workflow
- Message history
- Status tracking
- Expiration handling

### Review
- Rating system (1-5 stars)
- Detailed aspects (punctuality, driving, etc.)
- Tags and comments
- Response system

## Deployment

### Render Deployment

1. **Create Render Account**
   - Sign up at [Render](https://render.com)
   - Create a new Web Service

2. **Configure Environment Variables**
   - Add all variables from `.env.example`
   - Set `NODE_ENV=production`
   - Update `MONGO_URI` with your Atlas connection string

3. **Build Settings**
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Node Version: 18 or higher

4. **Deploy**
   - Connect your GitHub repository
   - Deploy automatically on push to main branch

### Environment Variables for Production
```env
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/rideshare?retryWrites=true&w=majority
JWT_SECRET=your_production_jwt_secret
JWT_REFRESH_SECRET=your_production_refresh_secret
FRONTEND_URL=https://your-frontend-domain.com
```

## Sample Data

The seed script creates sample data including:
- Admin user: `admin@rideshare.com / admin123`
- Sample users: `john@example.com / user123`
- Sample drivers: `robert@example.com / driver123`
- Sample vehicles, rides, bookings, payments, reviews, and negotiations

Run the seed script:
```bash
npm run seed
```

## Security Features

- JWT-based authentication with refresh tokens
- Password hashing with bcryptjs
- Request validation and sanitization
- Role-based access control
- CORS configuration
- Rate limiting ready (can be added)
- Input validation with express-validator

## Error Handling

- Centralized error handling middleware
- Comprehensive error responses
- Validation error messages
- Development vs production error details
- Graceful shutdown handling

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team or create an issue in the repository.

---

**Note**: This is a backend-only implementation. You'll need to build or integrate with a frontend application to consume these APIs.
# RideShare_backend
# RideShare_backend
<<<<<<< HEAD
#   R i d e S h a r e _ b a c k e n d d  
 
=======
>>>>>>> 5ac37658648ba94131cd2f151bf13bedaed6c3a1
#   B a c k e n d _ p r o j e c t _ r i d e s h a r e  
 