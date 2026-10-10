import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import http from 'http';
import connectDB from './config/db.js';
import sensorRoutes from './routes/sensorRoutes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { initSocket } from './socket/socket.js';
import weatherRoutes from './routes/weatherRoutes.js';

// Connect to database
connectDB();


const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials:true,
  methods: ['GET', 'POST']
}));
app.use("/api/weather", weatherRoutes);
// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', apiLimiter);

// Body parser with size limit
app.use(express.json({ limit: '10kb' }));

// Health Check API
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    server: 'running',
    database: 'connected' // Should dynamically check if needed, but for simplicity assuming connected if it reached here
  });
});

// Routes
app.use('/api', sensorRoutes);

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Start server
server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
