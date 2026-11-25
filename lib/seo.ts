export const SITE_URL = 'https://safedose.rodneygainous.com';
export const OG_IMAGE_URL = `${SITE_URL}/icons/icon-512.png`;

/** Absolute canonical URL for a route path. "/" maps to the bare origin plus slash. */
export function canonicalUrl(path: string): string {
  const clean = path.split(/[?#]/, 1)[0];
  return `${SITE_URL}${clean.startsWith('/') ? clean : `/${clean}`}`;
}
