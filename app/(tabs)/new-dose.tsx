import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { Camera as CameraIcon, ArrowRight, Syringe, Pill, RotateCcw, Home, Check, X, Plus } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Animated, { FadeIn } from 'react-native-reanimated';
import OpenAI from 'openai';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';

// SyringeIllustration Component
const SyringeIllustration = ({ syringeType, syringeVolume, recommendedMarking, syringeOptions }) => {
  const unit = syringeType === 'Insulin' ? 'Units' : 'ml';
  const markingsString = syringeOptions[syringeType][syringeVolume];
  const markings = [0, ...markingsString.split(',').map(m => parseFloat(m))];
  const maxMarking = Math.max(...markings);
  const syringeWidth = 300;
  const markingPositions = markings.map(m => (m / maxMarking) * syringeWidth);
  const recommendedValue = parseFloat(recommendedMarking);
  const recommendedPosition = (recommendedValue / maxMarking) * syringeWidth;

  return (
    <View style={{ width: syringeWidth, height: 100, position: 'relative' }}>
      <View style={{ position: 'absolute', left: 0, top: 40, width: syringeWidth, height: 20, backgroundColor: '#E0E0E0', borderRadius: 10 }} />
      <View style={{ position: 'absolute', left: 0, top: 50, width: syringeWidth, height: 2, backgroundColor: '#000' }} />
      {markings.map((m, index) => (
        <View key={m} style={{ position: 'absolute', left: markingPositions[index], top: 40, width: 1, height: 20, backgroundColor: '#000' }} />
      ))}
      {markings.map((m, index) => (
        <Text key={`label-${m}`} style={{ position: 'absolute', left: markingPositions[index] - 10, top: 65, fontSize: 10 }}>
          {m}
        </Text>
      ))}
      <Text style={{ position: 'absolute', left: syringeWidth - 30, top: 65, fontSize: 12, color: '#000', fontWeight: 'bold' }}>
        {unit}
      </Text>
      <View style={{ position: 'absolute', left: recommendedPosition - 2, top: 20, width: 4, height: 60, backgroundColor: '#FF0000', zIndex: 1 }} />
      <Text style={{ position: 'absolute', left: Math.max(0, recommendedPosition - 30), top: 85, fontSize: 12, color: '#FF0000', fontWeight: 'bold' }}>
        Draw to here
      </Text>
    </View>
  );
};

// Custom Progress Bar Component
const CustomProgressBar = ({ progress }) => {
  const totalSteps = 5;
  const currentStep = Math.round(progress * totalSteps);
  const progressWidth = (progress * 100) + '%';

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressBarBackground}>
        <View style={[styles.progressBarFill, { width: progressWidth }]} />
      </View>
      <Text style={styles.progressText}>
        Step {currentStep} of {totalSteps}
      </Text>
    </View>
  );
};

// Define steps for manual entry
type ManualEntryStep = 'dose' | 'medicationSource' | 'concentrationInput' | 'totalAmountInput' | 'reconstitution' | 'syringe' | 'finalResult';
type MedicationInputType = 'concentration' | 'totalAmount' | null;

