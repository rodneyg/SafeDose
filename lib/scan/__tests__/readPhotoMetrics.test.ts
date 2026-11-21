import { deleteAsync } from 'expo-file-system';
import { manipulateAsync } from 'expo-image-manipulator';
import { encode } from 'jpeg-js';
import { readPhotoMetrics } from '../readPhotoMetrics';

jest.mock('expo-file-system', () => ({ deleteAsync: jest.fn(async () => {}) }));
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: 'jpeg' },
}));

const photo = { imageUrl: 'data:image/jpeg;base64,/9j/', uri: 'file:///source.jpg', width: 3_000, height: 4_000 };

beforeEach(() => jest.clearAllMocks());

it('measures and removes a bounded thumbnail from a native camera photo', async () => {
  const width = 192;
  const height = 256;
  const data = Buffer.alloc(width * height * 4, 128);
  const { data: jpeg } = encode({ width, height, data }, 100);
  (manipulateAsync as jest.Mock).mockResolvedValue({ base64: jpeg.toString('base64'), uri: 'file:///sample.jpg' });

  await expect(readPhotoMetrics(photo)).resolves.toEqual({ laplacianVariance: 0, highlightRatio: 0 });
  expect(manipulateAsync).toHaveBeenCalledWith(
    photo.uri, [{ resize: { width, height } }], { base64: true, compress: 1, format: 'jpeg' },
  );
  expect(deleteAsync).toHaveBeenCalledWith('file:///sample.jpg', { idempotent: true });
});

it('removes the thumbnail if JPEG decoding fails', async () => {
  (manipulateAsync as jest.Mock).mockResolvedValue({ base64: 'AAAA', uri: 'file:///sample.jpg' });

  await expect(readPhotoMetrics(photo)).rejects.toThrow();
  expect(deleteAsync).toHaveBeenCalledWith('file:///sample.jpg', { idempotent: true });
});
