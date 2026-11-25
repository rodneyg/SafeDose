import fs from 'fs';
import path from 'path';
import { canonicalUrl, SITE_URL } from './seo';

const publicDir = path.join(__dirname, '..', 'public');

it('builds absolute canonical urls without query or fragment', () => {
  expect(canonicalUrl('/pricing?x=1#a')).toBe(`${SITE_URL}/pricing`);
  expect(canonicalUrl('/')).toBe(`${SITE_URL}/`);
});

it('ships a text robots.txt that points at the sitemap', () => {
  const robots = fs.readFileSync(path.join(publicDir, 'robots.txt'), 'utf8');
  expect(robots).not.toMatch(/<html/i);
  expect(robots).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
});

it('lists the public routes in the sitemap', () => {
  const xml = fs.readFileSync(path.join(publicDir, 'sitemap.xml'), 'utf8');
  for (const route of ['/', '/dosing-problem', '/pricing', '/privacy', '/terms']) {
    expect(xml).toContain(`<loc>${SITE_URL}${route}</loc>`);
  }
});
