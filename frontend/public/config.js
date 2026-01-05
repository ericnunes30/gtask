// Runtime configuration for development
// This file is optional and used for production environment variables
window.__ENV__ = window.__ENV__ || {
  // Development environment defaults
  NODE_ENV: 'development',
  BACKEND_API_URL: 'http://192.168.1.116:3334',
  // Add any other environment variables needed for development
};

// Log that config was loaded successfully
console.log('[Config] Runtime configuration loaded for development');