import { captureAndProcessImage } from './cameraUtils';
import { readScan } from './scan';

jest.mock('./utils', () => ({ isWeb: false }));
jest.mock('./analytics', () => ({ logAnalyticsEvent: jest.fn(), ANALYTICS_EVENTS: {} }));
jest.mock('./scan', () => ({ readScan: jest.fn(), mapScanToDoseInputs: jest.fn() }));
jest.mock('./scan/completeOnServer', () => ({ completeScanOnServer: jest.fn() }));
jest.mock('expo-file-system', () => ({ readAsStringAsync: jest.fn() }));

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
  expect(setScanError).toHaveBeenLastCalledWith('Error: Camera returned no picture');
  expect(setIsProcessing.mock.calls).toEqual([[true], [false]]);
  expect(readScan).not.toHaveBeenCalled();
  expect(incrementScansUsed).not.toHaveBeenCalled();
});
