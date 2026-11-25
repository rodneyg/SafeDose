const { normalizeUpgradeEmail } = require('./upgradeEmail');

describe('normalizeUpgradeEmail', () => {
  it('returns null for non-string values', () => {
    for (const value of [undefined, null, 42, true, {}, [], ['a@b.co']]) {
      expect(normalizeUpgradeEmail(value)).toBeNull();
    }
  });

  it('returns null for empty or whitespace-only strings', () => {
    expect(normalizeUpgradeEmail('')).toBeNull();
    expect(normalizeUpgradeEmail('   ')).toBeNull();
    expect(normalizeUpgradeEmail('\n\t')).toBeNull();
  });

  it('returns null for obviously invalid addresses', () => {
    for (const value of [
      'plainaddress',
      '@example.com',
      'user@',
      'user@example',
      'user@@example.com',
      'user name@example.com',
      'user@exa mple.com',
    ]) {
      expect(normalizeUpgradeEmail(value)).toBeNull();
    }
  });

  it('returns a valid address trimmed', () => {
    expect(normalizeUpgradeEmail('  user@example.com  ')).toBe('user@example.com');
  });

  it('preserves the local part and lowercases the domain', () => {
    expect(normalizeUpgradeEmail('First.Last+Tag@Example.COM')).toBe('First.Last+Tag@example.com');
  });

  it('rejects addresses longer than 254 characters', () => {
    const domain = '@example.com';
    const atLimit = 'a'.repeat(254 - domain.length) + domain;
    const overLimit = 'a'.repeat(255 - domain.length) + domain;

    expect(atLimit).toHaveLength(254);
    expect(normalizeUpgradeEmail(atLimit)).toBe(atLimit);
    expect(overLimit).toHaveLength(255);
    expect(normalizeUpgradeEmail(overLimit)).toBeNull();
  });
});
