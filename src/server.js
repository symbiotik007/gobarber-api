import { Sequelize } from 'sequelize';
import { Umzug, SequelizeStorage } from 'umzug';
import path from 'path';
import app from './app';
import ExpirationJob from './app/services/ExpirationJob';
import AnalyticsService from './app/services/AnalyticsService';
import logger from './lib/logger';
import dbConfig from './config/database';

// Migrations that were applied before umzug was introduced.
// If the DB already has these tables/columns, we mark them as executed
// so umzug doesn't try to re-run them and fail with "already exists".
const LEGACY_MIGRATIONS = [
  '20190625203718-create-users.js',
  '20190627121026-create-files.js',
  '20190627122623-add-avatar-field-to-users.js',
  '20190627132934-create-appointments.js',
  '20250509000001-create-services.js',
  '20250509000002-create-guest-customers.js',
  '20250509000003-create-bookings.js',
  '20250509000004-create-booking-status-history.js',
  '20250509000005-create-payments.js',
  '20250509000006-create-payment-attempts.js',
  '20250509000007-create-payment-webhooks.js',
  '20250509000008-create-availability-locks.js',
  '20250509000009-create-booking-notifications.js',
  '20250509000010-create-admin-settings.js',
  '20250509000011-add-branch-support.js',
];

async function runMigrations() {
  const sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
    ...dbConfig,
    logging: false,
  });

  const storage = new SequelizeStorage({ sequelize });

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
    storage,
    logger: { info: msg => logger.info('migration', { msg }), warn: () => {}, error: () => {} },
  });

  // If the bookings table already exists the DB was seeded before umzug was
  // introduced. Mark all legacy migrations as executed so umzug doesn't retry them.
  const [rows] = await sequelize.query(`SELECT to_regclass('public.bookings') AS exists`);
  if (rows[0]?.exists) {
    const executed = await storage.executed();
    for (const name of LEGACY_MIGRATIONS) {
      if (!executed.includes(name)) {
        await storage.logMigration({ name });
      }
    }
    logger.info('legacy_migrations_marked');
  }

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

