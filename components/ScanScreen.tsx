import React, { RefObject, useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Camera as CameraIcon, Flashlight } from 'lucide-react-native';
import { CameraView, FlashMode, BarcodeScanningResult } from 'expo-camera';
import { BarCodeScanner } from 'expo-barcode-scanner'; // For BarCodeType constants
import { isMobileWeb } from '../lib/utils';

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
  const [barcodeScanned, setBarcodeScanned] = useState<boolean>(false); // To prevent multiple scans

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
    if (isMobileWeb && webCameraStream && videoRef.current) {
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
    setBarcodeScanned(false); // Reset barcode scan status when leaving screen
  };

  const handleGoHome = () => {
    // Original handleGoHome passed as prop might do more, ensure to call it if needed
    // For now, just navigate to intro and reset barcode status
    console.log('[ScanScreen] Navigating to home/intro screen');
    setScreenStep('intro');
    setBarcodeScanned(false); // Reset barcode scan status
    // if (props.handleGoHome) props.handleGoHome(); // If there was an original prop
  };


  const handleBarcodeScanned = useCallback(({ type, data, boundingBox }: BarcodeScanningResult) => {
    if (!barcodeScanned) {
      setBarcodeScanned(true); // Set flag to true to prevent further processing for this session
      console.log(`[ScanScreen] Barcode Scanned! Type: ${type}, Data: ${data}`);
      // Here you could:
      // 1. Display an alert or toast with the data.
      // 2. Set state with the barcode data.
      // 3. Trigger a navigation or pre-fill logic.
      // For now, just logging and preventing re-scans.

      // Example: Show an alert (consider removing for production if too intrusive)
      // Alert.alert("Barcode Scanned!", `Type: ${type}\nData: ${data}`, [{ text: "OK", onPress: () => setBarcodeScanned(false) }]);

      // --- MODIFICATION START: Pre-fill substance name and navigate ---
      if (data) {
        // 1. Reset the form, potentially to the step where substance name is usually entered.
        //    'medicationSource' is the step where 'substanceName' is an input.
        resetFullForm('medicationSource');

        // 2. Set the substance name and hint *after* resetting the form.
        setSubstanceName(data);
        setSubstanceNameHint(`Scanned: ${type} barcode`);

        // 3. Navigate to the manual entry screen.
        setScreenStep('manualEntry');
        // The manualStep is already set to 'medicationSource' by resetFullForm.
        // If you want to start at a different step *after* medicationSource, set it here:
        // setManualStep('anotherStep');

      } else {
        // Allow another scan if data is null/empty, and stay on the scan screen.
        setTimeout(() => setBarcodeScanned(false), 3000);
      }
      // --- MODIFICATION END ---
    }
  }, [barcodeScanned, resetFullForm, setSubstanceName, setSubstanceNameHint, setScreenStep, setManualStep]);

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

  if (isMobileWeb) {
    if (permissionStatus === 'undetermined') {
      return (
        <View style={styles.content}>
          <Text style={styles.text}>Camera access is needed to scan items.</Text>
          <TouchableOpacity style={[styles.button, styles.buttonMobile]} onPress={requestWebCameraPermission}>
            <Text style={styles.buttonText}>Grant Camera Access</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.backButton, styles.backButtonMobile]} onPress={() => setScreenStep('intro')}>
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (mobileWebPermissionDenied) {
      console.log('[ScanScreen] Rendering mobile web denied view');
      return (
        <View style={styles.content}>
          <Text style={styles.errorText}>
            Camera access was denied. You can still scan by uploading a photo or adjust your browser settings to allow camera access.
          </Text>
          <TouchableOpacity
            style={[styles.button, styles.buttonMobile, isProcessing && styles.disabledButton]}
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
          <TouchableOpacity style={[styles.tryCameraAgainButton, styles.buttonMobile]} onPress={requestWebCameraPermission}>
            <Text style={styles.buttonText}>Try Camera Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.backButton, styles.backButtonMobile]} onPress={() => setScreenStep('intro')}>
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      );
    }

    console.log('[ScanScreen] Rendering mobile web capture view');
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
          <Text style={styles.scanText}>Click below to take a photo of the syringe & vial</Text>
          <View style={styles.captureRow}>
            {/* Flashlight button for mobile web - only show if supported */}
            {toggleWebFlashlight && webFlashlightSupported && (
              <TouchableOpacity
                style={[styles.flashlightButton, webFlashlightEnabled && styles.flashlightButtonActive]}
                onPress={toggleWebFlashlight}
                disabled={isProcessing}
              >
                <Flashlight color={webFlashlightEnabled ? '#000' : '#fff'} size={20} />
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
          // Barcode scanning props
          onBarcodeScanned={isMobileWeb ? undefined : handleBarcodeScanned} // Barcode scanning for native only for now
          barcodeScannerSettings={{
            barCodeTypes: [
              BarCodeScanner.Constants.BarCodeType.ean13,
              BarCodeScanner.Constants.BarCodeType.ean8,
              BarCodeScanner.Constants.BarCodeType.upc_a,
              BarCodeScanner.Constants.BarCodeType.upc_e,
              BarCodeScanner.Constants.BarCodeType.qr,
              BarCodeScanner.Constants.BarCodeType.pdf417,
              BarCodeScanner.Constants.BarCodeType.dataMatrix,
              BarCodeScanner.Constants.BarCodeType.code128,
              BarCodeScanner.Constants.BarCodeType.code39,
              BarCodeScanner.Constants.BarCodeType.interleaved2of5,
            ],
          }}
        />
        <View style={styles.overlayBottom}>
          {scanError && <Text style={[styles.errorText, { marginBottom: 10 }]}>{scanError}</Text>}
          <Text style={styles.scanText}>Position syringe & vial clearly</Text>
          <View style={styles.captureRow}>
            {/* Flashlight button - only show on mobile, not web */}
            {!isMobileWeb && (
              <TouchableOpacity
                style={[styles.flashlightButton, flashMode === 'on' && styles.flashlightButtonActive]}
                onPress={toggleFlashlight}
                disabled={isProcessing}
              >
                <Flashlight color={flashMode === 'on' ? '#000' : '#fff'} size={20} />
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
              onPress={handleGoHome} // Updated to use the local or prop-based handleGoHome
              disabled={isProcessing}
            >
              <Text style={styles.backButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Fallback for undetermined or denied status if not handled above (should be, but as a safeguard)
  const renderPermissionMessage = (message: string, buttonText: string) => (
    <View style={styles.content}>
      <Text style={styles.text}>{message}</Text>
      <TouchableOpacity
        style={[styles.button, isMobileWeb && styles.buttonMobile]}
        onPress={isMobileWeb ? requestWebCameraPermission : () => {
          // For native, permission request is typically handled by expo-camera or through app settings
          // This button could link to app settings if feasible, or just be a general prompt
          console.log("Requesting native permissions (typically via OS prompt or settings)");
        }}
      >
        <Text style={styles.buttonText}>{buttonText}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.backButton, isMobileWeb && styles.backButtonMobile]}
        onPress={() => { setScreenStep('intro'); setBarcodeScanned(false); }}
      >
        <Text style={styles.buttonText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );

  if (permission.status === 'denied') {
    console.log('[ScanScreen] Rendering permission denied view (final check)');
    return renderPermissionMessage('Camera permission is required to scan items.', 'Request Permissions');
  }

  // Default to undetermined if no other state matches (should ideally not be reached if logic above is correct)
  console.log('[ScanScreen] Rendering permission undetermined view (final check)');
  return renderPermissionMessage('Camera permission is needed to scan items.', 'Grant Permission');
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
  overlayBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: 40, paddingTop: 20, alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  bottomButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 20, marginTop: 10 },
  manualEntryButtonScan: { padding: 10, backgroundColor: 'rgba(0, 0, 0, 0.6)', borderRadius: 20 },
  backButtonScan: { padding: 10, backgroundColor: 'rgba(0, 0, 0, 0.6)', borderRadius: 20 },
  scanText: { fontSize: 18, color: '#fff', textAlign: 'center', paddingHorizontal: 20, marginBottom: 15, fontWeight: 'bold' },
  captureRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20, width: '100%', paddingHorizontal: 20 },
  captureButton: { backgroundColor: '#ef4444', width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'rgba(255, 255, 255, 0.5)' },
  flashlightButton: { backgroundColor: 'rgba(0, 0, 0, 0.6)', width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 'auto' },
  flashlightButtonActive: { backgroundColor: '#fff' },
  spacer: { width: 50, marginLeft: 'auto' },
  backButtonText: { color: '#fff', fontSize: 14 },
  buttonText: { color: '#f8fafc', fontSize: 16, fontWeight: '500', textAlign: 'center' },
  disabledButton: { backgroundColor: '#C7C7CC' },
});