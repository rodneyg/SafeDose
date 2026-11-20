// A practical address check for an optional contact form.
function normalizeUpgradeEmail(value) {
  if (typeof value !== 'string') return null;
  const email = value.trim();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;

  const separator = email.lastIndexOf('@');
  return email.slice(0, separator + 1) + email.slice(separator + 1).toLowerCase();
}

module.exports = { normalizeUpgradeEmail };
