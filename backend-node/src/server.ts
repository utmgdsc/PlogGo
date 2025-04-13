import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { config } from './config';
import apiRoutes from './routes';
import { initWebSocketServer } from './websocket';

// Global error handlers for debugging
process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION:', error);
  // Don't exit the process in development
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', reason);
});

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Initialize WebSocket server
console.log('Initializing WebSocket server...');
const io = initWebSocketServer(httpServer);
console.log('WebSocket server initialized successfully');

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api', apiRoutes);

// Start the server
httpServer.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
  console.log(`WebSocket server is available on ws://localhost:${config.port}`);
}); 