/**
 * NearChat Full-Stack Server
 * Integrates Express API, Socket.io WebSocket server, and Vite dev middleware on port 3000.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { createServer as createHttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { config } from './server/config.js';
import { setupSignalingHandlers } from './server/socket/signaling.js';
import {
  runMatchmakerCycle,
  waitingQueue,
  activeUsers,
  broadcastOnlineCounts
} from './server/socket/matchmaking.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createHttpServer(app);

  // Security headers & CORS
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false
    })
  );

  app.use(
    cors({
      origin: config.CLIENT_ORIGIN === '*' ? true : config.CLIENT_ORIGIN,
      credentials: true
    })
  );

  app.use(express.json());

  // API endpoints
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

  app.get('/api/config', (req, res) => {
    res.json({
      maxRadiusKm: config.MAX_RADIUS_KM,
      iceServers: config.ICE_SERVERS
    });
  });

  // Attach Socket.io WebSocket server
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 20000,
    pingInterval: 10000
  });

  io.on('connection', (socket) => {
    setupSignalingHandlers(io, socket);
    broadcastOnlineCounts(io);
  });

  // Re-run matching cycle every 3 seconds
  setInterval(() => {
    try {
      runMatchmakerCycle(io);
      broadcastOnlineCounts(io);
    } catch (err) {
      console.error('Error in matchmaker cycle:', err);
    }
  }, 3000);

  // MongoDB connection attempt
  if (config.MONGO_URI) {
    mongoose
      .connect(config.MONGO_URI)
      .then(() => console.log('MongoDB connected'))
      .catch((err) =>
        console.warn('MongoDB connection failed. Operating with in-memory fallback:', err.message)
      );
  } else {
    console.log('Running NearChat with in-memory storage for reports and bans (no MONGO_URI provided).');
  }

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    // Mount Vite dev server in middleware mode
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // Serve production static build
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  const port = config.PORT || 3000;
  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`NearChat full-stack server running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
