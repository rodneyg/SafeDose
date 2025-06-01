import React, { RefObject, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Camera as CameraIcon, Flashlight } from 'lucide-react-native';
import { CameraView, FlashMode } from 'expo-camera';
import { isMobileWeb, isWeb } from '../lib/utils';

interface ScanScreenProps {
  permission: { status: string } | null;
  permissionStatus: 'undetermined' | 'granted' | 'denied';
  mobileWebPermissionDenied: boolean;
  isProcessing: boolean;
  scanError: string | null;
  cameraRef: RefObject<CameraView>;
  webCameraStream?: MediaStream | null;
  openai: any;
  setScreenStep: (step: 'intro' | 'scan' | 'manualEntry') => void;
  setManualStep: (step: 'dose' | 'medicationSource' | 'concentrationInput' | 'totalAmountInput' | 'reconstitution' | 'syringe' | 'finalResult') => void;
  setManualSyringe: (syringe: { type: 'Insulin' | 'Standard'; volume: string }) => void;
  setSyringeHint: (hint: string | null) => void;
  setSubstanceName: (name: string) => void;
  setSubstanceNameHint: (hint: string | null) => void;
  setConcentrationAmount: (amount: string) => void;
  setConcentrationUnit: (unit: 'mg/ml' | 'mcg/ml' | 'units/ml') => void;
  setConcentrationHint: (hint: string | null) => void;
  setTotalAmount: (amount: string) => void;
  setTotalAmountHint: (hint: string | null) => void;
  setMedicationInputType: (type: 'concentration' | 'totalAmount' | null) => void;
  setIsProcessing: (value: boolean) => void;
  setProcessingMessage: (message: string) => void;
  setScanError: (error: string | null) => void;
  resetFullForm: (startStep?: 'dose' | 'medicationSource' | 'concentrationInput' | 'totalAmountInput' | 'reconstitution' | 'syringe' | 'finalResult') => void;
  requestWebCameraPermission: () => Promise<void>;
  handleGoHome: () => void;
  onCapture: () => void;
  webFlashlightEnabled?: boolean;
  webFlashlightSupported?: boolean;
  toggleWebFlashlight?: () => void;
}

