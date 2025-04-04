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
import { Camera as CameraIcon, ArrowRight, Syringe, Pill, RotateCcw, Home, Check } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Animated, { FadeIn } from 'react-native-reanimated';
import OpenAI from 'openai';
import Constants from 'expo-constants';
import { ProgressBar } from 'react-native-paper';

const CameraIconComponent = CameraIcon;

const SyringeIllustration = ({ syringeType, syringeVolume, recommendedMarking, syringeOptions }) => {
  const unit = syringeType === 'Insulin' ? 'units' : 'ml';
  const markingsString = syringeOptions[syringeType]?.[syringeVolume];
  if (!markingsString) {
    console.warn(`Markings not found for syringe type "${syringeType}" volume "${syringeVolume}"`);
    return <Text style={styles.errorText}>Markings unavailable for this syringe.</Text>;
  }
  const markings = [0, ...markingsString.split(',').map(m => parseFloat(m))];
  const maxMarking = Math.max(...markings);
  const syringeWidth = 300;
  const markingPositions = markings.map(m => (m / maxMarking) * syringeWidth);
  const recommendedValue = parseFloat(recommendedMarking);
  const recommendedPosition = (recommendedValue / maxMarking) * syringeWidth;

  return (
    <View style={{ width: syringeWidth, height: 100, position: 'relative' }}>
      <View style={{ position: 'absolute', left: 0, top: 50, width: syringeWidth, height: 2, backgroundColor: '#000' }} />
      {markings.map((m, index) => (
        <View key={m} style={{ position: 'absolute', left: markingPositions[index], top: 40, width: 1, height: 20, backgroundColor: '#000' }} />
      ))}
      {markings.map((m, index) => (
        <Text key={`label-${m}`} style={{ position: 'absolute', left: markingPositions[index] - 10, top: 65, fontSize: 10 }}>
          {m} {unit}
        </Text>
      ))}
      {!isNaN(recommendedPosition) && recommendedPosition >= 0 && recommendedPosition <= syringeWidth && (
        <View style={{ position: 'absolute', left: recommendedPosition, top: 30, width: 2, height: 40, backgroundColor: 'red' }} />
      )}
    </View>
  );
};

type ManualEntryStep = 'dose' | 'medicationSource' | 'concentrationInput' | 'totalAmountInput' | 'reconstitution' | 'syringe' | 'finalResult';
type MedicationInputType = 'concentration' | 'totalAmount' | null;

