const OpenAI = require('openai');
const { buildScanRequest } = require('../lib/scan/request');

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const IMAGE_DATA_URL = /^data:image\/(jpeg|jpg|png|webp|gif);base64,([A-Za-z0-9+/=\s]+)$/i;

// Best-effort, per-instance protection: cold starts and other Vercel instances
// have independent windows. Forwarded IP headers must be supplied by the host proxy.
const RATE_LIMIT_REQUESTS = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_RATE_LIMIT_IPS = 10000;
const requestWindows = new Map();

function allowedOrigin(origin) {
  if (origin === undefined) return true; // Native clients do not send Origin.
  if (typeof origin !== 'string') return false;
  try {
    const url = new URL(origin);
    if (url.origin !== origin) return false;
    if (url.hostname === 'localhost') return ['http:', 'https:'].includes(url.protocol);
    return url.protocol === 'https:' && !url.port && (
      url.hostname === 'safedose.rodneygainous.com' ||
      url.hostname === 'safe-dose.vercel.app' ||
      /^safe-dose-[a-z0-9-]+-rodneygs-projects\.vercel\.app$/.test(url.hostname)
    );
  } catch {
    return false;
  }
}

function retryAfter(req, now) {
  const headers = req.headers || {};
  const forwarded = headers['x-forwarded-for'];
  const ip = (typeof forwarded === 'string' && forwarded.split(',')[0].trim()) ||
    headers['x-real-ip'] || (req.socket && req.socket.remoteAddress) || 'unknown';
  for (const [key, timestamps] of requestWindows) {
    const active = timestamps.filter(time => time > now - RATE_LIMIT_WINDOW_MS);
    if (active.length) requestWindows.set(key, active);
    else requestWindows.delete(key);
  }
  const timestamps = requestWindows.get(ip) || [];
  if (timestamps.length >= RATE_LIMIT_REQUESTS) {
    return Math.max(1, Math.ceil((timestamps[0] + RATE_LIMIT_WINDOW_MS - now) / 1000));
  }
  // Fail closed rather than evicting active windows under high-cardinality abuse.
  if (!requestWindows.has(ip) && requestWindows.size >= MAX_RATE_LIMIT_IPS) {
    return Math.ceil(RATE_LIMIT_WINDOW_MS / 1000);
  }
  timestamps.push(now);
  requestWindows.set(ip, timestamps);
  return 0;
}

function validateImage(image) {
  if (typeof image !== 'string' || !image) {
    return 'An image is required.';
  }
  const match = image.trim().match(IMAGE_DATA_URL);
  if (!match) {
    return 'Image must be a data:image URL with a supported type (jpeg, png, webp, or gif).';
  }
  const b64 = match[2].replace(/\s+/g, '');
  const padding = (b64.match(/=+$/) || [''])[0].length;
  const bytes = Math.floor((b64.length * 3) / 4) - padding;
  if (bytes <= 0 || bytes > MAX_IMAGE_BYTES) {
    return 'Image exceeds the 4 MB upload limit.';
  }
  return null;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!allowedOrigin((req.headers || {}).origin)) {
    return res.status(403).json({ error: 'Origin is not allowed.' });
  }
  const retry = retryAfter(req, Date.now());
  if (retry) {
    res.setHeader('Retry-After', String(retry));
    return res.status(429).json({ error: 'Too many scan requests. Please try again later.' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || typeof apiKey !== 'string') {
    console.error('[analyze-scan] OPENAI_API_KEY is not set on the server');
    return res.status(503).json({ error: 'Vision analysis is not configured.' });
  }

  const image = req.body && req.body.image;
  const invalid = validateImage(image);
  if (invalid) {
    return res.status(400).json({ error: invalid });
  }

  try {
    const client = new OpenAI({ apiKey, timeout: 45000, maxRetries: 0 });
    const response = await client.chat.completions.create(buildScanRequest(image.trim()));
    const content = response && response.choices && response.choices[0] && response.choices[0].message
      ? response.choices[0].message.content
      : null;
    if (typeof content !== 'string' || !content.trim()) {
      return res.status(502).json({ error: 'Invalid response from image analysis.' });
    }
    return res.status(200).json({ content });
  } catch (error) {
    // Never log provider messages or error objects: they can contain credentials
    // or the submitted image. Only emit a category controlled by this route.
    const status = error && error.status;
    const code = error && (error.code || (error.error && error.error.code));
    if (status === 401 || status === 403) {
      console.error('[analyze-scan] Vision authentication failed');
      return res.status(503).json({
        error: 'Image analysis is unavailable because service authentication failed. Please contact support.',
      });
    }
    const timedOut = error && (
      error.name === 'APIConnectionTimeoutError' || error.name === 'AbortError' ||
      code === 'ETIMEDOUT' || status === 408 || status === 504 ||
      (typeof error.message === 'string' && /timeout|timed out/i.test(error.message))
    );
    if (timedOut) {
      console.error('[analyze-scan] Vision request timed out');
      return res.status(504).json({ error: 'Image analysis timed out. Please try again.' });
    }
    const invalidImageCodes = [
      'invalid_image', 'invalid_image_format', 'invalid_base64_image',
      'invalid_image_url', 'image_parse_error', 'image_too_large',
      'image_too_small', 'image_too_large_for_model', 'unsupported_image',
    ];
    if ((status === 400 || status === 422) && invalidImageCodes.includes(code)) {
      console.error('[analyze-scan] Vision request rejected an invalid image');
      return res.status(400).json({
        error: 'The image could not be read. Please upload a clear JPEG, PNG, WebP, or GIF image.',
      });
    }
    console.error('[analyze-scan] Vision request failed');
    return res.status(502).json({ error: 'Image analysis failed. Please try again.' });
  }
};

module.exports.validateImage = validateImage;
module.exports.MAX_IMAGE_BYTES = MAX_IMAGE_BYTES;

module.exports.RATE_LIMIT_REQUESTS = RATE_LIMIT_REQUESTS;
module.exports.RATE_LIMIT_WINDOW_MS = RATE_LIMIT_WINDOW_MS;
