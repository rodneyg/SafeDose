import {
  IMAGE_QUALITY_MAX_SIDE,
  measureImageQuality,
  qualitySampleSize,
} from '../imageQualityMetrics';

function rgba(...pixels: Array<[number, number, number, number]>) {
  return new Uint8ClampedArray(pixels.flat());
}

describe('measureImageQuality', () => {
  it('reports a fully highlighted, uniformly white image as unblurred', () => {
    const pixels = new Uint8Array(4 * 4 * 4).fill(255);

    expect(measureImageQuality(pixels, 4, 4)).toEqual({
      laplacianVariance: 0,
      highlightRatio: 1,
    });
  });

  it('composites transparent pixels over white before measuring highlights', () => {
    const pixels = rgba(
      [0, 0, 0, 0],
      [0, 0, 0, 255],
      [255, 255, 255, 255],
      [249, 249, 249, 255],
    );

    expect(measureImageQuality(pixels, 2, 2).highlightRatio).toBe(0.5);
  });

  it('counts a sharp white center pixel without variance when it is the only interior pixel', () => {
    const pixels = new Uint8ClampedArray(3 * 3 * 4);
    for (let index = 3; index < pixels.length; index += 4) pixels[index] = 255;
    pixels[(4 * 4)] = 255;
    pixels[(4 * 4) + 1] = 255;
    pixels[(4 * 4) + 2] = 255;

    expect(measureImageQuality(pixels, 3, 3)).toEqual({
      laplacianVariance: 0,
      highlightRatio: 1 / 9,
    });
  });

  it('measures variation between interior edges', () => {
    const pixels = new Uint8ClampedArray(4 * 3 * 4);
    for (let index = 3; index < pixels.length; index += 4) pixels[index] = 255;
    const whiteOffset = (1 * 4 + 1) * 4;
    pixels.fill(255, whiteOffset, whiteOffset + 3);

    expect(measureImageQuality(pixels, 4, 3).laplacianVariance).toBeGreaterThan(0);
  });
});

describe('qualitySampleSize', () => {
  it('keeps images that already fit within the maximum side unchanged', () => {
    expect(qualitySampleSize(200, 100)).toEqual({ width: 200, height: 100 });
  });

  it('scales landscape and portrait images proportionally with rounded dimensions', () => {
    expect(qualitySampleSize(1000, 501)).toEqual({
      width: IMAGE_QUALITY_MAX_SIDE,
      height: 128,
    });
    expect(qualitySampleSize(501, 1000)).toEqual({
      width: 128,
      height: IMAGE_QUALITY_MAX_SIDE,
    });
  });
});
