const { isIP } = require('node:net');

const WINDOW_MS = 60_000;
const MAX_CLIENTS = 10_000;

function clientAddress(req) {
  // Vercel supplies this header. Direct connections use their socket address.
  const forwarded = req.headers?.['x-vercel-forwarded-for'];
  if (process.env.VERCEL === '1' && typeof forwarded === 'string' && isIP(forwarded)) {
    return forwarded;
  }
  return req.socket?.remoteAddress || 'unknown';
}

function createRateLimit(maxRequests, message = 'Too many requests. Please try again later.') {
  // Each function instance has its own sliding windows.
  const windows = new Map();

  return (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const now = Date.now();
    const cutoff = now - WINDOW_MS;
    const address = clientAddress(req);

    // Entries are ordered by their last accepted request.
    for (const [client, attempts] of windows) {
      if (attempts[attempts.length - 1] > cutoff) break;
      windows.delete(client);
    }

    const attempts = windows.get(address)?.filter(time => time > cutoff);
    let retryMs = 0;
    if (attempts && attempts.length >= maxRequests) {
      retryMs = attempts[0] + WINDOW_MS - now;
    } else if (!attempts && windows.size >= MAX_CLIENTS) {
      retryMs = WINDOW_MS;
    }

    if (retryMs) {
      res.setHeader('Retry-After', String(Math.ceil(retryMs / 1000)));
      res.status(429).json({ error: message });
      return false;
    }

    windows.delete(address);
    windows.set(address, [...(attempts || []), now]);
    return true;
  };
}

module.exports = { createRateLimit, WINDOW_MS };
