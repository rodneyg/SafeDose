import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, ScrollView } from 'react-native';
import { Camera as CameraIcon, ArrowRight, Syringe, Pill } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Animated, { FadeIn } from 'react-native-reanimated';
import OpenAI from 'openai';
import Constants from 'expo-constants';
import { isMobileWeb, syringeOptions } from '../../lib/utils';
import CustomProgressBar from '../../components/CustomProgressBar';
import DoseInputStep from '../../components/DoseInputStep';
import MedicationSourceStep from '../../components/MedicationSourceStep';
import ConcentrationInputStep from '../../components/ConcentrationInputStep';
import TotalAmountInputStep from '../../components/TotalAmountInputStep';
import ReconstitutionStep from '../../components/ReconstitutionStep';
import SyringeStep from '../../components/SyringeStep';
import FinalResultDisplay from '../../components/FinalResultDisplay';
import useDoseCalculator from '../../lib/hooks/useDoseCalculator';
import { captureAndProcessImage } from '../../lib/cameraUtils';

export default function NewDoseScreen() {
  const calculateDoseVolumeAndMarking = () => {
    console.log('[Calculate] Starting calculation');
    setCalculatedVolume(null);
    setRecommendedMarking(null);
    setCalculationError(null);

    if (doseValue === null || isNaN(doseValue) || doseValue <= 0) {
      setCalculationError('Dose value is invalid or missing.');
      console.log('[Calculate] Error: Invalid dose value');
      return;
    }

    if (concentration === null || isNaN(concentration) || concentration <= 0) {
      setCalculationError('Concentration is invalid or missing.');
      console.log('[Calculate] Error: Invalid concentration');
      return;
    }

    if (!manualSyringe || !manualSyringe.type || !manualSyringe.volume) {
      setCalculationError('Syringe details are missing.');
      console.log('[Calculate] Error: Missing syringe details');
      return;
    }

    const markingsString = syringeOptions[manualSyringe.type][manualSyringe.volume];
    if (!markingsString) {
      setCalculationError(`Markings unavailable for ${manualSyringe.type} ${manualSyringe.volume} syringe.`);
      console.log('[Calculate] Error: Invalid syringe option');
      return;
    }

    let requiredVolume = doseValue / concentration;
    console.log('[Calculate] Initial required volume (ml):', requiredVolume);

    if (unit === 'mcg' && concentrationUnit === 'mcg/ml') {
      requiredVolume = doseValue / concentration;
    } else if (unit === 'mg' && concentrationUnit === 'mg/ml') {
      requiredVolume = doseValue / concentration;
    } else if (unit === 'units' && concentrationUnit === 'units/ml') {
      requiredVolume = doseValue / concentration;
    } else if (unit === 'mcg' && concentrationUnit === 'mg/ml') {
      requiredVolume = (doseValue / 1000) / concentration;
    } else if (unit === 'mg' && concentrationUnit === 'mcg/ml') {
      requiredVolume = (doseValue * 1000) / concentration;
    } else {
      setCalculationError('Unit mismatch between dose and concentration.');
      console.log('[Calculate] Error: Unit mismatch');
      return;
    }

    console.log('[Calculate] Adjusted required volume (ml):', requiredVolume);
    setCalculatedVolume(requiredVolume);

    const maxVolume = parseFloat(manualSyringe.volume.replace(/[^0-9.]/g, ''));
    if (requiredVolume > maxVolume) {
      setCalculationError(`Required volume (${requiredVolume.toFixed(2)} ml) exceeds syringe capacity (${maxVolume} ml).`);
      console.log('[Calculate] Error: Volume exceeds capacity');
      return;
    }

    const markings = markingsString.split(',').map(m => parseFloat(m));
    const markingScaleValue = manualSyringe.type === 'Insulin' ? requiredVolume * 100 : requiredVolume;
    console.log('[Calculate] Marking scale value:', markingScaleValue);

    const nearestMarking = markings.reduce((prev, curr) =>
      Math.abs(curr - markingScaleValue) < Math.abs(prev - markingScaleValue) ? curr : prev
    );
    console.log('[Calculate] Nearest marking:', nearestMarking);

    let precisionMessage = null;
    if (Math.abs(nearestMarking - markingScaleValue) > 0.01) {
      const unitLabel = manualSyringe.type === 'Insulin' ? 'units' : 'ml';
      precisionMessage = `Calculated dose is ${markingScaleValue.toFixed(2)} ${unitLabel}. Nearest mark is ${nearestMarking} ${unitLabel}.`;
    }

    setRecommendedMarking(nearestMarking.toString());
    console.log('[Calculate] Set recommended marking:', nearestMarking);

    if (precisionMessage) {
      setCalculationError(precisionMessage);
      console.log('[Calculate] Precision message:', precisionMessage);
    }
  };

  const doseCalculator = useDoseCalculator(calculateDoseVolumeAndMarking);
  const {
    screenStep,
    setScreenStep,
    manualStep,
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
  } = doseCalculator;

  const [permission, requestPermission] = useCameraPermissions();
  const [permissionStatus, setPermissionStatus] = useState<'undetermined' | 'granted' | 'denied'>('undetermined');
  const [mobileWebPermissionDenied, setMobileWebPermissionDenied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState<string>('Processing image... This may take a few seconds');
  const [scanError, setScanError] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  const openai = new OpenAI({
    apiKey: Constants.expoConfig?.extra?.OPENAI_API_KEY || '',
    dangerouslyAllowBrowser: true,
  });

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
  }, [screenStep]);

  useEffect(() => {
    console.log("isProcessing changed to:", isProcessing);
  }, [isProcessing]);

  const requestWebCameraPermission = async () => {
    if (!isMobileWeb) return;
    console.warn("Skipping getUserMedia check due to lack of support");
    setPermissionStatus('denied');
    setMobileWebPermissionDenied(true);
  };

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
      setManualStep: doseCalculator.setManualStep,
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

  const renderIntro = () => (
    <Animated.View entering={FadeIn.duration(400)} style={styles.content}>
      <Syringe color={'#6ee7b7'} size={64} style={styles.icon} />
      <Text style={styles.text}>Welcome! Calculate your dose accurately.</Text>
      <View style={styles.disclaimerContainer}>
        <Text style={styles.disclaimerText}>
          **Medical Disclaimer**: This app is for informational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider before making any decisions regarding medication or treatment. Incorrect dosing can lead to serious health risks.
        </Text>
      </View>
      <TouchableOpacity style={[styles.button, isMobileWeb && styles.buttonMobile]} onPress={() => setScreenStep('scan')}>
        <CameraIcon color={'#fff'} size={20} style={{ marginRight: 8 }} />
        <Text style={styles.buttonText}>Scan Items</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, styles.manualButton, isMobileWeb && styles.buttonMobile]} onPress={() => { resetFullForm('dose'); setScreenStep('manualEntry'); }}>
        <Pill color={'#fff'} size={20} style={{ marginRight: 8 }} />
        <Text style={styles.buttonText}>Enter Details Manually</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderScan = () => {
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
          <TouchableOpacity style={[styles.button, isMobileWeb && styles.buttonMobile]} onPress={requestPermission}>
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
          <TouchableOpacity style={[styles.button, isMobileWeb && styles.buttonMobile]} onPress={requestPermission}>
            <Text style={styles.buttonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.backButton, isMobileWeb && styles.backButtonMobile]} onPress={() => setScreenStep('intro')}>
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      );
    }
  };

  const renderManualEntry = () => {
    let currentStepComponent;
    let progress = 0;

    switch (manualStep) {
      case 'dose':
        currentStepComponent = (
          <DoseInputStep
            dose={dose}
            setDose={setDose}
            unit={unit}
            setUnit={setUnit}
          />
        );
        progress = 1 / 5;
        break;
      case 'medicationSource':
        currentStepComponent = (
          <MedicationSourceStep
            substanceName={substanceName}
            setSubstanceName={setSubstanceName}
            setSubstanceNameHint={setSubstanceNameHint}
            substanceNameHint={substanceNameHint}
            medicationInputType={medicationInputType}
            setMedicationInputType={setMedicationInputType}
          />
        );
        progress = 2 / 5;
        break;
      case 'concentrationInput':
        currentStepComponent = (
          <ConcentrationInputStep
            concentrationAmount={concentrationAmount}
            setConcentrationAmount={setConcentrationAmount}
            concentrationUnit={concentrationUnit}
            setConcentrationUnit={setConcentrationUnit}
            setConcentrationHint={setConcentrationHint}
            concentrationHint={concentrationHint}
          />
        );
        progress = 3 / 5;
        break;
      case 'totalAmountInput':
        currentStepComponent = (
          <TotalAmountInputStep
            totalAmount={totalAmount}
            setTotalAmount={setTotalAmount}
            setTotalAmountHint={setTotalAmountHint}
            totalAmountHint={totalAmountHint}
            unit={unit}
          />
        );
        progress = 3 / 5;
        break;
      case 'reconstitution':
        currentStepComponent = (
          <ReconstitutionStep
            solutionVolume={solutionVolume}
            setSolutionVolume={setSolutionVolume}
          />
        );
        progress = 4 / 5;
        break;
      case 'syringe':
        currentStepComponent = (
          <SyringeStep
            manualSyringe={manualSyringe}
            setManualSyringe={setManualSyringe}
            setSyringeHint={setSyringeHint}
            syringeHint={syringeHint}
          />
        );
        progress = 5 / 5;
        break;
      case 'finalResult':
        currentStepComponent = (
          <FinalResultDisplay
            calculationError={calculationError}
            recommendedMarking={recommendedMarking}
            doseValue={doseValue}
            unit={unit}
            substanceName={substanceName}
            manualSyringe={manualSyringe}
            calculatedVolume={calculatedVolume}
            handleStartOver={handleStartOver}
            setScreenStep={setScreenStep}
            isMobileWeb={isMobileWeb}
          />
        );
        progress = 1;
        break;
      default:
        currentStepComponent = <Text style={styles.errorText}>Invalid step</Text>;
    }

    return (
      <ScrollView style={styles.manualEntryContainer}>
        <CustomProgressBar progress={progress} />
        <View style={styles.formWrapper}>
          {currentStepComponent}
          {formError && <Text style={styles.errorText}>{formError}</Text>}
          {manualStep !== 'finalResult' && (
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={[styles.backButton, isMobileWeb && styles.backButtonMobile]} onPress={handleBack}>
                <Text style={styles.buttonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.nextButton, (manualStep === 'dose' && !dose) && styles.disabledButton, isMobileWeb && styles.nextButtonMobile]}
                onPress={() => {
                  if (manualStep === 'dose') handleNextDose();
                  else if (manualStep === 'medicationSource') handleNextMedicationSource();
                  else if (manualStep === 'concentrationInput') handleNextConcentrationInput();
                  else if (manualStep === 'totalAmountInput') handleNextTotalAmountInput();
                  else if (manualStep === 'reconstitution') handleNextReconstitution();
                  else if (manualStep === 'syringe') handleCalculateFinal();
                }}
                disabled={manualStep === 'dose' && !dose}
              >
                <Text style={styles.buttonText}>
                  {manualStep === 'syringe' ? 'Calculate' : 'Next'}
                </Text>
                {manualStep !== 'syringe' && <ArrowRight color="#fff" size={18} />}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
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
      </View>
      {screenStep === 'intro' && renderIntro()}
      {screenStep === 'scan' && renderScan()}
      {screenStep === 'manualEntry' && renderManualEntry()}
      {isProcessing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
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
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, padding: 20 },
  icon: { marginBottom: 16 },
  text: { fontSize: 16, color: '#000000', textAlign: 'center', paddingHorizontal: 16 },
  errorText: { fontSize: 14, color: '#f87171', textAlign: 'center', padding: 10, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 8, marginTop: 10 },
  disclaimerContainer: { backgroundColor: '#FFF3CD', padding: 12, borderRadius: 8, marginVertical: 10, width: '90%', alignSelf: 'center' },
  disclaimerText: { fontSize: 12, color: '#856404', textAlign: 'center', fontStyle: 'italic' },
  button: { backgroundColor: '#007AFF', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '80%', minHeight: 50 },
  buttonMobile: { paddingVertical: 16, paddingHorizontal: 32, minHeight: 60 },
  tryCameraAgainButton: { backgroundColor: '#FF9500', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '80%', minHeight: 50 },
  manualButton: { backgroundColor: '#6366f1' },
  backButton: { backgroundColor: '#8E8E93', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center', justifyContent: 'center', width: '45%', minHeight: 50 },
  backButtonMobile: { paddingVertical: 14, minHeight: 55 },
  manualEntryContainer: { flex: 1 },
  formWrapper: { alignItems: 'center', paddingHorizontal: 16, paddingBottom: 20 },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', maxWidth: 600, marginTop: 20, gap: 10 },
  nextButton: { backgroundColor: '#007AFF', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, width: '45%', minHeight: 50 },
  nextButtonMobile: { paddingVertical: 14, minHeight: 55 },
  disabledButton: { backgroundColor: '#C7C7CC' },
  scanContainer: { flex: 1, backgroundColor: '#000' },
  overlayBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: 40, paddingTop: 20, alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  bottomButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 20, marginTop: 10 },
  manualEntryButtonScan: { padding: 10, backgroundColor: 'rgba(0, 0, 0, 0.6)', borderRadius: 20 },
  backButtonScan: { padding: 10, backgroundColor: 'rgba(0, 0, 0, 0.6)', borderRadius: 20 },
  scanText: { fontSize: 18, color: '#fff', textAlign: 'center', paddingHorizontal: 20, marginBottom: 15, fontWeight: 'bold' },
  captureButton: { backgroundColor: '#ef4444', width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'rgba(255, 255, 0.5)', marginBottom: 20 },
  backButtonText: { color: '#fff', fontSize: 14 },
  buttonText: { color: '#f8fafc', fontSize: 16, fontWeight: '500', textAlign: 'center' },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.8)', zIndex: 1000 },
  loadingText: { color: '#fff', marginTop: 15, fontSize: 16 },
});