export default function ScanScreen({
  permission,
  permissionStatus,
  mobileWebPermissionDenied,
  isProcessing,
  scanError,
  cameraRef,
  webCameraStream,
  openai,
  setScreenStep,
  setManualStep,
  setManualSyringe,
  setSyringeHint,
  setSubstanceName,
  setSubstanceNameHint,
  setConcentrationAmount,
  setConcentrationUnit,
  setConcentrationHint,
  setTotalAmount,
  setTotalAmountHint,
  setMedicationInputType,
  setIsProcessing,
  setProcessingMessage,
  setScanError,
  resetFullForm,
  requestWebCameraPermission,
  handleGoHome,
  onCapture,
  webFlashlightEnabled = false,
  webFlashlightSupported = false,
  toggleWebFlashlight,
}: ScanScreenProps) {
  console.log('[ScanScreen] Rendering scan screen', { 
    isProcessing, 
    permissionStatus, 
    mobileWebPermissionDenied, 
    hasStream: !!webCameraStream,
    isMobileWeb,
    platformOS: Platform.OS
  });
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const [flashMode, setFlashMode] = useState<FlashMode>('off');
  const [cameraFacing] = useState<'front' | 'back'>('back'); // Explicitly manage camera facing

  // Debug component mount and initial state
  useEffect(() => {
    console.log('[ScanScreen] Component mounted', {
      isMobileWeb,
      platformOS: Platform.OS,
      permissionStatus,
      hasPermission: !!permission,
      permissionStatusFromProp: permission?.status,
      cameraFacing
    });
  }, []);

  // Connect video element to stream for web camera
  useEffect(() => {
    if (isWeb && webCameraStream && videoRef.current) {
      console.log('[ScanScreen] Connecting web camera stream to video element');
      videoRef.current.srcObject = webCameraStream;
      videoRef.current.play().catch(err => {
        console.error('[ScanScreen] Error playing video:', err);
      });
    }
  }, [webCameraStream]);

  // Safeguard: Reset isProcessing state after 20 seconds if it gets stuck
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    if (isProcessing) {
      console.log('[ScanScreen] Setting safeguard timeout for isProcessing');
      timeoutId = setTimeout(() => {
        console.log('[ScanScreen] Safeguard timeout triggered - resetting isProcessing');
        setIsProcessing(false);
        setScanError('Operation timed out. Please try again.');
      }, 20000); // 20 seconds timeout
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isProcessing, setIsProcessing, setScanError]);
  const handleNavigateToIntro = () => {
    // Ensure we're using the safest navigation path back to intro
    console.log('[ScanScreen] Navigating back to intro screen');
    setScreenStep('intro');
  };

  const handleButtonPress = () => {
    console.log('[ScanScreen] Capture button pressed', { isProcessing });
    if (isProcessing) {
      console.log('[ScanScreen] Ignoring button press while processing');
      return;
    }
    
    if (typeof onCapture === 'function') {
      onCapture();
    } else {
      console.error('[ScanScreen] onCapture is not a function', onCapture);
      setScanError('Camera functionality unavailable');
    }
  };

  const toggleFlashlight = () => {
    console.log('[ScanScreen] Flashlight toggle pressed', { 
      currentMode: flashMode, 
      willSwitchTo: flashMode === 'off' ? 'on' : 'off',
      isMobileWeb,
      platformOS: Platform.OS
    });
    setFlashMode(current => current === 'off' ? 'on' : 'off');
  };

  if (isWeb) {
    if (permissionStatus === 'undetermined') {
      return (
        <View style={styles.content}>
          <Text style={styles.text}>Camera access is needed to scan items.</Text>
          <TouchableOpacity style={[styles.button, isMobileWeb && styles.buttonMobile]} onPress={requestWebCameraPermission}>
            <Text style={styles.buttonText}>Grant Camera Access</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.backButton, isMobileWeb && styles.backButtonMobile]} onPress={() => setScreenStep('intro')}>
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (mobileWebPermissionDenied) {
      console.log('[ScanScreen] Rendering web permission denied view');
      return (
        <View style={styles.content}>
          <Text style={styles.errorText}>
            Camera access was denied. You can still scan by uploading a photo or adjust your browser settings to allow camera access.
          </Text>
          <TouchableOpacity
            style={[styles.button, isMobileWeb && styles.buttonMobile, isProcessing && styles.disabledButton]}
            onPress={handleButtonPress}
            disabled={isProcessing}
            activeOpacity={0.7}
          >
            {isProcessing ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.buttonText}>Processing...</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>Take or Upload Photo</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tryCameraAgainButton, isMobileWeb && styles.buttonMobile]} onPress={requestWebCameraPermission}>
            <Text style={styles.buttonText}>Try Camera Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.backButton, isMobileWeb && styles.backButtonMobile]} onPress={() => setScreenStep('intro')}>
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      );
    }

    console.log('[ScanScreen] Rendering web capture view');
    return (
      <View style={styles.scanContainer}>
        {webCameraStream && (
          <video
            ref={videoRef}
            style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' }}
            playsInline
            autoPlay
          />
        )}
        <View style={styles.overlayBottom}>
          {scanError && <Text style={[styles.errorText, { marginBottom: 10 }]}>{scanError}</Text>}
          <Text style={styles.scanText}>Position both syringe and vial clearly in view</Text>
          <View style={styles.captureRow}>
            {/* Flashlight button for mobile web - only show if supported */}
            {toggleWebFlashlight && webFlashlightSupported && (
              <TouchableOpacity
                style={[styles.flashlightButton, webFlashlightEnabled && styles.flashlightButtonActive]}
                onPress={toggleWebFlashlight}
                disabled={isProcessing}
              >
                <Flashlight color={webFlashlightEnabled ? '#000' : '#fff'} size={18} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.captureButton, isProcessing && styles.disabledButton]}
              onPress={handleButtonPress}
              disabled={isProcessing}
            >
              {isProcessing ? <ActivityIndicator color="#fff" /> : <CameraIcon color={'#fff'} size={24} />}
            </TouchableOpacity>
            {/* Spacer to center the capture button when flashlight is present */}
            {toggleWebFlashlight && webFlashlightSupported && <View style={styles.spacer} />}
          </View>
          <View style={styles.bottomButtons}>
            <TouchableOpacity
              style={styles.manualEntryButtonScan}
              onPress={() => { resetFullForm('dose'); setScreenStep('manualEntry'); }}
            >
              <Text style={styles.backButtonText}>Manual Entry</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.backButtonScan}
              onPress={handleGoHome}
              disabled={isProcessing}
            >
              <Text style={styles.backButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (!permission) {
    console.log('[ScanScreen] Rendering permission loading view - permission object is null');
    return (
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#000000" />
        <Text style={styles.text}>Checking permissions...</Text>
      </View>
    );
  }

  console.log('[ScanScreen] Permission object available', { 
    status: permission.status, 
    permission,
    isMobileWeb,
    platformOS: Platform.OS,
    isPermissionGranted: permission.status === 'granted',
    canShowCamera: permission.status === 'granted' && !isMobileWeb
  });

  if (permission.status === 'granted') {
    console.log('[ScanScreen] Rendering camera view', { 
      facing: cameraFacing, 
      flashMode, 
      isMobileWeb, 
      platformOS: Platform.OS,
      permissionStatus: permission.status
    });
    return (
      <View style={styles.scanContainer}>
        <CameraView 
          ref={cameraRef} 
          style={StyleSheet.absoluteFill} 
          facing={cameraFacing} 
          flash={flashMode}
          onCameraReady={() => console.log('[ScanScreen] Camera ready with facing:', cameraFacing)}
          mode="picture"
        />
        <View style={styles.overlayBottom}>
          {scanError && <Text style={[styles.errorText, { marginBottom: 10 }]}>{scanError}</Text>}
          <Text style={styles.scanText}>Position both syringe and vial clearly in view</Text>
          <View style={styles.captureRow}>
            {/* Flashlight button - only show on mobile, not web */}
            {!isMobileWeb && (
              <TouchableOpacity
                style={[styles.flashlightButton, flashMode === 'on' && styles.flashlightButtonActive]}
                onPress={toggleFlashlight}
                disabled={isProcessing}
              >
                <Flashlight color={flashMode === 'on' ? '#000' : '#fff'} size={18} />
              </TouchableOpacity>
            )}
            {console.log('[ScanScreen] Flashlight button visibility', { 
              shouldShow: !isMobileWeb, 
              isMobileWeb, 
              platformOS: Platform.OS 
            })}
            <TouchableOpacity
              style={[styles.captureButton, isProcessing && styles.disabledButton]}
              onPress={handleButtonPress}
              disabled={isProcessing}
            >
              {isProcessing ? <ActivityIndicator color="#fff" /> : <CameraIcon color={'#fff'} size={24} />}
            </TouchableOpacity>
            {/* Spacer to center the capture button when flashlight is present */}
            {!isMobileWeb && <View style={styles.spacer} />}
          </View>
          <View style={styles.bottomButtons}>
            <TouchableOpacity
              style={styles.manualEntryButtonScan}
              onPress={() => { resetFullForm('dose'); setScreenStep('manualEntry'); }}
            >
              <Text style={styles.backButtonText}>Manual Entry</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.backButtonScan}
              onPress={handleGoHome}
              disabled={isProcessing}
            >
              <Text style={styles.backButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (permission.status === 'denied') {
    console.log('[ScanScreen] Rendering permission denied view');
    return (
      <View style={styles.content}>
        <Text style={styles.errorText}>Camera permission is required to scan items.</Text>
        <TouchableOpacity style={[styles.button, isMobileWeb && styles.buttonMobile]} onPress={requestWebCameraPermission}>
          <Text style={styles.buttonText}>Request Permissions</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.backButton, isMobileWeb && styles.backButtonMobile]} onPress={() => setScreenStep('intro')}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (permission.status === 'undetermined') {
    console.log('[ScanScreen] Rendering permission undetermined view');
    return (
      <View style={styles.content}>
        <Text style={styles.text}>Camera permission is needed to scan items.</Text>
        <TouchableOpacity style={[styles.button, isMobileWeb && styles.buttonMobile]} onPress={requestWebCameraPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
          <TouchableOpacity style={[styles.backButton, isMobileWeb && styles.backButtonMobile]} onPress={() => setScreenStep('intro')}>
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, padding: 20 },
  text: { fontSize: 16, color: '#000000', textAlign: 'center', paddingHorizontal: 16 },
  errorText: { fontSize: 14, color: '#f87171', textAlign: 'center', padding: 10, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 8, marginTop: 10 },
  button: { backgroundColor: '#007AFF', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '80%', minHeight: 50 },
  buttonMobile: { paddingVertical: 16, paddingHorizontal: 32, minHeight: 60 },
  buttonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  tryCameraAgainButton: { backgroundColor: '#FF9500', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '80%', minHeight: 50 },
  backButton: { backgroundColor: '#8E8E93', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center', justifyContent: 'center', width: '45%', minHeight: 50 },
  backButtonMobile: { paddingVertical: 14, minHeight: 55 },
  scanContainer: { flex: 1, backgroundColor: '#000' },
  overlayBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: 20, paddingTop: 15, alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.7)' },
  bottomButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 20, marginTop: 12 },
  manualEntryButtonScan: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: 12, minWidth: 80 },
  backButtonScan: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: 12, minWidth: 80 },
  scanText: { fontSize: 14, color: '#fff', textAlign: 'center', paddingHorizontal: 20, marginBottom: 15, fontWeight: '400', lineHeight: 18 },
  captureRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 15, width: '100%', paddingHorizontal: 20 },
  captureButton: { 
    backgroundColor: '#ef4444', 
    width: 65, 
    height: 65, 
    borderRadius: 32.5, 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  flashlightButton: { backgroundColor: 'rgba(255, 255, 255, 0.2)', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 'auto' },
  flashlightButtonActive: { backgroundColor: 'rgba(255, 255, 255, 0.9)' },
  spacer: { width: 40, marginLeft: 'auto' },
  backButtonText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  buttonText: { color: '#f8fafc', fontSize: 16, fontWeight: '500', textAlign: 'center' },
  disabledButton: { backgroundColor: '#C7C7CC' },
});