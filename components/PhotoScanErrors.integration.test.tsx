import React, { useRef, useState } from 'react';
import { act, render, fireEvent } from '@testing-library/react-native';
import { Text, TextInput, View } from 'react-native';
import { SCAN_UNAVAILABLE_MESSAGE, SCAN_TIMEOUT_MS } from '../lib/scan/completeOnServer';
import ScanScreen from './ScanScreen';
import { captureAndProcessImage } from '../lib/cameraUtils';
import { logAnalyticsEvent } from '../lib/analytics';
import fixtures from '../evals/vision/fixtures/model-outputs.json';

jest.mock('../lib/utils', () => ({ isWeb: true, isMobileWeb: false, MAX_FILE_SIZE: 5 * 1024 * 1024 }));
jest.mock('../lib/analytics', () => ({ logAnalyticsEvent: jest.fn(), ANALYTICS_EVENTS: {} }));
jest.mock('expo-file-system', () => ({}));
jest.mock('expo-camera', () => ({ CameraView: 'CameraView' }));
jest.mock('lucide-react-native', () => new Proxy({}, { get: (_, key) => String(key) }));

const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
const originalReader = Object.getOwnPropertyDescriptor(globalThis, 'FileReader');
const originalFetch = globalThis.fetch;
const capturePhoto = jest.fn(captureAndProcessImage);
const incrementScansUsed = jest.fn(async () => {});
const onResult = jest.fn();
const onImageReady = jest.fn();
let selectedSize: number;
let cancelSelection: boolean;
let cookie: string;
let cookieWrite: string;
let allowCookies: boolean;
let readFailure: 'error' | 'abort' | 'empty' | 'invalid' | 'throw' | null;

// Keep the screen, capture helper, server-response parsing, and state updates real.
// Replace only browser APIs and the remote scan service. No camera or network needed.
function PhotoFlow() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [step, setStep] = useState('scan');
  const [dose, setDose] = useState('12');
  const cameraRef = useRef(null);
  if (step === 'manualEntry') return <View>
    <Text accessibilityRole="alert">{scanError}</Text>
    <TextInput accessibilityLabel="Dose" value={dose} onChangeText={setDose} />
  </View>;
  const permission = { status: 'denied' };
  return <ScanScreen {...({
    permission, permissionStatus: 'denied', mobileWebPermissionDenied: true,
    cameraRef, webCameraStream: null, isProcessing, scanError,
    setIsProcessing, setScanError, setScreenStep: jest.fn(), requestWebCameraPermission: jest.fn(),
    onCapture: async () => {
      const result = await capturePhoto({
        cameraRef, permission, isMobileWeb: false, setIsProcessing, setScanError,
        setProcessingMessage: jest.fn(), incrementScansUsed, onImageReady,
        onScanUnavailable: () => setStep('manualEntry'),
      });
      if (result) onResult(result);
    },
  } as React.ComponentProps<typeof ScanScreen>)} />;
}

// Wait for the in-process capture to finish so the assertions do not poll on a wall clock.
async function uploadPhoto(screen: ReturnType<typeof render>) {
  const captureIndex = capturePhoto.mock.results.length;
  await act(async () => {
    fireEvent.press(screen.getByText('Take or Upload Photo'));
    expect(capturePhoto).toHaveBeenCalledTimes(captureIndex + 1);
    await capturePhoto.mock.results[captureIndex].value;
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  selectedSize = 100;
  cancelSelection = false;
  cookie = '';
  cookieWrite = '';
  allowCookies = true;
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { location: { protocol: 'https:' } },
  });
  readFailure = null;
  const attached = new Set();
  Object.defineProperty(globalThis, 'document', { configurable: true, value: {
    get cookie() { return cookie; },
    set cookie(value: string) {
      cookieWrite = value;
      if (allowCookies) cookie = value.split(';')[0];
    },
    querySelectorAll: () => [],
    body: { appendChild: (node: any) => attached.add(node), contains: (node: any) => attached.has(node), removeChild: (node: any) => attached.delete(node) },
    createElement: () => {
      const input = {
        onchange: (_: any) => {},
        oncancel: () => {},
        click: () => {
          Promise.resolve().then(() => {
            if (cancelSelection) input.oncancel();
            else input.onchange({ target: { files: [{ name: 'photo.jpg', type: 'image/jpeg', size: selectedSize }] } });
          });
        },
      };
      return input;
    },
  } });
  Object.defineProperty(globalThis, 'FileReader', { configurable: true, value: class {
    result = 'data:image/jpeg;base64,/9j/';
    onload = () => {};
    onerror = () => {};
    onabort = () => {};
    readAsDataURL() {
      if (readFailure === 'throw') throw new Error('private browser diagnostic');
      if (readFailure === 'error') return this.onerror();
      if (readFailure === 'abort') return this.onabort();
      if (readFailure === 'empty') this.result = 'data:image/jpeg;base64,';
      if (readFailure === 'invalid') this.result = 'invalid';
      this.onload();
    }
  } });
  globalThis.fetch = jest.fn();
});

