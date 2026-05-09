import app from './app';
import ExpirationJob from './app/services/ExpirationJob';
import AnalyticsService from './app/services/AnalyticsService';
import logger from './lib/logger';

AnalyticsService.init();

const PORT = Number(process.env.PORT) || 3333;

const server = app.listen(PORT, () => {
  logger.info('server_started', { port: PORT, env: process.env.NODE_ENV || 'development' });
  ExpirationJob.start();
});

function shutdown(signal) {
  logger.info('shutdown_signal', { signal });
  server.close(() => {
    logger.info('server_closed');
    process.exit(0);
  });
  // Force exit if graceful close takes too long
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
