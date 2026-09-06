import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import config from './config/env.js';
import { standardLimiter } from './middleware/rateLimitMiddleware.js';
import { notFoundHandler, errorHandler } from './middleware/errorMiddleware.js';
import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import documentRoutes from './routes/documentRoutes.js';

const app = express();

// Security headers
app.use(helmet());

// CORS configuration for frontend integration
app.use(
  cors({
    origin: [
      config.frontendUrl,
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:3000',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-mock-role', 'x-user-role'],
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
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;
