import { expect, test } from '@playwright/test';
import { generateSyntheticVial } from './synthetic-vial';

test('generates a decodable synthetic PNG in memory without network requests', async ({ page, context }) => {
  const requests: string[] = [];
  await context.route('**/*', route => {
    requests.push(route.request().url());
    return route.abort();
  });
  const image = await generateSyntheticVial(page);
  expect(image.name).toBe('synthetic-vial.png');
  expect(image.mimeType).toBe('image/png');
  expect(image.buffer.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  expect(image.buffer.length).toBeGreaterThan(1_000);
  expect(image.buffer.length).toBeLessThan(100_000);
  const dimensions = await page.evaluate(async base64 => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    return { width: image.naturalWidth, height: image.naturalHeight };
  }, image.buffer.toString('base64'));
  expect(dimensions).toEqual({ width: 640, height: 360 });
  expect(requests).toEqual([]);
});
