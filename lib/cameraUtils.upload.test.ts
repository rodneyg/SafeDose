import { captureAndProcessImage } from './cameraUtils';
import { SCAN_UNAVAILABLE_MESSAGE } from './scan/completeOnServer';
import fixtures from '../evals/vision/fixtures/model-outputs.json';

jest.mock('./utils', () => ({ isWeb: true, MAX_FILE_SIZE: 5 * 1024 * 1024 }));
jest.mock('./analytics', () => ({ logAnalyticsEvent: jest.fn(), ANALYTICS_EVENTS: {} }));
jest.mock('expo-file-system', () => ({}));

const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
const originalReader = Object.getOwnPropertyDescriptor(globalThis, 'FileReader');
const originalFetch = globalThis.fetch;
let mockReadFails = false;
let mockCancel = false;
let mockFile = { name: 'syringe.jpg', type: 'image/jpeg', size: 100 };
let input: any;
let options: Parameters<typeof captureAndProcessImage>[0];
let processingAtCapture = false;

beforeEach(() => {
  jest.useFakeTimers();
  mockReadFails = false;
  mockCancel = false;
  processingAtCapture = false;
  mockFile = { name: 'syringe.jpg', type: 'image/jpeg', size: 100 };
  const attached = new Set();
  Object.defineProperty(globalThis, 'document', { configurable: true, value: {
    querySelectorAll: () => [],
    body: { appendChild: (node: any) => attached.add(node), contains: (node: any) => attached.has(node), removeChild: (node: any) => attached.delete(node) },
    createElement: () => (input = { click: () => {
      processingAtCapture = (options.setIsProcessing as jest.Mock).mock.calls.at(-1)?.[0] === true;
      // A real picker dispatches change asynchronously after click returns.
      Promise.resolve().then(() => {
        if (mockCancel) input.oncancel?.();
        else input.onchange({ target: { files: [mockFile] } });
      });
    } }),
  } });
  Object.defineProperty(globalThis, 'FileReader', { configurable: true, value: class {
    result = 'data:image/jpeg;base64,/9j/';
    onload = () => {};
    onerror = () => {};
    readAsDataURL() { mockReadFails ? this.onerror() : this.onload(); }
  } });
  globalThis.fetch = jest.fn();
  options = {
    onScanUnavailable: jest.fn(),
    cameraRef: { current: null }, permission: { status: 'denied' }, isMobileWeb: false,
    setIsProcessing: jest.fn(), setProcessingMessage: jest.fn(), setScanError: jest.fn(), incrementScansUsed: jest.fn(async () => {}),
  };
});
afterEach(() => {
  jest.useRealTimers();
  for (const [key, descriptor] of [['document', originalDocument], ['FileReader', originalReader]] as const) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
  globalThis.fetch = originalFetch;
});

it.each([
  ['network failure', () => Promise.reject(new Error('offline')), /Photo scan is unavailable right now/i],
  ['vision failure', async () => ({ ok: false, json: async () => ({ error: 'Image analysis failed. Please try again.' }) }), /Photo scan is unavailable right now/i],
  ['invalid response', async () => ({ ok: true, json: async () => ({}) }), /Photo scan is unavailable right now/i],
  ['unreadable photo', async () => ({ ok: true, json: async () => ({ content: '{}' }) }), /could not read the syringe size or vial strength safely/i],
] as const)('reports %s for a selected photo without camera permission', async (_, response, message) => {
  (fetch as jest.Mock).mockImplementation(response);
  expect(await captureAndProcessImage(options)).toBeNull();
  expect(options.setScanError).toHaveBeenLastCalledWith(expect.stringMatching(message));
  expect(options.setIsProcessing).toHaveBeenLastCalledWith(false);
  expect(options.incrementScansUsed).not.toHaveBeenCalled();
  expect(fetch).toHaveBeenCalledWith(expect.stringMatching(/\/api\/analyze-scan$/), expect.objectContaining({ method: 'POST' }));
  expect(jest.getTimerCount()).toBe(0);
});

