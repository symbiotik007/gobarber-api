import logger from '../../lib/logger';

const WINDOW_MS = 10 * 60 * 1000; // 10 minutos
const MAX_BY_EMAIL = 3;
const MAX_BY_IP = 5;

const emailMap = new Map();
const ipMap = new Map();

function getCount(map, key) {
  const entry = map.get(key);
  if (!entry) return 0;
  const now = Date.now();
  const fresh = entry.filter(ts => now - ts < WINDOW_MS);
  if (fresh.length === 0) { map.delete(key); return 0; }
  map.set(key, fresh);
  return fresh.length;
}

function record(map, key) {
  const entry = map.get(key) || [];
  entry.push(Date.now());
  map.set(key, entry);
}

export default function fraudDetector(req, res, next) {
  const ip = req.ip;
  const email = req.body && req.body.customer && req.body.customer.email;

  const byIp = getCount(ipMap, ip);
  const byEmail = email ? getCount(emailMap, email) : 0;

  if (byIp >= MAX_BY_IP || (email && byEmail >= MAX_BY_EMAIL)) {
    logger.warn('fraud_suspect', {
      requestId: req.requestId,
      ip,
      email,
      byIp,
      byEmail,
    });
  }

  const originalJson = res.json.bind(res);
  res.json = function (body) {
    if (res.statusCode === 201) {
      record(ipMap, ip);
      if (email) record(emailMap, email);
    }
    return originalJson(body);
  };

  next();
}
