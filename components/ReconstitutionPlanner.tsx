import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { ArrowLeft, Camera, Edit3, Calculator, ArrowRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useCameraPermissions, CameraView } from 'expo-camera';
import OpenAI from 'openai';
import Constants from 'expo-constants';

import { useReconstitutionPlanner } from '../lib/hooks/useReconstitutionPlanner';
import { captureAndProcessImage } from '../lib/cameraUtils';
import ReconstitutionInputMethodStep from './ReconstitutionInputMethodStep';
import ReconstitutionManualInputStep from './ReconstitutionManualInputStep';
import ReconstitutionScanStep from './ReconstitutionScanStep';
import ReconstitutionOutputStep from './ReconstitutionOutputStep';
import { isMobileWeb } from '../lib/utils';

export default function ReconstitutionPlanner() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const webCameraStreamRef = useRef<MediaStream | null>(null);

  const {
    step,
    inputMethod,
    peptideAmount,
    peptideUnit,
    bacWater,
    targetDose,
    targetDoseUnit,
    scannedPeptideAmount,
    isProcessing,
    error,
    result,
    setStep,
    setInputMethod,
    setPeptideAmount,
    setPeptideUnit,
    setBacWater,
    setTargetDose,
    setTargetDoseUnit,
    setScannedPeptideAmount,
    setIsProcessing,
    setError,
    proceedToOutput,
    reset,
  } = useReconstitutionPlanner();

  const openai = new OpenAI({
    apiKey: Constants.expoConfig?.extra?.OPENAI_API_KEY || '',
    dangerouslyAllowBrowser: true,
  });

  const handleBack = () => {
    switch (step) {
      case 'manualInput':
      case 'scanLabel':
        setStep('inputMethod');
        break;
      case 'output':
        setStep(inputMethod === 'manual' ? 'manualInput' : 'scanLabel');
        break;
      default:
        router.back();
    }
  };

  const handleScanCapture = async () => {
    try {
      setIsProcessing(true);
      setError(null);

      const result = await captureAndProcessImage({
        cameraRef,
        permission,
        openai,
        isMobileWeb,
        webCameraStream: webCameraStreamRef.current,
        setIsProcessing,
        setProcessingMessage: () => {}, // We handle processing state in the component
        setScanError: setError,
        incrementScansUsed: () => {}, // This is a planning tool, not counted against scans
      });

      if (result?.vial) {
        // Extract peptide amount from scan result
        const vial = result.vial;
        if (vial.totalAmount && vial.totalAmount !== 'unreadable') {
          const amountMatch = String(vial.totalAmount).match(/([\d.]+)/);
          if (amountMatch) {
            setScannedPeptideAmount(amountMatch[1]);
            setStep('manualInput'); // Continue to manual input for BAC water and dose
          }
        } else if (vial.concentration && vial.concentration !== 'unreadable') {
          // If we got concentration instead of total amount, extract the amount part
          const concMatch = String(vial.concentration).match(/([\d.]+)/);
          if (concMatch) {
            setScannedPeptideAmount(concMatch[1]);
            setStep('manualInput');
          }
        } else {
          setError('Could not extract peptide amount from vial label. Please enter manually.');
          setStep('manualInput');
        }
      } else {
        setError('Could not read vial information. Please enter manually.');
        setStep('manualInput');
      }
    } catch (err) {
      console.error('Scan error:', err);
      setError('Failed to scan vial label. Please try again or enter manually.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUseDoseCalculator = () => {
    if (!result) return;

    // Navigate to main dose calculator with prefilled values
    // We'll pass the calculated concentration as a query parameter
    const concentration = result.concentration.toFixed(3);
    router.push(`/(tabs)/new-dose?prefillConcentration=${concentration}&prefillUnit=mg/ml`);
  };

  const getStepTitle = () => {
    switch (step) {
      case 'inputMethod':
        return 'Plan Reconstitution';
      case 'manualInput':
        return inputMethod === 'scan' && scannedPeptideAmount ? 'Confirm & Complete' : 'Enter Details';
      case 'scanLabel':
        return 'Scan Vial Label';
      case 'output':
        return 'Reconstitution Plan';
      default:
        return 'Plan Reconstitution';
    }
  };

  const canProceed = () => {
    switch (step) {
      case 'inputMethod':
        return !!inputMethod;
      case 'manualInput':
        const peptideValue = peptideAmount || scannedPeptideAmount;
        return !!peptideValue && !!bacWater && !!targetDose;
      case 'scanLabel':
        return false; // Handled by scan flow
      case 'output':
        return !!result;
      default:
        return false;
    }
  };

  const handleNext = () => {
    switch (step) {
      case 'inputMethod':
        if (inputMethod === 'manual') {
          setStep('manualInput');
        } else if (inputMethod === 'scan') {
          setStep('scanLabel');
        }
        break;
      case 'manualInput':
        proceedToOutput();
        break;
      default:
        break;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ArrowLeft color="#007AFF" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>{getStepTitle()}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {step === 'inputMethod' && (
          <ReconstitutionInputMethodStep
            selectedMethod={inputMethod}
            onSelectMethod={setInputMethod}
          />
        )}

        {step === 'manualInput' && (
          <ReconstitutionManualInputStep
            peptideAmount={peptideAmount}
            onChangePeptideAmount={setPeptideAmount}
            peptideUnit={peptideUnit}
            onChangePeptideUnit={setPeptideUnit}
            bacWater={bacWater}
            onChangeBacWater={setBacWater}
            targetDose={targetDose}
            onChangeTargetDose={setTargetDose}
            targetDoseUnit={targetDoseUnit}
            onChangeTargetDoseUnit={setTargetDoseUnit}
            scannedPeptideAmount={scannedPeptideAmount}
            error={error}
          />
        )}

        {step === 'scanLabel' && (
          <ReconstitutionScanStep
            cameraRef={cameraRef}
            permission={permission}
            requestPermission={requestPermission}
            isProcessing={isProcessing}
            error={error}
            onCapture={handleScanCapture}
            webCameraStream={webCameraStreamRef.current}
          />
        )}

        {step === 'output' && result && (
          <ReconstitutionOutputStep
            result={result}
            peptideAmount={peptideAmount || scannedPeptideAmount || ''}
            peptideUnit={peptideUnit}
            bacWater={bacWater}
            targetDose={targetDose}
            targetDoseUnit={targetDoseUnit}
            onUseDoseCalculator={handleUseDoseCalculator}
            onStartOver={reset}
          />
        )}
      </ScrollView>

      {/* Footer with Next/Action button */}
      {step !== 'output' && step !== 'scanLabel' && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.nextButton,
              !canProceed() && styles.nextButtonDisabled,
            ]}
            onPress={handleNext}
            disabled={!canProceed()}
          >
            <Text style={[
              styles.nextButtonText,
              !canProceed() && styles.nextButtonTextDisabled,
            ]}>
              {step === 'inputMethod' ? 'Continue' : 'Calculate'}
            </Text>
            {canProceed() && <ArrowRight color="#fff" size={18} />}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 4,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  placeholder: {
    width: 32, // Same width as back button for centering
  },
  content: {
    flex: 1,
    padding: 16,
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  nextButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButtonTextDisabled: {
    color: '#8E8E93',
  },
});