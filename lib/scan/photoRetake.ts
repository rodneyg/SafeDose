import type { measureImageQuality } from './imageQualityMetrics';

// Conservative cutoffs calibrated with the synthetic development split.
const MIN_LAPLACIAN_VARIANCE = 10;
const MAX_HIGHLIGHT_RATIO = 0.90;

export function photoRetakeMessage(metrics: ReturnType<typeof measureImageQuality>) {
  if (metrics.highlightRatio >= MAX_HIGHLIGHT_RATIO) {
    return 'There is too much glare. Retake the photo with the flash off or move away from direct light.';
  }
  if (metrics.laplacianVariance < MIN_LAPLACIAN_VARIANCE) {
    return 'This photo looks blurry. Hold the camera steady and retake the photo when the markings are in focus.';
  }
  return null;
}
