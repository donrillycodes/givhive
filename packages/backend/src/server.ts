import app from './app';
import { env } from './config/env';
import db from './config/database';
import logger from './utils/logger';
import { startCronJobs } from './scripts/cron';

// Graceful shutdown handler
// This ensures the server finishes processing current requests
// and closes database connections cleanly before shutting down
const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`${signal} received — shutting down gracefully`);

  try {
    await db.$disconnect();
    logger.info('Database connection closed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error });
    process.exit(1);
  }
};

// Start the server
const startServer = async (): Promise<void> => {
  try {
    // Test database connection before starting
    await db.$connect();
    logger.info('Database connection established');

    // Start listening for requests
    app.listen(env.port, () => {
      logger.info(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🌱 GivHive API
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Environment : ${env.nodeEnv}
  Port        : ${env.port}
  Database    : Connected
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);

      // Start scheduled cron jobs
      startCronJobs();
    });

    // Handle termination signals
    // SIGTERM — sent by Railway and Docker when shutting down a container
    // SIGINT  — sent when you press Ctrl+C in the terminal
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle unhandled promise rejections
    // These are async errors that were not caught anywhere
    process.on('unhandledRejection', (reason: unknown) => {
      logger.error('Unhandled promise rejection', { reason });
      gracefulShutdown('UNHANDLED_REJECTION');
    });

    // Handle uncaught exceptions
    // These are synchronous errors that were not caught anywhere
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught exception', { error });
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

startServer();