export default function NewDoseScreen() {
  const [screenStep, setScreenStep] = useState<'intro' | 'scan' | 'manualEntry'>('intro');
  const [permission, requestPermission] = useCameraPermissions();
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const cameraRef = useRef(null);
  const [manualStep, setManualStep] = useState<ManualEntryStep>('dose');
  const [dose, setDose] = useState<string>('');
  const [unit, setUnit] = useState<'mg' | 'units'>('mg');
  const [substanceName, setSubstanceName] = useState<string>('');
  const [medicationInputType, setMedicationInputType] = useState<MedicationInputType>(null);
  const [concentrationAmount, setConcentrationAmount] = useState<string>('');
  const [concentrationUnit, setConcentrationUnit] = useState<'mg/ml' | 'units/ml'>('mg/ml');
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [solutionVolume, setSolutionVolume] = useState<string>('');
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
  const insulinVolumes = Object.keys(syringeOptions.Insulin);
  const standardVolumes = Object.keys(syringeOptions.Standard);

  const openai = new OpenAI({
    apiKey: Constants.expoConfig?.extra?.OPENAI_API_KEY || '',
    dangerouslyAllowBrowser: true,
  });

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

  const resetFullForm = (startStep: ManualEntryStep = 'dose') => {
    setDose('');
    setUnit('mg');
    setSubstanceName('');
    setMedicationInputType(null);
    setConcentrationAmount('');
    setConcentrationUnit('mg/ml');
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
    setSubstanceNameHint(null);
    setConcentrationHint(null);
    setTotalAmountHint(null);
    setManualStep(startStep);
  };

  const captureImage = async () => {
    if (!cameraRef.current) {
      Alert.alert("Camera Error", "Camera not ready.");
      return;
    }
    if (!openai.apiKey) {
      Alert.alert("Config Error", "OpenAI Key missing.");
      return;
    }

    setScanLoading(true);
    setScanError(null);
    setSubstanceName('');
    setSubstanceNameHint(null);
    setConcentrationAmount('');
    setConcentrationHint(null);
    setTotalAmount('');
    setTotalAmountHint(null);
    setMedicationInputType(null);

    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.8 });
      const base64Image = photo.base64;
      if (!base64Image) throw new Error("Failed to get base64 data from image.");

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Analyze this image for syringe and vial details. Provide JSON: { "syringe": { "type": "Insulin or Standard", "volume": "e.g., \'1 ml\'", "markings": "visible numbers/text" }, "vial": { "substance": "name", "totalAmount": "e.g., \'20 mg\'", "concentration": "e.g., \'100 units/ml\'", "expiration": "date" } }. Use null if absent, "unreadable" if illegible.' },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } },
            ],
          },
        ],
      });

      const content = response.choices[0].message.content || '{}';
      const result = JSON.parse(content.trim().replace(/^```json|```$/g, ''));
      if (!result.syringe || !result.vial) throw new Error("Invalid JSON structure.");

      const scannedType = result.syringe.type === 'Insulin' ? 'Insulin' : 'Standard';
      const targetVolumes = scannedType === 'Insulin' ? insulinVolumes : standardVolumes;
      const defaultVolume = scannedType === 'Insulin' ? '1 ml' : '3 ml';
      const scannedVolume = result.syringe.volume;
      let selectedVolume = defaultVolume;
      if (scannedVolume && typeof scannedVolume === 'string' && scannedVolume !== 'unreadable') {
        const normalizedScan = scannedVolume.replace(/\s+/g, '').toLowerCase();
        selectedVolume = targetVolumes.find(v => v.replace(/\s+/g, '').toLowerCase() === normalizedScan) || defaultVolume;
      }
      setManualSyringe({ type: scannedType, volume: selectedVolume });

      if (result.vial.substance && result.vial.substance !== 'unreadable') {
        setSubstanceName(result.vial.substance);
        setSubstanceNameHint("Detected from vial");
      }

      const concentrationStr = result.vial.concentration;
      const totalAmountStr = result.vial.totalAmount;
      if (concentrationStr && concentrationStr !== 'unreadable') {
        const concMatch = concentrationStr.match(/([\d.]+)\s*(\w+\/\w+)/);
        if (concMatch) {
          setConcentrationAmount(concMatch[1]);
          setConcentrationUnit(concMatch[2].toLowerCase() as 'mg/ml' | 'units/ml');
          setMedicationInputType('concentration');
          setConcentrationHint(`Detected: ${concentrationStr}`);
        }
      } else if (totalAmountStr && totalAmountStr !== 'unreadable') {
        const amountMatch = totalAmountStr.match(/([\d.]+)\s*(\w+)/);
        if (amountMatch) {
          setTotalAmount(amountMatch[1]);
          setMedicationInputType('totalAmount');
          setTotalAmountHint(`Detected: ${totalAmountStr}`);
        }
      }

      setScreenStep('manualEntry');
      setManualStep('dose');
    } catch (error) {
      console.error('Capture/Analysis Error:', error);
      setScanError(error instanceof Error ? error.message : 'An unexpected error occurred.');
    } finally {
      setScanLoading(false);
    }
  };

  const calculateDoseVolumeAndMarking = () => {
    setCalculatedVolume(null);
    setRecommendedMarking(null);
    setCalculationError(null);

    if (!doseValue || doseValue <= 0) {
      setCalculationError('Invalid dose value.');
      return;
    }
    if (!concentration || concentration <= 0) {
      setCalculationError('Invalid concentration.');
      return;
    }
    if (!manualSyringe.type || !manualSyringe.volume || !syringeOptions[manualSyringe.type]?.[manualSyringe.volume]) {
      setCalculationError('Invalid syringe selection.');
      return;
    }

    const requiredVolume = doseValue / concentration;
    setCalculatedVolume(requiredVolume);
    const maxVolume = parseFloat(manualSyringe.volume);
    if (requiredVolume > maxVolume) {
      setCalculationError(`Required volume (${requiredVolume.toFixed(3)} ml) exceeds syringe capacity (${maxVolume} ml).`);
      return;
    }

    const markings = syringeOptions[manualSyringe.type][manualSyringe.volume].split(',').map(Number);
    const markingScaleValue = manualSyringe.type === 'Insulin' ? doseValue : requiredVolume;
    setRecommendedMarking(markingScaleValue.toString());

    if (!markings.some(m => Math.abs(m - markingScaleValue) < 0.001)) {
      const nearestBelow = Math.max(...markings.filter(m => m <= markingScaleValue), 0);
      const nearestAbove = Math.min(...markings.filter(m => m >= markingScaleValue), markings[markings.length - 1]);
      setCalculationError(`Marking (${markingScaleValue.toFixed(3)}) is between ${nearestBelow} and ${nearestAbove}. Estimate carefully.`);
    }
  };

  const handleNextDose = () => {
    const parsedDose = parseFloat(dose);
    if (!parsedDose || parsedDose <= 0) {
      setFormError('Enter a valid dose.');
      return;
    }
    setDoseValue(parsedDose);
    setConcentrationUnit(unit === 'mg' ? 'mg/ml' : 'units/ml');
    setManualStep('medicationSource');
  };

  const handleNextMedicationSource = () => {
    if (!medicationInputType) {
      setFormError('Select medication input type.');
      return;
    }
    setManualStep(medicationInputType === 'concentration' ? 'concentrationInput' : 'totalAmountInput');
  };

  const handleNextConcentrationInput = () => {
    const parsedConc = parseFloat(concentrationAmount);
    if (!parsedConc || parsedConc <= 0) {
      setFormError('Enter a valid concentration.');
      return;
    }
    setConcentration(parsedConc);
    setManualStep('syringe');
  };

  const handleNextTotalAmountInput = () => {
    const parsedAmount = parseFloat(totalAmount);
    if (!parsedAmount || parsedAmount <= 0) {
      setFormError('Enter a valid total amount.');
      return;
    }
    setManualStep('reconstitution');
  };

  const handleNextReconstitution = () => {
    const parsedSolutionVol = parseFloat(solutionVolume);
    if (!parsedSolutionVol || parsedSolutionVol <= 0) {
      setFormError('Enter a valid volume.');
      return;
    }
    const parsedTotal = parseFloat(totalAmount);
    setConcentration(parsedTotal / parsedSolutionVol);
    setManualStep('syringe');
  };

  const handleCalculateFinal = () => {
    calculateDoseVolumeAndMarking();
    setManualStep('finalResult');
  };

  const handleBack = () => {
    setFormError(null);
    setCalculationError(null);
    if (manualStep === 'finalResult' || manualStep === 'syringe') {
      setCalculatedVolume(null);
      setRecommendedMarking(null);
    }
    const prevSteps: { [key in ManualEntryStep]?: ManualEntryStep } = {
      finalResult: 'syringe',
      syringe: medicationInputType === 'concentration' ? 'concentrationInput' : 'reconstitution',
      reconstitution: 'totalAmountInput',
      concentrationInput: 'medicationSource',
      totalAmountInput: 'medicationSource',
      medicationSource: 'dose',
    };
    if (manualStep === 'dose') {
      setScreenStep('intro');
      resetFullForm();
    } else {
      setManualStep(prevSteps[manualStep] || 'dose');
    }
  };

  const handleStartOver = () => {
    Alert.alert("Start Over?", "Clear all data?", [
      { text: "Cancel", style: "cancel" },
      { text: "Yes", onPress: () => resetFullForm('dose'), style: 'destructive' },
    ]);
  };

  const handleGoHome = () => {
    if (screenStep === 'manualEntry' && dose) {
      Alert.alert("Go Home?", "Discard calculation?", [
        { text: "Cancel", style: "cancel" },
        { text: "Yes", onPress: () => { resetFullForm(); setScreenStep('intro'); }, style: 'destructive' },
      ]);
    } else {
      resetFullForm();
      setScreenStep('intro');
    }
  };

  const renderIntro = () => (
    <Animated.View entering={FadeIn.duration(400)} style={styles.content}>
      <CameraIconComponent color="#6ee7b7" size={64} style={styles.icon} />
      <Text style={styles.title}>Dose Calculator</Text>
      <Text style={styles.text}>Calculate your medication dose using scanning or manual entry.</Text>
      <TouchableOpacity style={styles.button} onPress={() => setScreenStep('scan')}>
        <CameraIconComponent color="#fff" size={20} style={{ marginRight: 8 }} />
        <Text style={styles.buttonText}>Scan Items</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, styles.manualButton]} onPress={() => { resetFullForm('dose'); setScreenStep('manualEntry'); }}>
        <Pill color="#fff" size={20} style={{ marginRight: 8 }} />
        <Text style={styles.buttonText}>Enter Manually</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderScan = () => {
    if (!permission) {
      return <View style={styles.center}><ActivityIndicator size="large" color="#6ee7b7" /></View>;
    }
    if (!permission.granted) {
      return (
        <View style={styles.center}>
          <Text style={styles.errorText}>Camera permission required.</Text>
          <TouchableOpacity style={styles.backToHomeButton} onPress={requestPermission}>
            <Text style={styles.buttonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backToHomeButton} onPress={handleGoHome}>
            <Home color="#fff" size={18} />
            <Text style={styles.buttonText}> Go Home</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.scanContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing="back" />
        <View style={styles.overlayBottom}>
          {scanError && <Text style={styles.errorText}>{scanError}</Text>}
          <Text style={styles.scanText}>Position syringe & vial in frame</Text>
          <TouchableOpacity style={styles.captureButton} onPress={captureImage} disabled={scanLoading}>
            {scanLoading ? <ActivityIndicator color="#fff" /> : <CameraIconComponent color="#fff" size={24} />}
          </TouchableOpacity>
          <View style={styles.bottomButtons}>
            <TouchableOpacity style={styles.manualEntryButtonScan} onPress={() => { resetFullForm('dose'); setScreenStep('manualEntry'); }} disabled={scanLoading}>
              <Pill color="#fff" size={18} />
              <Text style={styles.backButtonText}> Manual Entry</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.backButtonScan} onPress={handleGoHome} disabled={scanLoading}>
              <Home color="#fff" size={18} />
              <Text style={styles.backButtonText}> Cancel</Text>
            </TouchableOpacity>
          </View>
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

  const renderManualEntry = () => {
    const steps: ManualEntryStep[] = ['dose', 'medicationSource', ...(medicationInputType === 'concentration' ? ['concentrationInput'] : medicationInputType === 'totalAmount' ? ['totalAmountInput', 'reconstitution'] : []), ...(medicationInputType ? ['syringe', 'finalResult'] : [])];
    const currentStepIndex = steps.indexOf(manualStep);
    const progress = steps.length > 1 ? (currentStepIndex + 1) / steps.length : 0;

    const renderStepContent = () => {
      switch (manualStep) {
        case 'dose':
          return (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Step 1: Prescribed Dose</Text>
              <Text style={styles.labelText}>Dose Amount:</Text>
              <TextInput style={styles.inputLarge} value={dose} onChangeText={setDose} keyboardType="numeric" placeholder="e.g., 100" placeholderTextColor="#9ca3af" />
              <Text style={styles.labelText}>Unit:</Text>
              <View style={styles.radioContainerHorizontal}>
                <TouchableOpacity style={[styles.radioButtonFlex, unit === 'mg' && styles.radioButtonSelected]} onPress={() => setUnit('mg')}>
                  <Text style={[styles.radioText, unit === 'mg' && styles.radioTextSelected]}>mg</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.radioButtonFlex, unit === 'units' && styles.radioButtonSelected]} onPress={() => setUnit('units')}>
                  <Text style={[styles.radioText, unit === 'units' && styles.radioTextSelected]}>units</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        case 'medicationSource':
          return (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Step 2: Medication Details</Text>
              <Text style={styles.labelText}>Substance Name (Optional):</Text>
              <TextInput style={styles.input} placeholder="e.g., Insulin" value={substanceName} onChangeText={text => { setSubstanceName(text); setSubstanceNameHint(null); }} />
              {substanceNameHint && <Text style={styles.helperHint}>{substanceNameHint}</Text>}
              <Text style={styles.labelText}>Medication Amount Type:</Text>
              <View style={styles.radioContainerVertical}>
                <TouchableOpacity style={[styles.radioButtonFlexWide, medicationInputType === 'concentration' && styles.radioButtonSelected]} onPress={() => setMedicationInputType('concentration')}>
                  <Text style={[styles.radioText, medicationInputType === 'concentration' && styles.radioTextSelected]}>Concentration (e.g., 10 mg/ml)</Text>
                  {medicationInputType === 'concentration' && concentrationHint && <Text style={styles.helperHintRadio}>{concentrationHint}</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.radioButtonFlexWide, medicationInputType === 'totalAmount' && styles.radioButtonSelected]} onPress={() => setMedicationInputType('totalAmount')}>
                  <Text style={[styles.radioText, medicationInputType === 'totalAmount' && styles.radioTextSelected]}>Total Amount (e.g., 50 mg)</Text>
                  {medicationInputType === 'totalAmount' && totalAmountHint && <Text style={styles.helperHintRadio}>{totalAmountHint}</Text>}
                </TouchableOpacity>
              </View>
            </View>
          );
        case 'concentrationInput':
          return (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Step 2a: Enter Concentration</Text>
              <Text style={styles.labelText}>Concentration Amount:</Text>
              <TextInput style={styles.inputLarge} value={concentrationAmount} onChangeText={text => { setConcentrationAmount(text); setConcentrationHint(null); }} keyboardType="numeric" placeholder="e.g., 100" placeholderTextColor="#9ca3af" />
              {concentrationHint && !concentrationAmount && <Text style={styles.helperHint}>{concentrationHint}</Text>}
              <Text style={styles.labelText}>Unit:</Text>
              <View style={styles.unitDisplayBox}><Text style={styles.unitDisplayText}>{concentrationUnit}</Text></View>
            </View>
          );
        case 'totalAmountInput':
          return (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Step 2b: Enter Total Amount</Text>
              <Text style={styles.labelText}>Total Amount ({unit}):</Text>
              <TextInput style={styles.inputLarge} value={totalAmount} onChangeText={text => { setTotalAmount(text); setTotalAmountHint(null); }} keyboardType="numeric" placeholder="e.g., 50" placeholderTextColor="#9ca3af" />
              {totalAmountHint && !totalAmount && <Text style={styles.helperHint}>{totalAmountHint}</Text>}
            </View>
          );
        case 'reconstitution':
          return (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Step 2c: Reconstitution</Text>
              <Text style={styles.labelTextBold}>Liquid Volume (ml):</Text>
              <View style={styles.presetContainer}>
                {['1', '2', '3', '5', '10'].map(ml => (
                  <TouchableOpacity key={ml} style={[styles.optionButtonSmall, solutionVolume === ml && styles.selectedOption]} onPress={() => setSolutionVolume(ml)}>
                    <Text style={[styles.buttonTextSmall, solutionVolume === ml && styles.selectedButtonText]}>{ml} ml</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput style={styles.input} value={solutionVolume} onChangeText={setSolutionVolume} keyboardType="numeric" placeholder="Custom volume (ml)" placeholderTextColor="#9ca3af" />
            </View>
          );
        case 'syringe':
          const availableVolumes = manualSyringe.type === 'Insulin' ? insulinVolumes : standardVolumes;
          useEffect(() => {
            if (!availableVolumes.includes(manualSyringe.volume)) {
              setManualSyringe(prev => ({ ...prev, volume: manualSyringe.type === 'Insulin' ? '1 ml' : '3 ml' }));
            }
          }, [manualSyringe.type]);
          return (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Step 3: Syringe Details</Text>
              <Text style={styles.labelText}>Syringe Type:</Text>
              <View style={styles.radioContainerHorizontal}>
                <TouchableOpacity style={[styles.radioButtonFlex, manualSyringe.type === 'Insulin' && styles.radioButtonSelected]} onPress={() => setManualSyringe(prev => ({ ...prev, type: 'Insulin' }))}>
                  <Syringe color={manualSyringe.type === 'Insulin' ? '#fff' : '#4ade80'} size={16} style={{ marginRight: 5 }} />
                  <Text style={[styles.radioText, manualSyringe.type === 'Insulin' && styles.radioTextSelected]}>Insulin</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.radioButtonFlex, manualSyringe.type === 'Standard' && styles.radioButtonSelected]} onPress={() => setManualSyringe(prev => ({ ...prev, type: 'Standard' }))}>
                  <Syringe color={manualSyringe.type === 'Standard' ? '#fff' : '#4ade80'} size={16} style={{ marginRight: 5 }} />
                  <Text style={[styles.radioText, manualSyringe.type === 'Standard' && styles.radioTextSelected]}>Standard</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.labelText}>Syringe Volume:</Text>
              <View style={styles.presetContainer}>
                {availableVolumes.map(volume => (
                  <TouchableOpacity key={volume} style={[styles.optionButton, manualSyringe.volume === volume && styles.selectedOption]} onPress={() => setManualSyringe(prev => ({ ...prev, volume }))}>
                    <Text style={[styles.buttonTextSmall, manualSyringe.volume === volume && styles.selectedButtonText]}>{volume}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        case 'finalResult':
          return (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Step 4: Calculation Result</Text>
              {calculationError && <View style={styles.errorBox}><Text style={styles.errorTextResult}>{calculationError}</Text></View>}
              {calculatedVolume && !calculationError?.includes('exceeds') && (
                <View style={styles.resultBox}>
                  <Syringe color="#10b981" size={24} />
                  <Text style={styles.resultTextHighlight}>{calculatedVolume.toFixed(3)} ml</Text>
                </View>
              )}
              {calculatedVolume && (
                <Text style={styles.resultDetailText}>
                  Volume for {doseValue} {unit} (Conc: {concentration?.toFixed(2)} {concentrationUnit}).
                </Text>
              )}
              {recommendedMarking && (
                <>
                  <Text style={styles.labelTextBold}>Draw To:</Text>
                  <SyringeIllustration syringeType={manualSyringe.type} syringeVolume={manualSyringe.volume} recommendedMarking={recommendedMarking} syringeOptions={syringeOptions} />
                  <Text style={[styles.resultDetailText, { textAlign: 'center' }]}>
                    Draw to <Text style={{ fontWeight: 'bold' }}>{parseFloat(recommendedMarking).toFixed(3)} {manualSyringe.type === 'Insulin' ? 'unit' : 'ml'}</Text> on {manualSyringe.volume} syringe.
                  </Text>
                </>
              )}
              <View style={styles.finalActions}>
                <TouchableOpacity style={styles.startOverButton} onPress={handleStartOver}>
                  <RotateCcw color="#ef4444" size={18} />
                  <Text style={styles.startOverButtonText}>Start Over</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.goHomeButton} onPress={handleGoHome}>
                  <Home color="#3b82f6" size={18} />
                  <Text style={styles.goHomeButtonText}>Go Home</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        default:
          return <Text>Unknown Step</Text>;
      }
    };

    return (
      <ScrollView style={styles.manualEntryContainer} contentContainerStyle={{ paddingBottom: 150 }}>
        {manualStep !== 'finalResult' && steps.length > 1 && (
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>Step {currentStepIndex + 1} of {steps.length}</Text>
            <ProgressBar progress={progress} color="#6ee7b7" style={styles.progressBar} />
          </View>
        )}
        <Animated.View entering={FadeIn.duration(300)}>{renderStepContent()}</Animated.View>
        {formError && <View style={styles.errorBoxForm}><Text style={styles.errorTextForm}>{formError}</Text></View>}
        <View style={styles.navigationButtons}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            {manualStep === 'dose' ? <Home color="#4b5563" size={18} /> : <ArrowRight color="#4b5563" size={18} style={{ transform: [{ scaleX: -1 }] }} />}
            <Text style={styles.backButtonNavText}>{manualStep === 'dose' ? 'Home' : 'Back'}</Text>
          </TouchableOpacity>
          {manualStep !== 'finalResult' && (
            <TouchableOpacity
              style={[styles.nextButton, (!dose || (manualStep === 'medicationSource' && !medicationInputType) || (manualStep === 'concentrationInput' && !concentrationAmount) || (manualStep === 'totalAmountInput' && !totalAmount) || (manualStep === 'reconstitution' && !solutionVolume)) && styles.disabledButton]}
              onPress={() => {
                if (manualStep === 'dose') handleNextDose();
                else if (manualStep === 'medicationSource') handleNextMedicationSource();
                else if (manualStep === 'concentrationInput') handleNextConcentrationInput();
                else if (manualStep === 'totalAmountInput') handleNextTotalAmountInput();
                else if (manualStep === 'reconstitution') handleNextReconstitution();
                else if (manualStep === 'syringe') handleCalculateFinal();
              }}
              disabled={!dose || (manualStep === 'medicationSource' && !medicationInputType) || (manualStep === 'concentrationInput' && !concentrationAmount) || (manualStep === 'totalAmountInput' && !totalAmount) || (manualStep === 'reconstitution' && !solutionVolume)}
            >
              <Text style={styles.nextButtonText}>{manualStep === 'syringe' ? 'Calculate' : 'Next'}</Text>
              {manualStep === 'syringe' ? <Check color="#fff" size={18} /> : <ArrowRight color="#fff" size={18} />}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {screenStep === 'intro' && renderIntro()}
      {screenStep === 'scan' && renderScan()}
      {screenStep === 'manualEntry' && renderManualEntry()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#1f2937' },
  scanContainer: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  overlayBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center' },
  scanText: { color: '#fff', fontSize: 16, marginBottom: 15, textAlign: 'center' },
  captureButton: { backgroundColor: '#4ade80', borderRadius: 50, width: 70, height: 70, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 3, borderColor: '#fff' },
  bottomButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  manualEntryButtonScan: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 15, backgroundColor: '#3b82f6', borderRadius: 8 },
  backButtonScan: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 15, backgroundColor: '#ef4444', borderRadius: 8 },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#fff', marginTop: 10, fontSize: 16 },
  icon: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#14532d', marginBottom: 10 },
  text: { fontSize: 16, color: '#3f3f46', textAlign: 'center', marginBottom: 30, lineHeight: 24 },
  button: { flexDirection: 'row', backgroundColor: '#4ade80', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 15, width: '80%' },
  manualButton: { backgroundColor: '#2563eb' },
  backToHomeButton: { flexDirection: 'row', backgroundColor: '#3b82f6', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  buttonTextSmall: { color: '#374151', fontSize: 14 },
  selectedButtonText: { color: '#ffffff', fontWeight: 'bold' },
  manualEntryContainer: { flex: 1, padding: 15 },
  progressContainer: { marginBottom: 15 },
  progressBar: { height: 8, borderRadius: 4 },
  progressText: { fontSize: 12, color: '#4b5563', textAlign: 'right', marginBottom: 4 },
  card: { backgroundColor: '#ffffff', borderRadius: 12, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 3 },
  cardTitle: { fontSize: 20, fontWeight: 'bold', color: '#166534', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#d1d5db', paddingBottom: 8 },
  labelText: { fontSize: 14, color: '#4b5563', marginBottom: 8 },
  labelTextBold: { fontSize: 16, color: '#374151', fontWeight: 'bold', marginBottom: 8 },
  input: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6, paddingVertical: 10, paddingHorizontal: 12, fontSize: 16, marginBottom: 5 },
  inputLarge: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6, paddingVertical: 12, paddingHorizontal: 12, fontSize: 20, marginBottom: 10, textAlign: 'center' },
  inputHelperText: { fontSize: 12, color: '#6b7280', marginTop: 5 },
  helperHint: { fontSize: 12, fontStyle: 'italic', color: '#16a34a', marginBottom: 10 },
  helperHintRadio: { fontSize: 11, fontStyle: 'italic', color: '#ffffff', marginTop: 4 },
  radioContainerHorizontal: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  radioContainerVertical: { flexDirection: 'column', marginBottom: 10 },
  radioButtonFlex: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flex: 1, borderWidth: 1, borderColor: '#9ca3af', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 10, marginHorizontal: 5 },
  radioButtonFlexWide: { flexDirection: 'column', alignItems: 'flex-start', borderWidth: 1, borderColor: '#9ca3af', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 15, marginBottom: 10 },
  radioButtonSelected: { backgroundColor: '#4ade80', borderColor: '#4ade80' },
  radioText: { fontSize: 14, color: '#374151' },
  radioTextSelected: { color: '#ffffff', fontWeight: 'bold' },
  unitDisplayBox: { backgroundColor: '#e5e7eb', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 6, alignItems: 'center', marginBottom: 10 },
  unitDisplayText: { fontSize: 16, fontWeight: 'bold', color: '#4b5563' },
  presetContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', marginBottom: 10 },
  optionButton: { backgroundColor: '#e5e7eb', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 15, marginRight: 10, marginBottom: 10, borderWidth: 1, borderColor: '#d1d5db' },
  optionButtonSmall: { backgroundColor: '#e5e7eb', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: '#d1d5db' },
  selectedOption: { backgroundColor: '#4ade80', borderColor: '#4ade80' },
  navigationButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, paddingHorizontal: 5, position: 'absolute', bottom: 15, left: 15, right: 15, backgroundColor: '#f0fdf4', paddingTop: 10 },
  backButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8, backgroundColor: '#e5e7eb' },
  backButtonNavText: { color: '#4b5563', fontSize: 16, marginLeft: 5 },
  nextButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, backgroundColor: '#22c55e' },
  nextButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginRight: 5 },
  disabledButton: { backgroundColor: '#9ca3af' },
  errorBox: { backgroundColor: '#fee2e2', padding: 15, borderRadius: 8, marginBottom: 15, borderLeftWidth: 4, borderLeftColor: '#ef4444' },
  errorBoxForm: { backgroundColor: '#fee2e2', padding: 10, borderRadius: 6, marginTop: 15, marginHorizontal: 5, borderLeftWidth: 4, borderLeftColor: '#ef4444' },
  errorTextResult: { color: '#b91c1c', fontSize: 14 },
  errorTextForm: { color: '#b91c1c', fontSize: 14, fontWeight: 'bold' },
  resultBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#dcfce7', paddingVertical: 15, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#86efac' },
  resultTextHighlight: { fontSize: 24, fontWeight: 'bold', color: '#15803d', marginLeft: 10 },
  resultDetailText: { fontSize: 14, color: '#4b5563', textAlign: 'center', lineHeight: 20, marginBottom: 15 },
  finalActions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 25, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  startOverButton: { flexDirection: 'row', alignItems: 'center', padding: 10 },
  startOverButtonText: { color: '#ef4444', fontSize: 15, marginLeft: 5 },
  goHomeButton: { flexDirection: 'row', alignItems: 'center', padding: 10 },
  goHomeButtonText: { color: '#3b82f6', fontSize: 15, marginLeft: 5 },
  errorText: { fontSize: 16, color: '#fecaca', textAlign: 'center', marginBottom: 20 },
  backButtonText: { color: '#fff', fontSize: 16, marginLeft: 5 },
});