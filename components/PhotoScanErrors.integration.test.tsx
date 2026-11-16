import React, { useState } from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
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
let selectedSize: number;
let pickerClicks: number;

// Keep the screen, capture helper, server-response parsing, and state updates real.
// Replace only browser APIs and the remote scan service. No camera or network needed.
function PhotoFlow() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const cameraRef = { current: null };
  const permission = { status: 'denied' };
  return <ScanScreen {...({
    permission, permissionStatus: 'denied', mobileWebPermissionDenied: true,
    cameraRef, webCameraStream: null, isProcessing, scanError,
    setIsProcessing, setScanError, setScreenStep: jest.fn(), requestWebCameraPermission: jest.fn(),
    onCapture: async () => {
      const result = await captureAndProcessImage({
        cameraRef, permission, isMobileWeb: false, setIsProcessing, setScanError,
        setProcessingMessage: jest.fn(), incrementScansUsed,
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
  pickerClicks = 0;
  const attached = new Set();
  Object.defineProperty(globalThis, 'document', { configurable: true, value: {
    querySelectorAll: () => [],
    body: { appendChild: (node: any) => attached.add(node), contains: (node: any) => attached.has(node), removeChild: (node: any) => attached.delete(node) },
    createElement: () => {
      const input = { onchange: (_: any) => {}, click: () => {
        pickerClicks++;
        Promise.resolve().then(() => input.onchange({ target: { files: [{ name: 'photo.jpg', type: 'image/jpeg', size: selectedSize }] } }));
      } };
      return input;
    },
  } });
  Object.defineProperty(globalThis, 'FileReader', { configurable: true, value: class {
    result = 'data:image/jpeg;base64,/9j/';
    onload = () => {};
    readAsDataURL() { this.onload(); }
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
  ['offline', () => Promise.reject(new Error('offline')), 'Could not reach the scan service. Please try again.'],
  ['analysis failure', async () => ({ ok: false, json: async () => ({ error: 'Image analysis failed. Please try again.' }) }), 'Image analysis failed. Please try again.'],
  ['private server error', async () => ({ ok: false, json: async () => ({ error: 'ERR_INTERNAL: private provider diagnostic' }) }), 'We could not process this photo. Please try another photo or enter the details manually.'],
] as const)('makes %s visible after upload and allows a retry', async (_, response, message) => {
  (fetch as jest.Mock).mockImplementation(response);
  const screen = render(<PhotoFlow />);
  expect(screen.queryByRole('alert')).toBeNull();
  fireEvent.press(screen.getByText('Take or Upload Photo'));
  await waitFor(() => expect(screen.getByRole('alert').props.children).toBe(message));
  expect(screen.queryByText('Processing...')).toBeNull();
  expect(screen.queryByText(/private provider diagnostic/)).toBeNull();
  expect(incrementScansUsed).not.toHaveBeenCalled();
  expect(onResult).not.toHaveBeenCalled();
  expect(fetch).toHaveBeenCalledTimes(1);

  selectedSize = 6 * 1024 * 1024;
  fireEvent.press(screen.getByText('Take or Upload Photo'));
  await waitFor(() => expect(screen.getByRole('alert').props.children).toBe('Selected image exceeds the 5 MB limit. Please choose a smaller image.'));
  expect(screen.queryByText(message)).toBeNull();
  expect(screen.queryByText('Processing...')).toBeNull();
  expect(pickerClicks).toBe(2);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(incrementScansUsed).not.toHaveBeenCalled();
  expect(onResult).not.toHaveBeenCalled();
});
