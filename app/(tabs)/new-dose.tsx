import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useState } from 'react';
import { Camera, ArrowRight } from 'lucide-react-native';
import Animated, { FadeIn, FadeInRight } from 'react-native-reanimated';

export default function NewDoseScreen() {
  const [step, setStep] = useState<'intro' | 'scan' | 'input' | 'result'>('intro');
  const [inputStep, setInputStep] = useState<'setup' | 'concentration' | 'amount'>('setup');
  const [detectedItems, setDetectedItems] = useState<string[]>([]);
  const [syringeType, setSyringeType] = useState<'Standard' | 'Insulin' | null>(null);
  const [medication, setMedication] = useState<'Insulin' | 'TRT' | 'GLP-1' | 'Other' | null>(null);
  const [vialConcentration, setVialConcentration] = useState<string>('');
  const [prescribedAmount, setPrescribedAmount] = useState<string>('');

  const handleDetection = (items: string[], syringe: 'Standard' | 'Insulin' | null, med: 'Insulin' | 'TRT' | 'GLP-1' | 'Other' | null) => {
    setDetectedItems(items);
    setSyringeType(syringe);
    setMedication(med);
    setVialConcentration('');
    setPrescribedAmount('');
    setInputStep('setup');
    setStep('input');
  };

  const handleNextInput = () => {
    if (inputStep === 'setup') {
      if (!syringeType || !medication) return alert('Please select syringe type and medication.');
      if (medication === 'Insulin') setInputStep('amount'); // Skip concentration for insulin
      else setInputStep('concentration');
    } else if (inputStep === 'concentration') {
      if (!vialConcentration) return alert('Please enter vial concentration.');
      setInputStep('amount');
    } else if (inputStep === 'amount') {
      if (!prescribedAmount) return alert('Please enter prescribed amount.');
      setStep('result');
    }
  };

  const renderIntro = () => (
    <Animated.View entering={FadeIn.duration(400)} style={styles.content}>
      <Camera color={'#fff'} size={64} style={styles.icon} />
      <Text style={styles.text}>
        Use your camera to scan your syringe and medication vial to get started.
      </Text>
      <TouchableOpacity style={styles.button} onPress={() => setStep('scan')}>
        <Text style={styles.buttonText}>Begin Preparation</Text>
        <ArrowRight color={'#fff'} size={24} />
      </TouchableOpacity>
    </Animated.View>
  );

  const renderScan = () => (
    <View style={styles.scanContainer}>
      <Text style={styles.scanText}>Simulate Detection</Text>
      <View style={styles.simulationButtons}>
        <TouchableOpacity
          style={[styles.simulationButton, detectedItems.join(',') === 'syringe,vial' && medication === 'Insulin' && styles.selectedButton]}
          onPress={() => handleDetection(['syringe', 'vial'], 'Insulin', 'Insulin')}
        >
          <Text style={styles.buttonText}>Insulin setup</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.simulationButton, detectedItems.join(',') === 'syringe,vial' && medication === 'TRT' && styles.selectedButton]}
          onPress={() => handleDetection(['syringe', 'vial'], 'Standard', 'TRT')}
        >
          <Text style={styles.buttonText}>TRT setup</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.simulationButton, detectedItems.join(',') === 'syringe,vial' && medication === 'GLP-1' && styles.selectedButton]}
          onPress={() => handleDetection(['syringe', 'vial'], 'Standard', 'GLP-1')}
        >
          <Text style={styles.buttonText}>GLP-1 setup</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.simulationButton, detectedItems.length === 0 && styles.selectedButton]}
          onPress={() => handleDetection([], null, null)}
        >
          <Text style={styles.buttonText}>Custom setup</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderInput = () => (
    <View style={styles.content}>
      {inputStep === 'setup' && (
        <>
          <Text style={styles.text}>
            Detected: {detectedItems.length > 0 ? detectedItems.join(', ') : 'Nothing'}
          </Text>
          {!syringeType && (
            <View style={styles.syringeSelection}>
              <Text style={styles.text}>Select syringe type:</Text>
              <View style={styles.syringeButtons}>
                {['Standard', 'Insulin'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.syringeButton, syringeType === type && styles.selectedButton]}
                    onPress={() => setSyringeType(type as 'Standard' | 'Insulin')}
                  >
                    <Text style={styles.buttonText}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          {!medication && (
            <View style={styles.medicationSelection}>
              <Text style={styles.text}>Select medication:</Text>
              <View style={styles.medicationButtons}>
                {['Insulin', 'TRT', 'GLP-1', 'Other'].map((med) => (
                  <TouchableOpacity
                    key={med}
                    style={[styles.medicationButton, medication === med && styles.selectedButton]}
                    onPress={() => setMedication(med as 'Insulin' | 'TRT' | 'GLP-1' | 'Other')}
                  >
                    <Text style={styles.buttonText}>{med}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </>
      )}

      {inputStep === 'concentration' && (
        <View style={styles.inputField}>
          <Text style={styles.text}>Enter vial concentration (e.g., 5 mg/mL):</Text>
          <TextInput
            style={styles.input}
            value={vialConcentration}
            onChangeText={setVialConcentration}
            placeholder="e.g., 5 mg/mL"
            placeholderTextColor="#94a3b8"
            keyboardType="numeric"
          />
        </View>
      )}

      {inputStep === 'amount' && (
        <View style={styles.inputField}>
          <Text style={styles.text}>
            Enter prescribed amount (e.g., {medication === 'Insulin' ? '10 units' : '50 mg'}):
          </Text>
          <TextInput
            style={styles.input}
            value={prescribedAmount}
            onChangeText={setPrescribedAmount}
            placeholder={medication === 'Insulin' ? 'e.g., 10 units' : 'e.g., 50 mg'}
            placeholderTextColor="#94a3b8"
            keyboardType="numeric"
          />
        </View>
      )}

      <TouchableOpacity style={styles.button} onPress={handleNextInput}>
        <Text style={styles.buttonText}>{inputStep === 'amount' ? 'Calculate' : 'Next'}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderResult = () => {
    const amount = parseFloat(prescribedAmount) || 0;
    let volume: number;
    let instruction: string;

    if (medication === 'Insulin' && syringeType === 'Insulin') {
      volume = amount; // Assuming 100 units/mL, units = volume in syringe
      instruction = `Pull the syringe to the ${volume} unit mark`;
    } else {
      const concentration = medication === 'Insulin' ? 100 : parseFloat(vialConcentration) || 1;
      volume = amount / concentration;
      instruction = `Pull the syringe to ${volume.toFixed(1)} mL`;
    }

    return (
      <Animated.View entering={FadeInRight.duration(400)} style={styles.content}>
        <Text style={styles.text}>
          For {medication}, {instruction} for {amount} {medication === 'Insulin' ? 'units' : 'mg'}.
        </Text>
        <Text style={styles.note}>Always confirm with your healthcare provider.</Text>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>New Dose</Text>
        <Text style={styles.subtitle}>
          {step === 'intro'
            ? 'Prepare your medication safely and accurately'
            : step === 'result'
            ? 'Your Preparation Instructions'
            : 'Follow the guide for accurate preparation'}
        </Text>
      </View>

      {step === 'intro' && renderIntro()}
      {step === 'scan' && renderScan()}
      {step === 'input' && renderInput()}
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
  note: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 8,
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
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  scanText: {
    fontSize: 18,
    color: '#f8fafc',
  },
  simulationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    flexWrap: 'wrap',
    gap: 10,
  },
  simulationButton: {
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  selectedButton: {
    backgroundColor: '#3b82f6',
  },
  inputField: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    backgroundColor: '#1e293b',
    color: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    width: '80%',
    textAlign: 'center',
  },
  syringeSelection: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
  syringeButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  syringeButton: {
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  medicationSelection: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
  medicationButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  medicationButton: {
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
});