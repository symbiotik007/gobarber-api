import { randomUUID } from 'crypto';
import logger from '../../lib/logger';

export default function requestLogger(req, res, next) {
  const requestId = randomUUID();
  const start = Date.now();

  req.requestId = requestId;
  req.log = logger.child({ requestId });

  res.on('finish', () => {
    const ms = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    req.log[level](`${req.method} ${req.path}`, {
      status: res.statusCode,
      ms,
      ip: req.ip,
      ua: req.get('user-agent'),
    });
  });

  next();
}
