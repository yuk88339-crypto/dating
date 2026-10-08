/**
 * NearChat Backend Server Entry Point
 * Express + Socket.io + Mongoose
 */

import http from 'http';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { config } from './config.js';
import { setupSignalingHandlers } from './socket/signaling.js';
import {
  runMatchmakerCycle,
  waitingQueue,
  activeUsers,
  broadcastOnlineCounts
} from './socket/matchmaking.js';

export function createApp() {
  const app = express();

  // Helmet security headers (with cross-origin resource policy permissive for video/assets)
  app.use(
    helmet({
      contentSecurityPolicy: false, // Vite/SPA dev compatibility
      crossOriginEmbedderPolicy: false
    })
  );

  // CORS restricted to configured origins or open for dev
  app.use(
    cors({
      origin: config.CLIENT_ORIGIN === '*' ? true : config.CLIENT_ORIGIN,
      credentials: true
    })
  );

  app.use(express.json());

  // Health and stats check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'NearChat Server',
      onlineUsers: activeUsers.size,
      inQueue: waitingQueue.size,
      maxRadiusKm: config.MAX_RADIUS_KM,
      timestamp: Date.now()
    });
  });

  // Client WebRTC config endpoint (STUN and TURN servers)
  app.get('/api/config', (req, res) => {
    res.json({
      maxRadiusKm: config.MAX_RADIUS_KM,
      iceServers: config.ICE_SERVERS
    });
  });

  return app;
}

export function createServer(customApp = null) {
  const app = customApp || createApp();
  const httpServer = http.createServer(app);

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.CLIENT_ORIGIN === '*' ? true : config.CLIENT_ORIGIN,
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 20000,
    pingInterval: 10000
  });

  // Setup socket connections
  io.on('connection', (socket) => {
    setupSignalingHandlers(io, socket);
    broadcastOnlineCounts(io);
  });

  // Re-run matching cycle every 3 seconds for all waiting users
  const matchInterval = setInterval(() => {
    try {
      runMatchmakerCycle(io);
      broadcastOnlineCounts(io);
    } catch (err) {
      console.error('Error in matchmaker cycle:', err);
    }
  }, 3000);

  // Connect to MongoDB if MONGO_URI is specified
  if (config.MONGO_URI) {
    mongoose
      .connect(config.MONGO_URI)
      .then(() => {
        console.log('MongoDB connected successfully');
      })
      .catch((err) => {
        console.warn('MongoDB connection failed. Operating with in-memory fallback store:', err.message);
      });
  } else {
    console.log('No MONGO_URI provided. NearChat running with in-memory store for reports and bans.');
  }

  return { app, httpServer, io, matchInterval };
}

// Standalone execution support: node server/index.js
const isDirectRun = process.argv[1]?.endsWith('server/index.js');
if (isDirectRun) {
  const { httpServer } = createServer();
  httpServer.listen(config.PORT, '0.0.0.0', () => {
    console.log(`NearChat standalone server running on http://0.0.0.0:${config.PORT}`);
  });
}
