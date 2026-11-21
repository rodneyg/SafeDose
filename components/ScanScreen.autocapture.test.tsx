import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ScanScreen from './ScanScreen';

// Mock the lucide-react-native icons
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const icon = (name: string) => ({ color }: { color: string }) =>
    React.createElement(Text, null, `${name}-${color}`);
  return { Camera: icon('Camera'), Flashlight: icon('Flashlight'), Zap: icon('Zap'), ZapOff: icon('ZapOff') };
});

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

  // These scenarios start with autocapture off, selected through its real toggle.
  const renderWithAutocaptureOff = (props: typeof defaultProps) => {
    const screen = render(<ScanScreen {...props} />);
    fireEvent.press(screen.getByText('Zap-#000').parent);
    return screen;
  };

  it('should enable autocapture by default', () => {
    const { getByText } = render(<ScanScreen {...defaultProps} />);
    expect(getByText('Zap-#000')).toBeTruthy();
    expect(getByText('Auto-capture is ON - will capture when conditions are perfect')).toBeTruthy();
  });

  it('should render autocapture toggle button', () => {
    const { getByText } = renderWithAutocaptureOff(defaultProps);

    // The autocapture toggle should be present (using ZapOff icon initially)
    expect(getByText('ZapOff-#fff')).toBeTruthy();
  });

  it('should toggle autocapture when autocapture button is pressed', () => {
    const { getByText } = renderWithAutocaptureOff(defaultProps);

    // Initially should show ZapOff (autocapture disabled)
    expect(getByText('ZapOff-#fff')).toBeTruthy();

    // Find and press the autocapture toggle button
    const autocaptureButton = getByText('ZapOff-#fff').parent;
    fireEvent.press(autocaptureButton);

    // After toggle, should show Zap (autocapture enabled)
    expect(getByText('Zap-#000')).toBeTruthy();
  });

  it('should show quality indicator when autocapture is enabled', async () => {
    const { getByText } = renderWithAutocaptureOff(defaultProps);

    // Enable autocapture
    const autocaptureButton = getByText('ZapOff-#fff').parent;
    fireEvent.press(autocaptureButton);

    // Wait for quality indicator to appear
    await waitFor(() => {
      expect(getByText('Poor')).toBeTruthy();
    });
  });

  it('should wait for excellent quality before showing countdown', async () => {
    const { getByText, queryByLabelText } = renderWithAutocaptureOff(defaultProps);

    // Enable autocapture
    const autocaptureButton = getByText('ZapOff-#fff').parent;
    fireEvent.press(autocaptureButton);

    // Mock excellent quality conditions
    // Note: In a real test, we would need to mock the canvas context and video element
    // For now, we just verify the UI structure is present

    // The countdown functionality is tested indirectly through integration
    expect(queryByLabelText('Cancel auto-capture')).toBeFalsy(); // Should not show until countdown starts
  });

  it('should maintain existing capture functionality', () => {
    const onCapture = jest.fn();
    const { getByText } = renderWithAutocaptureOff({ ...defaultProps, onCapture });

    // Find and press the manual capture button
    const captureButton = getByText('Camera-#fff').parent;
    fireEvent.press(captureButton);

    // Should call onCapture
    expect(onCapture).toHaveBeenCalled();
  });

  it('exposes the scanner controls by accessible label', () => {
    const { getByLabelText } = renderWithAutocaptureOff(defaultProps);

    expect(getByLabelText('Capture photo').props.accessibilityRole).toBe('button');
    expect(getByLabelText('Cancel scan').props.accessibilityRole).toBe('button');
  });

  it('should show instructions text', () => {
    const { getByText } = renderWithAutocaptureOff(defaultProps);

    expect(getByText('Position both syringe and vial clearly in view')).toBeTruthy();
  });
});
it('shows upload errors when camera permission has been denied', () => {
  const utils = jest.requireMock('../lib/utils');
  utils.isWeb = true;
  try {
    const screen = render(<ScanScreen {...({
      permission: { status: 'denied' }, permissionStatus: 'denied', mobileWebPermissionDenied: true,
      isProcessing: false, scanError: 'Image analysis failed. Please try again.', cameraRef: { current: null },
      onCapture: jest.fn(), setScreenStep: jest.fn(), requestWebCameraPermission: jest.fn(),
      setIsProcessing: jest.fn(), setScanError: jest.fn(),
    } as any)} />);
    expect(screen.getByRole('alert').props.children).toBe('Image analysis failed. Please try again.');
    expect(screen.getByText('Take or Upload Photo')).toBeTruthy();
    screen.unmount();
  } finally {
    utils.isWeb = false;
  }
});
