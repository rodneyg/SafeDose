const { createRateLimit } = require('../lib/apiRateLimit');
const { createHash } = require('node:crypto');
const { cert, getApps, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');
const { normalizeUpgradeEmail } = require('../lib/upgradeEmail');

const APP_NAME = 'upgrade-email';

const allowRequest = createRateLimit(10);

module.exports = async (req, res) => {
  if (req.method !== 'POST') res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).end();
  }

  const projectId = process.env.UPGRADE_EMAIL_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.UPGRADE_EMAIL_FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.UPGRADE_EMAIL_FIREBASE_PRIVATE_KEY;
  const databaseId = process.env.UPGRADE_EMAIL_DATABASE_ID;
  // A separate database keeps leads outside the rules used for app data.
  const enabled = Boolean(projectId && clientEmail && privateKey && databaseId && databaseId !== '(default)');
  if (req.method === 'GET') return res.status(200).json({ enabled });
  if (!allowRequest(req, res)) return;
  if (!enabled) return res.status(503).end();

  const headers = req.headers || {};
  const token = /^Bearer ([\w.-]+)$/.exec(headers.authorization || '')?.[1];
  if (!token) return res.status(401).end();
  if (!/^application\/json(?:;|$)/i.test(headers['content-type'] || '')) {
    return res.status(415).end();
  }

  const email = normalizeUpgradeEmail(req.body?.email);
  if (!email || Object.keys(req.body).length !== 1) return res.status(400).end();

  try {
    const app = getApps().find(candidate => candidate.name === APP_NAME) || initializeApp({
      credential: cert({ projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, '\n') }),
    }, APP_NAME);

    const identity = await getAuth(app).verifyIdToken(token).catch(() => null);
    const provider = identity?.firebase?.sign_in_provider;
    if (!identity?.uid || (provider !== 'anonymous' && provider !== 'google.com')) {
      return res.status(401).end();
    }

    // Keep one opt-in per Firebase identity. A retry preserves the original timestamp.
    const id = createHash('sha256').update(identity.uid).digest('hex');
    const lead = getFirestore(app, databaseId).collection('leads').doc(id);
    try {
      await lead.create({
        email,
        timestamp: FieldValue.serverTimestamp(),
        scanLimitHit: true,
        userType: provider === 'anonymous' ? 'anon' : 'google',
        source: 'upgrade_modal',
      });
    } catch (error) {
      if (error.code !== 6) throw error; // Firestore ALREADY_EXISTS
      if ((await lead.get()).get('email') !== email) return res.status(409).end();
    }

    return res.status(204).end();
  } catch {
    console.error('[upgrade-email] Unable to save consent.');
    return res.status(503).end();
  }
};
