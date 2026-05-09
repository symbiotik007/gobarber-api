const cache = new Map();
const TTL_MS = 15 * 60 * 1000; // 15 min — igual que booking_expiry_minutes

function pruneExpired() {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now > entry.expiresAt) cache.delete(key);
  }
}

export default function idempotency(req, res, next) {
  const key = req.headers['idempotency-key'];
  if (!key || key.length > 128) return next();

  pruneExpired();

  const hit = cache.get(key);
  if (hit) {
    return res.status(hit.status).json(hit.body);
  }

  const originalJson = res.json.bind(res);
  res.json = function (body) {
    if (res.statusCode < 500) {
      cache.set(key, { status: res.statusCode, body, expiresAt: Date.now() + TTL_MS });
    }
    return originalJson(body);
  };

  next();
}
