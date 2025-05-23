import React, { RefObject } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Camera as CameraIcon } from 'lucide-react-native';
import { CameraView } from 'expo-camera';
import { isMobileWeb } from '../lib/utils';
import { captureAndProcessImage } from '../lib/cameraUtils';

interface ScanScreenProps {
  permission: { status: string } | null;
  permissionStatus: 'undetermined' | 'granted' | 'denied';
  mobileWebPermissionDenied: boolean;
  isProcessing: boolean;
  scanError: string | null;
  cameraRef: RefObject<CameraView>;
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
}

export default function ScanScreen({
  permission,
  permissionStatus,
  mobileWebPermissionDenied,
  isProcessing,
  scanError,
  cameraRef,
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
}: ScanScreenProps) {
  const handleCapture = () => {
    captureAndProcessImage({
      cameraRef,
      permission,
      openai,
      isMobileWeb,
      setIsProcessing,
      setProcessingMessage,
      setScanError,
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
      resetFullForm,
    });
  };

  console.log('[Render] Rendering scan screen, isProcessing:', isProcessing);
  if (isMobileWeb) {
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
      return (
        <View style={styles.content}>
          <Text style={styles.errorText}>
            Camera access was denied. You can still scan by uploading a photo or adjust your browser settings to allow camera access.
          </Text>
          <TouchableOpacity style={[styles.button, isMobileWeb && styles.buttonMobile]} onPress={handleCapture} disabled={isProcessing}>
            <Text style={styles.buttonText}>Take or Upload Photo</Text>
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

    return (
      <View style={styles.scanContainer}>
        <View style={styles.overlayBottom}>
          {scanError && <Text style={[styles.errorText, { marginBottom: 10 }]}>{scanError}</Text>}
          <Text style={styles.scanText}>Click below to take a photo of the syringe & vial</Text>
          <TouchableOpacity
            style={[styles.captureButton, isProcessing && styles.disabledButton]}
            onPress={handleCapture}
            disabled={isProcessing}
          >
            {isProcessing ? <ActivityIndicator color="#fff" /> : <CameraIcon color={'#fff'} size={24} />}
          </TouchableOpacity>
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
    return (
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#000000" />
        <Text style={styles.text}>Checking permissions...</Text>
      </View>
    );
  }

  if (permission.status === 'granted') {
    return (
      <View style={styles.scanContainer}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
        <View style={styles.overlayBottom}>
          {scanError && <Text style={[styles.errorText, { marginBottom: 10 }]}>{scanError}</Text>}
          <Text style={styles.scanText}>Position syringe & vial clearly</Text>
          <TouchableOpacity
            style={[styles.captureButton, isProcessing && styles.disabledButton]}
            onPress={handleCapture}
            disabled={isProcessing}
          >
            {isProcessing ? <ActivityIndicator color="#fff" /> : <CameraIcon color={'#fff'} size={24} />}
          </TouchableOpacity>
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
  tryCameraAgainButton: { backgroundColor: '#FF9500', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '80%', minHeight: 50 },
  backButton: { backgroundColor: '#8E8E93', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center', justifyContent: 'center', width: '45%', minHeight: 50 },
  backButtonMobile: { paddingVertical: 14, minHeight: 55 },
  scanContainer: { flex: 1, backgroundColor: '#000' },
  overlayBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: 40, paddingTop: 20, alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  bottomButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 20, marginTop: 10 },
  manualEntryButtonScan: { padding: 10, backgroundColor: 'rgba(0, 0, 0, 0.6)', borderRadius: 20 },
  backButtonScan: { padding: 10, backgroundColor: 'rgba(0, 0, 0, 0.6)', borderRadius: 20 },
  scanText: { fontSize: 18, color: '#fff', textAlign: 'center', paddingHorizontal: 20, marginBottom: 15, fontWeight: 'bold' },
  captureButton: { backgroundColor: '#ef4444', width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'rgba(255, 255, 255, 0.5)', marginBottom: 20 },
  backButtonText: { color: '#fff', fontSize: 14 },
  buttonText: { color: '#f8fafc', fontSize: 16, fontWeight: '500', textAlign: 'center' },
  disabledButton: { backgroundColor: '#C7C7CC' },
});