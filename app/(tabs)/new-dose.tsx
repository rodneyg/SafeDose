import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import OpenAI from 'openai';
import Constants from 'expo-constants';
import { isMobileWeb } from '../../lib/utils';
import CustomProgressBar from '../../components/CustomProgressBar';
import DoseInputStep from '../../components/DoseInputStep';
import MedicationSourceStep from '../../components/MedicationSourceStep';
import ConcentrationInputStep from '../../components/ConcentrationInputStep';
import TotalAmountInputStep from '../../components/TotalAmountInputStep';
import ReconstitutionStep from '../../components/ReconstitutionStep';
import SyringeStep from '../../components/SyringeStep';
import FinalResultDisplay from '../../components/FinalResultDisplay';
import IntroScreen from '../../components/IntroScreen';
import ScanScreen from '../../components/ScanScreen';
import useDoseCalculator from '../../lib/hooks/useDoseCalculator';

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
  errorText: { fontSize: 14, color: '#f87171', textAlign: 'center', padding: 10, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 8, marginTop: 10 },
  manualEntryContainer: { flex: 1 },
  formWrapper: { alignItems: 'center', paddingHorizontal: 16, paddingBottom: 20 },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', maxWidth: 600, marginTop: 20, gap: 10 },
  backButton: { backgroundColor: '#8E8E93', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center', justifyContent: 'center', width: '45%', minHeight: 50 },
  backButtonMobile: { paddingVertical: 14, minHeight: 55 },
  nextButton: { backgroundColor: '#007AFF', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, width: '45%', minHeight: 50 },
  nextButtonMobile: { paddingVertical: 14, minHeight: 55 },
  disabledButton: { backgroundColor: '#C7C7CC' },
  buttonText: { color: '#f8fafc', fontSize: 16, fontWeight: '500', textAlign: 'center' },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.8)', zIndex: 1000 },
  loadingText: { color: '#fff', marginTop: 15, fontSize: 16 },
});