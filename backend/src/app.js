
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import config from './config/env.js';
import { standardLimiter } from './middleware/rateLimitMiddleware.js';
import { notFoundHandler, errorHandler } from './middleware/errorMiddleware.js';
import healthRoutes from './routes/healthRoutes.js';
import ocrRoutes from './routes/ocrRoutes.js';
import authRoutes from './routes/authRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import referenceRoutes from './routes/referenceRoutes.js';
import sessionRoutes from './routes/sessionRoutes.js';
import nfcRoutes from './routes/nfcRoutes.js';
import faceRoutes from './routes/faceRoutes.js';

const app = express();

// Security headers
app.use(helmet());

// CORS configuration for frontend & mobile LAN integration
const allowedOrigins = [
  config.frontendUrl,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5175',
  'http://localhost:3000',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      // In development, allow localhost and any LAN private IP (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
      if (
        allowedOrigins.includes(origin) ||
        (!config.isProduction &&
          (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
            /^http:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin)))
      ) {
        return callback(null, true);
      }
      return callback(null, !config.isProduction);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-mock-role', 'x-user-role', 'Accept', 'x-session-id'],
  })
);

// Body parsers
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Rate limiting
app.use(standardLimiter);

// Request logging (in development)
if (!config.isProduction) {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`);
    });
    next();
  });
}

// Welcome root endpoint
app.get('/', (req, res) => {
  res.json({
    project: 'PRAMAAN - AI-Based Fake Identity & Document Screening System',
    sihProblemStatement: 'SIH26188',
    organization: 'Ministry of Home Affairs / Sashastra Seema Bal (SSB), Police II Division',
    status: 'online',
    healthCheck: '/api/health',
    version: '1.0.0',
  });
});

// Mount Routes
app.use('/api/health', healthRoutes);
app.use('/api/v1/ocr', ocrRoutes);
app.use('/api/v1/reference', referenceRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/v1/session', sessionRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/v1/nfc', nfcRoutes);
app.use('/api/nfc', nfcRoutes);
app.use('/api/v1/face', faceRoutes);
app.use('/api/face', faceRoutes);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;
