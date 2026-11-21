import React, { useState } from 'react';
import { act, render, fireEvent, waitFor } from '@testing-library/react-native';
import ScanScreen from './ScanScreen';
import ImagePreviewModal from './ImagePreviewModal';
import { captureAndProcessImage } from '../lib/cameraUtils';
import { mapScanToDoseInputs, parseScanModelOutput, type ScanResult } from '../lib/scan';
import fixtures from '../evals/vision/fixtures/model-outputs.json';
import wrongFills from '../evals/vision/fixtures/holdout-wrong-fills.json';

jest.mock('../lib/utils', () => ({ isWeb: true, isMobileWeb: false, MAX_FILE_SIZE: 5 * 1024 * 1024 }));
jest.mock('../lib/analytics', () => ({ logAnalyticsEvent: jest.fn(), ANALYTICS_EVENTS: {} }));
jest.mock('expo-file-system', () => ({}));
jest.mock('expo-camera', () => ({ CameraView: 'CameraView' }));
jest.mock('lucide-react-native', () => new Proxy({}, { get: (_, key) => String(key) }));
const mockCreate = jest.fn();
jest.mock('openai', () => jest.fn().mockImplementation(() => ({
  chat: { completions: { create: (...args: unknown[]) => mockCreate(...args) } },
})));
const analyzeScan = require('../api/analyze-scan');

// Synthetic 1x1 PNG, unrelated to users. Only the provider SDK and platform APIs
// are replaced: capture, HTTP serialization, route, parser, mapping, and preview run real code.
const PHOTO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=';
// Existing authored fixture follows lib/scan/request.js, including per-field confidence.
const MODEL_OUTPUT = fixtures.find(f => f.label.id === 'fixture-exact-read')!.model_output;
const incrementScansUsed = jest.fn(async () => {});
const onResult = jest.fn();
const onVerify = jest.fn();
const originalKey = process.env.OPENAI_API_KEY;
const originalFetch = globalThis.fetch;
const browserDescriptors = ['document', 'FileReader'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
let routeStatus: number;
let routeBody: unknown;

function PhotoFlow() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const cameraRef = { current: null };
  const permission = { status: 'denied' };
  return <>
    <ScanScreen {...({
      permission, permissionStatus: 'denied', mobileWebPermissionDenied: true,
      cameraRef, webCameraStream: null, isProcessing, scanError,
      setIsProcessing, setScanError, setScreenStep: jest.fn(), requestWebCameraPermission: jest.fn(),
      onCapture: async () => {
        const captured = await captureAndProcessImage({
          cameraRef, permission, isMobileWeb: false, setIsProcessing, setScanError,
          setProcessingMessage: jest.fn(), incrementScansUsed,
        });
        if (captured) { onResult(captured); setResult(captured); }
      },
    } as React.ComponentProps<typeof ScanScreen>)} />
    <ImagePreviewModal visible={!!result} imageUri={result?.capturedImage?.uri ?? ''}
      scanResult={result} onRetake={() => setResult(null)} onVerify={onVerify} />
  </>;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  // Placeholder only. The mocked SDK never authenticates or makes a provider call.
  process.env.OPENAI_API_KEY = 'integration-test-placeholder';
  routeStatus = 0;
  routeBody = undefined;
  const attached = new Set();
  Object.defineProperty(globalThis, 'document', { configurable: true, value: {
    querySelectorAll: () => [],
    body: { appendChild: (node: unknown) => attached.add(node), contains: (node: unknown) => attached.has(node), removeChild: (node: unknown) => attached.delete(node) },
    createElement: () => {
      const input = { onchange: (_: unknown) => {}, click: () => {
        Promise.resolve().then(() => input.onchange({ target: { files: [{ name: 'synthetic.png', type: 'image/png', size: 68 }] } }));
      } };
      return input;
    },
  } });
  Object.defineProperty(globalThis, 'FileReader', { configurable: true, value: class {
    result = PHOTO;
    onload = () => {};
    readAsDataURL() { this.onload(); }
  } });
  // In-process HTTP adapter dispatches the actual client request to the actual route.
  // No live fetch fallback exists, so unexpected network requests fail the test.
  globalThis.fetch = jest.fn(async (url, init) => {
    expect(new URL(String(url)).pathname).toBe('/api/analyze-scan');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toEqual({ 'Content-Type': 'application/json', Accept: 'application/json' });
    expect(JSON.parse(init?.body as string)).toEqual({ image: PHOTO });
    const res = {
      setHeader: jest.fn(),
      status(code: number) { routeStatus = code; return this; },
      json(body: unknown) { routeBody = body; return this; },
    };
    await analyzeScan({ method: init?.method, headers: {}, body: JSON.parse(init?.body as string) }, res);
    return { ok: routeStatus >= 200 && routeStatus < 300, status: routeStatus, json: async () => routeBody } as Response;
  });
});

