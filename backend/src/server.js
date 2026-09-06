import app from './app.js';
import config from './config/env.js';

const PORT = config.port;

const server = app.listen(PORT, () => {
  console.log('================================================================');
  console.log('  PRAMAAN: Fake Identity & Document Screening System Backend');
  console.log('  SIH 2026 Problem Statement: SIH26188');
  console.log('  SSB, Police II Division / Ministry of Home Affairs');
  console.log('================================================================');
  console.log(`  - Server running on:    http://localhost:${PORT}`);
  console.log(`  - Health endpoint:      http://localhost:${PORT}/api/health`);
  console.log(`  - Environment:          ${config.nodeEnv}`);
  console.log(`  - AI Engine Mode:       ${config.ai.mode.toUpperCase()}`);
  console.log(`  - Supabase Configured:  ${config.supabase.isConfigured ? 'YES' : 'NO (Mock mode)'}`);
  console.log(`  - Allowed Frontend:     ${config.frontendUrl}`);
  console.log('================================================================');
});

// Graceful shutdown handling
const handleShutdown = (signal) => {
  console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log('[Server] HTTP server closed cleanly.');
    process.exit(0);
  });

  // Force close if connections don't drain within 5s
  setTimeout(() => {
    console.error('[Server] Forced shutdown after timeout.');
    process.exit(1);
  }, 5000);
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

export default server;
