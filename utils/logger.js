// Simple error logging utility (no sensitive data)
const logger = {
  error: (message, error = null, context = {}) => {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: 'ERROR',
      message,
      context: sanitizeContext(context),
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : null
    };
    
    console.error(JSON.stringify(logEntry, null, 2));
  },

  warn: (message, context = {}) => {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: 'WARN',
      message,
      context: sanitizeContext(context)
    };
    
    console.warn(JSON.stringify(logEntry, null, 2));
  },

  info: (message, context = {}) => {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: 'INFO',
      message,
      context: sanitizeContext(context)
    };
    
    console.log(JSON.stringify(logEntry, null, 2));
  },

  // Log API requests without sensitive data
  api: (method, url, statusCode, duration, userId = null) => {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: 'API',
      method,
      url: sanitizeUrl(url),
      statusCode,
      duration: `${duration}ms`,
      userId: userId ? `user-${userId.toString().slice(-6)}` : null
    };
    
    console.log(JSON.stringify(logEntry, null, 2));
  },

  // Log socket events
  socket: (event, userId = null, roomId = null) => {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: 'SOCKET',
      event,
      userId: userId ? `user-${userId.toString().slice(-6)}` : null,
      roomId
    };
    
    console.log(JSON.stringify(logEntry, null, 2));
  }
};

// Helper function to remove sensitive data from context
function sanitizeContext(context) {
  if (!context || typeof context !== 'object') return context;
  
  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'authorization', 'email', 'phone'];
  const sanitized = { ...context };
  
  for (const key in sanitized) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeContext(sanitized[key]);
    }
  }
  
  return sanitized;
}

// Helper function to sanitize URLs
function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return url;
  
  // Remove query parameters that might contain sensitive data
  const urlObj = new URL(url, 'http://localhost');
  urlObj.search = '';
  return urlObj.pathname + urlObj.search;
}

module.exports = logger;
