/**
 * NearChat Server Configuration
 * Strict 30 km radius matching for strangers
 */

import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // Matching radius strictly capped at 30 km
  MAX_RADIUS_KM: Number(process.env.MAX_RADIUS_KM) || 30,
  
  // Server port (port 3000 for AI Studio environment)
  PORT: Number(process.env.PORT) || 3000,
  
  // MongoDB Connection String
  MONGO_URI: process.env.MONGO_URI || '',
  
  // Client Origin for CORS
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || '*',
  
  // Secret salt for hashing IP addresses (never store raw IPs)
  IP_SALT: process.env.IP_SALT || 'nearchat_secure_salt_2026',
  
  // WebRTC ICE Configuration (Public STUN + Configurable TURN)
  ICE_SERVERS: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    ...(process.env.TURN_SERVER ? [{
      urls: process.env.TURN_SERVER,
      username: process.env.TURN_USERNAME || '',
      credential: process.env.TURN_CREDENTIAL || ''
    }] : [])
  ],

  // Rate Limiting Constants
  RATE_LIMITS: {
    NEXT_COOLDOWN_MS: 2000,      // Max 1 'next' per 2 seconds
    MSG_WINDOW_MS: 3000,         // Max 5 messages per 3 seconds
    MSG_MAX_COUNT: 5,
    MSG_MAX_LENGTH: 500          // Max 500 characters per message
  },

  // Auto-ban configuration
  BAN_THRESHOLD_REPORTS: 3,     // 3 reports triggers auto-ban
  BAN_DURATION_MS: 24 * 60 * 60 * 1000 // 24 hours
};

export default config;