afterEach(() => {
  for (const [key, descriptor] of [['document', originalDocument], ['window', originalWindow], ['FileReader', originalReader]] as const) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
  globalThis.fetch = originalFetch;
  jest.restoreAllMocks();
});

it.each([
  ['offline', () => Promise.reject(new Error('offline'))],
  ...[400, 401, 429, 500, 502, 503, 504].map(status => [
    `HTTP ${status}`, async () => ({ ok: false, status, json: async () => ({ error: 'private provider diagnostic' }) }),
  ]),
] as const)('takes %s to manual entry with the dose intact and no scan charged', async (_, response) => {
  (fetch as jest.Mock).mockImplementation(response);
  const screen = render(<PhotoFlow />);
  await uploadPhoto(screen);
  expect(screen.getByRole('alert').props.children).toBe(SCAN_UNAVAILABLE_MESSAGE);
  expect(screen.getAllByRole('alert')).toHaveLength(1);
  expect(screen.getByLabelText('Dose').props.value).toBe('12');
  fireEvent.changeText(screen.getByLabelText('Dose'), '15');
  expect(screen.getByLabelText('Dose').props.value).toBe('15');
  expect(screen.queryByText('Take or Upload Photo')).toBeNull();
  expect(screen.queryByText('Processing...')).toBeNull();
  expect(screen.queryByText(/private provider diagnostic/)).toBeNull();
  expect(incrementScansUsed).not.toHaveBeenCalled();
  expect(onResult).not.toHaveBeenCalled();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(onImageReady).toHaveBeenCalledTimes(1);
  expect(onImageReady.mock.invocationCallOrder[0]).toBeLessThan((fetch as jest.Mock).mock.invocationCallOrder[0]);
});

it('takes a timed-out request to manual entry and ignores a late success', async () => {
  jest.useFakeTimers();
  let resolveLate!: (value: any) => void;
  (fetch as jest.Mock).mockImplementation(() => new Promise(resolve => { resolveLate = resolve; }));
  const screen = render(<PhotoFlow />);
  try {
    await act(async () => {
      fireEvent.press(screen.getByText('Take or Upload Photo'));
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    await act(async () => {
      await jest.advanceTimersByTimeAsync(SCAN_TIMEOUT_MS);
      await capturePhoto.mock.results[0].value;
    });
    expect(screen.getByRole('alert').props.children).toBe(SCAN_UNAVAILABLE_MESSAGE);
    expect(screen.getByLabelText('Dose').props.value).toBe('12');
    await act(async () => { resolveLate({ ok: true, json: async () => ({ content: '{}' }) }); });
    expect(screen.getByLabelText('Dose').props.value).toBe('12');
    expect(incrementScansUsed).not.toHaveBeenCalled();
    expect(onResult).not.toHaveBeenCalled();
  } finally {
    screen.unmount();
    jest.useRealTimers();
  }
});

it('takes an oversized photo to manual entry with values retained and no request or scan charged', async () => {
  selectedSize = 16 * 1024 * 1024;
  const screen = render(<PhotoFlow />);
  await uploadPhoto(screen);
  expect(screen.getByRole('alert').props.children).toBe(SCAN_UNAVAILABLE_MESSAGE);
  expect(screen.getByLabelText('Dose').props.value).toBe('12');
  fireEvent.changeText(screen.getByLabelText('Dose'), '15');
  expect(screen.getByLabelText('Dose').props.value).toBe('15');
  expect(screen.queryByText('Take or Upload Photo')).toBeNull();
  expect(screen.queryByText('Processing...')).toBeNull();
  expect(fetch).not.toHaveBeenCalled();
  expect(onImageReady).not.toHaveBeenCalled();
  expect(incrementScansUsed).not.toHaveBeenCalled();
});


it.each(['error', 'abort', 'empty', 'invalid', 'throw'] as const)(
  'takes a local image read %s to manual entry with values retained and no request or scan charged',
  async failure => {
    readFailure = failure;
    const screen = render(<PhotoFlow />);
    await uploadPhoto(screen);
    expect(screen.getByRole('alert').props.children).toBe(SCAN_UNAVAILABLE_MESSAGE);
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByLabelText('Dose').props.value).toBe('12');
    fireEvent.changeText(screen.getByLabelText('Dose'), '15');
    expect(screen.getByLabelText('Dose').props.value).toBe('15');
    expect(screen.queryByText('Processing...')).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
    expect(onImageReady).not.toHaveBeenCalled();
    expect(incrementScansUsed).not.toHaveBeenCalled();
    expect(onResult).not.toHaveBeenCalled();
  },
);

function mockScanRead(accepted: boolean) {
  (fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({ content: accepted ? JSON.stringify(fixtures[0].model_output) : '{}' }),
  });
}

