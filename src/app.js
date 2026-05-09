import 'dotenv/config';
import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import Youch from 'youch';
import * as Sentry from '@sentry/node';
import sentryConfig from './config/sentry';
import 'express-async-errors';
import routes from './routes';
import logger from './lib/logger';
import requestLogger from './app/middlewares/requestLogger';
import fraudDetector from './app/middlewares/fraudDetector';
import validateEnv from './lib/validateEnv';

import './database';

validateEnv();

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5174', 'http://localhost:3000'];

class App {
  constructor() {
    this.server = express();
    if (process.env.NODE_ENV !== 'development') {
      this.initSentry();
    }
    this.middlewares();
    this.routes();
    this.exceptionHandler();
  }

  initSentry() {
    Sentry.init(sentryConfig);
    this.server.use(Sentry.Handlers.requestHandler());
  }

  middlewares() {
    this.server.use(helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
    }));
    this.server.use(compression());
    this.server.use(cors({
      origin: function(origin, callback) {
        // Allow requests with no origin (mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);
        if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    }));
    this.server.use(express.json({ limit: '64kb' }));
    this.server.use(requestLogger);
    this.server.use('/bookings', fraudDetector);
    this.server.use(
      '/files',
      express.static(path.resolve(__dirname, '..', 'tmp', 'uploads'))
    );
  }

  routes() {
    // Health check — before auth middleware, no rate limit
    this.server.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV || 'development',
      });
    });

    this.server.use(routes);

    if (process.env.NODE_ENV !== 'development') {
      this.server.use(Sentry.Handlers.errorHandler());
    }
  }

  exceptionHandler() {
    this.server.use(async (err, req, res, next) => {
      logger.error('unhandled_exception', {
        requestId: req.requestId,
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
      });

      if (process.env.NODE_ENV === 'development') {
        const errors = await new Youch(err, req).toJSON();
        return res.status(500).json(errors);
      }
      return res.status(500).json({ error: 'Internal server error' });
    });
  }
}

export default new App().server;
