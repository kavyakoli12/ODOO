import http from 'node:http';
import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { Server as SocketIOServer } from 'socket.io';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { seedDemoUsers } from './services/user.service.js';
import { apiRouter } from './routes/api.router.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';

const app: Express = express();
const server = http.createServer(app);

// Allowed origins: CLIENT_ORIGIN env var + localhost for dev
const allowedOrigins = [
  env.CLIENT_ORIGIN,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5000',
].filter(Boolean);

const isOriginAllowed = (origin: string | undefined): boolean => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (origin.endsWith('.onrender.com')) return true;
  if (env.NODE_ENV === 'production') return true;
  return false;
};

// Initialize Socket.IO with CORS support
export const io = new SocketIOServer(server, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) return callback(null, true);
      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST'],
  },
});

// Basic Socket connection logger
io.on('connection', (socket) => {
  console.log(`🔌 [Socket.IO] Client connected: ${socket.id}`);

  socket.on('disconnect', (reason) => {
    console.log(`🔌 [Socket.IO] Client disconnected (${socket.id}): ${reason}`);
  });
});

// Middleware configuration
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows flexible development & Leaflet map tile rendering
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) return callback(null, true);
      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

import path from 'node:path';
import fs from 'node:fs';

app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Mount main API router FIRST
app.use('/api/v1', apiRouter);

// Check for built frontend dist folder in monorepo
const possibleDistPaths = [
  path.resolve(process.cwd(), 'frontend/dist'),
  path.resolve(process.cwd(), '../frontend/dist'),
];

const frontendDistPath = possibleDistPaths.find((p) => fs.existsSync(p));

if (frontendDistPath) {
  console.log(`📦 Serving static frontend from: ${frontendDistPath}`);
  app.use(express.static(frontendDistPath));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
} else {
  // Fallback root welcome route when frontend is not built
  app.get('/', (_req, res) => {
    res.json({
      name: 'SafeMap API Service',
      status: 'online',
      version: '1.0.0',
      documentation: '/api/v1',
      healthCheck: '/api/v1/health',
    });
  });
}

// 404 & Global Error Handling
app.use(notFound);
app.use(errorHandler);

// Start server
async function startServer(): Promise<void> {
  await connectDB();
  await seedDemoUsers();

  server.listen(env.PORT, () => {
    console.log(`
🚀 ========================================================
   SafeMap Backend Service Running!
   --------------------------------------------------------
   📡 URL:          http://localhost:${env.PORT}
   🩺 Health:       http://localhost:${env.PORT}/api/v1/health
   🌐 Client:       ${env.CLIENT_ORIGIN}
   ⚙️  Environment:  ${env.NODE_ENV}
========================================================
    `);
  });
}

// Graceful shutdown handlers
process.on('SIGINT', () => {
  console.log('\n🛑 Gracefully shutting down SafeMap Backend...');
  server.close(() => {
    console.log('✅ HTTP & WebSocket server closed.');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM. Shutting down...');
  server.close(() => {
    process.exit(0);
  });
});

startServer();