export default function NewDoseScreen() {
  // State Management
  const [screenStep, setScreenStep] = useState<'intro' | 'scan' | 'manualEntry'>('intro');
  const [permission, requestPermission] = useCameraPermissions();
  const [permissionStatus, setPermissionStatus] = useState<'undetermined' | 'granted' | 'denied'>('undetermined');
  const [mobileWebPermissionDenied, setMobileWebPermissionDenied] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const cameraRef = useRef(null);
  const [manualStep, setManualStep] = useState<ManualEntryStep>('dose');
  const [dose, setDose] = useState<string>('');
  const [unit, setUnit] = useState<'mg' | 'units'>('mg');
  const [substanceName, setSubstanceName] = useState<string>('');
  const [medicationInputType, setMedicationInputType] = useState<MedicationInputType>('concentration');
  const [concentrationAmount, setConcentrationAmount] = useState<string>('');
  const [concentrationUnit, setConcentrationUnit] = useState<'mg/ml' | 'units/ml'>('mg/ml');
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

  // Constants
  const syringeOptions = {
    Insulin: {
      '0.3 ml': '5,10,15,20,25,30',
      '0.5 ml': '5,10,15,20,25,30,35,40,45,50',
      '1 ml': '10,20,30,40,50,60,70,80,90,100',
    },
    Standard: {
      '1 ml': '0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0',
      '3 ml': '0.5,1.0,1.5,2.0,2.5,3.0',
      '5 ml': '1.0,2.0,3.0,4.0,5.0',
    },
  };
  const insulinVolumes = ['0.3 ml', '0.5 ml', '1 ml'];
  const standardVolumes = ['1 ml', '3 ml', '5 ml'];
  const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';
  const userAgent = typeof navigator !== 'undefined' && navigator.userAgent ? navigator.userAgent : '';
  const isMobileDevice = userAgent ? /Android|iPhone|iPad/i.test(userAgent) : false;
  const isMobileWeb = isWeb && (isMobileDevice || Platform.OS === 'web' || (Platform.OS === 'ios' && isWeb));

  // Debug logging
  console.log('isWeb:', isWeb);
  console.log('User Agent:', userAgent);
  console.log('isMobileDevice:', isMobileDevice);
  console.log('isMobileWeb:', isMobileWeb);
  console.log('Platform.OS:', Platform.OS);
  console.log('OpenAI API Key:', Constants.expoConfig?.extra?.OPENAI_API_KEY || 'Not set');

  // OpenAI Client
  const openai = new OpenAI({
    apiKey: Constants.expoConfig?.extra?.OPENAI_API_KEY || '',
    dangerouslyAllowBrowser: true,
  });

  // Effects
  useEffect(() => {
    if (screenStep !== 'scan') setScanError(null);
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

  // Log scanLoading changes
  useEffect(() => {
    console.log("scanLoading changed to:", scanLoading);
  }, [scanLoading]);

  // Web-specific camera permission request
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
    setManualStep(startStep);
    setScanLoading(false);
  };

  // Utility to wait for a specified time
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const captureImage = async () => {
    console.log("Capture button pressed - Start");
  
    const apiKey = Constants.expoConfig?.extra?.OPENAI_API_KEY;
    if (!apiKey) {
      console.log("OpenAI API key missing");
      Alert.alert("Config Error", "OpenAI Key missing. Please check your configuration.");
      return;
    }
  
    // Reset state before starting
    setScanError(null);
    resetFullForm();
  
    try {
      // Delegate image capture and processing to processImage
      if (isMobileWeb) {
        console.log("Mobile web detected, using file input...");
  
        const filePromise = new Promise<{ file: File }>((resolve, reject) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.capture = 'environment';
  
          input.onchange = (event) => {
            const target = event.target as HTMLInputElement;
            const file = target.files?.[0];
            if (!file) {
              reject(new Error("No file selected"));
              return;
            }
            resolve({ file });
          };
  
          input.onerror = () => reject(new Error("Error accessing camera or gallery"));
          document.body.appendChild(input);
          input.click();
          setTimeout(() => document.body.removeChild(input), 1000);
        });
  
        const { file } = await filePromise;
        const worker = new Worker('/workers/fileReaderWorker.js');
        const workerPromise = new Promise<{ base64Image: string; mimeType: string }>((resolve, reject) => {
          worker.onmessage = (e) => {
            e.data.error ? reject(new Error(e.data.error)) : resolve(e.data);
            worker.terminate();
          };
          worker.onerror = (error) => {
            reject(error);
            worker.terminate();
          };
          worker.postMessage(file);
        });
  
        const { base64Image, mimeType } = await workerPromise;
        await processImage(base64Image, mimeType);
      } else {
        if (!cameraRef.current || permission?.status !== 'granted') {
          throw new Error("Camera not ready or permission denied");
        }
  
        const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5 });
        let base64Image = photo.base64 || (await FileSystem.readAsStringAsync(photo.uri, { encoding: 'Base64' }));
        if (!base64Image) throw new Error("Failed to capture image data");
  
        const mimeType = base64Image.startsWith('/9j/') ? 'image/jpeg' : 'image/png'; // Simplified MIME detection
        await processImage(base64Image, mimeType);
      }
    } catch (error) {
      console.error("Error in captureImage:", error.message);
      setScanError(`Capture failed: ${error.message}. Try again or use manual entry.`);
      Alert.alert(
        "Capture Error",
        error.message,
        [
          { text: "Retry", onPress: () => captureImage() },
          { text: "Manual Entry", onPress: () => { resetFullForm('dose'); setScreenStep('manualEntry'); } },
          { text: "Cancel" },
        ]
      );
    }
  };
  
  const processImage = async (base64Image: string, mimeType: string) => {
    console.log("Processing image with OpenAI...");
    flushSync(() => setScanLoading(true));
    console.log("scanLoading set to true");
  
    try {
      const imageUrl = `data:${mimeType};base64,${base64Image}`;
      console.log("Sending request to OpenAI...");
  
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze the image for syringe and vial details. Provide ONLY a valid JSON object with { "syringe": { "type": "Insulin | Standard | unreadable | null", "volume": "e.g., \'1 ml\' | unreadable | null", "markings": "e.g., \'0.1,0.2,...\' | unreadable | null" }, "vial": { "substance": "name | unreadable | null", "totalAmount": "e.g., \'20 mg\' | unreadable | null", "concentration": "e.g., \'10 mg/ml\' | unreadable | null", "expiration": "YYYY-MM-DD | unreadable | null" } }',
              },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
      });
  
      console.log("Received response from OpenAI");
      const result = JSON.parse(response.choices[0].message.content.trim());
      console.log("Parsed result:", result);
  
      // Populate state with scanned data (simplified for brevity)
      setManualSyringe({
        type: result.syringe.type === 'Insulin' ? 'Insulin' : 'Standard',
        volume: result.syringe.volume || '3 ml',
      });
      if (result.vial.substance) setSubstanceName(result.vial.substance);
      if (result.vial.concentration) {
        setConcentrationAmount(result.vial.concentration.split(' ')[0]);
        setMedicationInputType('concentration');
      } else if (result.vial.totalAmount) {
        setTotalAmount(result.vial.totalAmount.split(' ')[0]);
        setMedicationInputType('totalAmount');
      }
  
      setScreenStep('manualEntry');
      setManualStep('dose');
      Alert.alert("Success", "Image analyzed successfully.");
    } catch (error) {
      console.error("Error in processImage:", error.message);
      setScanError(`Processing failed: ${error.message}. Using manual entry.`);
      setScreenStep('manualEntry');
      setManualStep('dose');
      Alert.alert("Warning", "Image analysis failed. Proceeding to manual entry.");
    } finally {
      flushSync(() => setScanLoading(false));
      console.log("scanLoading set to false");
    }
  };

  const calculateDoseVolumeAndMarking = () => {
    setCalculatedVolume(null);
    setRecommendedMarking(null);
    setCalculationError(null);

    if (doseValue === null || isNaN(doseValue) || doseValue <= 0) {
      setCalculationError('Internal Error: Dose value is invalid.');
      return;
    }

    if (concentration === null || isNaN(concentration) || concentration <= 0) {
      setCalculationError('Internal Error: Medication concentration is invalid or missing.');
      return;
    }

    if (!manualSyringe || !manualSyringe.type || !manualSyringe.volume) {
      setCalculationError('Syringe details are missing.');
      return;
    }
    const isValidSyringeOption = syringeOptions[manualSyringe.type]?.[manualSyringe.volume];
    if (!isValidSyringeOption) {
      setCalculationError(`Markings unavailable for ${manualSyringe.type} ${manualSyringe.volume} syringe.`);
      return;
    }
    const markingsString = syringeOptions[manualSyringe.type][manualSyringe.volume];

    const requiredVolume = doseValue / concentration;
    setCalculatedVolume(requiredVolume);

    const maxVolume = parseFloat(manualSyringe.volume.replace(/[^0-9.]/g, ''));
    if (requiredVolume > maxVolume) {
      setCalculationError(`Required volume (${requiredVolume.toFixed(3)} ml) exceeds selected syringe capacity (${maxVolume} ml). Use a larger syringe or split dose.`);
      return;
    }

    const markings = markingsString.split(',').map(m => parseFloat(m)).sort((a, b) => a - b);
    const markingScaleValue = manualSyringe.type === 'Insulin' ? requiredVolume * 100 : requiredVolume;
    const markingScaleUnit = manualSyringe.type === 'Insulin' ? 'units' : 'ml';

    let recommendedMarkingValue = markingScaleValue;
    let precisionMessage: string | null = null;

    const lowerOrEqualMarkings = markings.filter(m => m <= markingScaleValue + 1e-9);
    if (lowerOrEqualMarkings.length === 0) {
      precisionMessage = `Calculated dose (${markingScaleValue.toFixed(3)} ${markingScaleUnit}) is below the smallest mark (${markings[0]} ${markingScaleUnit}). Verify the dose carefully.`;
      Alert.alert('Volume Below Smallest Mark', precisionMessage);
    } else if (!markings.some(m => Math.abs(m - markingScaleValue) < 1e-9)) {
      const nearestBelow = Math.max(...lowerOrEqualMarkings);
      precisionMessage = `Calculated dose is ${markingScaleValue.toFixed(3)} ${markingScaleUnit}. Nearest visible mark below is ${nearestBelow} ${markingScaleUnit}.`;
    }

    setRecommendedMarking(recommendedMarkingValue.toString());
    if (precisionMessage && !calculationError) setCalculationError(precisionMessage);
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
  };

  const handleNextMedicationSource = () => {
    setFormError(null);
    if (!medicationInputType) {
      setFormError('Please select how the medication amount is specified.');
      return;
    }
    setManualStep(medicationInputType === 'concentration' ? 'concentrationInput' : 'totalAmountInput');
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
    setManualStep('syringe');
  };

  const handleNextTotalAmountInput = () => {
    setFormError(null);
    const parsedAmount = parseFloat(totalAmount);
    if (!totalAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Please enter a valid, positive number for the total amount.');
      return;
    }
    setManualStep('reconstitution');
  };

  const handleNextReconstitution = () => {
    setFormError(null);
    const parsedSolutionVol = parseFloat(solutionVolume);
    if (!solutionVolume || isNaN(parsedSolutionVol) || parsedSolutionVol <= 0) {
      setFormError('Please enter a valid, positive volume (in ml) added for reconstitution.');
      return;
    }
    const totalAmountValue = parseFloat(totalAmount);
    const calculatedConc = totalAmountValue / parsedSolutionVol;
    setConcentration(calculatedConc);
    setManualStep('syringe');
  };

  const handleCalculateFinal = () => {
    setFormError(null);
    calculateDoseVolumeAndMarking();
    setManualStep('finalResult');
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
  };

  const handleStartOver = () => {
    resetFullForm('dose');
  };

  const handleGoHome = () => {
    resetFullForm();
    setScreenStep('intro');
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
    console.log("Rendering scan screen, scanLoading:", scanLoading);
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
            <TouchableOpacity style={[styles.button, isMobileWeb && styles.buttonMobile]} onPress={captureImage}>
              <Text style={styles.buttonText}>Take or Upload Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tryCameraAgainButton, isMobileWeb && styles.buttonMobile]} onPress={requestWebCameraPermission}>
              <Text style={styles.buttonText}>Try Camera Again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.backButton, isMobileWeb && styles.backButtonMobile]} onPress={() => setScreenStep('intro')}>
              <Text style={styles.buttonText}>Go Back</Text>
            </TouchableOpacity>
            {/* Removed Toggle Loading Indicator button for mobile web */}
          </View>
        );
      }

      return (
        <View style={styles.scanContainer}>
          <View style={styles.overlayBottom}>
            {scanError && <Text style={[styles.errorText, { marginBottom: 10 }]}>{scanError}</Text>}
            <Text style={styles.scanText}>Click below to take a photo of the syringe & vial</Text>
            <TouchableOpacity
              style={styles.captureButton}
              onPress={captureImage}
              disabled={scanLoading}
            >
              {scanLoading ? <ActivityIndicator color="#fff" /> : <CameraIcon color={'#fff'} size={24} />}
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
                disabled={scanLoading}
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
              style={styles.captureButton}
              onPress={captureImage}
              disabled={scanLoading}
            >
              {scanLoading ? <ActivityIndicator color="#fff" /> : <CameraIcon color={'#fff'} size={24} />}
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
                disabled={scanLoading}
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

  const renderDoseInputStep = () => (
    <View style={styles.formContainer}>
      <Text style={styles.formTitle}>Step 1: Prescribed Dose</Text>
      <Text style={styles.labelText}>Dose Amount:</Text>
      <TextInput
        style={styles.input}
        value={dose}
        onChangeText={setDose}
        keyboardType="numeric"
        placeholder="e.g., 100"
        placeholderTextColor="#9ca3af"
      />
      <Text style={styles.labelText}>Unit:</Text>
      <View style={styles.radioContainer}>
        <TouchableOpacity
          style={[styles.radioButton, unit === 'mg' && styles.radioButtonSelected]}
          onPress={() => setUnit('mg')}
        >
          <Text style={[styles.radioText, unit === 'mg' && styles.radioTextSelected]}>mg</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.radioButton, unit === 'units' && styles.radioButtonSelected]}
          onPress={() => setUnit('units')}
        >
          <Text style={[styles.radioText, unit === 'units' && styles.radioTextSelected]}>units</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderMedicationSourceStep = () => (
    <View style={styles.formContainer}>
      <Text style={styles.formTitle}>Step 2: Medication Details</Text>
      <TextInput
        style={styles.input}
        placeholder="Substance Name (Optional)"
        placeholderTextColor="#9ca3af"
        value={substanceName}
        onChangeText={(text) => { setSubstanceName(text); setSubstanceNameHint(null); }}
      />
      {substanceNameHint && <Text style={styles.helperHint}>{substanceNameHint}</Text>}
      <Text style={styles.labelText}>Select how the medication amount is specified on the vial label:</Text>
      <View style={styles.radioContainerVertical}>
        <TouchableOpacity
          style={[styles.radioButtonWide, medicationInputType === 'concentration' && styles.radioButtonSelected]}
          onPress={() => setMedicationInputType('concentration')}
        >
          <Text style={[styles.radioText, medicationInputType === 'concentration' && styles.radioTextSelected]}>
            Concentration (e.g., 10 mg/ml, 100 units/ml)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.radioButtonWide, medicationInputType === 'totalAmount' && styles.radioButtonSelected]}
          onPress={() => setMedicationInputType('totalAmount')}
        >
          <Text style={[styles.radioText, medicationInputType === 'totalAmount' && styles.radioTextSelected]}>
            Total Amount in Vial (e.g., 50 mg, 1000 units)
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderConcentrationInputStep = () => (
    <View style={styles.formContainer}>
      <Text style={styles.formTitle}>Step 2a: Enter Concentration</Text>
      <Text style={styles.labelText}>Concentration Amount:</Text>
      <TextInput
        style={styles.input}
        value={concentrationAmount}
        onChangeText={(text) => { setConcentrationAmount(text); setConcentrationHint(null); }}
        keyboardType="numeric"
        placeholder="e.g., 10"
        placeholderTextColor="#9ca3af"
      />
      {concentrationHint && <Text style={styles.helperHint}>{concentrationHint}</Text>}
      <Text style={styles.labelText}>Unit:</Text>
      <View style={styles.radioContainer}>
        <TouchableOpacity
          style={[styles.radioButton, concentrationUnit === 'mg/ml' && styles.radioButtonSelected]}
          onPress={() => setConcentrationUnit('mg/ml')}
        >
          <Text style={[styles.radioText, concentrationUnit === 'mg/ml' && styles.radioTextSelected]}>mg/ml</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.radioButton, concentrationUnit === 'units/ml' && styles.radioButtonSelected]}
          onPress={() => setConcentrationUnit('units/ml')}
        >
          <Text style={[styles.radioText, concentrationUnit === 'units/ml' && styles.radioTextSelected]}>units/ml</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.inputHelperText}>Enter the concentration value and select the unit.</Text>
    </View>
  );

  const renderTotalAmountInputStep = () => (
    <View style={styles.formContainer}>
      <Text style={styles.formTitle}>Step 2b: Enter Total Amount</Text>
      <Text style={styles.labelText}>Total Amount in Vial ({unit}):</Text>
      <TextInput
        style={styles.input}
        value={totalAmount}
        onChangeText={(text) => { setTotalAmount(text); setTotalAmountHint(null); }}
        keyboardType="numeric"
        placeholder="e.g., 50"
        placeholderTextColor="#9ca3af"
      />
      {totalAmountHint && <Text style={styles.helperHint}>{totalAmountHint}</Text>}
      <Text style={styles.inputHelperText}>Enter the total amount of substance in the vial as a number. Unit is '{unit}'.</Text>
    </View>
  );

  const renderReconstitutionStep = () => (
    <View style={styles.formContainer}>
      <Text style={styles.formTitle}>Step 2c: Reconstitution</Text>
      <Text style={styles.labelTextBold}>How much liquid (ml) are you adding?</Text>
      <Text style={styles.labelText}>(e.g., sterile water, bacteriostatic water)</Text>
      <View style={styles.presetContainer}>
        {['1', '2', '3', '5'].map(ml => (
          <TouchableOpacity
            key={ml + 'ml'}
            style={[styles.optionButtonSmall, solutionVolume === ml && styles.selectedOption]}
            onPress={() => setSolutionVolume(ml)}
          >
            <Text style={[styles.buttonTextSmall, solutionVolume === ml && styles.selectedButtonText]}>{ml} ml</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        style={[styles.input, { marginTop: 10 }]}
        placeholder="Or enter custom volume (ml)"
        placeholderTextColor="#9ca3af"
        value={solutionVolume}
        onChangeText={setSolutionVolume}
        keyboardType="numeric"
      />
    </View>
  );

  const renderSyringeStep = () => {
    const availableVolumes = manualSyringe.type === 'Insulin' ? insulinVolumes : standardVolumes;
    const isValidSyringeOption = syringeOptions[manualSyringe.type]?.[manualSyringe.volume];

    return (
      <View style={styles.formContainer}>
        <Text style={styles.formTitle}>Step 3: Syringe Details</Text>
        <Text style={styles.labelText}>Syringe Type:</Text>
        <View style={styles.presetContainer}>
          <TouchableOpacity
            style={[styles.optionButton, manualSyringe.type === 'Insulin' && styles.selectedOption]}
            onPress={() => setManualSyringe({ type: 'Insulin', volume: insulinVolumes[2] })}
          >
            <Text style={[styles.buttonText, manualSyringe.type === 'Insulin' && styles.selectedButtonText]}>Insulin (units)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.optionButton, manualSyringe.type === 'Standard' && styles.selectedOption]}
            onPress={() => setManualSyringe({ type: 'Standard', volume: standardVolumes[1] })}
          >
            <Text style={[styles.buttonText, manualSyringe.type === 'Standard' && styles.selectedButtonText]}>Standard (ml)</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.labelText}>Syringe Volume:</Text>
        <View style={styles.presetContainer}>
          {availableVolumes.map(volume => (
            <TouchableOpacity
              key={volume}
              style={[styles.optionButton, manualSyringe.volume === volume && styles.selectedOption]}
              onPress={() => setManualSyringe(prev => ({ ...prev, volume }))}
            >
              <Text style={[styles.buttonText, manualSyringe.volume === volume && styles.selectedButtonText]}>{volume}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {isValidSyringeOption ? (
          <Text style={styles.inferredMarkings}>Markings ({manualSyringe.type === 'Insulin' ? 'units' : 'ml'}): {syringeOptions[manualSyringe.type][manualSyringe.volume]}</Text>
        ) : (
          <Text style={[styles.inferredMarkings, { color: '#991B1B', fontWeight: 'bold' }]}>Markings unavailable.</Text>
        )}
      </View>
    );
  };

  const renderFinalResultDisplay = () => (
    <View style={styles.formContainer}>
      {calculationError && !recommendedMarking && (
        <View style={[styles.instructionCard, { backgroundColor: '#FEE2E2', borderColor: '#F87171' }]}>
          <X color="#f87171" size={24} />
          <Text style={{ fontSize: 15, color: '#991B1B', textAlign: 'center', fontWeight: '500', marginLeft: 8, flexShrink: 1 }}>{calculationError}</Text>
        </View>
      )}
      {recommendedMarking && (
        <View style={[styles.instructionCard, calculationError ? { backgroundColor: '#FEF3C7', borderColor: '#FBBF24' } : { backgroundColor: '#D1FAE5', borderColor: '#34D399' }]}>
          <Text style={styles.instructionTitle}>
            {calculationError ? '⚠️ Dose Recommendation' : '✅ Dose Calculation Result'}
          </Text>
          <Text style={styles.instructionText}>
            For a {doseValue} {unit} dose of {substanceName || 'this medication'}:
          </Text>
          <Text style={styles.instructionTextLarge}>
            Draw up to the {recommendedMarking} mark
          </Text>
          <Text style={styles.instructionNote}>
            ({manualSyringe.type === 'Insulin' ? 'Units mark on Insulin Syringe' : 'ml mark on Standard Syringe'})
          </Text>
          {calculatedVolume !== null && (
            <Text style={styles.instructionNote}>
              (Exact calculated volume: {calculatedVolume.toFixed(3)} ml)
            </Text>
          )}
          {calculationError && (
            <Text style={{ fontSize: 13, color: '#92400E', textAlign: 'center', marginTop: 10, paddingHorizontal: 10, backgroundColor: 'rgba(251, 191, 36, 0.1)', paddingVertical: 6, borderRadius: 6, width: '90%', alignSelf: 'center' }}>
              {calculationError}
            </Text>
          )}
          <View style={{ marginTop: 20, alignItems: 'center' }}>
            <Text style={styles.instructionNote}>Syringe Illustration (recommended mark highlighted)</Text>
            <SyringeIllustration
              syringeType={manualSyringe.type}
              syringeVolume={manualSyringe.volume}
              recommendedMarking={recommendedMarking}
              syringeOptions={syringeOptions}
            />
          </View>
        </View>
      )}
      <View style={styles.disclaimerContainer}>
        <Text style={styles.disclaimerText}>
          **Medical Disclaimer**: This calculation is for informational purposes only. It is not a substitute for professional medical advice. Verify all doses with a healthcare provider before administration to avoid potential health risks. Incorrect dosing can lead to serious harm.
        </Text>
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#10B981' }, isMobileWeb && styles.actionButtonMobile]} onPress={handleStartOver}>
          <Plus color="#fff" size={18} style={{ marginRight: 8 }} />
          <Text style={styles.buttonText}>New Dose</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#3b82f6' }, isMobileWeb && styles.actionButtonMobile]} onPress={() => setScreenStep('scan')}>
          <CameraIcon color="#fff" size={18} style={{ marginRight: 8 }} />
          <Text style={styles.buttonText}>Scan Again</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderManualEntry = () => {
    let currentStepComponent;
    let progress = 0;

    switch (manualStep) {
      case 'dose':
        currentStepComponent = renderDoseInputStep();
        progress = 1 / 5;
        break;
      case 'medicationSource':
        currentStepComponent = renderMedicationSourceStep();
        progress = 2 / 5;
        break;
      case 'concentrationInput':
        currentStepComponent = renderConcentrationInputStep();
        progress = 3 / 5;
        break;
      case 'totalAmountInput':
        currentStepComponent = renderTotalAmountInputStep();
        progress = 3 / 5;
        break;
      case 'reconstitution':
        currentStepComponent = renderReconstitutionStep();
        progress = 4 / 5;
        break;
      case 'syringe':
        currentStepComponent = renderSyringeStep();
        progress = 5 / 5;
        break;
      case 'finalResult':
        currentStepComponent = renderFinalResultDisplay();
        progress = 1;
        break;
      default:
        currentStepComponent = <Text style={styles.errorText}>Invalid step</Text>;
    }

    return (
      <View style={styles.manualEntryContainer}>
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
      </View>
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
      {scanLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Processing image... This may take a few seconds</Text>
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
    marginTop: 80, 
    marginBottom: 20, 
    paddingHorizontal: 16,
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#000000', 
    textAlign: 'center',
  },
  subtitle: { 
    fontSize: 16, 
    color: '#8E8E93', 
    textAlign: 'center', 
    marginTop: 4,
  },
  content: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 20, 
    padding: 20,
  },
  icon: { 
    marginBottom: 16,
  },
  text: { 
    fontSize: 16, 
    color: '#000000', 
    textAlign: 'center', 
    paddingHorizontal: 16,
  },
  labelText: { 
    fontSize: 14, 
    color: '#000000', 
    marginTop: 10, 
    marginBottom: 6,
  },
  labelTextBold: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: '#000000', 
    marginTop: 12, 
    marginBottom: 8, 
    textAlign: 'center',
  },
  errorText: { 
    fontSize: 14, 
    color: '#f87171', 
    textAlign: 'center', 
    padding: 10, 
    backgroundColor: 'rgba(239, 68, 68, 0.1)', 
    borderRadius: 8, 
    marginTop: 10,
  },
  disclaimerContainer: {
    backgroundColor: '#FFF3CD',
    padding: 12,
    borderRadius: 8,
    marginVertical: 10,
    width: '90%',
    alignSelf: 'center',
  },
  disclaimerText: {
    fontSize: 12,
    color: '#856404',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  button: { 
    backgroundColor: '#007AFF', 
    paddingVertical: 14, 
    paddingHorizontal: 28, 
    borderRadius: 8, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8, 
    width: '80%', 
    minHeight: 50,
  },
  buttonMobile: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    minHeight: 60,
  },
  tryCameraAgainButton: {
    backgroundColor: '#FF9500', // Orange for distinction
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '80%',
    minHeight: 50,
  },
  manualButton: { 
    backgroundColor: '#6366f1',
  },
  backButton: {
    backgroundColor: '#8E8E93',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '45%',
    minHeight: 50,
  },
  backButtonMobile: {
    paddingVertical: 14,
    minHeight: 55,
  },
  manualEntryContainer: { 
    flex: 1,
    ...(Platform.OS === 'web' && { minHeight: '100vh' }),
  },
  progressContainer: {
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 4,
  },
  formWrapper: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 20,
    ...(Platform.OS === 'web' && { minHeight: '80vh' }),
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    width: '100%',
    maxWidth: 600,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#FFFFFF',
    color: '#000000',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 6,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginBottom: 10,
    width: '100%',
  },
  inputHelperText: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 10,
  },
  radioContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
    width: '100%',
  },
  radioContainerVertical: {
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
    gap: 10,
  },
  radioButton: {
    backgroundColor: '#E5E5EA',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  radioButtonWide: {
    backgroundColor: '#E5E5EA',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    alignItems: 'center',
    width: '100%',
  },
  radioButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  radioText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  radioTextSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  nextButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    width: '45%',
    minHeight: 50,
  },
  nextButtonMobile: {
    paddingVertical: 14,
    minHeight: 55,
  },
  disabledButton: {
    backgroundColor: '#C7C7CC',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 600,
    marginTop: 20,
    gap: 10,
  },
  instructionCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 16,
    width: '100%',
  },
  instructionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#065F46',
    textAlign: 'center',
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 15,
    color: '#065F46',
    textAlign: 'center',
    marginBottom: 8,
  },
  instructionTextLarge: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#065F46',
    textAlign: 'center',
    marginVertical: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 6,
  },
  instructionNote: {
    fontSize: 13,
    color: '#065F46',
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
  actionButton: {
    paddingVertical: 14,
    borderRadius: 8,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
    minHeight: 50,
  },
  actionButtonMobile: {
    paddingVertical: 16,
    minHeight: 60,
  },
  presetContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 8,
    width: '100%',
  },
  optionButton: {
    backgroundColor: '#E5E5EA',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    marginHorizontal: 5,
  },
  optionButtonSmall: {
    backgroundColor: '#E5E5EA',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedOption: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  buttonText: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  buttonTextSmall: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  selectedButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  inferredMarkings: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  scanContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlayBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 40,
    paddingTop: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  bottomButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  manualEntryButtonScan: {
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
  },
  backButtonScan: {
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
  },
  scanText: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
    fontWeight: 'bold',
  },
  captureButton: {
    backgroundColor: '#ef4444',
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 20,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 1000,
  },
  loadingText: {
    color: '#fff',
    marginTop: 15,
    fontSize: 16,
  },
  helperHint: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'left',
    marginTop: 2,
    marginBottom: 8,
    fontStyle: 'italic',
  },
});