function experimentEvents() {
  return (logAnalyticsEvent as jest.Mock).mock.calls
    .filter(([name]) => typeof name === 'string' && name.startsWith('retake_guidance_'));
}

it('shows arm A on refusal, ignores a cancelled photo picker, and counts the successful retry once', async () => {
  jest.spyOn(Math, 'random').mockReturnValue(0.2);
  mockScanRead(false);
  const screen = render(<PhotoFlow />);

  await uploadPhoto(screen);
  expect(screen.getByText('Retake in bright light, straight on')).toBeTruthy();
  expect(screen.getByRole('alert').props.children).toMatch(/enter the details manually/i);
  expect(cookieWrite).toBe('safedose_retake_guidance_v1=a; Max-Age=7776000; Path=/; SameSite=Lax; Secure');
  expect(incrementScansUsed).not.toHaveBeenCalled();
  expect(experimentEvents()).toEqual([['retake_guidance_shown_a']]);

  cancelSelection = true;
  await uploadPhoto(screen);
  expect(screen.getByText('No image selected')).toBeTruthy();
  expect(experimentEvents()).toEqual([['retake_guidance_shown_a']]);

  cancelSelection = false;
  mockScanRead(true);
  await uploadPhoto(screen);
  expect(onResult).toHaveBeenCalledTimes(1);
  expect(incrementScansUsed).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('Retake in bright light, straight on')).toBeNull();
  expect(experimentEvents()).toEqual([
    ['retake_guidance_shown_a'],
    ['retake_guidance_retry_a'],
    ['retake_guidance_success_a'],
  ]);
});

it('keeps arm B on remount and treats a repeat refusal as a new opportunity', async () => {
  mockScanRead(false);
  const random = jest.spyOn(Math, 'random').mockReturnValue(0.8);
  const first = render(<PhotoFlow />);
  await uploadPhoto(first);
  expect(first.getByText('1. Use bright, even light.')).toBeTruthy();
  expect(first.getByText('2. Hold the camera straight on and steady.')).toBeTruthy();
  expect(first.getByText('3. Keep the syringe markings and vial strength in view.')).toBeTruthy();
  first.unmount();

  random.mockReturnValue(0.2);
  const second = render(<PhotoFlow />);
  await uploadPhoto(second);
  expect(second.getByText('1. Use bright, even light.')).toBeTruthy();
  await uploadPhoto(second);
  expect(experimentEvents()).toEqual([
    ['retake_guidance_shown_b'],
    ['retake_guidance_shown_b'],
    ['retake_guidance_retry_b'],
    ['retake_guidance_shown_b'],
  ]);
  expect(random).toHaveBeenCalledTimes(1);
  expect(onResult).not.toHaveBeenCalled();
  expect(incrementScansUsed).not.toHaveBeenCalled();
});

it('keeps the existing refusal guidance when cookies are blocked', async () => {
  allowCookies = false;
  mockScanRead(false);
  const screen = render(<PhotoFlow />);
  await uploadPhoto(screen);
  expect(screen.getByText(/Try a clear photo showing the syringe scale and vial strength/)).toBeTruthy();
  expect(experimentEvents()).toEqual([]);
  expect(onResult).not.toHaveBeenCalled();
});
