// Smoke test for the /health endpoint — no DB connection needed.

jest.mock('../../src/database/index.js', () => ({}));
jest.mock('../../src/lib/validateEnv', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../../src/app/middlewares/requestLogger', () => ({
  __esModule: true,
  default: (req, res, next) => next(),
}));
jest.mock('../../src/app/middlewares/fraudDetector', () => ({
  __esModule: true,
  default: (req, res, next) => next(),
}));
jest.mock('../../src/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));
jest.mock('../../src/config/sentry', () => ({ __esModule: true, default: {} }));
jest.mock('@sentry/node', () => ({
  init: jest.fn(),
  Handlers: {
    requestHandler: () => (req, res, next) => next(),
    errorHandler: () => (err, req, res, next) => next(err),
  },
}));
jest.mock('../../src/routes', () => {
  const { Router } = require('express');
  return { __esModule: true, default: Router() };
});

process.env.APP_SECRET = 'test-secret';
process.env.DB_HOST = 'localhost';
process.env.DB_USER = 'test';
process.env.DB_PASS = 'test';
process.env.DB_NAME = 'test';
process.env.NODE_ENV = 'test';

import request from 'supertest';
import app from '../../src/app';

describe('GET /health', () => {
  test('returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('includes uptime and timestamp', async () => {
    const res = await request(app).get('/health');
    expect(typeof res.body.uptime).toBe('number');
    expect(res.body.uptime).toBeGreaterThanOrEqual(0);
    expect(res.body.timestamp).toMatch(/^\d{4}-/);
  });
});
