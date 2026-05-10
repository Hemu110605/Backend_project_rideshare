// Simple in-memory rate limiting middleware
const rateLimitStore = new Map();

const rateLimiter = (windowMs, max, message) => {
  return (req, res, next) => {
    const key = req.ip + (req.headers['user-agent'] || '');
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get existing requests for this IP
    const requests = rateLimitStore.get(key) || [];
    
    // Filter out old requests outside the window
    const validRequests = requests.filter(timestamp => timestamp > windowStart);
    
    // Check if limit exceeded
    if (validRequests.length >= max) {
      return res.status(429).json({
        success: false,
        message: message || 'Too many requests, please try again later.',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    // Add current request timestamp
    validRequests.push(now);
    rateLimitStore.set(key, validRequests);

    // Clean up old entries periodically
    if (rateLimitStore.size > 10000) {
      for (const [storeKey, timestamps] of rateLimitStore.entries()) {
        const filtered = timestamps.filter(timestamp => timestamp > windowStart);
        if (filtered.length === 0) {
          rateLimitStore.delete(storeKey);
        } else {
          rateLimitStore.set(storeKey, filtered);
        }
      }
    }

    next();
  };
};

// Specific rate limiters for different endpoints
const authLimiter = rateLimiter(
  15 * 60 * 1000, // 15 minutes
  50, // 50 requests per window (for testing)
  'Too many login attempts, please try again after 15 minutes.'
);

const registerLimiter = rateLimiter(
  60 * 60 * 1000, // 1 hour
  20, // 20 registrations per hour (for testing)
  'Too many registration attempts, please try again after 1 hour.'
);

const forgotPasswordLimiter = rateLimiter(
  60 * 60 * 1000, // 1 hour
  10, // 10 password reset requests per hour (for testing)
  'Too many password reset attempts, please try again after 1 hour.'
);

const otpLimiter = rateLimiter(
  60 * 1000, // 1 minute
  3, // 3 OTP requests per minute per IP
  'Too many OTP requests, please try again after 1 minute.'
);

module.exports = {
  rateLimiter,
  authLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  otpLimiter
};
