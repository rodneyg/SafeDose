import { measureImageQuality, qualitySampleSize } from '../imageQualityMetrics';
import { readPhotoMetrics } from '../readPhotoMetrics.web';

jest.mock('../imageQualityMetrics', () => ({
  measureImageQuality: jest.fn(),
  qualitySampleSize: jest.fn(),
}));

const imageData = new Uint8ClampedArray([1, 2, 3, 255]);
const drawImage = jest.fn();
const getImageData = jest.fn(() => ({ data: imageData }));
const getContext = jest.fn();
const createElement = jest.fn();
const decode = jest.fn();

class MockImage {
  naturalWidth = 1200;
  naturalHeight = 800;
  src = '';
  decode = decode;
}

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(global, 'Image', { configurable: true, value: MockImage });
  Object.defineProperty(global, 'document', {
    configurable: true,
    value: { createElement },
  });
  (qualitySampleSize as jest.Mock).mockReturnValue({ width: 256, height: 171 });
  getContext.mockReturnValue({ drawImage, getImageData, imageSmoothingQuality: 'low' });
  createElement.mockReturnValue({ width: 0, height: 0, getContext });
  (measureImageQuality as jest.Mock).mockReturnValue({ laplacianVariance: 12, highlightRatio: 0.25 });
});

it('decodes, downsizes, draws, and measures the photo', async () => {
  const result = await readPhotoMetrics({ imageUrl: 'data:image/jpeg;base64,photo' });

  expect(decode).toHaveBeenCalledTimes(1);
  expect(qualitySampleSize).toHaveBeenCalledWith(1200, 800);
  expect(createElement).toHaveBeenCalledWith('canvas');
  const canvas = createElement.mock.results[0].value;
  expect(canvas).toMatchObject({ width: 256, height: 171 });
  const context = getContext.mock.results[0].value;
  expect(context.imageSmoothingQuality).toBe('high');
  expect(drawImage).toHaveBeenCalledWith(expect.objectContaining({ src: 'data:image/jpeg;base64,photo' }), 0, 0, 256, 171);
  expect(getImageData).toHaveBeenCalledWith(0, 0, 256, 171);
  expect(measureImageQuality).toHaveBeenCalledWith(imageData, 256, 171);
  expect(result).toEqual({ laplacianVariance: 12, highlightRatio: 0.25 });
});

it('returns before creating a canvas when the sampled image is too small', async () => {
  (qualitySampleSize as jest.Mock).mockReturnValue({ width: 2, height: 3 });

  await expect(readPhotoMetrics({ imageUrl: 'small' })).resolves.toBeUndefined();
  expect(createElement).not.toHaveBeenCalled();
  expect(measureImageQuality).not.toHaveBeenCalled();
});

it('returns without measuring when a 2d context is unavailable', async () => {
  getContext.mockReturnValue(null);

  await expect(readPhotoMetrics({ imageUrl: 'photo' })).resolves.toBeUndefined();
  expect(getContext).toHaveBeenCalledWith('2d');
  expect(measureImageQuality).not.toHaveBeenCalled();
});

it('rejects without creating a canvas when image decoding fails', async () => {
  decode.mockRejectedValueOnce(new Error('invalid image'));

  await expect(readPhotoMetrics({ imageUrl: 'invalid' })).rejects.toThrow('invalid image');
  expect(createElement).not.toHaveBeenCalled();
  expect(measureImageQuality).not.toHaveBeenCalled();
});
