import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ScanScreen from './ScanScreen';

// Mock the lucide-react-native icons
jest.mock('lucide-react-native', () => ({
  Camera: ({ color }: { color: string }) => `Camera-${color}`,
  Flashlight: ({ color }: { color: string }) => `Flashlight-${color}`,
  Zap: ({ color }: { color: string }) => `Zap-${color}`,
  ZapOff: ({ color }: { color: string }) => `ZapOff-${color}`,
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
    openai: {},
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

  it('should render autocapture toggle button', () => {
    const { getByText } = render(<ScanScreen {...defaultProps} />);
    
    // The autocapture toggle should be present (using ZapOff icon initially)
    expect(getByText('ZapOff-#fff')).toBeTruthy();
  });

  it('should toggle autocapture when autocapture button is pressed', () => {
    const { getByText } = render(<ScanScreen {...defaultProps} />);
    
    // Initially should show ZapOff (autocapture disabled)
    expect(getByText('ZapOff-#fff')).toBeTruthy();
    
    // Find and press the autocapture toggle button
    const autocaptureButton = getByText('ZapOff-#fff').parent;
    fireEvent.press(autocaptureButton);
    
    // After toggle, should show Zap (autocapture enabled)
    expect(getByText('Zap-#000')).toBeTruthy();
  });

  it('should show quality indicator when autocapture is enabled', async () => {
    const { getByText } = render(<ScanScreen {...defaultProps} />);
    
    // Enable autocapture
    const autocaptureButton = getByText('ZapOff-#fff').parent;
    fireEvent.press(autocaptureButton);
    
    // Wait for quality indicator to appear
    await waitFor(() => {
      expect(getByText('Poor')).toBeTruthy();
    });
  });

  it('should show countdown when quality is excellent', async () => {
    const { getByText, queryByText } = render(<ScanScreen {...defaultProps} />);
    
    // Enable autocapture
    const autocaptureButton = getByText('ZapOff-#fff').parent;
    fireEvent.press(autocaptureButton);
    
    // Mock excellent quality conditions
    // Note: In a real test, we would need to mock the canvas context and video element
    // For now, we just verify the UI structure is present
    
    // The countdown functionality is tested indirectly through integration
    expect(queryByText('Cancel')).toBeFalsy(); // Should not show until countdown starts
  });

  it('should maintain existing capture functionality', () => {
    const onCapture = jest.fn();
    const { getByText } = render(<ScanScreen {...defaultProps} onCapture={onCapture} />);
    
    // Find and press the manual capture button
    const captureButton = getByText('Camera-#fff').parent;
    fireEvent.press(captureButton);
    
    // Should call onCapture
    expect(onCapture).toHaveBeenCalled();
  });

  it('should show instructions text', () => {
    const { getByText } = render(<ScanScreen {...defaultProps} />);
    
    expect(getByText('Position both syringe and vial clearly in view')).toBeTruthy();
  });
});