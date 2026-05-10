const mongoose = require('mongoose');

const driverLocationSchema = new mongoose.Schema(
    {
        rideId: {
            type: String,
            required: true,
        },
        driverId: {
            type: String,
            default: 'driver-1',
        },
        lat: {
            type: Number,
            required: true,
        },
        lng: {
            type: Number,
            required: true,
        },
        heading: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('DriverLocation', driverLocationSchema);