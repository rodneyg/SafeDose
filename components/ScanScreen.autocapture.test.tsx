import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import ScanScreen from './ScanScreen';

// Mock the lucide-react-native icons
jest.mock('lucide-react-native', () => ({
  Camera: ({ color }: { color: string }) => require('react').createElement(require('react-native').Text, null, `Camera-${color}`),
  Flashlight: ({ color }: { color: string }) => require('react').createElement(require('react-native').Text, null, `Flashlight-${color}`),
  Zap: ({ color }: { color: string }) => require('react').createElement(require('react-native').Text, null, `Zap-${color}`),
  ZapOff: ({ color }: { color: string }) => require('react').createElement(require('react-native').Text, null, `ZapOff-${color}`),
}));

// Mock expo-camera
jest.mock('expo-camera', () => ({
  CameraView: 'CameraView',
  FlashMode: {
    off: 'off',
    on: 'on',
  },
}));

// Mock the utils
jest.mock('../lib/utils', () => ({
  isMobileWeb: false,
  isWeb: false,
}));

describe('ScanScreen Autocapture', () => {
  const defaultProps = {
    permission: { status: 'granted' },
    permissionStatus: 'granted' as const,
    mobileWebPermissionDenied: false,
    isProcessing: false,
    scanError: null,
    cameraRef: { current: null },
    webCameraStream: null,
    setScreenStep: jest.fn(),
    setManualStep: jest.fn(),
    setManualSyringe: jest.fn(),
    setSyringeHint: jest.fn(),
    setSubstanceName: jest.fn(),
    setSubstanceNameHint: jest.fn(),
    setConcentrationAmount: jest.fn(),
    setConcentrationUnit: jest.fn(),
    setConcentrationHint: jest.fn(),
    setTotalAmount: jest.fn(),
    setTotalAmountHint: jest.fn(),
    setMedicationInputType: jest.fn(),
    setIsProcessing: jest.fn(),
    setProcessingMessage: jest.fn(),
    setScanError: jest.fn(),
    resetFullForm: jest.fn(),
    requestWebCameraPermission: jest.fn(),
    handleGoHome: jest.fn(),
    onCapture: jest.fn(),
    webFlashlightEnabled: false,
    webFlashlightSupported: false,
    toggleWebFlashlight: jest.fn(),
  };

  beforeEach(() => { jest.useFakeTimers(); jest.clearAllMocks(); });
  afterEach(() => { jest.useRealTimers(); });

  it('should render autocapture toggle button', () => {
    const { getByText } = render(<ScanScreen {...defaultProps} />);
    
    // Auto-capture starts enabled.
    expect(getByText('Zap-#000')).toBeTruthy();
  });

  it('should toggle autocapture when autocapture button is pressed', () => {
    const { getByText } = render(<ScanScreen {...defaultProps} />);
    
    // Initially shows Zap (autocapture enabled).
    expect(getByText('Zap-#000')).toBeTruthy();
    
    // Find and press the autocapture toggle button
    const autocaptureButton = getByText('Zap-#000');
    fireEvent.press(autocaptureButton);
    
    // After toggle, autocapture is disabled.
    expect(getByText('ZapOff-#fff')).toBeTruthy();
  });

  it('should show quality indicator when autocapture is enabled', () => {
    const { getByText } = render(<ScanScreen {...defaultProps} />);
    expect(getByText('Poor')).toBeTruthy();
    act(() => { jest.advanceTimersByTime(500); });
    expect(getByText('Good')).toBeTruthy();
  });

  it('should not start a countdown below excellent quality', () => {
    const onCapture = jest.fn();
    const { getByText, queryByText } = render(<ScanScreen {...defaultProps} onCapture={onCapture} />);
    act(() => { jest.advanceTimersByTime(3500); });
    // The native fallback score is 70, below the excellent-quality threshold.
    expect(getByText('Good')).toBeTruthy();
    expect(queryByText('Capturing in')).toBeNull();
    expect(onCapture).not.toHaveBeenCalled();
  });

  it('should maintain existing capture functionality', () => {
    const onCapture = jest.fn();
    const { getByText } = render(<ScanScreen {...defaultProps} onCapture={onCapture} />);
    
    // Find and press the manual capture button
    const captureButton = getByText('Camera-#fff');
    fireEvent.press(captureButton);
    
    // Should call onCapture
    expect(onCapture).toHaveBeenCalled();
  });

  it('should show instructions text', () => {
    const { getByText } = render(<ScanScreen {...defaultProps} />);
    
    expect(getByText('Auto-capture is ON - will capture when conditions are perfect')).toBeTruthy();
    fireEvent.press(getByText('Zap-#000'));
    expect(getByText('Position both syringe and vial clearly in view')).toBeTruthy();
  });
});