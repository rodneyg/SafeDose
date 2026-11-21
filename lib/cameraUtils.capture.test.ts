import { captureAndProcessImage } from './cameraUtils';
import { readScan } from './scan';
import * as FileSystem from 'expo-file-system';

jest.mock('./utils', () => ({ isWeb: false }));
jest.mock('./analytics', () => ({ logAnalyticsEvent: jest.fn(), ANALYTICS_EVENTS: {} }));
jest.mock('./scan', () => ({ readScan: jest.fn(), mapScanToDoseInputs: jest.fn() }));
jest.mock('./scan/completeOnServer', () => ({ completeScanOnServer: jest.fn() }));
jest.mock('expo-file-system', () => ({
  readAsStringAsync: jest.fn(),
  EncodingType: { Base64: 'base64' },
}));

it('reports an empty native capture and resets processing without analyzing or counting a scan', async () => {
  const setIsProcessing = jest.fn();
  const setScanError = jest.fn();
  const incrementScansUsed = jest.fn();
  const result = await captureAndProcessImage({
    cameraRef: { current: { takePictureAsync: jest.fn().mockResolvedValue(undefined) } },
    permission: { status: 'granted' },
    isMobileWeb: false,
    setIsProcessing,
    setProcessingMessage: jest.fn(),
    setScanError,
    incrementScansUsed,
  });

  expect(result).toBeNull();
  expect(setScanError).toHaveBeenLastCalledWith('We could not take a photo. Try again or enter the details manually.');
  expect(setIsProcessing.mock.calls).toEqual([[true], [false]]);
  expect(readScan).not.toHaveBeenCalled();
  expect(incrementScansUsed).not.toHaveBeenCalled();
});

it.each(['camera', 'filesystem'] as const)('sanitizes a raw %s rejection at the native capture boundary', async (source) => {
  const rawError = new Error(source === 'camera'
    ? 'ERR_CAMERA_CAPTURE_FAILED: native capture failed'
    : 'ERR_FILESYSTEM_READ_FAILED: private/file/path');
  const takePictureAsync = source === 'camera'
    ? jest.fn().mockRejectedValue(rawError)
    : jest.fn().mockResolvedValue({ uri: 'file:///photo.jpg' });
  (FileSystem.readAsStringAsync as jest.Mock).mockRejectedValue(rawError);
  const setIsProcessing = jest.fn();
  const setScanError = jest.fn();
  const incrementScansUsed = jest.fn();

  expect(await captureAndProcessImage({
    cameraRef: { current: { takePictureAsync } },
    permission: { status: 'granted' }, isMobileWeb: false,
    setIsProcessing, setProcessingMessage: jest.fn(), setScanError, incrementScansUsed,
  })).toBeNull();
  if (source === 'filesystem') {
    expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith('file:///photo.jpg', { encoding: 'base64' });
  }
  expect(setScanError).toHaveBeenLastCalledWith('We could not process this photo. Please try another photo or enter the details manually.');
  expect(setIsProcessing.mock.calls).toEqual([[true], [false]]);
  expect(readScan).not.toHaveBeenCalled();
  expect(incrementScansUsed).not.toHaveBeenCalled();
});
