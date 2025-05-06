import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Alert, ScrollView } from 'react-native';
import { Camera as CameraIcon, ArrowRight, Syringe, Pill } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Animated, { FadeIn } from 'react-native-reanimated';
import OpenAI from 'openai';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import { isMobileWeb, MAX_FILE_SIZE, syringeOptions, insulinVolumes, standardVolumes } from '../../lib/utils';
import CustomProgressBar from '../../components/CustomProgressBar';
import DoseInputStep from '../../components/DoseInputStep';
import MedicationSourceStep from '../../components/MedicationSourceStep';
import ConcentrationInputStep from '../../components/ConcentrationInputStep';
import TotalAmountInputStep from '../../components/TotalAmountInputStep';
import ReconstitutionStep from '../../components/ReconstitutionStep';
import SyringeStep from '../../components/SyringeStep';
import FinalResultDisplay from '../../components/FinalResultDisplay';

type ManualEntryStep = 'dose' | 'medicationSource' | 'concentrationInput' | 'totalAmountInput' | 'reconstitution' | 'syringe' | 'finalResult';
type MedicationInputType = 'concentration' | 'totalAmount' | null;

export default function NewDoseScreen() {
  const [screenStep, setScreenStep] = useState<'intro' | 'scan' | 'manualEntry'>('intro');
  const [permission, requestPermission] = useCameraPermissions();
  const [permissionStatus, setPermissionStatus] = useState<'undetermined' | 'granted' | 'denied'>('undetermined');
  const [mobileWebPermissionDenied, setMobileWebPermissionDenied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState<string>('Processing image... This may take a few seconds');
  const [scanError, setScanError] = useState<string | null>(null);
  const cameraRef = useRef(null);
  const [manualStep, setManualStep] = useState<ManualEntryStep>('dose');
  const [dose, setDose] = useState<string>('');
  const [unit, setUnit] = useState<'mg' | 'mcg' | 'units'>('mg');
  const [substanceName, setSubstanceName] = useState<string>('');
  const [medicationInputType, setMedicationInputType] = useState<MedicationInputType>('concentration');
  const [concentrationAmount, setConcentrationAmount] = useState<string>('');
  const [concentrationUnit, setConcentrationUnit] = useState<'mg/ml' | 'mcg/ml' | 'units/ml'>('mg/ml');
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [solutionVolume, setSolutionVolume] = useState<string>('1');
  const [manualSyringe, setManualSyringe] = useState<{ type: 'Insulin' | 'Standard'; volume: string }>({ type: 'Standard', volume: '3 ml' });
  const [doseValue, setDoseValue] = useState<number | null>(null);
  const [concentration, setConcentration] = useState<number | null>(null);
  const [calculatedVolume, setCalculatedVolume] = useState<number | null>(null);
  const [recommendedMarking, setRecommendedMarking] = useState<string | null>(null);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [substanceNameHint, setSubstanceNameHint] = useState<string | null>(null);
  const [concentrationHint, setConcentrationHint] = useState<string | null>(null);
  const [totalAmountHint, setTotalAmountHint] = useState<string | null>(null);
  const [syringeHint, setSyringeHint] = useState<string | null>(null);

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
  }, [dose, unit, medicationInputType, concentrationAmount, totalAmount, solutionVolume, manualSyringe]);

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

  const resetFullForm = (startStep: ManualEntryStep = 'dose') => {
    setDose('');
    setUnit('mg');
    setSubstanceName('');
    setMedicationInputType('concentration');
    setConcentrationAmount('');
    setConcentrationUnit('mg/ml');
    setTotalAmount('');
    setSolutionVolume('1');
    setManualSyringe({ type: 'Standard', volume: '3 ml' });
    setDoseValue(null);
    setConcentration(null);
    setCalculatedVolume(null);
    setRecommendedMarking(null);
    setCalculationError(null);
    setFormError(null);
    setScanError(null);
    setSubstanceNameHint(null);
    setConcentrationHint(null);
    setTotalAmountHint(null);
    setSyringeHint(null);
    setManualStep(startStep);
    console.log('[Reset] Form reset complete');
  };

  const captureImage = async () => {
    console.log('[Capture] Button pressed - Start');

    const apiKey = Constants.expoConfig?.extra?.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('[Capture] OpenAI API key missing');
      Alert.alert('Config Error', 'OpenAI Key missing. Please check your configuration.');
      return;
    }

    setIsProcessing(false);
    setScanError(null);
    setProcessingMessage('Waiting for photo selection...');
    resetFullForm();

    await new Promise(resolve => setTimeout(resolve, 300));
    setIsProcessing(true);
    console.log('[Capture] isProcessing set to true');

    try {
      if (isMobileWeb) {
        console.log('[Capture] Mobile web detected, using file input');

        const filePromise = new Promise<{ file: File }>((resolve, reject) => {
          const existingInputs = document.querySelectorAll('input[type="file"]');
          existingInputs.forEach(input => input.remove());
          console.log('[Capture] Cleared existing file inputs');

          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.capture = 'environment';

          input.onchange = (event) => {
            console.log('[Capture] File input change event');
            const target = event.target as HTMLInputElement;
            const file = target.files?.[0];
            if (!file) {
              console.log('[Capture] No file selected');
              reject(new Error('No file selected or user cancelled'));
              return;
            }
            console.log('[Capture] File selected:', file.name, 'Size:', file.size);
            if (file.size > MAX_FILE_SIZE) {
              reject(new Error(`File size (${(file.size / 1024 / 1024).toFixed(1)} MB) exceeds 5 MB limit`));
              return;
            }
            resolve({ file });
            if (document.body.contains(input)) {
              document.body.removeChild(input);
              console.log('[Capture] File input removed after selection');
            }
          };

          input.onerror = (error) => {
            console.error('[Capture] File input error:', error);
            reject(new Error('File input failed: ' + (error.message || 'Unknown error')));
            if (document.body.contains(input)) {
              document.body.removeChild(input);
              console.log('[Capture] File input removed on error');
            }
          };

          document.body.appendChild(input);
          console.log('[Capture] Triggering file input click');
          input.click();

          setTimeout(() => {
            if (document.body.contains(input) && !input.files?.length) {
              document.body.removeChild(input);
              reject(new Error('File selection cancelled after 15 seconds'));
              console.log('[Capture] File input cancelled');
            }
          }, 15000);
        });

        const { file } = await filePromise;
        setProcessingMessage('Reading image data...');

        const reader = new FileReader();
        const readerPromise = new Promise<{ base64Image: string; mimeType: string }>((resolve, reject) => {
          reader.onload = () => {
            console.log('[Capture] FileReader onload triggered');
            const result = reader.result;
            if (typeof result !== 'string' || !result.includes(',')) {
              console.error('[Capture] Invalid FileReader result');
              reject(new Error('Failed to read image data'));
              return;
            }
            const base64Image = result.split(',')[1];
            const mimeType = file.type || 'image/jpeg';
            console.log('[Capture] Image converted to base64, length:', base64Image.length);
            resolve({ base64Image, mimeType });
          };

          reader.onerror = () => {
            console.error('[Capture] FileReader error');
            reject(new Error('Failed to read image'));
          };

          console.log('[Capture] Starting FileReader readAsDataURL');
          reader.readAsDataURL(file);
        });

        const { base64Image, mimeType } = await readerPromise;
        setProcessingMessage('Analyzing image with AI...');
        await processImage(base64Image, mimeType);
      } else {
        if (!cameraRef.current) {
          console.log('[Capture] Camera ref is null or undefined');
          Alert.alert('Camera Error', 'Camera not ready.');
          throw new Error('Camera not ready');
        }

        if (permission?.status !== 'granted') {
          console.log('[Capture] Camera permission not granted:', permission?.status);
          Alert.alert('Permission Error', 'Camera permission is required.');
          throw new Error('Camera permission required');
        }

        console.log('[Capture] Starting capture with expo-camera');
        const photo = await cameraRef.current.takePictureAsync({
          base64: true,
          quality: 0.5,
        });
        console.log('[Capture] Picture taken successfully');

        let base64Image = photo.base64;
        if (!base64Image && photo.uri) {
          console.log('[Capture] Base64 missing, reading from URI:', photo.uri);
          setProcessingMessage('Reading image data...');
          base64Image = await FileSystem.readAsStringAsync(photo.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          console.log('[Capture] Base64 read from URI. Length:', base64Image.length);
        }

        if (!base64Image) {
          console.error('[Capture] No base64 data available');
          throw new Error('Failed to capture image data.');
        }

        let mimeType = '';
        if (base64Image.startsWith('data:image/')) {
          const prefixMatch = base64Image.match(/^data:image\/([a-z]+);base64,/);
          if (prefixMatch) {
            mimeType = `image/${prefixMatch[1]}`;
            base64Image = base64Image.substring(prefixMatch[0].length);
            console.log(`[Capture] Stripped prefix. MIME type: ${mimeType}`);
          }
        }

        if (!mimeType) {
          if (base64Image.startsWith('/9j/')) mimeType = 'image/jpeg';
          else if (base64Image.startsWith('iVBORw0KGgo=')) mimeType = 'image/png';
          else if (base64Image.startsWith('UklGR')) mimeType = 'image/webp';
          else if (base64Image.startsWith('R0lGODlh')) mimeType = 'image/gif';
          else {
            console.error('[Capture] Unknown image format:', base64Image.substring(0, 20));
            throw new Error('Unrecognized image format.');
          }
          console.log('[Capture] Detected MIME type:', mimeType);
        }

        if (base64Image.length % 4 !== 0) {
          const paddingNeeded = (4 - (base64Image.length % 4)) % 4;
          base64Image += "=".repeat(paddingNeeded);
          console.log('[Capture] Padded base64 length:', base64Image.length);
        }

        setProcessingMessage('Analyzing image with AI...');
        await processImage(base64Image, mimeType);
      }
    } catch (error) {
      console.error('[Capture] Error in captureImage:', error.message, error.stack);
      const message = error.message || 'Unknown error during capture';
      setScanError(`An error occurred: ${message}. Please try again or use manual entry.`);
      Alert.alert(
        'Capture Error',
        message,
        [
          { text: 'Retry', onPress: () => captureImage() },
          { text: 'Use Manual Entry', onPress: () => { resetFullForm('dose'); setScreenStep('manualEntry'); } },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } finally {
      setIsProcessing(false);
      console.log('[Capture] isProcessing set to false');
    }
  };

  const processImage = async (base64Image: string, mimeType: string) => {
    console.log('[Process] Starting image processing');

    try {
      const imageUrl = `data:${mimeType};base64,${base64Image}`;
      console.log('[Process] Constructed Image URL (first 150 chars):', imageUrl.substring(0, 150));
      console.log('[Process] Sending request to OpenAI');

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze the image for syringe and vial details. Provide ONLY a valid JSON object with the following structure: { "syringe": { "type": "Insulin | Standard | unreadable | null", "volume": "e.g., \'1 ml\', \'0.5 ml\', \'unreadable\', null", "markings": "e.g., \'0.1,0.2,...\', \'unreadable\', null" }, "vial": { "substance": "name | unreadable | null", "totalAmount": "e.g., \'20 mg\', \'1000 units\', \'unreadable\', null", "concentration": "e.g., \'100 units/ml\', \'10 mg/ml\', \'unreadable\', null", "expiration": "YYYY-MM-DD | unreadable | null" } }. Use "unreadable" if text is present but illegible. Use null if the information is completely absent or not visible. Do not include any explanatory text before or after the JSON.',
              },
              {
                type: 'image_url',
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
      });

      console.log('[Process] Received response from OpenAI:', JSON.stringify(response, null, 2));

      const content = response.choices[0].message.content;
      console.log('[Process] Raw OpenAI response content:', content);

      if (!content) {
        throw new Error('OpenAI returned an empty response.');
      }

      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/);
      const jsonContent = jsonMatch ? jsonMatch[1].trim() : content.trim();
      console.log('[Process] Extracted JSON content:', jsonContent);

      let result;
      try {
        result = JSON.parse(jsonContent);
        console.log('[Process] Parsed JSON result:', JSON.stringify(result, null, 2));
        if (typeof result !== 'object' || result === null || !('syringe' in result) || !('vial' in result)) {
          console.error('[Process] Invalid JSON structure:', result);
          throw new Error('Invalid JSON structure received from analysis.');
        }
      } catch (parseError) {
        console.error('[Process] JSON parse error:', parseError.message, parseError.stack);
        throw new Error('Could not parse analysis result.');
      }

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
        console.log('[Process] No reliable concentration or total amount detected.');
      }

      console.log('[Process] Scan successful, transitioning to manual entry');
      Alert.alert('Success', 'Image analyzed, proceeding to manual entry.');
      setScreenStep('manualEntry');
      setManualStep('dose');
    } catch (error) {
      console.error('[Process] Error processing image:', error.message, error.stack);
      let message = 'An unexpected error occurred during scanning.';
      if (error instanceof Error) {
        if (error.message.includes('format is not recognized')) {
          message = 'Image format could not be processed.';
        } else {
          message = `Error communicating with analysis service: ${error.message}`;
        }
      }
      setManualSyringe({ type: 'Standard', volume: '3 ml' });
      setSubstanceName('');
      setMedicationInputType('concentration');
      setConcentrationAmount('');
      setTotalAmount('');
      setScreenStep('manualEntry');
      setManualStep('dose');
      Alert.alert(
        'Warning',
        `Failed to analyze image: ${message}. Proceeding to manual entry with default values.`,
        [
          { text: 'OK', onPress: () => {} },
          { text: 'Retry', onPress: () => captureImage() },
        ]
      );
    }
  };

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

  const handleNextDose = () => {
    setFormError(null);
    const parsedDose = parseFloat(dose);
    if (!dose || isNaN(parsedDose) || parsedDose <= 0) {
      setFormError('Please enter a valid, positive dose amount.');
      return;
    }
    setDoseValue(parsedDose);
    setManualStep('medicationSource');
    console.log('[Navigation] Moving to medicationSource');
  };

  const handleNextMedicationSource = () => {
    setFormError(null);
    if (!medicationInputType) {
      setFormError('Please select how the medication amount is specified.');
      return;
    }
    setManualStep(medicationInputType === 'concentration' ? 'concentrationInput' : 'totalAmountInput');
    console.log('[Navigation] Moving to', medicationInputType === 'concentration' ? 'concentrationInput' : 'totalAmountInput');
  };

  const handleNextConcentrationInput = () => {
    setFormError(null);
    const parsedConc = parseFloat(concentrationAmount);
    if (!concentrationAmount || isNaN(parsedConc) || parsedConc <= 0) {
      setFormError('Please enter a valid, positive concentration amount.');
      return;
    }
    const expectedUnit = unit + '/ml';
    if (concentrationUnit !== expectedUnit) {
      setFormError(`Unit mismatch: Dose is in '${unit}', but concentration unit is '${concentrationUnit}'. Please use '${expectedUnit}'.`);
      return;
    }
    setConcentration(parsedConc);
    if (unit === 'units' || unit === 'mcg') {
      setManualSyringe({ type: 'Insulin', volume: '1 ml' });
      setSyringeHint(unit === 'units' ? 'Insulin syringe suggested due to units.' : 'Insulin syringe suggested due to micrograms.');
    } else {
      setManualSyringe({ type: 'Standard', volume: '3 ml' });
      setSyringeHint('Standard syringe selected for milligrams.');
    }
    setManualStep('syringe');
    console.log('[Navigation] Moving to syringe with concentration:', parsedConc);
  };

  const handleNextTotalAmountInput = () => {
    setFormError(null);
    const parsedAmount = parseFloat(totalAmount);
    if (!totalAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Please enter a valid, positive number for the total amount.');
      return;
    }
    setManualStep('reconstitution');
    console.log('[Navigation] Moving to reconstitution');
  };

  const handleNextReconstitution = () => {
    setFormError(null);
    const parsedSolutionVol = parseFloat(solutionVolume);
    if (!solutionVolume || isNaN(parsedSolutionVol) || parsedSolutionVol <= 0) {
      setFormError('Please enter a valid, positive volume (in ml) added for reconstitution.');
      return;
    }
    let totalAmountValue = parseFloat(totalAmount);
    if (unit === 'mcg') {
      totalAmountValue *= 1000;
    }
    const calculatedConc = totalAmountValue / parsedSolutionVol;
    setConcentration(calculatedConc);
    if (unit === 'units' || unit === 'mcg') {
      setManualSyringe({ type: 'Insulin', volume: '1 ml' });
      setSyringeHint(unit === 'units' ? 'Insulin syringe suggested due to units.' : 'Insulin syringe suggested due to micrograms.');
    } else {
      setManualSyringe({ type: 'Standard', volume: '3 ml' });
      setSyringeHint('Standard syringe selected for milligrams.');
    }
    setManualStep('syringe');
    console.log('[Navigation] Moving to syringe with calculated concentration:', calculatedConc);
  };

  const handleCalculateFinal = () => {
    setFormError(null);
    calculateDoseVolumeAndMarking();
    setManualStep('finalResult');
    console.log('[Navigation] Moving to finalResult');
  };

  const handleBack = () => {
    setCalculationError(null);
    setFormError(null);
    switch (manualStep) {
      case 'finalResult': setManualStep('syringe'); break;
      case 'syringe': setManualStep(medicationInputType === 'concentration' ? 'concentrationInput' : 'reconstitution'); break;
      case 'reconstitution': setManualStep('totalAmountInput'); break;
      case 'concentrationInput':
      case 'totalAmountInput': setManualStep('medicationSource'); break;
      case 'medicationSource': setManualStep('dose'); break;
      case 'dose': setScreenStep('intro'); resetFullForm(); break;
    }
    console.log('[Navigation] Going back to', manualStep);
  };

  const handleStartOver = () => {
    resetFullForm('dose');
    console.log('[Navigation] Starting over');
  };

  const handleGoHome = () => {
    resetFullForm();
    setScreenStep('intro');
    console.log('[Navigation] Going home');
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
            <TouchableOpacity style={[styles.button, isMobileWeb && styles.buttonMobile]} onPress={captureImage} disabled={isProcessing}>
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
              onPress={captureImage}
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
              onPress={captureImage}
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
            setSubstanceNameHint={set-substanceNameHint}
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
  captureButton: { backgroundColor: '#ef4444', width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'rgba(255, 255, 255, 0.5)', marginBottom: 20 },
  backButtonText: { color: '#fff', fontSize: 14 },
  buttonText: { color: '#f8fafc', fontSize: 16, fontWeight: '500', textAlign: 'center' },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.8)', zIndex: 1000 },
  loadingText: { color: '#fff', marginTop: 15, fontSize: 16 },
});