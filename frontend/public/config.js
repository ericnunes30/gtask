// Runtime configuration for development
// This file is optional and used for production environment variables
window.__ENV__ = window.__ENV__ || {
  // Development environment defaults
  NODE_ENV: 'development',
  API_URL: 'http://localhost:3000',
  // Add any other environment variables needed for development
};

// Log that config was loaded successfully
console.log('[Config] Runtime configuration loaded for development');