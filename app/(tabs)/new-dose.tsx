import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import OpenAI from 'openai';
import Constants from 'expo-constants';
import { useNavigation, useFocusEffect } from 'expo-router';
import { isMobileWeb, insulinVolumes, standardVolumes } from '../../lib/utils';
import IntroScreen from '../../components/IntroScreen';
import ScanScreen from '../../components/ScanScreen';
import ManualEntryScreen from '../../components/ManualEntryScreen';
import LimitModal from '../../components/LimitModal';
import useDoseCalculator from '../../lib/hooks/useDoseCalculator';
import { useUsageTracking } from '../../lib/hooks/useUsageTracking';
import { useAuth } from '../../contexts/AuthContext';
import { captureAndProcessImage } from '../../lib/cameraUtils';
import { logAnalyticsEvent, ANALYTICS_EVENTS } from '../../lib/analytics';

export default function NewDoseScreen() {
  const { user } = useAuth();
  const { usageData, checkUsageLimit, incrementScansUsed } = useUsageTracking();
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [hasInitializedAfterNavigation, setHasInitializedAfterNavigation] = useState(false);
  const [isScreenActive, setIsScreenActive] = useState(true);
  const [navigatingFromIntro, setNavigatingFromIntro] = useState(false);

  const doseCalculator = useDoseCalculator({ checkUsageLimit });
  
  // Ensure intro screen is shown on initial load
  useEffect(() => {
    console.log('[NewDoseScreen] Initial setup, ensuring intro screen is shown');
    // Force screenStep to 'intro' on first render
    doseCalculator.setScreenStep('intro');
  }, []);
  
  // Special override for setScreenStep to ensure navigation state is tracked
  const handleSetScreenStep = useCallback((step: 'intro' | 'scan' | 'manualEntry') => {
    console.log('[NewDoseScreen] Setting screen step to:', step);
    
    // Track navigation from intro to other screens
    if (doseCalculator.screenStep === 'intro' && step !== 'intro') {
      setNavigatingFromIntro(true);
    }
    
    doseCalculator.setScreenStep(step);
  }, [doseCalculator, setNavigatingFromIntro]);
  
  // Handle screen focus events to ensure state is properly initialized after navigation
  useFocusEffect(
    React.useCallback(() => {
      console.log('[NewDoseScreen] Screen focused', { navigatingFromIntro, screenStep: doseCalculator.screenStep });
      setIsScreenActive(true);
      
      // Don't reset state during initial render or when navigating from intro
      if (hasInitializedAfterNavigation && !navigatingFromIntro) {
        if (doseCalculator.stateHealth === 'recovering') {
          console.log('[NewDoseScreen] Resetting due to recovering state');
          doseCalculator.resetFullForm();
          doseCalculator.setScreenStep('intro');
        }
      } else {
        setHasInitializedAfterNavigation(true);
      }
      
      // Reset the navigation tracking flag after processing
      if (navigatingFromIntro) {
        setTimeout(() => {
          setNavigatingFromIntro(false);
        }, 500); // Short delay to ensure navigation completes
      }
      
      return () => {
        // Cleanup when screen is unfocused
        console.log('[NewDoseScreen] Screen unfocused');
        setIsScreenActive(false);
      };
    }, [hasInitializedAfterNavigation, doseCalculator, navigatingFromIntro])
  );
  const {
    screenStep,
    setScreenStep,
    manualStep,
    setManualStep,
    dose,
    setDose,
    unit,
    setUnit,
    substanceName,
    setSubstanceName,
    medicationInputType,
    setMedicationInputType,
    concentrationAmount,
    setConcentrationAmount,
    concentrationUnit,
    setConcentrationUnit,
    totalAmount,
    setTotalAmount,
    solutionVolume,
    setSolutionVolume,
    manualSyringe,
    setManualSyringe,
    doseValue,
    setDoseValue,
    concentration,
    setConcentration,
    calculatedVolume,
    setCalculatedVolume,
    recommendedMarking,
    setRecommendedMarking,
    calculationError,
    setCalculationError,
    formError,
    setFormError,
    substanceNameHint,
    setSubstanceNameHint,
    concentrationHint,
    setConcentrationHint,
    totalAmountHint,
    setTotalAmountHint,
    syringeHint,
    setSyringeHint,
    resetFullForm,
    handleNextDose,
    handleNextMedicationSource,
    handleNextConcentrationInput,
    handleNextTotalAmountInput,
    handleNextReconstitution,
    handleCalculateFinal,
    handleBack,
    handleStartOver,
    handleGoHome,
    handleCapture,
  } = doseCalculator;

  const [permission, requestPermission] = useCameraPermissions();
  const [permissionStatus, setPermissionStatus] = useState<'undetermined' | 'granted' | 'denied'>('undetermined');
  const [mobileWebPermissionDenied, setMobileWebPermissionDenied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState<string>('Processing image... This may take a few seconds');
  const [scanError, setScanError] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const webCameraStreamRef = useRef<MediaStream | null>(null);

  const openai = new OpenAI({
    apiKey: Constants.expoConfig?.extra?.OPENAI_API_KEY || '',
    dangerouslyAllowBrowser: true,
  });

  console.log('Usage Data:', usageData);

  useEffect(() => {
    if (screenStep !== 'scan') {
      setScanError(null);
      setIsProcessing(false);
      setProcessingMessage('Processing image... This may take a few seconds');
    }
  }, [screenStep]);

  useEffect(() => {
    setFormError(null);
  }, [manualStep]);

  useEffect(() => {
    if (manualStep !== 'finalResult') {
      setCalculatedVolume(null);
      setRecommendedMarking(null);
      setCalculationError(null);
    }
  }, [dose, unit, medicationInputType, concentrationAmount, totalAmount, solutionVolume, manualSyringe, setCalculatedVolume, setRecommendedMarking, setCalculationError]);

  useEffect(() => {
    if (isMobileWeb && screenStep === 'scan' && permissionStatus === 'undetermined') {
      requestWebCameraPermission();
    }
    
    // Clean up camera stream when navigating away from scan screen
    if (screenStep !== 'scan' && webCameraStreamRef.current) {
      console.log("[WebCamera] Cleaning up camera stream on screen change");
      webCameraStreamRef.current.getTracks().forEach(track => track.stop());
      webCameraStreamRef.current = null;
    }
  }, [screenStep]);

  // Add enhanced logging for isProcessing state changes
  useEffect(() => {
    console.log("isProcessing changed to:", isProcessing);
    
    // Log any suspiciously long processing times
    if (isProcessing) {
      const timerId = setTimeout(() => {
        console.warn("Processing taking longer than expected, isProcessing still true after 10 seconds");
      }, 10000);
      
      return () => clearTimeout(timerId);
    }
  }, [isProcessing]);

  const handleScanAttempt = async () => {
    console.log('handleScanAttempt: Called', { isProcessing, scansUsed: usageData.scansUsed, limit: usageData.limit });
    
    // Don't proceed if already processing
    if (isProcessing) {
      console.log('handleScanAttempt: Already processing, ignoring request');
      return;
    }
    
    // Log scan attempt
    logAnalyticsEvent(ANALYTICS_EVENTS.SCAN_ATTEMPT);
    
    try {
      const canProceed = await handleCapture();
      console.log('handleScanAttempt: canProceed=', canProceed);
      if (!canProceed) {
        console.log('handleScanAttempt: Showing LimitModal');
        logAnalyticsEvent(ANALYTICS_EVENTS.REACH_SCAN_LIMIT);
        setShowLimitModal(true);
        return;
      }

      console.log('handleScanAttempt: Processing image');
      const result = await captureAndProcessImage({
        cameraRef,
        permission,
        openai,
        isMobileWeb,
        webCameraStream: webCameraStreamRef.current,
        setIsProcessing,
        setProcessingMessage,
        setScanError,
        incrementScansUsed,
      });

      if (result) {
        console.log('handleScanAttempt: Applying scan results', result);
        logAnalyticsEvent(ANALYTICS_EVENTS.SCAN_SUCCESS);
        const scannedSyringe = result.syringe || {};
        const scannedVial = result.vial || {};

        const scannedType = scannedSyringe.type === 'Insulin' ? 'Insulin' : 'Standard';
        const scannedVolume = scannedSyringe.volume;
        const targetVolumes = scannedType === 'Insulin' ? insulinVolumes : standardVolumes;
        const defaultVolume = scannedType === 'Insulin' ? '1 ml' : '3 ml';
        let selectedVolume = defaultVolume;

        if (scannedVolume && scannedVolume !== 'unreadable' && scannedVolume !== null) {
          const normalizedScan = String(scannedVolume).replace(/\s+/g, '').toLowerCase();
          selectedVolume = targetVolumes.find(v => v.replace(/\s+/g, '').toLowerCase() === normalizedScan) || defaultVolume;
          console.log(`[Process] Detected syringe volume: ${scannedVolume}, selected: ${selectedVolume}`);
        } else {
          console.log(`[Process] Syringe volume unreadable/null (${scannedVolume}), using default: ${selectedVolume}`);
        }
        setManualSyringe({ type: scannedType, volume: selectedVolume });
        setSyringeHint('Detected from image scan');

        if (scannedVial.substance && scannedVial.substance !== 'unreadable') {
          setSubstanceName(String(scannedVial.substance));
          setSubstanceNameHint('Detected from vial scan');
          console.log('[Process] Set substance name:', scannedVial.substance);
        }

        const vialConcentration = scannedVial.concentration;
        const vialTotalAmount = scannedVial.totalAmount;

        if (vialConcentration && vialConcentration !== 'unreadable') {
          const concMatch = String(vialConcentration).match(/([\d.]+)\s*(\w+\/?\w+)/);
          if (concMatch) {
            setConcentrationAmount(concMatch[1]);
            const detectedUnit = concMatch[2].toLowerCase();
            if (detectedUnit === 'units/ml' || detectedUnit === 'u/ml') setConcentrationUnit('units/ml');
            else if (detectedUnit === 'mg/ml') setConcentrationUnit('mg/ml');
            else if (detectedUnit === 'mcg/ml') setConcentrationUnit('mcg/ml');
            console.log(`[Process] Detected concentration: ${concMatch[1]} ${detectedUnit}`);
          } else {
            setConcentrationAmount(String(vialConcentration));
            console.log(`[Process] Detected concentration (raw): ${vialConcentration}`);
          }
          setMedicationInputType('concentration');
          setConcentrationHint('Detected from vial scan');
          setTotalAmountHint(null);
        } else if (vialTotalAmount && vialTotalAmount !== 'unreadable') {
          const amountMatch = String(vialTotalAmount).match(/([\d.]+)/);
          if (amountMatch) {
            setTotalAmount(amountMatch[1]);
            console.log(`[Process] Detected total amount: ${amountMatch[1]}`);
          } else {
            setTotalAmount(String(vialTotalAmount));
            console.log(`[Process] Detected total amount (raw): ${vialTotalAmount}`);
          }
          setMedicationInputType('totalAmount');
          setTotalAmountHint('Detected from vial scan');
          setConcentrationHint(null);
        } else {
          console.log('[Process] No reliable concentration or total amount detected');
          setMedicationInputType(null);
          setConcentrationHint('No concentration detected, please enter manually');
          setTotalAmountHint('No total amount detected, please enter manually');
        }

        console.log('[Process] Scan successful, transitioning to manual entry');
        resetFullForm('dose');
        setScreenStep('manualEntry');
        setManualStep('dose');
      } else {
        console.log('[Process] Scan failed, transitioning to manual entry with defaults');
        logAnalyticsEvent(ANALYTICS_EVENTS.SCAN_FAILURE, { reason: 'No results returned' });
        setManualSyringe({ type: 'Standard', volume: '3 ml' });
        setSubstanceName('');
        setMedicationInputType('totalAmount');
        setConcentrationAmount('');
        setTotalAmount('');
        setScreenStep('manualEntry');
        setManualStep('dose');
      }
    } catch (error) {
      console.error('handleScanAttempt: Error=', error);
      
      // Log scan failure with error details
      logAnalyticsEvent(ANALYTICS_EVENTS.SCAN_FAILURE, { 
        reason: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      // Log error event
      logAnalyticsEvent(ANALYTICS_EVENTS.ERROR_OCCURRED, { 
        error_type: 'scan_error',
        error_message: error instanceof Error ? error.message : 'Unknown scan error'
      });
      
      // Ensure isProcessing is reset in case of errors
      setIsProcessing(false);
      
      // Set an informative error message
      let errorMessage = 'Failed to process scan';
      if (error instanceof Error) {
        errorMessage = `Scan error: ${error.message}`;
      }
      setScanError(errorMessage);
      
      // Still provide a graceful fallback to manual entry
      setManualSyringe({ type: 'Standard', volume: '3 ml' });
      setSubstanceName('');
      setMedicationInputType('totalAmount');
      setConcentrationAmount('');
      setTotalAmount('');
      setScreenStep('manualEntry');
      setManualStep('dose');
    }
  };

  const requestWebCameraPermission = async () => {
    if (!isMobileWeb) return;
    
    try {
      // Release any existing stream first to avoid multiple active streams
      if (webCameraStreamRef.current) {
        webCameraStreamRef.current.getTracks().forEach(track => track.stop());
        webCameraStreamRef.current = null;
      }
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn("getUserMedia not supported in this browser");
        setPermissionStatus('denied');
        setMobileWebPermissionDenied(true);
        return;
      }
      
      console.log("[WebCamera] Requesting camera permission");
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      
      // Permission granted - we got a stream
      console.log("[WebCamera] Camera permission granted");
      setPermissionStatus('granted');
      setMobileWebPermissionDenied(false);
      
      // Store the stream for later use instead of stopping it
      webCameraStreamRef.current = stream;
    } catch (error) {
      console.error("[WebCamera] Error requesting camera permission:", error);
      
      // Handle specific error types
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        console.warn("[WebCamera] Camera permission denied by user");
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        console.warn("[WebCamera] No camera device found");
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        console.warn("[WebCamera] Camera is in use by another application");
      }
      
      setPermissionStatus('denied');
      setMobileWebPermissionDenied(true);
    }
  };

  // Clean up camera resources when component unmounts
  useEffect(() => {
    return () => {
      if (webCameraStreamRef.current) {
        console.log("[WebCamera] Cleaning up camera stream on unmount");
        webCameraStreamRef.current.getTracks().forEach(track => track.stop());
        webCameraStreamRef.current = null;
      }
    };
  }, []);

  console.log('[NewDoseScreen] Rendering', { screenStep });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {/* Scan Credits Display */}
        <View style={styles.usageInfoContainer}>
          <View style={styles.scanCreditsContainer}>
            <Text style={styles.scanCreditsText}>
              🎟️ Scans: {usageData.scansUsed}/{usageData.limit}
            </Text>
          </View>
          
          {/* Premium Badge (only for plus users) */}
          {usageData.plan === 'plus' && (
            <View style={styles.premiumBadgeContainer}>
              <Text style={styles.premiumBadgeText}>Premium ⭐</Text>
            </View>
          )}
        </View>
        
        <Text style={styles.title}>SafeDose</Text>
        <Text style={styles.subtitle}>
          {screenStep === 'intro' && 'Welcome'}
          {screenStep === 'scan' && 'Scan Syringe & Vial'}
          {screenStep === 'manualEntry' && (
            `${
              manualStep === 'dose' ? 'Enter Dose' :
              manualStep === 'medicationSource' ? 'Select Medication Type' :
              manualStep === 'concentrationInput' ? 'Enter Concentration' :
              manualStep === 'totalAmountInput' ? 'Enter Total Amount' :
              manualStep === 'reconstitution' ? 'Reconstitution' :
              manualStep === 'syringe' ? 'Select Syringe' :
              'Calculation Result'
            }`
          )}
        </Text>
        
        {/* Recovery button that only shows if state health is recovering */}
        {doseCalculator.stateHealth === 'recovering' && (
          <TouchableOpacity 
            onPress={() => {
              doseCalculator.resetFullForm();
              doseCalculator.setScreenStep('intro');
            }}
            style={styles.recoveryButton}
          >
            <Text style={styles.recoveryButtonText}>Reset App</Text>
          </TouchableOpacity>
        )}
      </View>
      {screenStep === 'intro' && (
        <IntroScreen
          setScreenStep={handleSetScreenStep}
          resetFullForm={resetFullForm}
          setNavigatingFromIntro={setNavigatingFromIntro}
        />
      )}
      {screenStep === 'scan' && (
        <ScanScreen
          permission={permission}
          permissionStatus={permissionStatus}
          mobileWebPermissionDenied={mobileWebPermissionDenied}
          isProcessing={isProcessing}
          scanError={scanError}
          cameraRef={cameraRef}
          webCameraStream={webCameraStreamRef.current}
          openai={openai}
          setScreenStep={handleSetScreenStep}
          setManualStep={setManualStep}
          setManualSyringe={(syringe) => setManualSyringe(syringe.volume)}
          setSyringeHint={setSyringeHint}
          setSubstanceName={setSubstanceName}
          setSubstanceNameHint={setSubstanceNameHint}
          setConcentrationAmount={setConcentrationAmount}
          setConcentrationUnit={setConcentrationUnit}
          setConcentrationHint={setConcentrationHint}
          setTotalAmount={setTotalAmount}
          setTotalAmountHint={setTotalAmountHint}
          setMedicationInputType={setMedicationInputType}
          setIsProcessing={setIsProcessing}
          setProcessingMessage={setProcessingMessage}
          setScanError={setScanError}
          resetFullForm={resetFullForm}
          requestWebCameraPermission={requestWebCameraPermission}
          handleGoHome={handleGoHome}
          onCapture={handleScanAttempt}
        />
      )}
      {screenStep === 'manualEntry' && (
        <ManualEntryScreen
          manualStep={manualStep}
          dose={dose}
          setDose={setDose}
          unit={unit}
          setUnit={setUnit}
          substanceName={substanceName}
          setSubstanceName={setSubstanceName}
          medicationInputType={medicationInputType}
          setMedicationInputType={setMedicationInputType}
          concentrationAmount={concentrationAmount}
          setConcentrationAmount={setConcentrationAmount}
          concentrationUnit={concentrationUnit}
          setConcentrationUnit={setConcentrationUnit}
          totalAmount={totalAmount}
          setTotalAmount={setTotalAmount}
          solutionVolume={solutionVolume}
          setSolutionVolume={setSolutionVolume}
          manualSyringe={manualSyringe}
          setManualSyringe={setManualSyringe}
          doseValue={doseValue}
          calculatedVolume={calculatedVolume}
          recommendedMarking={recommendedMarking}
          calculationError={calculationError}
          formError={formError}
          substanceNameHint={substanceNameHint}
          setSubstanceNameHint={setSubstanceNameHint}
          concentrationHint={concentrationHint}
          setConcentrationHint={setConcentrationHint}
          totalAmountHint={totalAmountHint}
          setTotalAmountHint={setTotalAmountHint}
          syringeHint={syringeHint}
          setSyringeHint={setSyringeHint}
          handleNextDose={handleNextDose}
          handleNextMedicationSource={handleNextMedicationSource}
          handleNextConcentrationInput={handleNextConcentrationInput}
          handleNextTotalAmountInput={handleNextTotalAmountInput}
          handleNextReconstitution={handleNextReconstitution}
          handleCalculateFinal={handleCalculateFinal}
          handleBack={handleBack}
          handleStartOver={handleStartOver}
          setScreenStep={handleSetScreenStep}
        />
      )}
      <LimitModal
        visible={showLimitModal}
        isAnonymous={user?.isAnonymous ?? true}
        isPremium={usageData.plan !== 'free'}
        onClose={() => setShowLimitModal(false)}
      />
      {isProcessing && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>{processingMessage}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: { marginTop: 80, marginBottom: 20, paddingHorizontal: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#000000', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#8E8E93', textAlign: 'center', marginTop: 4 },
  usageInfoContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  scanCreditsContainer: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 8 },
  scanCreditsText: { color: '#333333', fontSize: 14, fontWeight: '500' },
  premiumBadgeContainer: { 
    backgroundColor: '#FFD700', 
    borderRadius: 8, 
    padding: 4, 
    marginLeft: 8,
    // Simulated gradient effect since React Native doesn't have built-in gradients
    shadowColor: '#FFC107',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  premiumBadgeText: { color: '#333333', fontSize: 14, fontWeight: 'bold' },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.8)', zIndex: 1000 },
  loadingText: { color: '#fff', marginTop: 15, fontSize: 16 },
  recoveryButton: { backgroundColor: '#ff3b30', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, marginTop: 8, alignSelf: 'center' },
  recoveryButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
});