export const IMAGE_QUALITY_MAX_SIDE = 256;
const HIGHLIGHT_LUMA = 250;

export function measureImageQuality(pixels: Uint8Array | Uint8ClampedArray, width: number, height: number) {
  const pixelCount = width * height;
  const luminance = new Uint8Array(pixelCount);
  let highlights = 0;

  for (let index = 0; index < pixelCount; index += 1) {
    const offset = index * 4;
    // Composite transparency over white, as for a browser-displayed photo.
    const opacity = pixels[offset + 3] / 255;
    const luma = (77 * pixels[offset] + 150 * pixels[offset + 1] + 29 * pixels[offset + 2]) / 256;
    luminance[index] = Math.round(luma * opacity + 255 * (1 - opacity));
    if (luminance[index] >= HIGHLIGHT_LUMA) highlights += 1;
  }

  let sum = 0;
  let squares = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      const laplacian = luminance[index - 1] + luminance[index + 1]
        + luminance[index - width] + luminance[index + width] - 4 * luminance[index];
      sum += laplacian;
      squares += laplacian * laplacian;
    }
  }

  const interiorCount = (width - 2) * (height - 2);
  return {
    laplacianVariance: squares / interiorCount - (sum / interiorCount) ** 2,
    highlightRatio: highlights / pixelCount,
  };
}

export function qualitySampleSize(width: number, height: number) {
  const scale = Math.min(1, IMAGE_QUALITY_MAX_SIDE / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export type PhotoSource = { imageUrl: string; uri?: string; width?: number; height?: number };
