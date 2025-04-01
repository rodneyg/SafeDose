import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Alert,
  // Platform, // Platform was imported but not used, removed for cleanup
} from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { Camera as CameraIcon, ArrowRight, Syringe, Pill, RotateCcw, Home } from 'lucide-react-native';
import { Camera, CameraDevice } from 'react-native-vision-camera';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as FileSystem from 'expo-file-system';
import OpenAI from 'openai';
import Constants from 'expo-constants';

export default function NewDoseScreen() {
  // State Management
  const [step, setStep] = useState<'intro' | 'scan' | 'result'>('intro');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [detectionResult, setDetectionResult] = useState<
    | {
        syringe: { type: string | null; volume: string | null; markings: string | null } | null;
        vial: { substance: string | null; totalAmount: string | null; concentration: string | null; expiration: string | null } | null;
      }
    | string // Can be 'error' or '' initially or {} for manual mode
    | object // Allow empty object for manual mode start
  >('');
  const [dose, setDose] = useState<string>(''); // User-input dose number
  const [unit, setUnit] = useState<'mg' | 'units'>('mg'); // Unit selection
  const [solutionVolume, setSolutionVolume] = useState<string>(''); // For calculating concentration
  const [calculatedVolume, setCalculatedVolume] = useState<number | null>(null);
  const [recommendedMarking, setRecommendedMarking] = useState<string | null>(null);
  // Initialize with valid defaults according to syringeOptions
  const [manualSyringe, setManualSyringe] = useState<{ type: 'Insulin' | 'Standard'; volume: string }>({ type: 'Standard', volume: '3 ml' });
  const [manualVial, setManualVial] = useState<{ substance: string; amountOrConcentration: string }>({
    substance: '',
    amountOrConcentration: '',
  });
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const cameraRef = useRef<Camera>(null);
  const [devices, setDevices] = useState<CameraDevice[]>([]);

  // Predefined syringe options with simplified inferred markings
  const syringeOptions = {
    Insulin: {
      '0.3 ml': '5,10,15,20,25,30',
      '0.5 ml': '5,10,15,20,25,30,35,40,45,50',
      '1 ml': '10,20,30,40,50,60,70,80,90,100',
    },
    Standard: {
      '1 ml': '0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0', // More granular standard 1ml
      '3 ml': '0.5,1.0,1.5,2.0,2.5,3.0',
      '5 ml': '1.0,2.0,3.0,4.0,5.0',
    },
  };

  // Available volumes based on syringe type
  const insulinVolumes = ['0.3 ml', '0.5 ml', '1 ml'];
  const standardVolumes = ['1 ml', '3 ml', '5 ml'];

  // Reset calculation results when inputs change
  useEffect(() => {
    setCalculatedVolume(null);
    setRecommendedMarking(null);
    setCalculationError(null);
    // Don't reset manual vial/syringe here unless intended when dose/unit changes
  }, [dose, unit, manualSyringe.type, manualSyringe.volume, manualVial.substance, manualVial.amountOrConcentration, solutionVolume]);


  // Initialize OpenAI client
  // IMPORTANT: Ensure OPENAI_API_KEY is set in your app config (app.json/app.config.js) under 'extra'
  const openai = new OpenAI({
    apiKey: Constants.expoConfig?.extra?.OPENAI_API_KEY || '',
  });

  // Request camera permission and get available devices
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
            Alert.alert("Camera Error", "Could not access camera devices.");
        }
      }
    })();
  }, []);

  // Capture and analyze image with OpenAI
  const captureImage = async () => {
    if (!cameraRef.current) {
        Alert.alert("Camera Error", "Camera reference is not available.");
        return;
    }
    if (!openai.apiKey) {
        Alert.alert("Configuration Error", "OpenAI API Key is missing. Please configure it in app.json/app.config.js under 'extra'.");
        return; // Prevent API call without key
    }

    setLoading(true);
    setDetectionResult(''); // Reset previous result/error
    try {
      const photo = await cameraRef.current.takePhoto();
      const base64Image = await FileSystem.readAsStringAsync(photo.path, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const response = await openai.chat.completions.create({
        model: 'gpt-4o', // Or your preferred model
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this image and provide the following information in JSON format: { "syringe": { "type": "Insulin or Standard", "volume": "volume like \'1 ml\' or \'0.5 ml\' or \'30 units\'", "markings": "any text or numbers visible" }, "vial": { "substance": "substance name", "totalAmount": "total substance amount, e.g., \'20 mg\'", "concentration": "e.g., \'100 units/ml\' or \'10 mg/ml\'", "expiration": "date if visible" } }. If an item is not present, set its value to null. If text is unreadable, set the value to "unreadable". Ensure the response is valid JSON without markdown formatting.',
              },
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${base64Image}` },
              },
            ],
          },
        ],
        // Optional: Specify response format if supported by the model/API version
        // response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content || '{}';
      const jsonContent = content.replace(/```json\n?|\n?```/g, '').trim(); // Adjusted regex slightly
      let result;

      try {
        result = JSON.parse(jsonContent);
        // Basic validation: check if result is an object with expected top-level keys
        if (typeof result !== 'object' || result === null || !('syringe' in result) || !('vial' in result)) {
            console.warn("Parsed JSON doesn't have the expected structure:", result);
            // Assign default null structure if parsing gives wrong format but doesn't throw
            result = { syringe: null, vial: null };
            // Optionally set an error state or provide feedback
            setDetectionResult('error'); // Treat unexpected structure as error
        }
      } catch (parseError) {
        console.error('Error parsing OpenAI response:', parseError, 'Raw content:', jsonContent);
        setDetectionResult('error'); // Set error state if parsing fails
        setLoading(false);
        setStep('result'); // Go to result screen to show error
        return; // Stop execution
      }

       // Check if we got an error state from structure validation above
       if(detectionResult === 'error') {
          setLoading(false);
          setStep('result');
          return;
       }

      setDetectionResult(result); // Store the parsed (or default) result object

      // --- Logic for Setting Manual Syringe ---
      const scannedTypeInput = result.syringe?.type?.toLowerCase();
      const scannedType: 'Insulin' | 'Standard' = scannedTypeInput === 'insulin' ? 'Insulin' : 'Standard';

      const scannedVolumeInput = result.syringe?.volume;
      let selectedVolume: string;

      const targetVolumes = scannedType === 'Insulin' ? insulinVolumes : standardVolumes;
      const defaultVolume = scannedType === 'Insulin' ? '1 ml' : '3 ml';

      if (scannedVolumeInput && typeof scannedVolumeInput === 'string' && scannedVolumeInput !== 'unreadable') {
        const normalizedScan = scannedVolumeInput.replace(/\s+/g, '').toLowerCase();
        const foundVolume = targetVolumes.find(v => v.replace(/\s+/g, '').toLowerCase() === normalizedScan);
        selectedVolume = foundVolume || defaultVolume;
      } else {
        selectedVolume = defaultVolume;
      }

      setManualSyringe({
        type: scannedType,
        volume: selectedVolume,
      });
      // --- End Syringe Logic ---

      // Initialize manualVial with scanned data
      const concentration = (result.vial?.concentration && result.vial.concentration !== 'unreadable') ? result.vial.concentration : null;
      const totalAmount = (result.vial?.totalAmount && result.vial.totalAmount !== 'unreadable') ? result.vial.totalAmount : null;
      let amountOrConcentration = '';

      if (concentration) { amountOrConcentration = concentration; }
      else if (totalAmount) { amountOrConcentration = totalAmount; }

      setManualVial({
        substance: (result.vial?.substance && result.vial.substance !== 'unreadable') ? result.vial.substance : '',
        amountOrConcentration: amountOrConcentration,
      });
      // Reset calculation specific fields when new scan data comes in
      resetCalculationFields();
      setStep('result');

    } catch (error) {
      console.error('Error during capture or analysis:', error);
      if (error instanceof OpenAI.APIError) {
           console.error('OpenAI API Error Details:', { status: error.status, name: error.name, message: error.message });
           Alert.alert('API Error', `Could not analyze image: ${error.name}. Check API key and network.`);
      } else if (error instanceof Error) {
           Alert.alert('Error', `An unexpected error occurred: ${error.message}`);
      } else {
           Alert.alert('Error', 'An unexpected error occurred.');
      }
      setDetectionResult('error');
      setStep('result');
    } finally {
      setLoading(false);
    }
  };

  // Helper to reset calculation-related state
  const resetCalculationFields = () => {
    setDose('');
    setUnit('mg');
    setSolutionVolume('');
    setCalculatedVolume(null);
    setRecommendedMarking(null);
    setCalculationError(null);
  };

  // Helper to reset the entire form (including scanned data)
  const resetForm = () => {
    resetCalculationFields();
    setManualSyringe({ type: 'Standard', volume: '3 ml' });
    setManualVial({ substance: '', amountOrConcentration: '' });
    setDetectionResult(''); // Clear detection result as well
  };

  // ** MODIFIED: Calculate Dose with Safety Rounding **
  const calculateDose = () => {
    setCalculatedVolume(null);
    setRecommendedMarking(null);
    setCalculationError(null); // Clear previous errors

    const syringe = manualSyringe;
    const vial = manualVial;

    // Validate Dose Input
    if (!dose || dose.trim() === '' || isNaN(parseFloat(dose)) || parseFloat(dose) <= 0) {
      setCalculationError('Please enter a valid positive number for the dose amount.');
      return;
    }
    const doseValue = parseFloat(dose);

    // Validate Syringe Selection
    if (!syringe || !syringe.type || !syringe.volume) {
      setCalculationError('Syringe details are missing. Please select type and volume.');
      return;
    }
     // Check Syringe Options Validity
    const isValidSyringeOption = syringeOptions[syringe.type] && syringeOptions[syringe.type][syringe.volume];
    if (!isValidSyringeOption) {
        setCalculationError(`Cannot find markings for the selected ${syringe.type} ${syringe.volume} syringe.`);
        return;
    }
    const markingsString = syringeOptions[syringe.type][syringe.volume];

    // Validate Vial Information
    if (!vial.substance || vial.substance.trim() === '') {
        setCalculationError('Please enter the substance name.');
        return;
    }
    if (!vial.amountOrConcentration || vial.amountOrConcentration.trim() === '') {
        setCalculationError('Please enter the vial\'s total amount or concentration.');
        return;
    }

    // Determine Concentration
    let concentration: number;
    let concentrationUnit: string; // 'mg/ml' or 'units/ml'
    const volumeUnit = syringe.type === 'Insulin' ? 'units' : 'ml'; // Unit used on the syringe itself

    const concentrationMatch = vial.amountOrConcentration.match(/(\d+\.?\d*)\s*(mg\/ml|units\/ml)/i);
    if (concentrationMatch) {
      concentration = parseFloat(concentrationMatch[1]);
      concentrationUnit = concentrationMatch[2].toLowerCase();
      if (isNaN(concentration) || concentration <= 0) {
        setCalculationError('Invalid concentration value found. Please check vial details.');
        return;
      }
    } else { // Assume Total Amount requiring Reconstitution
      const totalAmountMatch = vial.amountOrConcentration.match(/(\d+\.?\d*)\s*(mg|units)/i);
      if (!totalAmountMatch) {
        setCalculationError('Vial amount format is unclear. Use "X mg", "X units", "X mg/ml", or "X units/ml".');
        return;
      }
      const totalAmount = parseFloat(totalAmountMatch[1]);
      const totalAmountUnit = totalAmountMatch[2].toLowerCase();

      if (isNaN(totalAmount) || totalAmount <= 0) {
        setCalculationError('Invalid total amount value found. Please check vial details.');
        return;
      }
      if (!solutionVolume || solutionVolume.trim() === '') {
        setCalculationError('This vial requires reconstitution. Please enter the volume of sterile water/solution added (in ml).');
        return;
      }
      const addedVolume = parseFloat(solutionVolume);
      if (isNaN(addedVolume) || addedVolume <= 0) {
        setCalculationError('Please enter a valid positive number for the solution volume in ml.');
        return;
      }
      concentration = totalAmount / addedVolume;
      concentrationUnit = totalAmountUnit + '/ml';
    }

    // Unit Consistency Check
    if (unit === 'mg' && concentrationUnit !== 'mg/ml') {
      setCalculationError(`Unit mismatch: Dose is in 'mg' but vial concentration is in '${concentrationUnit}'.`);
      return;
    }
    if (unit === 'units' && concentrationUnit !== 'units/ml') {
      setCalculationError(`Unit mismatch: Dose is in 'units' but vial concentration is in '${concentrationUnit}'.`);
      return;
    }

    // Calculate Required Volume (in ml)
    const requiredVolume = doseValue / concentration;
    if (isNaN(requiredVolume) || requiredVolume <= 0) {
        setCalculationError('Calculation resulted in an invalid volume. Please check inputs.');
        return;
    }
    setCalculatedVolume(requiredVolume); // Store the exact calculated volume

    // Check against Syringe Capacity
    const maxVolume = parseFloat(syringe.volume.replace(/[^0-9.]/g, ''));
    if (requiredVolume > maxVolume) {
      setCalculationError(
        `Required volume (${requiredVolume.toFixed(3)} ml) exceeds selected syringe capacity (${maxVolume} ml). Consider using a larger syringe or splitting the dose.`
      );
      setRecommendedMarking(null); // Can't recommend a mark if over capacity
      return;
    }

    // --- Find Recommended Marking (Prioritizing Rounding Down for Safety) ---
    const markings = markingsString.split(',').map(m => parseFloat(m)).sort((a, b) => a - b); // Ensure sorted ascending
    if (markings.length === 0 || markings.some(isNaN)) {
        setCalculationError("Error reading syringe markings. Cannot recommend a marking.");
        return;
    }

    let recommendedMarkingValue: number;
    let needsPrecisionWarning = false;
    let precisionMessage = '';

    // Find the highest marking that is less than or equal to the required volume
    const lowerOrEqualMarkings = markings.filter(m => m <= requiredVolume);

    if (lowerOrEqualMarkings.length > 0) {
        // Found markings less than or equal to the volume, take the highest one (closest from below)
        recommendedMarkingValue = Math.max(...lowerOrEqualMarkings);
        // Set warning flag if the chosen mark is not exactly the required volume (using tolerance)
        if (Math.abs(recommendedMarkingValue - requiredVolume) > 1e-9) {
             needsPrecisionWarning = true;
             precisionMessage = `Calculated volume is ${requiredVolume.toFixed(3)} ${volumeUnit}. To avoid exceeding the dose, the nearest mark at or below this volume is recommended: ${recommendedMarkingValue} ${volumeUnit}.`;
        } else {
            // Exactly matches a mark, no warning needed for rounding
            needsPrecisionWarning = false;
        }
    } else {
        // requiredVolume is less than the smallest marking
        recommendedMarkingValue = markings[0]; // Recommend the smallest marking
        needsPrecisionWarning = true; // It's definitely not exact
        precisionMessage = `Calculated volume (${requiredVolume.toFixed(3)} ${volumeUnit}) is less than the smallest syringe marking (${markings[0]} ${volumeUnit}). The smallest marking is recommended, but please verify if administering this slightly higher dose is appropriate, or if a different syringe is needed.`;
        // Issue a specific alert immediately for this case as it might require action
        Alert.alert('Volume Below Smallest Mark', precisionMessage);
    }

    setRecommendedMarking(recommendedMarkingValue.toString());

    // Display Precision Warning as an inline message OR alert if significant rounding occurred
    // (Using inline error state for less intrusive feedback unless below smallest mark)
    if (needsPrecisionWarning && lowerOrEqualMarkings.length > 0) { // Only show standard rounding warning if NOT below smallest mark (already alerted)
       setCalculationError(precisionMessage); // Use error state to display the note prominently
       // Optionally use Alert instead:
       // Alert.alert('Note on Precision', precisionMessage);
    } else if (!needsPrecisionWarning) {
       setCalculationError(null); // Clear any previous error/warning if exact match
    }
    // --- End Marking Calculation ---

  };


  // --- Handler Functions for UI ---
  const selectSyringeType = (type: 'Insulin' | 'Standard') => {
    const defaultVolume = type === 'Insulin' ? insulinVolumes[2] : standardVolumes[1]; // '1 ml' or '3 ml'
    setManualSyringe({ type, volume: defaultVolume });
    resetCalculationFields(); // Reset calculation when syringe changes significantly
  };

  const selectSyringeVolume = (volume: string) => {
    setManualSyringe(prev => ({ ...prev, volume }));
    resetCalculationFields(); // Reset calculation when syringe changes
  };

  // --- Render Functions --- (renderIntro, renderScan remain largely the same)

  const renderIntro = () => (
    <Animated.View entering={FadeIn.duration(400)} style={styles.content}>
      <Syringe color={'#6ee7b7'} size={64} style={styles.icon} />
      <Text style={styles.text}>
        Welcome! Let's calculate your dose accurately.
      </Text>
      <Text style={styles.subText}>
        You can scan your items or enter the details manually.
      </Text>
      <TouchableOpacity style={styles.button} onPress={() => setStep('scan')}>
        <CameraIcon color={'#fff'} size={20} style={{marginRight: 8}}/>
        <Text style={styles.buttonText}>Scan Items</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, styles.manualButton]} onPress={() => {
          resetForm();
          setStep('result');
          setDetectionResult({}); // Signify manual mode start
        }}>
        <Pill color={'#fff'} size={20} style={{marginRight: 8}}/>
        <Text style={styles.buttonText}>Enter Details Manually</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderScan = () => {
    // Basic permission/device checks
    if (hasPermission === null) return <View style={styles.content}><ActivityIndicator size="large" color="#fff" /><Text style={styles.text}>Requesting camera permission...</Text></View>;
    if (hasPermission === false) return <View style={styles.content}><Text style={styles.errorText}>Camera permission denied. Please enable it in your device settings.</Text><TouchableOpacity style={styles.backToHomeButton} onPress={() => setStep('intro')}><Home color="#fff" size={18} /><Text style={styles.buttonText}> Back</Text></TouchableOpacity></View>;
    if (devices.length === 0 && hasPermission) return <View style={styles.content}><Text style={styles.text}>No suitable camera devices found.</Text><TouchableOpacity style={styles.backToHomeButton} onPress={() => setStep('intro')}><Home color="#fff" size={18} /><Text style={styles.buttonText}> Back</Text></TouchableOpacity></View>;

    const device = devices.find(d => d.position === 'back') || devices[0];
    if (!device) return <View style={styles.content}><Text style={styles.text}>Camera initialization failed.</Text></View>;

    // Render Camera View
    return (
      <View style={styles.scanContainer}>
        {step === 'scan' && ( // Ensure camera is active only when needed
            <Camera
                ref={cameraRef}
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={true}
                photo={true}
             />
        )}
        <View style={styles.overlay}>
          <Text style={styles.scanText}>Position the syringe and vial clearly in the frame</Text>
          <TouchableOpacity style={styles.captureButton} onPress={captureImage} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <CameraIcon color={'#fff'} size={24} />}
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButtonScan} onPress={() => setStep('intro')} disabled={loading}>
            <Home color="#fff" size={18} />
            <Text style={styles.backButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
        {loading && ( // Full screen Loading Overlay
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Analyzing image...</Text>
          </View>
        )}
      </View>
    );
  };

  // Render Result/Input Screen
  const renderResult = () => {
    // Handle error state from scanning
    if (detectionResult === 'error') {
      return (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.errorText}>Analysis Failed</Text>
          <Text style={styles.text}>We couldn't analyze the image, or there was an error.</Text>
          <TouchableOpacity style={styles.button} onPress={() => setStep('scan')}>
            <RotateCcw color="#fff" size={18} style={{ marginRight: 8 }} />
            <Text style={styles.buttonText}>Try Scanning Again</Text>
          </TouchableOpacity>
           <TouchableOpacity style={[styles.button, styles.manualButton]} onPress={() => {
               resetForm();
               setStep('result');
               setDetectionResult({}); // Signify manual mode
            }}>
            <Pill color="#fff" size={18} style={{ marginRight: 8 }} />
            <Text style={styles.buttonText}>Enter Manually Instead</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backToHomeButton} onPress={() => setStep('intro')}>
            <Home color="#fff" size={18} style={{ marginRight: 8 }} />
            <Text style={styles.buttonText}>Back to Home</Text>
          </TouchableOpacity>
        </ScrollView>
      );
    }

    // Proceed with rendering inputs/results
    const syringeType = manualSyringe.type;
    const availableVolumes = syringeType === 'Insulin' ? insulinVolumes : standardVolumes;
    const isConcentrationProvided = /[\d\.]+\s*(mg\/ml|units\/ml)/i.test(manualVial.amountOrConcentration);
    const isTotalAmountProvided = /[\d\.]+\s*(mg|units)/i.test(manualVial.amountOrConcentration);
    const showSolutionVolumeInput = isTotalAmountProvided && !isConcentrationProvided && manualVial.amountOrConcentration.trim() !== '';
    const isValidSyringeOption = manualSyringe.type && manualSyringe.volume && syringeOptions[manualSyringe.type] && syringeOptions[manualSyringe.type][manualSyringe.volume];

    return (
      <ScrollView contentContainerStyle={styles.contentResult} keyboardShouldPersistTaps="handled">
        {/* Syringe Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>1. Syringe Details</Text>
          <Text style={styles.labelText}>Syringe Type:</Text>
          <View style={styles.presetContainer}>
            {/* Insulin/Standard Buttons */}
            <TouchableOpacity style={[styles.optionButton, syringeType === 'Insulin' && styles.selectedOption]} onPress={() => selectSyringeType('Insulin')}>
              <Text style={[styles.buttonText, syringeType === 'Insulin' && styles.selectedButtonText]}>Insulin</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.optionButton, syringeType === 'Standard' && styles.selectedOption]} onPress={() => selectSyringeType('Standard')}>
              <Text style={[styles.buttonText, syringeType === 'Standard' && styles.selectedButtonText]}>Standard</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.labelText}>Syringe Volume:</Text>
          <View style={styles.presetContainer}>
            {/* Volume Buttons */}
            {availableVolumes.map(volume => (
              <TouchableOpacity key={volume} style={[styles.optionButton, manualSyringe.volume === volume && styles.selectedOption]} onPress={() => selectSyringeVolume(volume)}>
                <Text style={[styles.buttonText, manualSyringe.volume === volume && styles.selectedButtonText]}>{volume}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {/* Display Markings */}
          {isValidSyringeOption ? (
            <Text style={styles.inferredMarkings}>
              Markings ({manualSyringe.type === 'Insulin' ? 'units' : 'ml'}): {syringeOptions[manualSyringe.type][manualSyringe.volume]}
            </Text>
          ) : (
            <Text style={[styles.inferredMarkings, { color: styles.errorTextResult.color, fontWeight: 'bold' }]}> Markings unavailable. </Text>
          )}
        </View>

        {/* Vial Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>2. Vial / Medication Details</Text>
          {/* Substance Input */}
          <TextInput style={styles.input} placeholder="Substance Name (e.g., BPC-157)" placeholderTextColor="#9ca3af" value={manualVial.substance} onChangeText={text => setManualVial(prev => ({ ...prev, substance: text }))} />
          {/* Amount/Concentration Input */}
          <TextInput style={styles.input} placeholder="Amount (e.g., 10 mg) or Conc. (e.g., 100 units/ml)" placeholderTextColor="#9ca3af" value={manualVial.amountOrConcentration} onChangeText={text => setManualVial(prev => ({ ...prev, amountOrConcentration: text }))} />
          {/* Reconstitution Section */}
          {showSolutionVolumeInput && (
            <View style={styles.reconstitutionSection}>
              <Text style={styles.labelTextBold}>Reconstitution Needed</Text>
              <Text style={styles.labelText}>Volume of Sterile Water / Solution Added:</Text>
              <View style={styles.presetContainer}>
                 {/* Preset Solution Volumes */}
                 {['1', '2', '3', '5'].map(ml => (
                   <TouchableOpacity key={ml + 'ml'} style={[styles.optionButtonSmall, solutionVolume === ml && styles.selectedOption]} onPress={() => setSolutionVolume(ml)} >
                     <Text style={[styles.buttonTextSmall, solutionVolume === ml && styles.selectedButtonText]}>{ml} ml</Text>
                   </TouchableOpacity>
                 ))}
              </View>
              {/* Custom Solution Volume Input */}
              <TextInput style={[styles.input, {marginTop: 10}]} placeholder="Or enter custom volume (ml)" placeholderTextColor="#9ca3af" value={solutionVolume} onChangeText={setSolutionVolume} keyboardType="numeric" />
            </View>
          )}
        </View>

        {/* Dose Input Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>3. Prescribed Dose</Text>
          <View style={styles.doseInputContainer}>
            {/* Dose Amount Input */}
            <TextInput style={styles.doseInput} value={dose} onChangeText={setDose} keyboardType="numeric" placeholder="Amount" placeholderTextColor="#9ca3af" />
            {/* Unit Selector */}
            <View style={styles.unitSelectorContainer}>
              <Text style={styles.labelText}>Unit:</Text>
              <View style={styles.radioContainer}>
                 <TouchableOpacity style={[styles.radioButton, unit === 'mg' && styles.radioButtonSelected]} onPress={() => setUnit('mg')} >
                   <Text style={[styles.radioText, unit === 'mg' && styles.radioTextSelected]}>mg</Text>
                 </TouchableOpacity>
                 <TouchableOpacity style={[styles.radioButton, unit === 'units' && styles.radioButtonSelected]} onPress={() => setUnit('units')} >
                   <Text style={[styles.radioText, unit === 'units' && styles.radioTextSelected]}>units</Text>
                 </TouchableOpacity>
              </View>
            </View>
          </View>
          {/* Calculate Button OR Recalculate/Clear Button */}
           {!recommendedMarking && ( // Show Calculate button only if no result yet
              <TouchableOpacity style={styles.calculateButton} onPress={calculateDose}>
                  <Text style={styles.buttonText}>Calculate Volume</Text>
              </TouchableOpacity>
           )}
            {/* Display Calculation Error / Precision Note */}
           {calculationError && <Text style={styles.errorTextResult}>{calculationError}</Text>}
        </View>


        {/* Instruction Card (shown when calculation is successful) */}
        {calculatedVolume !== null && recommendedMarking && !calculationError && ( // Also check for error presence
          <View style={styles.instructionCard}>
            <Text style={styles.instructionTitle}>✅ Dose Calculation Result</Text>
            <Text style={styles.instructionText}>
              For a {dose} {unit} dose of {manualVial.substance || 'this substance'}:
            </Text>
            <Text style={styles.instructionTextLarge}>
               Draw up to the {recommendedMarking} mark
            </Text>
             <Text style={styles.instructionNote}>
              ({manualSyringe.type === 'Insulin' ? 'Units mark on Insulin Syringe' : 'ml mark on Standard Syringe'})
            </Text>
            <Text style={styles.instructionNote}>
              (Exact calculated volume: {calculatedVolume.toFixed(3)} ml)
            </Text>
            {/* Allow recalculation or clearing */}
             <TouchableOpacity style={[styles.calculateButton, styles.recalculateButton]} onPress={calculateDose}>
                 <RotateCcw color="#fff" size={16} style={{ marginRight: 8 }} />
                 <Text style={styles.buttonText}>Re-Calculate</Text>
             </TouchableOpacity>
          </View>
        )}
         {/* Show Re-Calculate button even if there was an error, to allow fixing inputs */}
         {recommendedMarking === null && calculatedVolume !== null && calculationError && (
             <TouchableOpacity style={[styles.calculateButton, styles.recalculateButton, {marginTop: 10}]} onPress={calculateDose}>
                 <RotateCcw color="#fff" size={16} style={{ marginRight: 8 }} />
                 <Text style={styles.buttonText}>Re-Calculate</Text>
             </TouchableOpacity>
         )}


        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
           <TouchableOpacity style={[styles.actionButton, styles.scanNewButton]} onPress={() => setStep('scan')}>
            <CameraIcon color="#fff" size={18} style={{ marginRight: 8 }} />
            <Text style={styles.buttonText}>Scan New Items</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.resetButton]} onPress={resetForm}>
             <RotateCcw color="#fff" size={18} style={{ marginRight: 8 }} />
            <Text style={styles.buttonText}>Reset All Fields</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.homeButton]}
            onPress={() => { resetForm(); setStep('intro'); }}>
            <Home color="#fff" size={18} style={{ marginRight: 8 }} />
            <Text style={styles.buttonText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };


  // --- Main Return ---
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dose Calculator</Text>
         <Text style={styles.subtitle}>
          {step === 'intro' && 'Welcome'}
          {step === 'scan' && 'Scan Syringe & Vial'}
          {step === 'result' && (detectionResult === 'error' ? 'Error' : 'Enter Details & Calculate')}
        </Text>
      </View>
      {/* Conditional Rendering based on step */}
      {step === 'intro' && renderIntro()}
      {step === 'scan' && renderScan()}
      {step === 'result' && renderResult()}
    </View>
  );
}

// Styles (Includes previous refinements)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' /* slate-900 */ },
  header: { marginTop: 50, marginBottom: 20, paddingHorizontal: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#f1f5f9' /* slate-100 */, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#94a3b8' /* slate-400 */, textAlign: 'center', marginTop: 4 },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 20, padding: 20 },
  contentResult: { alignItems: 'center', gap: 16, paddingVertical: 16, paddingBottom: 40, paddingHorizontal: 8 },
  icon: { marginBottom: 16 },
  text: { fontSize: 16, color: '#e2e8f0' /* slate-200 */, textAlign: 'center', paddingHorizontal: 16 },
  subText: { fontSize: 14, color: '#94a3b8' /* slate-400 */, textAlign: 'center', paddingHorizontal: 16, marginTop: -10, marginBottom: 10 },
  labelText: { fontSize: 14, color: '#cbd5e1', marginTop: 10, marginBottom: 6, alignSelf: 'flex-start', marginLeft: '5%' },
  labelTextBold: { fontSize: 15, fontWeight: '600', color: '#f1f5f9', marginTop: 12, marginBottom: 8, textAlign: 'center' },
  errorText: { fontSize: 16, color: '#f87171', textAlign: 'center', padding: 10, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 8, width: '90%' },
  errorTextResult: { // For inline calculation errors/warnings
      fontSize: 14, color: '#fbbf24', // amber-400 for warnings
      textAlign: 'center', marginTop: 12, marginBottom: 4, paddingHorizontal: 10,
      backgroundColor: 'rgba(251, 191, 36, 0.1)', paddingVertical: 8, borderRadius: 6, width: '90%', alignSelf: 'center'
  },
  button: { backgroundColor: '#14b8a6', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5, width: '80%', minHeight: 50 },
  manualButton: { backgroundColor: '#6366f1' },
  card: { backgroundColor: '#1e293b', padding: 16, paddingBottom: 20, borderRadius: 12, width: '95%', alignSelf: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 3 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#f1f5f9', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#334155', paddingBottom: 6 },
  input: { backgroundColor: '#f8fafc', color: '#0f172a', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 6, width: '90%', alignSelf: 'center', fontSize: 16, marginVertical: 5, borderWidth: 1, borderColor: '#cbd5e1' },
  doseInput: { backgroundColor: '#f8fafc', color: '#0f172a', paddingVertical: 12, paddingHorizontal: 15, borderRadius: 6, width: '55%', textAlign: 'center', fontSize: 18, fontWeight: 'bold', borderWidth: 1, borderColor: '#cbd5e1' },
  unitSelectorContainer: { alignItems: 'center', marginTop: 0 },
  radioContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 8 },
  radioButton: { backgroundColor: '#475569', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginHorizontal: 5, borderWidth: 1, borderColor: '#475569' },
  radioButtonSelected: { backgroundColor: '#14b8a6', borderColor: '#5eead4' },
  radioText: { color: '#e2e8f0', fontSize: 14, fontWeight: '500' },
  radioTextSelected: { color: '#fff', fontWeight: 'bold' },
  doseInputContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', gap: 10, marginTop: 5 },
  calculateButton: { backgroundColor: '#0ea5e9', paddingVertical: 12, borderRadius: 8, marginTop: 16, width: '90%', alignSelf: 'center', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
  recalculateButton: { marginTop: 15, backgroundColor: '#f97316', width: '80%' },
  instructionCard: { backgroundColor: '#166534', padding: 16, borderRadius: 12, width: '95%', alignSelf: 'center', borderWidth: 1, borderColor: '#22c55e' },
  instructionTitle: { fontSize: 18, fontWeight: 'bold', color: '#f0fdf4', textAlign: 'center', marginBottom: 12 },
  instructionText: { fontSize: 15, color: '#dcfce7', textAlign: 'center', marginBottom: 8 },
  instructionTextLarge: { fontSize: 24, fontWeight: 'bold', color: '#ffffff', textAlign: 'center', marginVertical: 10, paddingVertical: 8, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 6 },
  instructionNote: { fontSize: 13, color: '#a7f3d0', textAlign: 'center', marginTop: 4, fontStyle: 'italic' },
  actionButtonsContainer: { width: '95%', alignSelf: 'center', marginTop: 16, marginBottom: 20, gap: 12 },
  actionButton: { paddingVertical: 14, borderRadius: 8, width: '100%', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
  backToHomeButton: { backgroundColor: '#475569', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, width: '80%' },
  scanNewButton: { backgroundColor: '#3b82f6' },
  resetButton: { backgroundColor: '#ef4444' },
  homeButton: { backgroundColor: '#64748b' },
  presetContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 4, marginBottom: 8, width: '90%', alignSelf: 'center' },
  optionButton: { backgroundColor: '#475569', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 6, minWidth: '28%', alignItems: 'center', borderWidth: 1, borderColor: 'transparent', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 3 },
  optionButtonSmall: { backgroundColor: '#475569', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 6, minWidth: '20%', alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  selectedOption: { backgroundColor: '#14b8a6', borderColor: '#5eead4' },
  buttonText: { color: '#f8fafc', fontSize: 16, fontWeight: '500', textAlign: 'center' },
  buttonTextSmall: { color: '#f8fafc', fontSize: 14, fontWeight: '500', textAlign: 'center' },
  selectedButtonText: { color: '#ffffff', fontWeight: 'bold' },
  reconstitutionSection: { marginTop: 15, paddingTop: 10, borderTopWidth: 1, borderColor: '#334155', alignItems: 'center' },
  scanContainer: { flex: 1, backgroundColor: '#000' },
  overlay: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: 40, paddingTop: 20, alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  scanText: { fontSize: 14, color: '#fff', textAlign: 'center', paddingHorizontal: 20, marginBottom: 15 },
  captureButton: { backgroundColor: '#ef4444', width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 6, borderWidth: 3, borderColor: 'rgba(255, 255, 255, 0.5)', marginBottom: 20 },
  backButtonScan: { position: 'absolute', left: 20, bottom: 55, flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: 'rgba(0, 0, 0, 0.6)', borderRadius: 20 },
  backButtonText: { color: '#fff', marginLeft: 5, fontSize: 14 },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: 10 },
  loadingText: { color: '#fff', marginTop: 15, fontSize: 16 },
  inferredMarkings: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginTop: 10, fontStyle: 'italic' },
});