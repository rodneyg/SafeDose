import { toByteArray } from 'base64-js';
import { deleteAsync } from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { decode } from 'jpeg-js';
import { measureImageQuality, qualitySampleSize, type PhotoSource } from './imageQualityMetrics';

export async function readPhotoMetrics({ imageUrl, uri, width, height }: PhotoSource) {
  // Camera captures supply dimensions. Skip other native sources when their
  // size is unknown so this optional check cannot decode an unbounded image.
  if (!width || !height) return;
  const size = qualitySampleSize(width, height);
  if (size.width < 3 || size.height < 3) return;

  const { base64, uri: thumbnailUri } = await manipulateAsync(uri || imageUrl, [{ resize: size }], {
    base64: true,
    compress: 1,
    format: SaveFormat.JPEG,
  });
  // Expo returns a cached file even when only its base64 is needed.
  try {
    if (!base64) return;
    const sample = decode(toByteArray(base64), { useTArray: true, maxResolutionInMP: 1, maxMemoryUsageInMB: 8 });
    if (sample.width < 3 || sample.height < 3) return;
    return measureImageQuality(sample.data, sample.width, sample.height);
  } finally {
    await deleteAsync(thumbnailUri, { idempotent: true }).catch(() => {});
  }
}
