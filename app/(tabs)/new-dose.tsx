import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { Camera as CameraIcon, ArrowRight, Syringe, Pill, RotateCcw, Home, Check, X } from 'lucide-react-native';
import { Camera, CameraDevice } from 'react-native-vision-camera';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as FileSystem from 'expo-file-system';
import OpenAI from 'openai';
import Constants from 'expo-constants';

// Define the steps for the multi-step manual entry form
type ManualEntryStep = 'dose' | 'medicationSource' | 'concentrationInput' | 'totalAmountInput' | 'reconstitution' | 'syringe' | 'finalResult';
type MedicationInputType = 'concentration' | 'totalAmount' | null;

export default function NewDoseScreen() {
  // --- State Management ---

  // Top-level Flow Control
  const [screenStep, setScreenStep] = useState<'intro' | 'scan' | 'manualEntry'>('intro');

  // Camera & Scan Specific State
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const cameraRef = useRef<Camera>(null);
  const [devices, setDevices] = useState<CameraDevice[]>([]);

  // Manual Entry Flow Control & Data Storage
  const [manualStep, setManualStep] = useState<ManualEntryStep>('dose');
  const [dose, setDose] = useState<string>(''); // User-input dose number string
  const [unit, setUnit] = useState<'mg' | 'units'>('mg'); // Unit selection
  const [substanceName, setSubstanceName] = useState<string>(''); // Optional substance name
  const [medicationInputType, setMedicationInputType] = useState<MedicationInputType>(null); // 'concentration' or 'totalAmount'
  const [concentrationAmount, setConcentrationAmount] = useState<string>(''); // Input string for concentration
  const [totalAmount, setTotalAmount] = useState<string>(''); // Input string for total amount
  const [solutionVolume, setSolutionVolume] = useState<string>(''); // Input string for reconstitution volume
  const [manualSyringe, setManualSyringe] = useState<{ type: 'Insulin' | 'Standard'; volume: string }>({ type: 'Standard', volume: '3 ml' }); // Syringe details

  // Derived/Calculated State (used during calculation and result display)
  const [doseValue, setDoseValue] = useState<number | null>(null); // Parsed dose
  const [concentration, setConcentration] = useState<number | null>(null); // Final calculated concentration (mg/ml or units/ml)
  const [calculatedVolume, setCalculatedVolume] = useState<number | null>(null); // Volume to draw (ml)
  const [recommendedMarking, setRecommendedMarking] = useState<string | null>(null); // Syringe marking to use
  const [calculationError, setCalculationError] = useState<string | null>(null); // Errors during final calculation/validation
  const [formError, setFormError] = useState<string | null>(null); // Errors during step validation

  // --- Constants and Options ---

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

  // --- OpenAI Client ---
  const openai = new OpenAI({
    apiKey: Constants.expoConfig?.extra?.OPENAI_API_KEY || '',
  });

  // --- Effects ---

  useEffect(() => {
    (async () => {
      const permission = await Camera.requestCameraPermission();
      setHasPermission(permission === 'granted');
      if (permission === 'granted') {
        try {
          const availableDevices = await Camera.getAvailableCameraDevices();
          setDevices(availableDevices);
        } catch (e) {
          console.error("Failed to get camera devices:", e);
          setScanError("Could not access camera devices.");
        }
      }
    })();
  }, []);

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

  // --- Helper Functions ---

  const resetFullForm = (startStep: ManualEntryStep = 'dose') => {
    setDose('');
    setUnit('mg');
    setSubstanceName('');
    setMedicationInputType(null);
    setConcentrationAmount('');
    setTotalAmount('');
    setSolutionVolume('');
    setManualSyringe({ type: 'Standard', volume: '3 ml' });
    setDoseValue(null);
    setConcentration(null);
    setCalculatedVolume(null);
    setRecommendedMarking(null);
    setCalculationError(null);
    setFormError(null);
    setScanError(null);
    setManualStep(startStep);
  };

  // --- Scan Function ---
  const captureImage = async () => {
    if (!cameraRef.current) { Alert.alert("Camera Error", "Camera not ready."); return; }
    if (!openai.apiKey) { Alert.alert("Config Error", "OpenAI Key missing."); return; }

    setScanLoading(true);
    setScanError(null);
    resetFullForm();

    try {
      const photo = await cameraRef.current.takePhoto();
      const base64Image = await FileSystem.readAsStringAsync(photo.path, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Analyze this image for syringe and vial details. Provide JSON: { "syringe": { "type": "Insulin or Standard", "volume": "e.g., \'1 ml\' or \'0.5 ml\'", "markings": "visible numbers/text" }, "vial": { "substance": "name", "totalAmount": "e.g., \'20 mg\'", "concentration": "e.g., \'100 units/ml\'", "expiration": "date" } }. Use null if absent, "unreadable" if illegible. Ensure valid JSON output only.' },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } },
            ],
          },
        ],
      });

      const content = response.choices[0].message.content || '{}';
      const jsonContent = content.replace(/```json\n?|\n?```/g, '').trim();
      let result;

      try {
        result = JSON.parse(jsonContent);
        if (typeof result !== 'object' || result === null || !('syringe' in result) || !('vial' in result)) {
          throw new Error("Parsed JSON structure mismatch.");
        }
      } catch (parseError) {
        console.error('Error parsing OpenAI response:', parseError, 'Raw:', jsonContent);
        setScanError('Could not understand the analysis result.');
        setScanLoading(false);
        return;
      }

      const scannedTypeInput = result.syringe?.type?.toLowerCase();
      const scannedType: 'Insulin' | 'Standard' = scannedTypeInput === 'insulin' ? 'Insulin' : 'Standard';
      const scannedVolumeInput = result.syringe?.volume;
      const targetVolumes = scannedType === 'Insulin' ? insulinVolumes : standardVolumes;
      const defaultVolume = scannedType === 'Insulin' ? '1 ml' : '3 ml';
      let selectedVolume = defaultVolume;
      if (scannedVolumeInput && typeof scannedVolumeInput === 'string' && scannedVolumeInput !== 'unreadable') {
        const normalizedScan = scannedVolumeInput.replace(/\s+/g, '').toLowerCase();
        const foundVolume = targetVolumes.find(v => v.replace(/\s+/g, '').toLowerCase() === normalizedScan);
        selectedVolume = foundVolume || defaultVolume;
      }
      setManualSyringe({ type: scannedType, volume: selectedVolume });

      const substance = (result.vial?.substance && result.vial.substance !== 'unreadable') ? result.vial.substance : '';
      setSubstanceName(substance);

      const concentrationStr = (result.vial?.concentration && result.vial.concentration !== 'unreadable') ? result.vial.concentration : null;
      const totalAmountStr = (result.vial?.totalAmount && result.vial.totalAmount !== 'unreadable') ? result.vial.totalAmount : null;

      if (concentrationStr) {
        setConcentrationAmount(concentrationStr);
        setMedicationInputType('concentration');
      } else if (totalAmountStr) {
        setTotalAmount(totalAmountStr);
        setMedicationInputType('totalAmount');
      }

      setScreenStep('manualEntry');
      setManualStep('dose');
    } catch (error) {
      console.error('Error during capture/analysis:', error);
      if (error instanceof OpenAI.APIError) {
        setScanError(`API Error: ${error.name}. Check key/network.`);
      } else if (error instanceof Error) {
        setScanError(`Error: ${error.message}`);
      } else {
        setScanError('An unexpected error occurred during scanning.');
      }
    } finally {
      setScanLoading(false);
    }
  };

  // --- Core Calculation Logic ---
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
    if (isNaN(requiredVolume) || requiredVolume <= 0) {
      setCalculationError('Calculation resulted in an invalid volume. Check inputs.');
      return;
    }
    setCalculatedVolume(requiredVolume);

    const maxVolume = parseFloat(manualSyringe.volume.replace(/[^0-9.]/g, ''));
    if (requiredVolume > maxVolume) {
      setCalculationError(
        `Required volume (${requiredVolume.toFixed(3)} ml) exceeds selected syringe capacity (${maxVolume} ml). Use a larger syringe or split dose.`
      );
      return;
    }

    const markings = markingsString.split(',').map(m => parseFloat(m)).sort((a, b) => a - b);
    if (markings.length === 0 || markings.some(isNaN)) {
      setCalculationError("Error reading syringe markings.");
      return;
    }

    const markingScaleValue = manualSyringe.type === 'Insulin' ? requiredVolume * concentration : requiredVolume;
    const markingScaleUnit = manualSyringe.type === 'Insulin' ? 'units' : 'ml';

    let recommendedMarkingValue: number;
    let precisionMessage: string | null = null;

    const lowerOrEqualMarkings = markings.filter(m => m <= markingScaleValue + 1e-9);
    if (lowerOrEqualMarkings.length > 0) {
      recommendedMarkingValue = Math.max(...lowerOrEqualMarkings);
      if (Math.abs(recommendedMarkingValue - markingScaleValue) > 1e-9) {
        precisionMessage = `Calculated dose is ${markingScaleValue.toFixed(3)} ${markingScaleUnit}. Nearest mark at or below this is ${recommendedMarkingValue} ${markingScaleUnit}.`;
      }
    } else {
      recommendedMarkingValue = markings[0];
      precisionMessage = `Calculated dose (${markingScaleValue.toFixed(3)} ${markingScaleUnit}) is below smallest mark (${markings[0]} ${markingScaleUnit}). Smallest mark recommended, verify if appropriate or use different syringe.`;
      Alert.alert('Volume Below Smallest Mark', precisionMessage);
    }

    setRecommendedMarking(recommendedMarkingValue.toString());
    if (precisionMessage && calculationError === null) {
      setCalculationError(precisionMessage);
    }
  };

  // --- Navigation Handlers for Manual Steps ---

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
      setFormError('Please select how the medication amount is specified (Concentration or Total Amount).');
      return;
    }
    if (medicationInputType === 'concentration') {
      setManualStep('concentrationInput');
    } else {
      setManualStep('totalAmountInput');
    }
  };

  const handleNextConcentrationInput = () => {
    setFormError(null);
    const concentrationMatch = concentrationAmount.match(/(\d+\.?\d*)\s*(mg\/ml|units\/ml)/i);
    if (!concentrationMatch) {
      setFormError(`Invalid format. Use "X ${unit}/ml" (e.g., "10 ${unit}/ml").`);
      return;
    }
    const parsedConc = parseFloat(concentrationMatch[1]);
    const concUnit = concentrationMatch[2].toLowerCase();
    const expectedConcUnit = unit + '/ml';

    if (isNaN(parsedConc) || parsedConc <= 0) {
      setFormError('Concentration amount must be a positive number.');
      return;
    }
    if (concUnit !== expectedConcUnit) {
      setFormError(`Unit mismatch: Dose is in '${unit}', but concentration entered is in '${concUnit}'. Please use '${expectedConcUnit}'.`);
      return;
    }

    setConcentration(parsedConc);
    setManualStep('syringe');
  };

  const handleNextTotalAmountInput = () => {
    setFormError(null);
    const totalAmountMatch = totalAmount.match(/(\d+\.?\d*)\s*(mg|units)/i);
    if (!totalAmountMatch) {
      setFormError(`Invalid format. Use "X ${unit}" (e.g., "50 ${unit}").`);
      return;
    }
    const parsedAmount = parseFloat(totalAmountMatch[1]);
    const amountUnit = totalAmountMatch[2].toLowerCase();

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Total amount must be a positive number.');
      return;
    }
    if (amountUnit !== unit) {
      setFormError(`Unit mismatch: Dose is in '${unit}', but total amount entered is in '${amountUnit}'. Please use '${unit}'.`);
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
    const totalAmountMatch = totalAmount.match(/(\d+\.?\d*)\s*(mg|units)/i);
    if (!totalAmountMatch) {
      setFormError('Internal Error: Could not retrieve total amount for calculation.');
      return;
    }
    const parsedAmount = parseFloat(totalAmountMatch[1]);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Internal Error: Invalid total amount.');
      return;
    }

    const calculatedConc = parsedAmount / parsedSolutionVol;
    if (isNaN(calculatedConc) || calculatedConc <= 0) {
      setFormError('Reconstitution resulted in an invalid concentration.');
      return;
    }
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
      case 'finalResult':
        setManualStep('syringe');
        break;
      case 'syringe':
        if (medicationInputType === 'concentration') {
          setManualStep('concentrationInput');
        } else {
          setManualStep('reconstitution');
        }
        break;
      case 'reconstitution':
        setManualStep('totalAmountInput');
        break;
      case 'concentrationInput':
      case 'totalAmountInput':
        setManualStep('medicationSource');
        break;
      case 'medicationSource':
        setManualStep('dose');
        break;
      case 'dose':
      default:
        setScreenStep('intro');
        resetFullForm();
        break;
    }
  };

  const handleStartOver = () => {
    resetFullForm('dose');
  };

  const handleGoHome = () => {
    resetFullForm();
    setScreenStep('intro');
  };

  // --- Render Functions ---

  const renderIntro = () => (
    <Animated.View entering={FadeIn.duration(400)} style={styles.content}>
      <Syringe color={'#6ee7b7'} size={64} style={styles.icon} />
      <Text style={styles.text}>Welcome! Calculate your dose accurately.</Text>
      <Text style={styles.subText}>Scan items or enter details step-by-step.</Text>
      <TouchableOpacity style={styles.button} onPress={() => setScreenStep('scan')}>
        <CameraIcon color={'#fff'} size={20} style={{ marginRight: 8 }} />
        <Text style={styles.buttonText}>Scan Items</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, styles.manualButton]} onPress={() => {
        resetFullForm('dose');
        setScreenStep('manualEntry');
      }}>
        <Pill color={'#fff'} size={20} style={{ marginRight: 8 }} />
        <Text style={styles.buttonText}>Enter Details Manually</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderScan = () => {
    if (hasPermission === null) return <View style={styles.content}><ActivityIndicator size="large" color="#fff" /><Text style={styles.text}>Requesting permission...</Text></View>;
    if (hasPermission === false) return <View style={styles.content}><Text style={styles.errorText}>Camera permission denied.</Text><TouchableOpacity style={styles.backToHomeButton} onPress={handleGoHome}><Home color="#fff" size={18} /><Text style={styles.buttonText}> Home</Text></TouchableOpacity></View>;
    if (devices.length === 0 && hasPermission) return <View style={styles.content}><Text style={styles.text}>No camera devices found.</Text><TouchableOpacity style={styles.backToHomeButton} onPress={handleGoHome}><Home color="#fff" size={18} /><Text style={styles.buttonText}> Home</Text></TouchableOpacity></View>;

    const device = devices.find(d => d.position === 'back') || devices[0];
    if (!device) return <View style={styles.content}><Text style={styles.text}>Camera init failed.</Text></View>;

    return (
      <View style={styles.scanContainer}>
        {screenStep === 'scan' && (
          <Camera
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={true}
            photo={true}
          />
        )}
        <View style={styles.overlay}>
          {scanError && <Text style={[styles.errorText, { marginBottom: 10 }]}>{scanError}</Text>}
          <Text style={styles.scanText}>Position syringe & vial clearly</Text>
          <TouchableOpacity style={styles.captureButton} onPress={captureImage} disabled={scanLoading}>
            {scanLoading ? <ActivityIndicator color="#fff" /> : <CameraIcon color={'#fff'} size={24} />}
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButtonScan} onPress={handleGoHome} disabled={scanLoading}>
            <Text style={styles.backButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
        {scanLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Analyzing...</Text>
          </View>
        )}
      </View>
    );
  };

  // --- Render Functions for Manual Steps ---

  const renderDoseInputStep = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Step 1: Prescribed Dose</Text>
      <Text style={styles.labelText}>Dose Amount:</Text>
      <TextInput
        style={styles.inputLarge}
        value={dose}
        onChangeText={setDose}
        keyboardType="numeric"
        placeholder="e.g., 5"
        placeholderTextColor="#9ca3af"
      />
      <Text style={styles.labelText}>Unit:</Text>
      <View style={styles.radioContainerHorizontal}>
        <TouchableOpacity style={[styles.radioButtonFlex, unit === 'mg' && styles.radioButtonSelected]} onPress={() => setUnit('mg')}>
          <Text style={[styles.radioText, unit === 'mg' && styles.radioTextSelected]}>mg</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.radioButtonFlex, unit === 'units' && styles.radioButtonSelected]} onPress={() => setUnit('units')}>
          <Text style={[styles.radioText, unit === 'units' && styles.radioTextSelected]}>units</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.nextButton} onPress={handleNextDose}>
        <Text style={styles.buttonText}>Next</Text>
        <ArrowRight color="#fff" size={18} />
      </TouchableOpacity>
    </View>
  );

  const renderMedicationSourceStep = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Step 2: Medication Details</Text>
      <TextInput
        style={styles.input}
        placeholder="Substance Name (Optional)"
        placeholderTextColor="#9ca3af"
        value={substanceName}
        onChangeText={setSubstanceName}
      />
      <Text style={styles.labelText}>Select how the medication amount is specified on the vial label:</Text>
      <View style={styles.radioContainerVertical}>
        <TouchableOpacity style={[styles.radioButtonFlexWide, medicationInputType === 'concentration' && styles.radioButtonSelected]} onPress={() => setMedicationInputType('concentration')}>
          <Text style={[styles.radioText, medicationInputType === 'concentration' && styles.radioTextSelected]}>Concentration (e.g., 10 mg/ml, 100 units/ml)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.radioButtonFlexWide, medicationInputType === 'totalAmount' && styles.radioButtonSelected]} onPress={() => setMedicationInputType('totalAmount')}>
          <Text style={[styles.radioText, medicationInputType === 'totalAmount' && styles.radioTextSelected]}>Total Amount in Vial (e.g., 50 mg, 1000 units)</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextButton} onPress={handleNextMedicationSource}>
          <Text style={styles.buttonText}>Next</Text>
          <ArrowRight color="#fff" size={18} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderConcentrationInputStep = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Step 2a: Enter Concentration</Text>
      <Text style={styles.labelText}>Concentration ({unit}/ml):</Text>
      <TextInput
        style={styles.inputLarge}
        value={concentrationAmount}
        onChangeText={setConcentrationAmount}
        keyboardType="numeric"
        placeholder={`e.g., 10 ${unit}/ml`}
        placeholderTextColor="#9ca3af"
      />
      <Text style={styles.inputHelperText}>Enter the value exactly as shown on the label, including the units '{unit}/ml'.</Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextButton} onPress={handleNextConcentrationInput}>
          <Text style={styles.buttonText}>Next</Text>
          <ArrowRight color="#fff" size={18} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTotalAmountInputStep = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Step 2b: Enter Total Amount</Text>
      <Text style={styles.labelText}>Total Amount in Vial ({unit}):</Text>
      <TextInput
        style={styles.inputLarge}
        value={totalAmount}
        onChangeText={setTotalAmount}
        keyboardType="numeric"
        placeholder={`e.g., 50 ${unit}`}
        placeholderTextColor="#9ca3af"
      />
      <Text style={styles.inputHelperText}>Enter the total amount of substance in the vial, using the unit '{unit}'. You'll enter the liquid volume next.</Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextButton} onPress={handleNextTotalAmountInput}>
          <Text style={styles.buttonText}>Next</Text>
          <ArrowRight color="#fff" size={18} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderReconstitutionStep = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Step 2c: Reconstitution</Text>
      <Text style={styles.labelTextBold}>How much liquid (ml) are you adding?</Text>
      <Text style={styles.labelText}>(e.g., sterile water, bacteriostatic water)</Text>
      <View style={styles.presetContainer}>
        {['1', '2', '3', '5'].map(ml => (
          <TouchableOpacity key={ml + 'ml'} style={[styles.optionButtonSmall, solutionVolume === ml && styles.selectedOption]} onPress={() => setSolutionVolume(ml)}>
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
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextButton} onPress={handleNextReconstitution}>
          <Text style={styles.buttonText}>Next</Text>
          <ArrowRight color="#fff" size={18} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSyringeStep = () => {
    const availableVolumes = manualSyringe.type === 'Insulin' ? insulinVolumes : standardVolumes;
    const isValidSyringeOption = manualSyringe.type && manualSyringe.volume && syringeOptions[manualSyringe.type]?.[manualSyringe.volume];

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Step 3: Syringe Details</Text>
        <Text style={styles.labelText}>Syringe Type:</Text>
        <View style={styles.presetContainer}>
          <TouchableOpacity style={[styles.optionButton, manualSyringe.type === 'Insulin' && styles.selectedOption]} onPress={() => setManualSyringe({ type: 'Insulin', volume: insulinVolumes[2] })}>
            <Text style={[styles.buttonText, manualSyringe.type === 'Insulin' && styles.selectedButtonText]}>Insulin (units)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.optionButton, manualSyringe.type === 'Standard' && styles.selectedOption]} onPress={() => setManualSyringe({ type: 'Standard', volume: standardVolumes[1] })}>
            <Text style={[styles.buttonText, manualSyringe.type === 'Standard' && styles.selectedButtonText]}>Standard (ml)</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.labelText}>Syringe Volume:</Text>
        <View style={styles.presetContainer}>
          {availableVolumes.map(volume => (
            <TouchableOpacity key={volume} style={[styles.optionButton, manualSyringe.volume === volume && styles.selectedOption]} onPress={() => setManualSyringe(prev => ({ ...prev, volume }))}>
              <Text style={[styles.buttonText, manualSyringe.volume === volume && styles.selectedButtonText]}>{volume}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {isValidSyringeOption ? (
          <Text style={styles.inferredMarkings}>
            Markings ({manualSyringe.type === 'Insulin' ? 'units' : 'ml'}): {syringeOptions[manualSyringe.type][manualSyringe.volume]}
          </Text>
        ) : (
          <Text style={[styles.inferredMarkings, { color: styles.errorTextResult.color, fontWeight: 'bold' }]}>Markings unavailable.</Text>
        )}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.buttonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.calculateButton} onPress={handleCalculateFinal}>
            <Check color="#fff" size={20} style={{ marginRight: 8 }} />
            <Text style={styles.buttonText}>Calculate Dose</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderFinalResultDisplay = () => (
    <View style={styles.card}>
      {calculationError && !recommendedMarking && (
        <View style={styles.errorResultCard}>
          <X color="#f87171" size={24} />
          <Text style={styles.errorTextResultFatal}>{calculationError}</Text>
        </View>
      )}
      {recommendedMarking && (
        <View style={[styles.instructionCard, calculationError ? styles.warningCard : styles.successCard]}>
          <Text style={styles.instructionTitle}>
            {calculationError ? '⚠️ Dose Recommendation' : '✅ Dose Calculation Result'}
          </Text>
          <Text style={styles.instructionText}>
            For a {doseValue} {unit} dose of {substanceName || 'this substance'}:
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
            <Text style={styles.warningTextResult}>{calculationError}</Text>
          )}
        </View>
      )}
      <TouchableOpacity style={[styles.actionButton, styles.resetButton, { marginTop: 20 }]} onPress={handleStartOver}>
        <RotateCcw color="#fff" size={18} style={{ marginRight: 8 }} />
        <Text style={styles.buttonText}>Enter Another Dose</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.actionButton, styles.scanNewButton]} onPress={() => setScreenStep('scan')}>
        <CameraIcon color="#fff" size={18} style={{ marginRight: 8 }} />
        <Text style={styles.buttonText}>Scan New Items</Text>
      </TouchableOpacity>
    </View>
  );

  // --- Main Manual Entry Renderer ---
  const renderManualEntry = () => {
    let currentStepComponent;

    switch (manualStep) {
      case 'dose':
        currentStepComponent = renderDoseInputStep();
        break;
      case 'medicationSource':
        currentStepComponent = renderMedicationSourceStep();
        break;
      case 'concentrationInput':
        currentStepComponent = renderConcentrationInputStep();
        break;
      case 'totalAmountInput':
        currentStepComponent = renderTotalAmountInputStep();
        break;
      case 'reconstitution':
        currentStepComponent = renderReconstitutionStep();
        break;
      case 'syringe':
        currentStepComponent = renderSyringeStep();
        break;
      case 'finalResult':
        currentStepComponent = renderFinalResultDisplay();
        break;
      default:
        currentStepComponent = <Text style={styles.errorText}>Invalid step</Text>;
    }

    return (
      <ScrollView contentContainerStyle={styles.contentManualEntry} keyboardShouldPersistTaps="handled">
        {currentStepComponent}
        {formError && <Text style={styles.errorTextForm}>{formError}</Text>}
        {manualStep !== 'finalResult' && (
          <TouchableOpacity style={[styles.actionButton, styles.homeButton, { marginTop: 20, width: '95%' }]} onPress={handleGoHome}>
            <Home color="#fff" size={18} style={{ marginRight: 8 }} />
            <Text style={styles.buttonText}>Return to Start</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    );
  };

  // --- Main Return ---
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dose Calculator</Text>
        <Text style={styles.subtitle}>
          {screenStep === 'intro' && 'Welcome'}
          {screenStep === 'scan' && 'Scan Syringe & Vial'}
          {screenStep === 'manualEntry' && (
            `Manual Entry - ${
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
    </View>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { marginTop: 50, marginBottom: 20, paddingHorizontal: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#f1f5f9', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#94a3b8', textAlign: 'center', marginTop: 4 },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 20, padding: 20 },
  contentManualEntry: { alignItems: 'center', gap: 16, paddingVertical: 10, paddingBottom: 40, paddingHorizontal: 8 },
  icon: { marginBottom: 16 },
  text: { fontSize: 16, color: '#e2e8f0', textAlign: 'center', paddingHorizontal: 16 },
  subText: { fontSize: 14, color: '#94a3b8', textAlign: 'center', paddingHorizontal: 16, marginTop: -10, marginBottom: 10 },
  labelText: { fontSize: 14, color: '#cbd5e1', marginTop: 10, marginBottom: 6, alignSelf: 'flex-start', marginLeft: '5%' },
  labelTextBold: { fontSize: 15, fontWeight: '600', color: '#f1f5f9', marginTop: 12, marginBottom: 8, textAlign: 'center' },
  errorText: { fontSize: 14, color: '#f87171', textAlign: 'center', padding: 10, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 8, width: '90%' },
  errorTextForm: { fontSize: 14, color: '#f87171', textAlign: 'center', marginTop: 12, marginBottom: 4, paddingHorizontal: 10, backgroundColor: 'rgba(239, 68, 68, 0.1)', paddingVertical: 8, borderRadius: 6, width: '90%', alignSelf: 'center' },
  errorTextResultFatal: { fontSize: 15, color: '#fca5a5', textAlign: 'center', fontWeight: '500', marginLeft: 8, flexShrink: 1 },
  warningTextResult: { fontSize: 13, color: '#fcd34d', textAlign: 'center', marginTop: 10, paddingHorizontal: 10, backgroundColor: 'rgba(251, 191, 36, 0.1)', paddingVertical: 6, borderRadius: 6, width: '90%', alignSelf: 'center' },
  button: { backgroundColor: '#14b8a6', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5, width: '80%', minHeight: 50 },
  manualButton: { backgroundColor: '#6366f1' },
  card: { backgroundColor: '#1e293b', padding: 16, paddingBottom: 20, borderRadius: 12, width: '95%', alignSelf: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 3 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#f1f5f9', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#334155', paddingBottom: 8, textAlign: 'center' },
  input: { backgroundColor: '#f8fafc', color: '#0f172a', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 6, width: '90%', alignSelf: 'center', fontSize: 15, marginVertical: 5, borderWidth: 1, borderColor: '#cbd5e1' },
  inputLarge: { backgroundColor: '#f8fafc', color: '#0f172a', paddingVertical: 12, paddingHorizontal: 15, borderRadius: 6, width: '90%', alignSelf: 'center', fontSize: 16, marginVertical: 5, borderWidth: 1, borderColor: '#cbd5e1', textAlign: 'center' },
  inputHelperText: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 4, width: '85%', alignSelf: 'center' },
  radioContainerHorizontal: { flexDirection: 'row', justifyContent: 'center', marginBottom: 8, width: '90%', alignSelf: 'center', gap: 10 },
  radioContainerVertical: { flexDirection: 'column', alignItems: 'center', marginBottom: 8, width: '90%', alignSelf: 'center', gap: 10 },
  radioButtonFlex: { flex: 1, backgroundColor: '#475569', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 20, marginHorizontal: 5, borderWidth: 1, borderColor: '#475569', alignItems: 'center' },
  radioButtonFlexWide: { width: '100%', backgroundColor: '#475569', paddingVertical: 12, paddingHorizontal: 15, borderRadius: 8, borderWidth: 1, borderColor: '#475569', alignItems: 'center' },
  radioButtonSelected: { backgroundColor: '#14b8a6', borderColor: '#5eead4' },
  radioText: { color: '#e2e8f0', fontSize: 14, fontWeight: '500', textAlign: 'center' },
  radioTextSelected: { color: '#ffffff', fontWeight: 'bold' },
  nextButton: { backgroundColor: '#0ea5e9', paddingVertical: 12, borderRadius: 8, width: '45%', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  calculateButton: { backgroundColor: '#16a34a', paddingVertical: 12, borderRadius: 8, width: '45%', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  backButton: { backgroundColor: '#64748b', paddingVertical: 12, borderRadius: 8, width: '45%', alignItems: 'center' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, width: '90%', alignSelf: 'center' },
  instructionCard: { padding: 16, borderRadius: 12, width: '100%', alignSelf: 'center', borderWidth: 2, marginBottom: 16 },
  successCard: { backgroundColor: '#166534', borderColor: '#22c55e' },
  warningCard: { backgroundColor: '#a16207', borderColor: '#facc15' },
  errorResultCard: { backgroundColor: '#991b1b', borderColor: '#f87171', padding: 16, borderRadius: 12, width: '100%', alignSelf: 'center', flexDirection: 'row', alignItems: 'center' },
  instructionTitle: { fontSize: 18, fontWeight: 'bold', color: '#f0fdf4', textAlign: 'center', marginBottom: 12 },
  instructionText: { fontSize: 15, color: '#dcfce7', textAlign: 'center', marginBottom: 8 },
  instructionTextLarge: { fontSize: 24, fontWeight: 'bold', color: '#ffffff', textAlign: 'center', marginVertical: 10, paddingVertical: 8, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 6 },
  instructionNote: { fontSize: 13, color: '#a7f3d0', textAlign: 'center', marginTop: 4, fontStyle: 'italic' },
  actionButton: { paddingVertical: 14, borderRadius: 8, width: '100%', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
  backToHomeButton: { backgroundColor: '#475569', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, width: '80%' },
  scanNewButton: { backgroundColor: '#3b82f6' },
  resetButton: { backgroundColor: '#ef4444' },
  homeButton: { backgroundColor: '#64748b' },
  presetContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 4, marginBottom: 8, width: '90%', alignSelf: 'center' },
  optionButton: { backgroundColor: '#475569', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 6, minWidth: '45%', alignItems: 'center', borderWidth: 1, borderColor: 'transparent', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 3 },
  optionButtonSmall: { backgroundColor: '#475569', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 6, minWidth: '20%', alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  selectedOption: { backgroundColor: '#14b8a6', borderColor: '#5eead4' },
  buttonText: { color: '#f8fafc', fontSize: 16, fontWeight: '500', textAlign: 'center' },
  buttonTextSmall: { color: '#f8fafc', fontSize: 14, fontWeight: '500', textAlign: 'center' },
  selectedButtonText: { color: '#ffffff', fontWeight: 'bold' },
  inferredMarkings: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginTop: 10, fontStyle: 'italic' },
  scanContainer: { flex: 1, backgroundColor: '#000' },
  overlay: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: 40, paddingTop: 20, alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  scanText: { fontSize: 14, color: '#fff', textAlign: 'center', paddingHorizontal: 20, marginBottom: 15 },
  captureButton: { backgroundColor: '#ef4444', width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 6, borderWidth: 3, borderColor: 'rgba(255, 255, 255, 0.5)', marginBottom: 20 },
  backButtonScan: { position: 'absolute', left: 20, bottom: 55, flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: 'rgba(0, 0, 0, 0.6)', borderRadius: 20 },
  backButtonText: { color: '#fff', fontSize: 14 },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: 10 },
  loadingText: { color: '#fff', marginTop: 15, fontSize: 16 },
});