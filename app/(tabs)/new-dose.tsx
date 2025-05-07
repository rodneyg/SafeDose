import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import OpenAI from 'openai';
import Constants from 'expo-constants';
import { isMobileWeb } from '../../lib/utils';
import IntroScreen from '../../components/IntroScreen';
import ScanScreen from '../../components/ScanScreen';
import ManualEntryScreen from '../../components/ManualEntryScreen';
import LimitModal from '../../components/LimitModal';
import useDoseCalculator from '../../lib/hooks/useDoseCalculator';
import { useUsageTracking } from '../../lib/hooks/useUsageTracking';

export default function NewDoseScreen() {
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
  } = useDoseCalculator();

  const [permission, requestPermission] = useCameraPermissions();
  const [permissionStatus, setPermissionStatus] = useState<'undetermined' | 'granted' | 'denied'>('undetermined');
  const [mobileWebPermissionDenied, setMobileWebPermissionDenied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState<string>('Processing image... This may take a few seconds');
  const [scanError, setScanError] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);

  const openai = new OpenAI({
    apiKey: Constants.expoConfig?.extra?.OPENAI_API_KEY || '',
    dangerouslyAllowBrowser: true,
  });

  const { usageData } = useUsageTracking();
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
      <TouchableOpacity
        style={styles.testButton}
        onPress={() => setShowLimitModal(true)}
      >
        <Text style={styles.testButtonText}>Show Limit Modal</Text>
      </TouchableOpacity>
      {screenStep === 'intro' && (
        <IntroScreen
          setScreenStep={setScreenStep}
          resetFullForm={resetFullForm}
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
          openai={openai}
          setScreenStep={setScreenStep}
          setManualStep={setManualStep}
          setManualSyringe={setManualSyringe}
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
          setScreenStep={setScreenStep}
        />
      )}
      <LimitModal
        visible={showLimitModal}
        isAnonymous={usageData.plan === 'free' && !usageData.scansUsed}
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
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.8)', zIndex: 1000 },
  loadingText: { color: '#fff', marginTop: 15, fontSize: 16 },
  testButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    margin: 10,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});