afterEach(() => {
  for (const [key, descriptor] of browserDescriptors) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalKey;
  jest.restoreAllMocks();
});

it('uploads a photo through the API and displays the parsed syringe and vial values', async () => {
  const content = JSON.stringify(MODEL_OUTPUT);
  mockCreate.mockResolvedValue({ choices: [{ message: { role: 'assistant', content }, finish_reason: 'stop' }] });
  const screen = render(<PhotoFlow />);
  fireEvent.press(screen.getByText('Take or Upload Photo'));
  await waitFor(() => expect(screen.getByText('Review Your Scan')).toBeTruthy());

  expect(screen.getByLabelText('Retake photo').props.accessibilityRole).toBe('button');

  expect(fetch).toHaveBeenCalledTimes(1);
  expect(mockCreate).toHaveBeenCalledTimes(1);
  expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
    model: 'gpt-4o-2024-08-06', temperature: 0, response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: [expect.objectContaining({ type: 'text' }), { type: 'image_url', image_url: { url: PHOTO } }] }],
  }));
  expect(routeStatus).toBe(200);
  expect(routeBody).toEqual({ content });
  expect(onResult).toHaveBeenCalledTimes(1);
  const result = onResult.mock.calls[0][0] as ScanResult;
  expect(result).toMatchObject({
    refuse: false, reasons: [], raw: content,
    syringe: { type: 'Insulin', volume: '1 ml', scale: 'U-100', capacity_ml: 1 },
    vial: { substance: 'Example compound', concentration: '10 mg/ml', totalAmount: null },
    fill: { units: 25, ml: 0.25, plunger_visible: true },
    capturedImage: { uri: PHOTO, mimeType: 'image/png' },
  });
  // This is the same mapper used by NewDoseScreen to prefill ManualEntryScreen.
  expect(mapScanToDoseInputs(result)).toEqual({ status: 'needs-verification', reasons: [], inputs: {
    manualSyringe: { type: 'Insulin', volume: '1 ml' }, substance: 'Example compound',
    concentration: 10, concentrationUnit: 'mg/ml', totalAmount: null, totalAmountUnit: null,
  } });
  for (const value of ['Insulin', '1 ml', 'Example compound', '10 mg/ml', 'Not detected']) {
    expect(screen.getAllByText(value).length).toBeGreaterThan(0);
  }
  expect(screen.queryByRole('alert')).toBeNull();
  expect(screen.queryByText('Processing...')).toBeNull();
  expect(incrementScansUsed).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Unconfirmed vial substance')).toBeTruthy();
  expect(onVerify).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('button', { name: 'Confirm substance and all details' }));
  expect(onVerify).toHaveBeenCalledWith('Example compound');
  screen.unmount();
});

it('requires a nonblank name after Edit and passes the corrected substance on confirmation', async () => {
  const content = JSON.stringify(MODEL_OUTPUT);
  mockCreate.mockResolvedValue({ choices: [{ message: { role: 'assistant', content }, finish_reason: 'stop' }] });
  const screen = render(<PhotoFlow />);
  fireEvent.press(screen.getByText('Take or Upload Photo'));
  await waitFor(() => expect(screen.getByText('Unconfirmed vial substance')).toBeTruthy());

  fireEvent.press(screen.getByRole('button', { name: 'Edit vial substance' }));
  const input = screen.getByLabelText('Vial substance');
  expect(input.props.value).toBe('Example compound');
  const confirm = () => screen.getByRole('button', { name: 'Confirm substance and all details' });
  fireEvent.changeText(input, '   ');
  expect(confirm().props.accessibilityState.disabled).toBe(true);
  fireEvent.press(confirm());
  expect(onVerify).not.toHaveBeenCalled();

  fireEvent.changeText(input, ' Corrected compound ');
  fireEvent.press(confirm());
  expect(onVerify).toHaveBeenCalledWith('Corrected compound');
  screen.unmount();
});

