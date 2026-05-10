import { Sequelize } from 'sequelize';
import { Umzug, SequelizeStorage } from 'umzug';
import path from 'path';
import app from './app';
import ExpirationJob from './app/services/ExpirationJob';
import AnalyticsService from './app/services/AnalyticsService';
import logger from './lib/logger';
import dbConfig from './config/database';

async function runMigrations() {
  const sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
    ...dbConfig,
    logging: false,
  });

  const umzug = new Umzug({
    migrations: {
      glob: path.join(__dirname, 'database/migrations/*.js'),
      resolve: ({ name, path: migPath, context }) => {
        const migration = require(migPath);
        return {
          name,
          up: () => migration.up(context, Sequelize),
          down: () => migration.down(context, Sequelize),
        };
      },
    },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize }),
    logger: { info: msg => logger.info('migration', { msg }), warn: () => {}, error: () => {} },
  });

  const pending = await umzug.pending();
  if (pending.length > 0) {
    logger.info('running_migrations', { count: pending.length, migrations: pending.map(m => m.name) });
    await umzug.up();
    logger.info('migrations_done');
  }

  await sequelize.close();
}

AnalyticsService.init();

const PORT = Number(process.env.PORT) || 3333;

runMigrations()
  .then(() => {
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
      setTimeout(() => process.exit(1), 10000).unref();
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  })
  .catch(err => {
    logger.error('migration_failed', { err: err.message });
    process.exit(1);
  });

