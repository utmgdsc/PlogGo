// Environment configuration

// API Base URL from environment variable
export const API_URL = process.env.EXPO_PUBLIC_BASE_URL || "http://localhost:5000";

// API Routes with prefixes to match backend
export const API_ROUTES = {
  LOGIN: '/api/login',
  REGISTER: '/api/register',
  LOGOUT: '/api/logout',
  PROFILE: '/api/profile',
  METRICS: '/api/metrics',
  LEADERBOARD: '/api/leaderboard',
  USER: '/api/user',
  SESSIONS: '/api/sessions',
  SESSIONS_HISTORY: '/api/sessions-history',
  SESSIONS_LATEST: '/api/sessions-history/latest',
  DAILY_CHALLENGE: '/api/daily-challenge',
  LITTER_CLASSIFICATION: '/api/classify-litter'
};

// WebSocket URL - now using the same server as the HTTP API
// Socket.IO automatically converts http:// to ws:// internally
export const WEBSOCKET_URL = process.env.EXPO_PUBLIC_BASE_URL || "http://localhost:5000";

// Other configuration variables
export const DEFAULT_TIMEOUT = 10000; // 10 seconds

// Configuration object for default export
const config = {
  API_URL,
  API_ROUTES,
  WEBSOCKET_URL,
  DEFAULT_TIMEOUT
};

export default config; 