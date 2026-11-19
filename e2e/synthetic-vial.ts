import type { Page } from '@playwright/test';

/** Render invented label text locally, without loading any external resources. */
export async function generateSyntheticVial(page: Page) {
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D context is unavailable');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#000000';
    context.lineWidth = 4;
    context.strokeRect(20, 20, 600, 320);
    context.fillStyle = '#000000';
    context.font = 'bold 36px sans-serif';
    context.fillText('TEST VIAL', 50, 100);
    context.fillText('5 mg / 1 mL', 50, 170);
    context.font = '24px sans-serif';
    context.fillText('SYNTHETIC TEST LABEL', 50, 250);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  return {
    name: 'synthetic-vial.png',
    mimeType: 'image/png',
    buffer: Buffer.from(base64, 'base64'),
  };
}
