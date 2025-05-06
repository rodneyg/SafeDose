import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';
import { insulinVolumes, standardVolumes, MAX_FILE_SIZE } from '../lib/utils';
import { CameraView } from 'expo-camera';

interface CameraRef {
  takePictureAsync: (options: { base64: boolean; quality: number }) => Promise<{ base64?: string; uri?: string } | undefined>;
}

interface CaptureAndProcessImageProps {
  cameraRef: React.RefObject<CameraRef>;
  permission: { status: string } | null;
  openai: any; // OpenAI client instance
  isMobileWeb: boolean;
  setIsProcessing: (value: boolean) => void;
  setProcessingMessage: (message: string) => void;
  setScanError: (error: string | null) => void;
  setScreenStep: (step: 'intro' | 'scan' | 'manualEntry') => void;
  setManualStep: (step: 'dose' | 'medicationSource' | 'concentrationInput' | 'totalAmountInput' | 'reconstitution' | 'syringe' | 'finalResult') => void;
  setManualSyringe: (syringe: { type: 'Insulin' | 'Standard'; volume: string }) => void;
  setSyringeHint: (hint: string | null) => void;
  setSubstanceName: (name: string) => void;
  setSubstanceNameHint: (hint: string | null) => void;
  setConcentrationAmount: (amount: string) => void;
  setConcentrationUnit: (unit: 'mg/ml' | 'mcg/ml' | 'units/ml') => void;
  setConcentrationHint: (hint: string | null) => void;
  setTotalAmount: (amount: string) => void;
  setTotalAmountHint: (hint: string | null) => void;
  setMedicationInputType: (type: 'concentration' | 'totalAmount' | null) => void;
  resetFullForm: (startStep?: 'dose' | 'medicationSource' | 'concentrationInput' | 'totalAmountInput' | 'reconstitution' | 'syringe' | 'finalResult') => void;
}

export async function captureAndProcessImage({
  cameraRef,
  permission,
  openai,
  isMobileWeb,
  setIsProcessing,
  setProcessingMessage,
  setScanError,
  setScreenStep,
  setManualStep,
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
}: CaptureAndProcessImageProps) {
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
    let base64Image: string | undefined;
    let mimeType: string;

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

      const result = await readerPromise;
      base64Image = result.base64Image;
      mimeType = result.mimeType;
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

      base64Image = photo.base64;
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

      mimeType = '';
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
    }

    setProcessingMessage('Analyzing image with AI...');
    console.log('[Process] Starting image processing');

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
    if (typeof setManualStep === 'function') {
      setManualStep('dose');
    } else {
      console.warn('[Process] setManualStep is not a function, skipping step update');
    }
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
    if (typeof setManualStep === 'function') {
      setManualStep('dose');
    } else {
      console.warn('[Process] setManualStep is not a function, skipping step update');
    }
    Alert.alert(
      'Warning',
      `Failed to analyze image: ${message}. Proceeding to manual entry with default values.`,
      [
        { text: 'OK', onPress: () => {} },
        { text: 'Retry', onPress: () => captureAndProcessImage({
          cameraRef,
          permission,
          openai,
          isMobileWeb,
          setIsProcessing,
          setProcessingMessage,
          setScanError,
          setScreenStep,
          setManualStep,
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
        }) },
      ]
    );
  } finally {
    setIsProcessing(false);
    console.log('[Capture] isProcessing set to false');
  }
}