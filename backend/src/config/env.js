import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '',
    secretKey: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    isConfigured: Boolean(
      process.env.SUPABASE_URL &&
      !process.env.SUPABASE_URL.includes('placeholder') &&
      (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)
    ),
  },
  ai: {
    serviceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
    mode: (process.env.AI_MODE || 'mock').toLowerCase(),
    isMock: (process.env.AI_MODE || 'mock').toLowerCase() === 'mock',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },
  upload: {
    maxSizeMb: parseInt(process.env.UPLOAD_MAX_SIZE_MB || '10', 10),
  },
};

export default config;
