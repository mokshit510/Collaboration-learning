import { Router } from 'express';
import config from '../config/env.js';
import { checkSupabaseConnection } from '../config/supabase.js';
import { sendSuccess } from '../utils/response.js';

const router = Router();

/**
 * @route   GET /api/health
 * @desc    System health check and runtime status
 * @access  Public
 */
router.get('/', async (req, res, next) => {
  try {
    const supabaseStatus = await checkSupabaseConnection();

    const healthData = {
      status: 'HEALTHY',
      service: 'PRAMAAN Screening Backend API',
      sihProblemStatement: 'SIH26188',
      organization: 'Ministry of Home Affairs / Sashastra Seema Bal (SSB), Police II Division',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
      aiMode: config.ai.mode,
      services: {
        api: 'running',
        supabase: {
          configured: config.supabase.isConfigured,
          status: supabaseStatus.connected ? 'connected' : 'mock/unconfigured',
          message: supabaseStatus.message,
        },
        aiEngine: {
          mode: config.ai.mode,
          url: config.ai.isMock ? 'internal-mock-engine' : config.ai.serviceUrl,
        },
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        memoryUsageMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
    };

    return sendSuccess(res, healthData, 'PRAMAAN Backend service is operational');
  } catch (err) {
    next(err);
  }
});

export default router;
