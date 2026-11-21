import { measureImageQuality, qualitySampleSize, type PhotoSource } from './imageQualityMetrics';

export async function readPhotoMetrics({ imageUrl }: PhotoSource) {
  const image = new Image();
  image.src = imageUrl;
  await image.decode();

  const { width, height } = qualitySampleSize(image.naturalWidth, image.naturalHeight);
  if (width < 3 || height < 3) return;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, width, height);
  return measureImageQuality(context.getImageData(0, 0, width, height).data, width, height);
}
