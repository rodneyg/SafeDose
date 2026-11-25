export const SITE_URL = 'https://safedose.rodneygainous.com';
export const OG_IMAGE_URL = `${SITE_URL}/icons/icon-512.png`;

/** Absolute canonical URL for a route path. "/" maps to the bare origin plus slash. */
export function canonicalUrl(path: string): string {
  const clean = path.split(/[?#]/, 1)[0];
  return `${SITE_URL}${clean.startsWith('/') ? clean : `/${clean}`}`;
}

const publicPages = new Map([
  ['/', {
    title: 'SafeDose | Syringe unit and reconstitution calculator',
    description: 'SafeDose helps you work out syringe units and reconstitution doses. Education only, not medical advice.',
  }],
  ['/dosing-problem', {
    title: 'The dosing problem | SafeDose',
    description: 'Why units, mL and mg get mixed up, how syringe sizes differ, and one worked reconstitution example. Education only, not medical advice.',
  }],
  ['/pricing', {
    title: 'Pricing | SafeDose',
    description: 'SafeDose pricing. The calculator stays free; web checkout, cancel anytime.',
  }],
  ['/privacy', {
    title: 'Privacy Policy for SafeDose',
    description: 'Read how SafeDose handles your data, device storage, and account information.',
  }],
  ['/terms', {
    title: 'Terms of Service for SafeDose',
    description: 'Read the terms that apply when you use SafeDose.',
  }],
  ['/support', {
    title: 'Support | SafeDose',
    description: 'Email SafeDose for help with your account, billing, or a problem using the app.',
  }],
  ['/changelog', {
    title: 'Changelog | SafeDose',
    description: 'New features, improvements, and fixes in each SafeDose release.',
  }],
]);

export function getSeoMetadata(path: string) {
  return publicPages.get(path);
}