it('clears processing immediately when the browser cancels the photo picker', async () => {
  mockCancel = true;
  const result = captureAndProcessImage(options);
  await jest.advanceTimersByTimeAsync(0);

  expect(options.setIsProcessing).toHaveBeenLastCalledWith(false);
  expect(options.setScanError).toHaveBeenLastCalledWith('No image selected');
  expect(document.body.contains(input)).toBe(false);
  expect(jest.getTimerCount()).toBe(0);
  expect(await result).toBeNull();
  expect(options.onScanUnavailable).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
  expect(options.incrementScansUsed).not.toHaveBeenCalled();
});

it('reports a file read failure before making a scan request', async () => {
  mockReadFails = true;
  expect(await captureAndProcessImage(options)).toBeNull();
  expect(options.setScanError).toHaveBeenLastCalledWith(SCAN_UNAVAILABLE_MESSAGE);
  expect(options.onScanUnavailable).toHaveBeenCalledTimes(1);
  expect(options.setIsProcessing).toHaveBeenLastCalledWith(false);
  expect(jest.getTimerCount()).toBe(0);
  expect(fetch).not.toHaveBeenCalled();
  expect(options.incrementScansUsed).not.toHaveBeenCalled();
});

it('returns a successful photo scan for preview and counts it once', async () => {
  (fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ content: JSON.stringify(fixtures[0].model_output) }) });
  const result = await captureAndProcessImage(options);
  expect(result?.refuse).toBe(false);
  expect(result?.capturedImage).toEqual({ uri: 'data:image/jpeg;base64,/9j/', mimeType: 'image/jpeg' });
  expect(options.incrementScansUsed).toHaveBeenCalledTimes(1);
  expect(options.setScanError).toHaveBeenLastCalledWith(null);
  expect(options.setIsProcessing).toHaveBeenLastCalledWith(false);
});

it.each([
  ['success', false],
  ['error', true],
] as const)('sets processing before capture and clears it in finally on %s', async (_, readFails) => {
  mockReadFails = readFails;
  (fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({ content: JSON.stringify(fixtures[0].model_output) }),
  });

  await captureAndProcessImage(options);

  expect(processingAtCapture).toBe(true);
  expect((options.setIsProcessing as jest.Mock).mock.calls).toEqual([[true], [false]]);
});

it.each([
  'ERR_VISION_FAILED: internal provider details',
  'File size ERR_INTERNAL: private server details',
  'No file selected ERR_INTERNAL',
  'Request cancelled ERR_INTERNAL',
])('sanitizes untrusted server error text: %s', async (error) => {
  (fetch as jest.Mock).mockResolvedValue({ ok: false, json: async () => ({ error }) });
  expect(await captureAndProcessImage(options)).toBeNull();
  expect(options.setScanError).toHaveBeenLastCalledWith('Photo scan is unavailable right now. Enter the values by hand.');
  expect(options.setIsProcessing).toHaveBeenLastCalledWith(false);
  expect(options.incrementScansUsed).not.toHaveBeenCalled();
  expect(jest.getTimerCount()).toBe(0);
});

it('opens manual entry without uploading or charging for an oversized photo', async () => {
  mockFile.size = 6 * 1024 * 1024;
  expect(await captureAndProcessImage(options)).toBeNull();
  expect(options.setScanError).toHaveBeenLastCalledWith(SCAN_UNAVAILABLE_MESSAGE);
  expect(options.onScanUnavailable).toHaveBeenCalledTimes(1);
  expect(options.setIsProcessing).toHaveBeenLastCalledWith(false);
  expect(options.incrementScansUsed).not.toHaveBeenCalled();
  expect(jest.getTimerCount()).toBe(0);
  expect(fetch).not.toHaveBeenCalled();
});