it.each([
  [wrongFills[0], '40', '0.4'],
  [wrongFills[1], '30', '0.3'],
])('withholds the model fill despite confidence 1.0 (case %#)', async (content, units, ml) => {
  mockCreate.mockResolvedValue({ choices: [{ message: { content } }] });
  const screen = render(<PhotoFlow />);
  fireEvent.press(screen.getByText('Take or Upload Photo'));
  await waitFor(() => expect(screen.getByText('Review Your Scan')).toBeTruthy());

  expect(screen.getByText(/Read the fill line on your own syringe/)).toBeTruthy();
  expect(screen.getByText(/vial label/)).toBeTruthy();
  expect(screen.getByText(/no medical advice/)).toBeTruthy();
  expect(screen.queryByText(new RegExp('^' + units + '( units)?$', 'i'))).toBeNull();
  // A syringe capacity can equal the raw fill. It is explicitly labelled Capacity.
  expect(screen.getByText('Capacity')).toBeTruthy();
  expect(screen.queryByText(ml)).toBeNull();
  expect(screen.queryByText(/^Fill(?: level| amount)?$/i)).toBeNull();

  jest.useFakeTimers();
  try {
    act(() => { jest.advanceTimersByTime(60_000); });
    expect(onVerify).not.toHaveBeenCalled();
    fireEvent.press(screen.getByRole('button', { name: /Confirm substance and all details|I checked both/ }));
    expect(onVerify).toHaveBeenCalledTimes(1);
    screen.unmount();
  } finally {
    jest.useRealTimers();
  }
});

it('refuses malformed provider JSON after an otherwise successful API response', async () => {
  const content = '{"syringe":';
  mockCreate.mockResolvedValue({ choices: [{ message: { content } }] });
  const screen = render(<PhotoFlow />);
  fireEvent.press(screen.getByText('Take or Upload Photo'));
  await waitFor(() => expect(screen.getByRole('alert').props.children).toBe(
    'We could not read the syringe size or vial strength safely. Try a clear photo showing the syringe scale and vial strength, or enter the details manually.',
  ));
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(mockCreate).toHaveBeenCalledTimes(1);
  expect(routeStatus).toBe(200);
  expect(routeBody).toEqual({ content });
  expect(onResult).not.toHaveBeenCalled();
  expect(incrementScansUsed).not.toHaveBeenCalled();
  expect(screen.queryByText('Review Your Scan')).toBeNull();
  expect(screen.queryByText('Example compound')).toBeNull();
  expect(screen.queryByText('Processing...')).toBeNull();
  screen.unmount();
});

it('hides a capacity that the development scan markings do not corroborate', () => {
  // Development case c1-b0-s1 has U-100 marks up to 50, conflicting with 1 mL.
  const result = parseScanModelOutput(JSON.stringify({
    ...MODEL_OUTPUT, syringe: { ...MODEL_OUTPUT.syringe, markings: '0,10,20,30,40,50' },
  }));
  const screen = render(<ImagePreviewModal visible imageUri="" scanResult={result}
    onRetake={jest.fn()} onVerify={onVerify} />);
  expect(screen.queryByText('1 ml')).toBeNull();
  expect(screen.getByText('Check the label and select manually')).toBeTruthy();
  expect(screen.getByText('Unconfirmed vial substance')).toBeTruthy();
  expect(screen.queryByRole('button', { name: /I checked both|Confirm substance|Edit vial substance/ })).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: 'Enter details manually' }));
  expect(onVerify).toHaveBeenCalledWith(null);
});
