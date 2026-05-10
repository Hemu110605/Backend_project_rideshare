const validateProductionEnv = () => {
  const requiredVars = [
    'FRONTEND_URL',
    'BACKEND_URL', 
    'GOOGLE_CALLBACK_URL',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET'
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('Missing required environment variables for production:');
    missing.forEach(varName => console.error(`  - ${varName}`));
    console.error('Please set these environment variables and restart the server.');
    process.exit(1);
  }
};

const getEnvironmentConfig = () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  // Development URLs - allow fallbacks
  const development = {
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
    BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:5002',
    GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5002/api/auth/google/callback',
    CORS_ORIGINS: [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000'
    ]
  };

  // Production URLs - NO FALLBACKS, fail fast if missing
  if (nodeEnv === 'production') {
    validateProductionEnv();
  }

  const production = {
    FRONTEND_URL: process.env.FRONTEND_URL,
    BACKEND_URL: process.env.BACKEND_URL,
    GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL,
    CORS_ORIGINS: [
      process.env.FRONTEND_URL,
      'https://frontend-rideshare.vercel.app' // Keep existing production URL for backward compatibility
    ].filter(Boolean)
  };

  // Test URLs (for testing environments)
  const test = {
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
    BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:5002',
    GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5002/api/auth/google/callback',
    CORS_ORIGINS: [
      'http://localhost:5173',
      'http://localhost:3000'
    ]
  };

  const config = {
    development,
    production,
    test
  }[nodeEnv] || development;

  // Log environment configuration for debugging
  console.log(`Environment: ${nodeEnv}`);
  console.log(`Frontend URL: ${config.FRONTEND_URL}`);
  console.log(`Backend URL: ${config.BACKEND_URL}`);
  console.log(`Google Callback URL: ${config.GOOGLE_CALLBACK_URL}`);

  return config;
};

module.exports = {
  getEnvironmentConfig
};
