import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { Camera as CameraIcon, ArrowRight } from 'lucide-react-native';
import { Camera, CameraDevice } from 'react-native-vision-camera';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as FileSystem from 'expo-file-system';
import OpenAI from 'openai';
import Constants from 'expo-constants';

export default function NewDoseScreen() {
  const [step, setStep] = useState<'intro' | 'scan' | 'result'>('intro');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [detectionResult, setDetectionResult] = useState<
    | { syringe: { type: string | null; volume: string | null; markings: string | null } | null; vial: { medication: string | null; concentration: string | null; expiration: string | null } | null }
    | string
  >('');
  const cameraRef = useRef<Camera>(null);
  const [devices, setDevices] = useState<CameraDevice[]>([]);

  // OpenAI API setup with environment variable from expo-constants
  const openai = new OpenAI({
    apiKey: Constants.expoConfig.extra.OPENAI_API_KEY,
  });

  // Request camera permission and get devices on mount
  useEffect(() => {
    (async () => {
      const permission = await Camera.requestCameraPermission();
      setHasPermission(permission === 'granted');

      if (permission === 'granted') {
        const availableDevices = await Camera.getAvailableCameraDevices();
        setDevices(availableDevices);
      }
    })();
  }, []);

  // Capture image and analyze with OpenAI Vision API
  const captureImage = async () => {
    if (cameraRef.current) {
      setLoading(true);
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
                {
                  type: 'text',
                  text: 'Analyze this image and provide the following information in JSON format: { "syringe": { "type": "insulin or standard", "volume": "number in ml", "markings": "any text or numbers visible" }, "vial": { "medication": "name", "concentration": "e.g., 100 units/ml", "expiration": "date if visible" } }. If an item is not present, set its value to null. Ensure the response is valid JSON without markdown formatting.',
                },
                {
                  type: 'image_url',
                  image_url: { url: `data:image/jpeg;base64,${base64Image}` },
                },
              ],
            },
          ],
        });

        const content = response.choices[0].message.content || '{}';
        const jsonContent = content.replace(/```json\n|\n```/g, '').trim();
        const result = JSON.parse(jsonContent);
        setDetectionResult(result);
        setStep('result');
      } catch (error) {
        console.error('Error capturing or analyzing image:', error);
        setDetectionResult('error');
      } finally {
        setLoading(false);
      }
    }
  };

  // Render intro screen
  const renderIntro = () => (
    <Animated.View entering={FadeIn.duration(400)} style={styles.content}>
      <CameraIcon color={'#fff'} size={64} style={styles.icon} />
      <Text style={styles.text}>
        Use your camera to scan your syringe and medication vial.
      </Text>
      <TouchableOpacity style={styles.button} onPress={() => setStep('scan')}>
        <Text style={styles.buttonText}>Begin Preparation</Text>
        <ArrowRight color={'#fff'} size={24} />
      </TouchableOpacity>
    </Animated.View>
  );

  // Render scan screen
  const renderScan = () => {
    if (hasPermission === null) {
      return (
        <View style={styles.scanContainer}>
          <Text style={styles.text}>Requesting camera permission...</Text>
        </View>
      );
    }
    if (hasPermission === false) {
      return (
        <View style={styles.scanContainer}>
          <Text style={styles.text}>Camera permission denied.</Text>
        </View>
      );
    }
    if (devices.length === 0) {
      return (
        <View style={styles.scanContainer}>
          <Text style={styles.text}>No camera devices available.</Text>
        </View>
      );
    }

    const device = devices.find(d => d.position === 'back') || devices[0];

    return (
      <View style={styles.scanContainer}>
        <Camera
          ref={cameraRef}
          style={styles.camera}
          device={device}
          isActive={true}
          photo={true}
        />
        <View style={styles.overlay}>
          <Text style={styles.scanText}>Point at your syringe and vial</Text>
          <TouchableOpacity style={styles.captureButton} onPress={captureImage}>
            <Text style={styles.buttonText}>Capture</Text>
          </TouchableOpacity>
        </View>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Analyzing...</Text>
          </View>
        )}
      </View>
    );
  };

  // Render result screen
  const renderResult = () => {
    if (detectionResult === 'error') {
      return (
        <View style={styles.content}>
          <Text style={styles.text}>Error analyzing image. Please try again.</Text>
          <TouchableOpacity style={styles.button} onPress={() => setStep('scan')}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const result = detectionResult as { syringe: any; vial: any };
    const syringeDetected = result.syringe !== null;
    const vialDetected = result.vial !== null;

    return (
      <View style={styles.content}>
        {syringeDetected && (
          <View style={styles.resultSection}>
            <Text style={styles.resultTitle}>Syringe:</Text>
            <Text style={styles.resultText}>Type: {result.syringe.type || 'Unknown'}</Text>
            <Text style={styles.resultText}>Volume: {result.syringe.volume || 'Unknown'}</Text>
            <Text style={styles.resultText}>Markings: {result.syringe.markings || 'None'}</Text>
          </View>
        )}
        {vialDetected && (
          <View style={styles.resultSection}>
            <Text style={styles.resultTitle}>Vial:</Text>
            <Text style={styles.resultText}>Medication: {result.vial.medication || 'Unknown'}</Text>
            <Text style={styles.resultText}>Concentration: {result.vial.concentration || 'Unknown'}</Text>
            <Text style={styles.resultText}>Expiration: {result.vial.expiration || 'Unknown'}</Text>
          </View>
        )}
        {!syringeDetected && !vialDetected && (
          <Text style={styles.text}>No syringe or vial found.</Text>
        )}
        <TouchableOpacity style={styles.button} onPress={() => setStep('scan')}>
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>New Dose</Text>
        <Text style={styles.subtitle}>
          {step === 'intro'
            ? 'Prepare your medication safely'
            : step === 'scan'
            ? 'Scan your items'
            : 'Detection Result'}
        </Text>
      </View>
      {step === 'intro' && renderIntro()}
      {step === 'scan' && renderScan()}
      {step === 'result' && renderResult()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 16,
  },
  header: {
    marginTop: 48,
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  subtitle: {
    fontSize: 18,
    color: '#94a3b8',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  icon: {
    marginBottom: 16,
  },
  text: {
    fontSize: 18,
    color: '#f8fafc',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  button: {
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#f8fafc',
    fontSize: 16,
  },
  scanContainer: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  camera: {
    width: '100%',
    height: '80%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanText: {
    fontSize: 18,
    color: '#fff',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 8,
    borderRadius: 4,
    marginBottom: 20,
  },
  captureButton: {
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  resultSection: {
    alignItems: 'flex-start',
    width: '80%',
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 8,
  },
  resultText: {
    fontSize: 16,
    color: '#f8fafc',
    marginBottom: 4,
  },
});