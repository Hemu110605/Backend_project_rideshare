// Simple test script to verify Razorpay integration
require('dotenv').config();
const Razorpay = require('razorpay');

console.log('Testing Razorpay integration...');
console.log('Key ID:', process.env.RAZORPAY_KEY_ID ? '✓ Set' : '✗ Missing');
console.log('Key Secret:', process.env.RAZORPAY_KEY_SECRET ? '✓ Set' : '✗ Missing');

if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  try {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
    
    console.log('✓ Razorpay instance created successfully');
    
    // Test creating an order
    const options = {
      amount: 10000, // ₹100 in paise
      currency: 'INR',
      receipt: 'test_receipt_' + Date.now(),
      payment_capture: 1
    };
    
    razorpay.orders.create(options)
      .then(order => {
        console.log('✓ Test order created successfully:');
        console.log('  Order ID:', order.id);
        console.log('  Amount:', order.amount);
        console.log('  Currency:', order.currency);
        console.log('  Receipt:', order.receipt);
      })
      .catch(error => {
        console.log('✗ Order creation failed:', error.message);
        if (error.statusCode === 401) {
          console.log('  This suggests invalid API credentials');
        }
      });
      
  } catch (error) {
    console.log('✗ Razorpay initialization failed:', error.message);
  }
} else {
  console.log('✗ Cannot test - missing environment variables');
}
