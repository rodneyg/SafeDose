import { measureImageQuality, qualitySampleSize } from '../imageQualityMetrics';
import { photoRetakeMessage } from '../photoRetake';

function metrics(valueAt: (index: number) => number) {
  const width = 16;
  const height = 12;
  const pixels = new Uint8Array(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    pixels.fill(valueAt(index), offset, offset + 3);
    pixels[offset + 3] = 255;
  }
  return measureImageQuality(pixels, width, height);
}

it('measures an in-focus pattern and allows it to scan', () => {
  const sharp = metrics(index => index % 2 ? 30 : 200);
  expect(sharp.laplacianVariance).toBe(115_600);
  expect(sharp.highlightRatio).toBe(0);
  expect(photoRetakeMessage(sharp)).toBeNull();
});

it('identifies a flat midtone as blurry and clipping as glare', () => {
  const flat = metrics(() => 115);
  const clipped = metrics(index => index < 182 ? 250 : 115);
  expect(flat.laplacianVariance).toBe(0);
  expect(photoRetakeMessage(flat)).toMatch(/blurry/i);
  expect(clipped.highlightRatio).toBe(182 / 192);
  expect(photoRetakeMessage(clipped)).toMatch(/glare/i);
});

it('bounds larger images without upscaling small ones', () => {
  expect(qualitySampleSize(4_000, 3_000)).toEqual({ width: 256, height: 192 });
  expect(qualitySampleSize(3_000, 4_000)).toEqual({ width: 192, height: 256 });
  expect(qualitySampleSize(80, 60)).toEqual({ width: 80, height: 60 });
});
