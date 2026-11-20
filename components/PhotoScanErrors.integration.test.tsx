import React, { useState } from 'react';
import { act, render, fireEvent, waitFor } from '@testing-library/react-native';
import { Text, TextInput, View } from 'react-native';
import { SCAN_UNAVAILABLE_MESSAGE, SCAN_TIMEOUT_MS } from '../lib/scan/completeOnServer';
import ScanScreen from './ScanScreen';
import { captureAndProcessImage } from '../lib/cameraUtils';

jest.mock('../lib/utils', () => ({ isWeb: true, isMobileWeb: false, MAX_FILE_SIZE: 5 * 1024 * 1024 }));
jest.mock('../lib/analytics', () => ({ logAnalyticsEvent: jest.fn(), ANALYTICS_EVENTS: {} }));
jest.mock('expo-file-system', () => ({}));
jest.mock('expo-camera', () => ({ CameraView: 'CameraView' }));
jest.mock('lucide-react-native', () => new Proxy({}, { get: (_, key) => String(key) }));

const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
const originalReader = Object.getOwnPropertyDescriptor(globalThis, 'FileReader');
const originalFetch = globalThis.fetch;
const incrementScansUsed = jest.fn(async () => {});
const onResult = jest.fn();
const onImageReady = jest.fn();
let selectedSize: number;
let readFailure: 'error' | 'abort' | 'empty' | 'invalid' | 'throw' | null;

// Keep the screen, capture helper, server-response parsing, and state updates real.
// Replace only browser APIs and the remote scan service. No camera or network needed.
function PhotoFlow() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [step, setStep] = useState('scan');
  const [dose, setDose] = useState('12');
  if (step === 'manualEntry') return <View>
    <Text accessibilityRole="alert">{scanError}</Text>
    <TextInput accessibilityLabel="Dose" value={dose} onChangeText={setDose} />
  </View>;
  const cameraRef = { current: null };
  const permission = { status: 'denied' };
  return <ScanScreen {...({
    permission, permissionStatus: 'denied', mobileWebPermissionDenied: true,
    cameraRef, webCameraStream: null, isProcessing, scanError,
    setIsProcessing, setScanError, setScreenStep: jest.fn(), requestWebCameraPermission: jest.fn(),
    onCapture: async () => {
      const result = await captureAndProcessImage({
        cameraRef, permission, isMobileWeb: false, setIsProcessing, setScanError,
        setProcessingMessage: jest.fn(), incrementScansUsed, onImageReady,
        onScanUnavailable: () => setStep('manualEntry'),
      });
      if (result) onResult(result);
    },
  } as React.ComponentProps<typeof ScanScreen>)} />;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  selectedSize = 100;
  readFailure = null;
  const attached = new Set();
  Object.defineProperty(globalThis, 'document', { configurable: true, value: {
    querySelectorAll: () => [],
    body: { appendChild: (node: any) => attached.add(node), contains: (node: any) => attached.has(node), removeChild: (node: any) => attached.delete(node) },
    createElement: () => {
      const input = { onchange: (_: any) => {}, click: () => {
        Promise.resolve().then(() => input.onchange({ target: { files: [{ name: 'photo.jpg', type: 'image/jpeg', size: selectedSize }] } }));
      } };
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
  for (const [key, descriptor] of [['document', originalDocument], ['FileReader', originalReader]] as const) {
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
  fireEvent.press(screen.getByText('Take or Upload Photo'));
  await waitFor(() => expect(screen.getByRole('alert').props.children).toBe(SCAN_UNAVAILABLE_MESSAGE));
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
    fireEvent.press(screen.getByText('Take or Upload Photo'));
    await act(async () => { await jest.advanceTimersByTimeAsync(SCAN_TIMEOUT_MS); });
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
  fireEvent.press(screen.getByText('Take or Upload Photo'));
  await waitFor(() => expect(screen.getByRole('alert').props.children).toBe(SCAN_UNAVAILABLE_MESSAGE));
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
    fireEvent.press(screen.getByText('Take or Upload Photo'));
    await waitFor(() => expect(screen.getByRole('alert').props.children).toBe(SCAN_UNAVAILABLE_MESSAGE));
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
