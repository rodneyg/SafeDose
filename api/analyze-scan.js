const OpenAI = require('openai');
const { buildScanRequest } = require('../lib/scan/request');

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const IMAGE_DATA_URL = /^data:image\/(jpeg|jpg|png|webp|gif);base64,([A-Za-z0-9+/=\s]+)$/i;

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
    const message = error && error.message ? error.message : 'unknown error';
    console.error('[analyze-scan] Vision request failed:', message);
    const timedOut = /timeout/i.test(message);
    return res.status(timedOut ? 504 : 502).json({
      error: timedOut ? 'Image analysis timed out. Please try again.' : 'Image analysis failed. Please try again.',
    });
  }
};

module.exports.validateImage = validateImage;
module.exports.MAX_IMAGE_BYTES = MAX_IMAGE_BYTES;
