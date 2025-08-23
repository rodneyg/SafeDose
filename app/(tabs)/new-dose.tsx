import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import OpenAI from 'openai';
import Constants from 'expo-constants';
import { useNavigation, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { isMobileWeb, isWeb, insulinVolumes, standardVolumes } from '../../lib/utils';
import IntroScreen from '../../components/IntroScreen';
import BeforeFirstScanScreen from '../../components/BeforeFirstScanScreen';
import ScanScreen from '../../components/ScanScreen';
import ManualEntryScreen from '../../components/ManualEntryScreen';
import WhyAreYouHereScreen from '../../components/WhyAreYouHereScreen';
import InjectionSiteSelector from '../../components/InjectionSiteSelector';
import PostDoseFeedbackScreen from '../../components/PostDoseFeedbackScreen';
import PMFSurveyModal from '../../components/PMFSurveyModal';
import LimitModal from '../../components/LimitModal';
import LogLimitModal from '../../components/LogLimitModal';
import VolumeErrorModal from '../../components/VolumeErrorModal'; // Import the new modal
import ImagePreviewModal from '../../components/ImagePreviewModal'; // Import image preview modal
import SignUpPrompt from '../../components/SignUpPrompt'; // Import sign-up prompt
import useDoseCalculator from '../../lib/hooks/useDoseCalculator';
import { useUsageTracking } from '../../lib/hooks/useUsageTracking';
import { useFeedbackStorage } from '../../lib/hooks/useFeedbackStorage';
import { useDoseLogging } from '../../lib/hooks/useDoseLogging';
import { useSignUpPrompt } from '../../lib/hooks/useSignUpPrompt';
import { useAuth } from '../../contexts/AuthContext';
import { captureAndProcessImage } from '../../lib/cameraUtils';
import { logAnalyticsEvent, ANALYTICS_EVENTS } from '../../lib/analytics';

type ScreenStep = 'intro' | 'beforeFirstScan' | 'scan' | 'manualEntry' | 'whyAreYouHere' | 'injectionSiteSelection' | 'postDoseFeedback' | 'pmfSurvey';

export default function NewDoseScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const { usageData, checkUsageLimit, incrementScansUsed } = useUsageTracking();
  const searchParams = useLocalSearchParams();
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [hasInitializedAfterNavigation, setHasInitializedAfterNavigation] = useState(false);
  const [isScreenActive, setIsScreenActive] = useState(true);
  const [navigatingFromIntro, setNavigatingFromIntro] = useState(false);
  const prefillAppliedRef = useRef(false);

  const feedbackStorage = useFeedbackStorage();
  const signUpPrompt = useSignUpPrompt();
  const { getDoseLogHistory } = useDoseLogging();
  
  const doseCalculator = useDoseCalculator({ 
    checkUsageLimit,
    trackInteraction: signUpPrompt.trackInteraction,
  });
  
  // Add useEffect to enforce viewport constraints for mobile web
  useEffect(() => {
    const lockViewport = () => {
      if (typeof document !== 'undefined') {
        document.body.style.width = '100vw';
        document.body.style.maxWidth = '100vw';
        document.body.style.overflowX = 'hidden';
        
        // Prevent zoom on iOS Safari/Chrome
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
          viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no');
        }
      }
    };
    
    lockViewport();
    
    // Re-apply on window resize
    window.addEventListener('resize', lockViewport);
    
    // Add touch event listeners to prevent zoom gestures
    const preventZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };
    
    const preventGestureStart = (e: Event) => {
      e.preventDefault();
    };
    
    if (typeof document !== 'undefined') {
      document.addEventListener('gesturestart', preventGestureStart);
      document.addEventListener('touchmove', preventZoom, { passive: false });
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', lockViewport);
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('gesturestart', preventGestureStart);
        document.removeEventListener('touchmove', preventZoom);
      }
    };
  }, []);

  // Handle prefill data from reconstitution planner - runs after doseCalculator is initialized
  useEffect(() => {
    const prefillTotalAmount = searchParams.prefillTotalAmount as string;
    const prefillTotalUnit = searchParams.prefillTotalUnit as string;
    const prefillSolutionVolume = searchParams.prefillSolutionVolume as string;
    const prefillDose = searchParams.prefillDose as string;
    const prefillDoseUnit = searchParams.prefillDoseUnit as string;
    
    // Reset the applied flag when params change
    if (!prefillTotalAmount || !prefillTotalUnit) {
      prefillAppliedRef.current = false;
    }
    
    // Only apply prefill if we have total amount data, haven't applied it yet, and doseCalculator is on the intro screen
    if (prefillTotalAmount && prefillTotalUnit && !prefillAppliedRef.current && doseCalculator.screenStep === 'intro') {
      console.log('[NewDoseScreen] Applying prefilled total amount data from reconstitution planner');
      prefillAppliedRef.current = true;
      
      // Set up the dose calculator with prefilled total amount data (not concentration)
      doseCalculator.setTotalAmount(prefillTotalAmount);
      doseCalculator.setMedicationInputType('totalAmount');
      doseCalculator.setTotalAmountHint('From reconstitution planner');
      
      // Prefill solution volume if provided
      if (prefillSolutionVolume) {
        doseCalculator.setSolutionVolume(prefillSolutionVolume);
        console.log('[NewDoseScreen] Prefilled solution volume:', prefillSolutionVolume);
      }
      
      // Prefill dose if provided
      if (prefillDose && prefillDoseUnit) {
        doseCalculator.setDose(prefillDose);
        doseCalculator.setUnit(prefillDoseUnit as any);
        console.log('[NewDoseScreen] Prefilled dose:', prefillDose, prefillDoseUnit);
      }
      
      // Start from dose step - user still needs to enter their dose
      doseCalculator.setManualStep('dose');
      doseCalculator.setScreenStep('manualEntry');
      
      console.log('[NewDoseScreen] ✅ Prefilled total amount data applied, starting from dose step');
    }
  }, [searchParams.prefillTotalAmount, searchParams.prefillTotalUnit, searchParams.prefillSolutionVolume, searchParams.prefillDose, searchParams.prefillDoseUnit, doseCalculator.screenStep]);
  
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
    calculatedConcentration,
    setCalculatedConcentration,
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
    handleNextPreDoseConfirmation,
    handleBack,
    handleStartOver,
    handleGoHome,
    handleCapture,
    // Destructure new state and handlers
    showVolumeErrorModal,
    setShowVolumeErrorModal,
    volumeErrorValue,
    setVolumeErrorValue,
    handleCloseVolumeErrorModal,
    handleReEnterVialData,
    // Feedback context
    feedbackContext,
    handleGoToFeedback,
    handleFeedbackComplete,
    // WhyAreYouHere handlers
    handleWhyAreYouHereSubmit,
    handleWhyAreYouHereSkip,
    validateDoseInput,
    validateConcentrationInput,
    // Last action tracking
    lastActionType,
    // Log limit modal
    showLogLimitModal,
    logLimitModalTriggerReason,
    handleCloseLogLimitModal,
    handleContinueWithoutSaving,
    logUsageData,
    // PMF Survey
    pmfSurveyTriggerData,
    handlePMFSurveyComplete,
    handlePMFSurveySkip,
    // Injection site selection
    selectedInjectionSite,
    setSelectedInjectionSite,
    handleInjectionSiteSelected,
    handleInjectionSiteCancel,
  } = doseCalculator;

  const [permission, requestPermission] = useCameraPermissions();
  const [permissionStatus, setPermissionStatus] = useState<'undetermined' | 'granted' | 'denied'>('undetermined');
  const [mobileWebPermissionDenied, setMobileWebPermissionDenied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState<string>('Processing image... This may take a few seconds');
  const [scanError, setScanError] = useState<string | null>(null);
  const [doseHistory, setDoseHistory] = useState<import('../../types/doseLog').DoseLog[]>([]);
  const [webFlashlightEnabled, setWebFlashlightEnabled] = useState(false);
  const [webFlashlightSupported, setWebFlashlightSupported] = useState(false);
  const [lastScreenStep, setLastScreenStep] = useState<ScreenStep>('intro');
  const cameraRef = useRef<CameraView>(null);
  const webCameraStreamRef = useRef<MediaStream | null>(null);

  // Image preview modal state
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [capturedImageUri, setCapturedImageUri] = useState<string>('');
  const [pendingScanResult, setPendingScanResult] = useState<any>(null);

  const openai = new OpenAI({
    apiKey: (Constants as any).expoConfig?.extra?.OPENAI_API_KEY || '',
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

  // Control tab bar visibility based on screen step
  useEffect(() => {
    if (navigation?.getParent) {
      const parent = navigation.getParent();
      if (parent?.setOptions) {
        parent.setOptions({
          tabBarStyle: screenStep === 'scan' ? { display: 'none' } : undefined,
        });
      }
    }
  }, [screenStep, navigation]);

  // Define requestWebCameraPermission before the useEffect that uses it
  const requestWebCameraPermission = useCallback(async () => {
    if (!isWeb) return;
    
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
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "environment" // Prefer back camera on mobile web
        } 
      });
      
      // Permission granted - we got a stream
      console.log("[WebCamera] Camera permission granted");
      setPermissionStatus('granted');
      setMobileWebPermissionDenied(false);
      
      // Store the stream for later use instead of stopping it
      webCameraStreamRef.current = stream;
      
      // Check if torch is supported
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities();
        const torchSupported = !!(capabilities as any).torch;
        setWebFlashlightSupported(torchSupported);
        console.log("[WebCamera] Torch support:", torchSupported);
      }
    } catch (error: any) {
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
  }, [isWeb]);

  // Track screen transitions to detect feedback -> scan transitions
  useEffect(() => {
    console.log('[NewDoseScreen] Screen transition:', lastScreenStep, '->', screenStep);
    
    // Force camera re-initialization when returning to scan from feedback
    if (lastScreenStep === 'postDoseFeedback' && screenStep === 'scan' && isWeb) {
      console.log('[NewDoseScreen] 🔄 Detected feedback -> scan transition, forcing camera reset');
      
      // Clean up any existing stream
      if (webCameraStreamRef.current) {
        webCameraStreamRef.current.getTracks().forEach(track => track.stop());
        webCameraStreamRef.current = null;
      }
      
      // Reset permission status to force fresh camera request
      setPermissionStatus('undetermined');
      setMobileWebPermissionDenied(false);
      
      // Small delay to ensure cleanup completes before re-requesting
      setTimeout(() => {
        console.log('[NewDoseScreen] 📸 Requesting fresh camera permission after reset');
        requestWebCameraPermission();
      }, 200);
    }
    
    setLastScreenStep(screenStep);
  }, [screenStep, lastScreenStep, isWeb, requestWebCameraPermission]);

  useEffect(() => {
    console.log("[WebCamera] Camera useEffect triggered", { 
      screenStep, 
      permissionStatus, 
      hasStream: !!webCameraStreamRef.current,
      isWeb 
    });
    
    if (isWeb && screenStep === 'scan') {
      // Request camera permission if undetermined, or re-establish stream if permission granted but no active stream
      console.log("[WebCamera] Scan screen active, checking camera state", { 
        permissionStatus, 
        hasStream: !!webCameraStreamRef.current 
      });
      
      if (permissionStatus === 'undetermined' || 
          (permissionStatus === 'granted' && !webCameraStreamRef.current)) {
        console.log("[WebCamera] Requesting camera permission/stream");
        requestWebCameraPermission();
      } else {
        console.log("[WebCamera] Not requesting camera - permissionStatus:", permissionStatus, "hasStream:", !!webCameraStreamRef.current);
      }
    }
    
    // Clean up camera stream when navigating away from scan screen
    if (screenStep !== 'scan' && webCameraStreamRef.current) {
      console.log("[WebCamera] Cleaning up camera stream on screen change from", screenStep);
      webCameraStreamRef.current.getTracks().forEach(track => track.stop());
      webCameraStreamRef.current = null;
    }
  }, [screenStep, permissionStatus, isWeb, requestWebCameraPermission]);

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

  // Load dose history when injection site selection screen is shown
  useEffect(() => {
    if (screenStep === 'injectionSiteSelection') {
      const loadDoseHistory = async () => {
        try {
          const history = await getDoseLogHistory();
          setDoseHistory(history);
        } catch (error) {
          console.error('Error loading dose history for injection site selection:', error);
          setDoseHistory([]); // Fallback to empty array
        }
      };
      
      loadDoseHistory();
    }
  }, [screenStep, getDoseLogHistory]);

  // Function to apply scan results to form state
  const applyScanResults = (result: any) => {
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
    // Clear calculation-related state without resetting the scan results
    setCalculatedVolume(null);
    setRecommendedMarking(null);
    setCalculationError(null);
    setFormError(null);
    // Note: showVolumeErrorModal and volumeErrorValue are managed internally by doseCalculator
    setScreenStep('manualEntry');
    setManualStep('dose');
  };

  // Function to apply last dose from history to form state
  const applyLastDose = async (): Promise<boolean> => {
    try {
      console.log('[applyLastDose] ========== STARTING APPLY LAST DOSE ==========');
      console.log('[applyLastDose] Getting dose history...');
      const doseHistory = await getDoseLogHistory();
      
      if (doseHistory.length === 0) {
        console.log('[applyLastDose] No dose history found');
        return false;
      }
      
      const lastDose = doseHistory[0];
      console.log('[applyLastDose] Found last dose:', JSON.stringify(lastDose, null, 2));
      
      // Validate that we have the minimum required data
      if (!lastDose.doseValue || !lastDose.calculatedVolume) {
        console.log('[applyLastDose] Last dose missing required calculation fields');
        return false;
      }

      console.log('[applyLastDose] ========== APPLYING DOSE DATA ==========');
      
      // Apply basic dose information with fallbacks for missing data
      const substanceNameValue = lastDose.substanceName || 'Previous Substance';
      const doseValue = lastDose.doseValue.toString();
      const unitValue = (lastDose.unit || 'mg') as 'mg' | 'mcg' | 'units' | 'mL';
      
      console.log('[applyLastDose] Applying values:', {
        substanceName: substanceNameValue,
        dose: doseValue,
        unit: unitValue,
        syringeType: lastDose.syringeType,
        injectionSite: lastDose.injectionSite,
        medicationInputType: lastDose.medicationInputType,
        originalData: {
          concentrationAmount: lastDose.concentrationAmount,
          concentrationUnit: lastDose.concentrationUnit,
          totalAmount: lastDose.totalAmount,
          solutionVolume: lastDose.solutionVolume,
        }
      });
      
      // Clear calculation state first
      setCalculatedVolume(null);
      setRecommendedMarking(null);
      setCalculationError(null);
      setFormError(null);
      setShowVolumeErrorModal(false);
      setVolumeErrorValue(null);
      
      // Set basic dose information
      setSubstanceName(substanceNameValue);
      setSubstanceNameHint(lastDose.substanceName ? 'From your last dose' : 'Substance name was not saved - please update');
      setDose(doseValue);
      setUnit(unitValue);
      
      // Apply syringe information if available
      if (lastDose.syringeType) {
        const defaultVolume = lastDose.syringeType === 'Insulin' ? '1 ml' : '3 ml';
        setManualSyringe({ type: lastDose.syringeType, volume: defaultVolume });
        setSyringeHint('Syringe type from your last dose');
      } else {
        setManualSyringe({ type: 'Standard', volume: '3 ml' });
        setSyringeHint(null);
      }
      
      // Set injection site if available
      if (lastDose.injectionSite) {
        setSelectedInjectionSite(lastDose.injectionSite);
      }
      
      // Restore original medication input method and values if available
      if (lastDose.medicationInputType && lastDose.medicationInputType === 'concentration') {
        // User originally entered concentration
        setMedicationInputType('concentration');
        setConcentrationAmount(lastDose.concentrationAmount || '');
        setConcentrationUnit((lastDose.concentrationUnit || 'mg/ml') as 'mg/ml' | 'mcg/ml' | 'units/ml');
        setConcentrationHint('From your last dose');
        
        // Clear total amount fields
        setTotalAmount('');
        setSolutionVolume('');
        setTotalAmountHint(null);
        
        console.log('[applyLastDose] Restored concentration inputs:', {
          amount: lastDose.concentrationAmount,
          unit: lastDose.concentrationUnit
        });
        
      } else if (lastDose.medicationInputType && lastDose.medicationInputType === 'totalAmount') {
        // User originally entered total amount
        setMedicationInputType('totalAmount');
        setTotalAmount(lastDose.totalAmount || '');
        setSolutionVolume(lastDose.solutionVolume || '');
        setTotalAmountHint('From your last dose');
        
        // Clear concentration fields
        setConcentrationAmount('');
        setConcentrationUnit('mg/ml');
        setConcentrationHint(null);
        
        console.log('[applyLastDose] Restored total amount inputs:', {
          totalAmount: lastDose.totalAmount,
          solutionVolume: lastDose.solutionVolume
        });
        
      } else {
        // Fallback for older logs without original input data
        // Try to calculate concentration from dose/volume ratio as before
        console.log('[applyLastDose] No original input data found, falling back to calculated concentration');
        
        if (lastDose.calculatedVolume && lastDose.doseValue) {
          const calculatedConcentration = lastDose.doseValue / lastDose.calculatedVolume;
          const concentrationAmountValue = calculatedConcentration.toString();
          
          setConcentrationAmount(concentrationAmountValue);
          setMedicationInputType('concentration');
          setConcentrationHint('Calculated from your last dose (original input not available)');
          
          // Set concentration unit based on dose unit
          if (lastDose.unit === 'mg') {
            setConcentrationUnit('mg/ml');
          } else if (lastDose.unit === 'mcg') {
            setConcentrationUnit('mcg/ml');
          } else if (lastDose.unit === 'units') {
            setConcentrationUnit('units/ml');
          }
          
          // Clear total amount fields
          setTotalAmount('');
          setSolutionVolume('');
          setTotalAmountHint(null);
        } else {
          // If we can't calculate concentration, default to total amount mode
          setMedicationInputType('totalAmount');
          setConcentrationAmount('');
          setConcentrationUnit('mg/ml');
          setConcentrationHint(null);
          setTotalAmountHint('Please enter the medication strength');
          setTotalAmount('');
          setSolutionVolume('');
        }
      }
      
      // Set to dose step
      setManualStep('dose');
      
      // Add a longer delay to ensure all state updates are complete
      await new Promise(resolve => setTimeout(resolve, 300));
      
      console.log('[applyLastDose] ========== APPLY LAST DOSE COMPLETE ==========');
      console.log('[applyLastDose] Successfully applied last dose, final state should be:', {
        dose: doseValue,
        unit: unitValue,
        substanceName: substanceNameValue,
        medicationInputType: lastDose.medicationInputType || 'concentration',
        manualStep: 'dose'
      });
      
      // Additional debug: Log current state after delay
      console.log('[applyLastDose] 🔍 STATE CHECK: Current dose value after delay:', dose);
      console.log('[applyLastDose] 🔍 STATE CHECK: Current substanceName after delay:', substanceName);
      console.log('[applyLastDose] 🔍 STATE CHECK: Current medicationInputType after delay:', medicationInputType);
      
      return true;
    } catch (error) {
      console.error('[applyLastDose] ========== ERROR IN APPLY LAST DOSE ==========');
      console.error('[applyLastDose] Error applying last dose:', error);
      return false;
    }
  };

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
        
        // Track interaction for sign-up prompt
        signUpPrompt.trackInteraction();
        
        // If we have a captured image, show the preview modal first
        if (result.capturedImage?.uri) {
          console.log('[Process] Showing image preview modal');
          setCapturedImageUri(result.capturedImage.uri);
          setPendingScanResult(result);
          setShowImagePreview(true);
          return; // Don't proceed to manual entry yet
        }

        // If no captured image, proceed directly (fallback for older flow)
        applyScanResults(result);
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

  const handleTryAIScan = useCallback(async () => {
    console.log('handleTryAIScan: Called from teaser');
    
    // Check if user has remaining scans
    const canProceed = await doseCalculator.handleCapture();
    if (!canProceed) {
      console.log('handleTryAIScan: Showing LimitModal');
      logAnalyticsEvent(ANALYTICS_EVENTS.REACH_SCAN_LIMIT);
      setShowLimitModal(true);
      return;
    }

    // Log that user tried AI scan from teaser
    logAnalyticsEvent(ANALYTICS_EVENTS.SCAN_ATTEMPT, { source: 'teaser' });
    
    // Transition to scan screen
    setScreenStep('scan');
  }, [doseCalculator, setScreenStep]);

  const toggleWebFlashlight = async () => {
    if (!isWeb || !webCameraStreamRef.current) return;
    
    try {
      const videoTrack = webCameraStreamRef.current.getVideoTracks()[0];
      if (!videoTrack) {
        console.warn("[WebFlashlight] No video track available");
        return;
      }

      // Check if torch capability is supported
      const capabilities = videoTrack.getCapabilities();
      if (!(capabilities as any).torch) {
        console.warn("[WebFlashlight] Torch not supported on this device");
        return;
      }

      const newFlashlightState = !webFlashlightEnabled;
      console.log(`[WebFlashlight] Setting torch to: ${newFlashlightState}`);
      
      await videoTrack.applyConstraints({
        advanced: [{ torch: newFlashlightState } as any]
      });
      
      setWebFlashlightEnabled(newFlashlightState);
      console.log(`[WebFlashlight] Torch successfully set to: ${newFlashlightState}`);
    } catch (error) {
      console.error("[WebFlashlight] Error toggling flashlight:", error);
      // Silently fail - flashlight is a nice-to-have feature
    }
  };

  // Image preview modal handlers
  const handleImagePreviewRetake = useCallback(() => {
    console.log('[ImagePreview] User chose to retake image');
    setShowImagePreview(false);
    setCapturedImageUri('');
    setPendingScanResult(null);
    // Stay on scan screen for retake
  }, []);

  const handleImagePreviewContinue = useCallback(() => {
    console.log('[ImagePreview] User chose to continue with image');
    setShowImagePreview(false);
    setCapturedImageUri('');
    
    // Apply the pending scan results and proceed to manual entry
    if (pendingScanResult) {
      applyScanResults(pendingScanResult);
      setPendingScanResult(null);
    }
  }, [pendingScanResult]);

  // Feedback handlers
  const handleFeedbackSubmit = useCallback(async (feedbackType: any, notes?: string) => {
    console.log('[NewDoseScreen] handleFeedbackSubmit called', { feedbackType, feedbackContext });
    if (!feedbackContext) return;
    
    await feedbackStorage.submitFeedback(
      feedbackType,
      feedbackContext.doseInfo,
      notes
    );
    
    // Clear any scan errors before navigating
    setScanError(null);
    console.log('[NewDoseScreen] About to call handleFeedbackComplete');
    handleFeedbackComplete();
  }, [feedbackContext, feedbackStorage, handleFeedbackComplete]);

  const handleFeedbackSkip = useCallback(() => {
    console.log('[NewDoseScreen] handleFeedbackSkip called', { feedbackContext });
    // Clear any scan errors before navigating 
    setScanError(null);
    console.log('[NewDoseScreen] About to call handleFeedbackComplete');
    handleFeedbackComplete();
  }, [handleFeedbackComplete]);

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
        <Text style={styles.title}>SafeDose</Text>
        {/* Only show subtitle for non-intro screens to avoid redundant "Welcome" text */}
        {screenStep !== 'intro' && (
          <Text style={styles.subtitle}>
            {screenStep === 'beforeFirstScan' && 'Before You Scan'}
            {screenStep === 'scan' && 'Scan Syringe & Vial'}
            {screenStep === 'whyAreYouHere' && 'Quick Question'}
            {screenStep === 'injectionSiteSelection' && 'Select Injection Site'}
            {screenStep === 'postDoseFeedback' && 'Share Your Experience'}
            {screenStep === 'pmfSurvey' && 'Quick Survey'}
            {screenStep === 'manualEntry' && (
              `${
                manualStep === 'dose' ? 'Enter Dose' :
                manualStep === 'medicationSource' ? 'Select Medication Type' :
                manualStep === 'concentrationInput' ? 'Enter Concentration' :
                manualStep === 'totalAmountInput' ? 'Enter Total Amount' :
                manualStep === 'reconstitution' ? 'Reconstitution' :
                manualStep === 'syringe' ? 'Select Syringe' :
                manualStep === 'preDoseConfirmation' ? 'Pre-Dose Safety Review' :
                'Calculation Result'
              }`
            )}
          </Text>
        )}
        
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
          applyLastDose={applyLastDose}
          onScanPress={doseCalculator.handleScanNavigation}
        />
      )}
      {screenStep === 'beforeFirstScan' && (
        <BeforeFirstScanScreen
          onContinue={doseCalculator.handleBeforeFirstScanContinue}
          onBack={doseCalculator.handleBeforeFirstScanBack}
          onDontShowAgain={
            doseCalculator.beforeFirstScanPrompt.showCount > 0
              ? doseCalculator.handleBeforeFirstScanDontShowAgain
              : undefined
          }
          showDontShowAgain={doseCalculator.beforeFirstScanPrompt.showCount > 0}
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
          webFlashlightEnabled={webFlashlightEnabled}
          webFlashlightSupported={webFlashlightSupported}
          toggleWebFlashlight={toggleWebFlashlight}
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
          calculatedConcentration={calculatedConcentration}
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
          handleNextPreDoseConfirmation={handleNextPreDoseConfirmation}
          handleBack={handleBack}
          handleStartOver={handleStartOver}
          setScreenStep={handleSetScreenStep}
          handleGoToFeedback={handleGoToFeedback}
          lastActionType={lastActionType}
          validateDoseInput={validateDoseInput}
          validateConcentrationInput={validateConcentrationInput}
          usageData={usageData}
          onTryAIScan={handleTryAIScan}
        />
      )}
      {screenStep === 'whyAreYouHere' && (
        <WhyAreYouHereScreen
          onSubmit={handleWhyAreYouHereSubmit}
          onSkip={handleWhyAreYouHereSkip}
          isMobileWeb={isMobileWeb}
        />
      )}
      {screenStep === 'pmfSurvey' && (
        <PMFSurveyModal
          isVisible={true}
          onComplete={handlePMFSurveyComplete}
          onSkip={handlePMFSurveySkip}
          sessionCount={pmfSurveyTriggerData.sessionCount}
          isMobileWeb={isMobileWeb}
        />
      )}
      {screenStep === 'injectionSiteSelection' && (
        <InjectionSiteSelector
          doseHistory={doseHistory}
          selectedSite={selectedInjectionSite}
          onSiteSelect={setSelectedInjectionSite}
          onConfirm={handleInjectionSiteSelected}
          onCancel={handleInjectionSiteCancel}
        />
      )}
      {screenStep === 'postDoseFeedback' && feedbackContext && (
        <PostDoseFeedbackScreen
          context={feedbackContext}
          onSubmit={handleFeedbackSubmit}
          onSkip={handleFeedbackSkip}
          isMobileWeb={isMobileWeb}
        />
      )}
      <LimitModal
        visible={showLimitModal}
        isAnonymous={user?.isAnonymous ?? true}
        isPremium={usageData.plan !== 'free'}
        onClose={() => setShowLimitModal(false)}
      />
      <LogLimitModal
        visible={showLogLimitModal}
        isAnonymous={user?.isAnonymous ?? true}
        isPremium={logUsageData.plan !== 'free'}
        onClose={handleCloseLogLimitModal}
        onContinueWithoutSaving={handleContinueWithoutSaving}
        triggerReason={logLimitModalTriggerReason}
      />
      <VolumeErrorModal
        visible={showVolumeErrorModal}
        onClose={handleCloseVolumeErrorModal}
        onReEnterVialData={handleReEnterVialData}
        // volumeErrorValue={volumeErrorValue} // Pass if needed by the modal for display
      />
      <ImagePreviewModal
        visible={showImagePreview}
        imageUri={capturedImageUri}
        scanResult={pendingScanResult}
        onRetake={handleImagePreviewRetake}
        onContinue={handleImagePreviewContinue}
        autoAdvanceDelay={15000} // 15 seconds auto-advance for concentration
      />
      {isProcessing && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>{processingMessage}</Text>
        </View>
      )}
      <SignUpPrompt
        visible={signUpPrompt.shouldShowPrompt}
        onSignUp={signUpPrompt.handlePromptClick}
        onDismiss={signUpPrompt.dismissPrompt}
        onShow={signUpPrompt.markPromptShown}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F2F2F7',
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden'
  },
  header: { marginTop: 70, marginBottom: 20, paddingHorizontal: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#000000', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#8E8E93', textAlign: 'center', marginTop: 8 },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.8)', zIndex: 1000 },
  loadingText: { color: '#fff', marginTop: 15, fontSize: 16 },
  recoveryButton: { backgroundColor: '#ff3b30', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, marginTop: 8, alignSelf: 'center' },
  recoveryButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
});