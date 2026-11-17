module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  return res.status(200).json({
    ok: true,
    // Presence only: this does not validate credentials or call the scan provider.
    scanProviderConfigured: Boolean(process.env.OPENAI_API_KEY),
  });
};
