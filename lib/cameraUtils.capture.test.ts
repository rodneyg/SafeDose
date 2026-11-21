import { captureAndProcessImage } from './cameraUtils';
import { mapScanToDoseInputs, readScan } from './scan';
import { completeScanOnServer } from './scan/completeOnServer';
import fixtures from '../evals/vision/fixtures/model-outputs.json';
import * as FileSystem from 'expo-file-system';

jest.mock('./utils', () => ({ isWeb: false }));
jest.mock('./analytics', () => ({ logAnalyticsEvent: jest.fn(), ANALYTICS_EVENTS: {} }));
jest.mock('./scan', () => {
  const scan = jest.requireActual('./scan');
  return { ...scan, readScan: jest.fn(scan.readScan) };
});
jest.mock('./scan/completeOnServer', () => ({
  ...jest.requireActual('./scan/completeOnServer'),
  completeScanOnServer: jest.fn(),
}));
jest.mock('expo-file-system', () => ({ readAsStringAsync: jest.fn(), EncodingType: { Base64: 'base64' } }));

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

describe('native scan result guardrails', () => {
  let options: Parameters<typeof captureAndProcessImage>[0];
  const takePictureAsync = jest.fn();
  const readFile = jest.mocked(FileSystem.readAsStringAsync);
  const complete = jest.mocked(completeScanOnServer);

  beforeEach(() => {
    readFile.mockReset();
    complete.mockReset();
    takePictureAsync.mockReset().mockResolvedValue({ base64: '/9j/AA' });
    options = {
      cameraRef: { current: { takePictureAsync } },
      permission: { status: 'granted' },
      isMobileWeb: false,
      setIsProcessing: jest.fn(),
      setProcessingMessage: jest.fn(),
      setScanError: jest.fn(),
      incrementScansUsed: jest.fn().mockResolvedValue(undefined),
    };
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  function replyWith(concentration: string | number, totalAmount: string | null = null) {
    const output = fixtures[0].model_output;
    complete.mockResolvedValue(JSON.stringify({
      ...output, vial: { ...output.vial, concentration, totalAmount },
    }));
  }

  it('preserves an explicit small concentration through native URI capture and requires verification', async () => {
    takePictureAsync.mockResolvedValue({ uri: 'file:///photo.jpg' });
    readFile.mockResolvedValue('data:image/jpeg;base64,/9j/AA');
    replyWith('0.000001 mg/ml');

    const scan = await captureAndProcessImage(options);
    expect(readFile).toHaveBeenCalledWith('file:///photo.jpg', { encoding: 'base64' });
    expect(complete).toHaveBeenCalledWith('data:image/jpeg;base64,/9j/AA==');
    expect(scan).not.toBeNull();
    expect(mapScanToDoseInputs(scan!)).toMatchObject({
      status: 'needs-verification',
      inputs: { concentration: 0.000001, concentrationUnit: 'mg/ml' },
    });
    expect(options.incrementScansUsed).toHaveBeenCalledTimes(1);
    expect(options.setScanError).toHaveBeenLastCalledWith(null);
    expect(options.setIsProcessing).toHaveBeenLastCalledWith(false);
  });

  it.each([
    ['zero strength', '0 mg/ml', null],
    ['mismatched vial units', '10 mg/ml', '100 units'],
    ['unreadable units', '10 apples/ml', null],
    ['unitless numeric strength', 10, null],
    ['vial amount without units', '10 mg/ml', '100'],
    ['overflowing strength', `${'9'.repeat(309)} mg/ml`, null],
    ['strength that loses digits', '9007199254740993 mg/ml', null],
  ] as const)('refuses %s before showing scan results or counting usage', async (_, strength, totalAmount) => {
    replyWith(strength, totalAmount);

    expect(await captureAndProcessImage(options)).toBeNull();
    expect(complete).toHaveBeenCalledTimes(1);
    expect(options.setScanError).toHaveBeenLastCalledWith(expect.stringMatching(/could not read .* safely/i));
    expect(options.incrementScansUsed).not.toHaveBeenCalled();
    expect(options.setIsProcessing).toHaveBeenLastCalledWith(false);
  });

  it.each([
    ['capacity rounded to a supported size', { volume: '1.00000000000000001 ml' }],
    ['marking rounded down to capacity', { markings: '0,10,100.000000000000001' }],
  ] as const)('refuses a %s before native review or counting usage', async (_, syringe) => {
    const output = fixtures[0].model_output;
    complete.mockResolvedValue(JSON.stringify({
      ...output, syringe: { ...output.syringe, ...syringe },
    }));

    expect(await captureAndProcessImage(options)).toBeNull();
    expect(complete).toHaveBeenCalledTimes(1);
    expect(options.setScanError).toHaveBeenLastCalledWith(expect.stringMatching(/could not read .* safely/i));
    expect(options.incrementScansUsed).not.toHaveBeenCalled();
    expect(options.setIsProcessing).toHaveBeenLastCalledWith(false);
  });

  it('accepts exact syringe decimals with trailing zeroes for native verification', async () => {
    const output = fixtures[0].model_output;
    complete.mockResolvedValue(JSON.stringify({
      ...output, syringe: { ...output.syringe, volume: '1.000 ml', markings: '0,10.0,100.00' },
    }));

    const scan = await captureAndProcessImage(options);
    expect(scan).not.toBeNull();
    expect(mapScanToDoseInputs(scan!)).toMatchObject({
      status: 'needs-verification',
      inputs: { manualSyringe: { type: 'Insulin', volume: '1 ml' } },
    });
    expect(options.incrementScansUsed).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['missing capture data', {}, 'We could not take a photo. Try again or enter the details manually.'],
    ['unknown image data', { base64: 'not-an-image' }, 'Image format could not be processed'],
  ] as const)('stops %s before sending a scan request', async (_, photo, message) => {
    takePictureAsync.mockResolvedValue(photo);

    expect(await captureAndProcessImage(options)).toBeNull();
    expect(options.setScanError).toHaveBeenLastCalledWith(message);
    expect(complete).not.toHaveBeenCalled();
    expect(options.incrementScansUsed).not.toHaveBeenCalled();
    expect(options.setIsProcessing).toHaveBeenLastCalledWith(false);
  });
});
