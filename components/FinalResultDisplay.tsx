import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Modal, TextInput } from 'react-native';
import { Plus, X, Info, ChevronDown, ChevronUp, RotateCcw, Save, Camera as CameraIcon, Bookmark } from 'lucide-react-native';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import SyringeIllustration from './SyringeIllustration';
import { syringeOptions } from "../lib/utils";
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { useDoseLogging } from '@/lib/hooks/useDoseLogging';
import { usePresetStorage } from '@/lib/hooks/usePresetStorage';

type Props = {
  calculationError: string | null;
  recommendedMarking: string | null;
  doseValue: number | null;
  unit: 'mg' | 'mcg' | 'units' | 'mL';
  concentrationUnit?: 'mg/ml' | 'mcg/ml' | 'units/ml'; // Add concentrationUnit prop
  substanceName: string;
  manualSyringe: { type: 'Insulin' | 'Standard'; volume: string };
  calculatedVolume: number | null;
  calculatedConcentration?: number | null; // Add calculated concentration prop
  concentration?: number | null; // Add concentration prop for breakdown display
  handleStartOver: () => void;
  setScreenStep: (step: 'intro' | 'scan' | 'manualEntry') => void;
  handleGoToFeedback: (nextAction: 'new_dose' | 'scan_again' | 'start_over') => void;
  lastActionType: 'manual' | 'scan' | null;
  isMobileWeb: boolean;
  usageData?: { scansUsed: number; limit: number; plan: string };
  onTryAIScan?: () => void;
  // Preset-related props
  concentrationValue?: number | null;
  totalAmount?: number | null;
  totalAmountUnit?: 'mg' | 'mcg' | 'units';
  solutionVolume?: number | null;
};

export default function FinalResultDisplay({
  calculationError,
  recommendedMarking,
  doseValue,
  unit,
  concentrationUnit,
  substanceName,
  manualSyringe,
  calculatedVolume,
  calculatedConcentration,
  concentration,
  handleStartOver,
  setScreenStep,
  handleGoToFeedback,
  lastActionType,
  isMobileWeb,
  usageData,
  onTryAIScan,
  concentrationValue,
  totalAmount,
  totalAmountUnit,
  solutionVolume,
}: Props) {
  const { disclaimerText } = useUserProfile();
  const { user, auth } = useAuth();
  const { logDose, isLogging } = useDoseLogging();
  const { savePreset, maxPresets } = usePresetStorage();

  const [showCalculationBreakdown, setShowCalculationBreakdown] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingSave, setPendingSave] = useState(false); // Track if we're waiting for auth to complete save
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetNotes, setPresetNotes] = useState('');
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  
  // Effect to handle automatic saving after successful authentication
  useEffect(() => {
    const handleAuthenticatedSave = async () => {
      if (pendingSave && user && !user.isAnonymous && !isSaving && !isLogging) {
        setPendingSave(false);
        setIsSaving(true);
        
        try {
          const doseInfo = {
            substanceName,
            doseValue,
            unit,
            calculatedVolume,
            syringeType: manualSyringe.type as 'Insulin' | 'Standard',
            recommendedMarking,
          };

          const result = await logDose(doseInfo);
          
          if (result.success) {
            Alert.alert('Dose Saved', 'Your dose has been saved to your log.');
          } else if (result.limitReached) {
            Alert.alert('Log Limit Reached', 'You have reached your dose logging limit.');
          } else {
            Alert.alert('Save Failed', 'There was an error saving your dose. Please try again.');
          }
        } catch (error) {
          console.error('Error saving dose after auth:', error);
          Alert.alert('Save Failed', 'There was an error saving your dose. Please try again.');
        } finally {
          setIsSaving(false);
        }
      }
    };

    handleAuthenticatedSave();
  }, [
    pendingSave, user, isSaving, isLogging, logDose,
    substanceName, doseValue, unit, calculatedVolume, 
    manualSyringe, recommendedMarking
  ]);
  
  // Helper function to trigger Google sign-in
  const handleSignIn = useCallback(async (): Promise<boolean> => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await signInWithPopup(auth, provider);
      console.log('Google Sign-In OK:', result.user.uid);
      return true;
    } catch (error) {
      console.error('Google Sign-In error:', error);
      Alert.alert(
        'Sign-in Failed', 
        'There was an error signing in with Google. Please try again.'
      );
      return false;
    }
  }, [auth]);

  // Handler for saving dose
  const handleSaveDose = useCallback(async () => {
    if (isSaving || isLogging) return;
    
    setIsSaving(true);
    
    try {
      // Check if user is authenticated
      if (!user || user.isAnonymous) {
        // Set pending save flag and trigger Google sign-in
        setPendingSave(true);
        const signInSuccessful = await handleSignIn();
        if (!signInSuccessful) {
          setPendingSave(false);
          setIsSaving(false);
          return;
        }
        // Note: The useEffect will handle the actual saving once auth completes
        // Keep isSaving true to show loading state
        return;
      }

      // User is already authenticated, proceed with saving immediately
      const doseInfo = {
        substanceName,
        doseValue,
        unit,
        calculatedVolume,
        syringeType: manualSyringe.type as 'Insulin' | 'Standard',
        recommendedMarking,
      };

      const result = await logDose(doseInfo);
      
      if (result.success) {
        Alert.alert('Dose Saved', 'Your dose has been saved to your log.');
      } else if (result.limitReached) {
        Alert.alert('Log Limit Reached', 'You have reached your dose logging limit.');
      } else {
        Alert.alert('Save Failed', 'There was an error saving your dose. Please try again.');
      }
    } catch (error) {
      console.error('Error saving dose:', error);
      Alert.alert('Save Failed', 'There was an error saving your dose. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [
    isSaving, isLogging, user, handleSignIn, logDose,
    substanceName, doseValue, unit, calculatedVolume, 
    manualSyringe, recommendedMarking
  ]);
  
  // Preset handlers
  const handleSavePreset = useCallback(() => {
    setShowPresetModal(true);
  }, []);

  const handleSavePresetConfirm = useCallback(async () => {
    if (!presetName.trim()) {
      Alert.alert('Error', 'Please enter a preset name');
      return;
    }

    setIsSavingPreset(true);
    try {
      const presetData = {
        name: presetName.trim(),
        substanceName,
        doseValue: doseValue || 0,
        unit,
        concentrationValue,
        concentrationUnit,
        totalAmount,
        totalAmountUnit,
        solutionVolume,
        notes: presetNotes.trim() || undefined,
      };

      const result = await savePreset(presetData);
      
      if (result.success) {
        Alert.alert('Preset Saved', `"${presetName}" has been saved as a preset.`);
        setShowPresetModal(false);
        setPresetName('');
        setPresetNotes('');
      } else {
        Alert.alert('Save Failed', result.error || 'Failed to save preset');
      }
    } catch (error) {
      console.error('Error saving preset:', error);
      Alert.alert('Save Failed', 'Failed to save preset');
    } finally {
      setIsSavingPreset(false);
    }
  }, [presetName, presetNotes, substanceName, doseValue, unit, concentrationValue, concentrationUnit, totalAmount, totalAmountUnit, solutionVolume, savePreset]);

  const handlePresetModalClose = useCallback(() => {
    setShowPresetModal(false);
    setPresetName('');
    setPresetNotes('');
  }, []);
  
  // Helper function to get the calculation formula based on unit types
  const getCalculationFormula = () => {
    if (!doseValue) return 'Formula not available';
    
    // For mL doses, concentrationUnit is not required
    if (unit === 'mL') {
      return 'Volume (ml) = Dose (ml) [Direct volume administration]';
    } 
    
    // For other units, we need concentrationUnit
    if (!concentrationUnit) return 'Formula not available';
    
    if (unit === 'mcg' && concentrationUnit === 'mg/ml') {
      return 'Volume (ml) = Dose (mcg) ÷ 1000 ÷ Concentration (mg/ml)';
    } else if (unit === 'mg' && concentrationUnit === 'mcg/ml') {
      return 'Volume (ml) = Dose (mg) × 1000 ÷ Concentration (mcg/ml)';
    } else if (unit === 'mg' && concentrationUnit === 'mg/ml') {
      return 'Volume (ml) = Dose (mg) ÷ Concentration (mg/ml)';
    } else if (unit === 'mcg' && concentrationUnit === 'mcg/ml') {
      return 'Volume (ml) = Dose (mcg) ÷ Concentration (mcg/ml)';
    } else if (unit === 'units' && concentrationUnit === 'units/ml') {
      return 'Volume (ml) = Dose (units) ÷ Concentration (units/ml)';
    }
    return 'Volume (ml) = Dose ÷ Concentration';
  };
  
  // Get the concentration value to display (prioritize calculatedConcentration, then concentration prop)
  const getConcentrationForDisplay = () => {
    if (calculatedConcentration !== null && calculatedConcentration !== undefined) {
      return calculatedConcentration;
    }
    if (concentration !== null && concentration !== undefined) {
      return concentration;
    }
    return null;
  };
  
  console.log('[FinalResultDisplay] Rendering with:', { 
    calculationError, 
    recommendedMarking,
    doseValue,
    unit,
    substanceName,
    manualSyringe,
    calculatedVolume,
    calculatedConcentration
  });
  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
      {calculationError && !recommendedMarking && (
        <View style={[styles.instructionCard, { backgroundColor: '#FEE2E2', borderColor: '#F87171', flexDirection: 'column', alignItems: 'center' }]}>
          <X color="#f87171" size={24} style={{ marginBottom: 10 }} />
          <Text style={styles.errorTitle}>Calculation Error</Text>
          <Text style={styles.errorText}>{calculationError}</Text>
          <Text style={styles.errorHelpText}>
            {calculationError.includes('exceeds total amount') && 
              'Try reducing the dose amount or selecting a medication with a higher total amount.'}
            {calculationError.includes('exceeds what can be made') && 
              'Try selecting a medication with a higher concentration or total amount.'}
            {calculationError.includes('exceeds syringe capacity') && 
              'Try selecting a syringe with a larger capacity or reducing the dose amount.'}
          </Text>
        </View>
      )}
      {!calculationError && !recommendedMarking && (
        <View style={[styles.instructionCard, { backgroundColor: '#EFF6FF', borderColor: '#60A5FA' }]}>
          <Text style={[styles.instructionTitle, { color: '#1E40AF' }]}>
            Dose Calculation
          </Text>
          <Text style={[styles.instructionText, { color: '#1E40AF' }]}>
            {doseValue ? `For ${doseValue} ${unit} dose` : 'For the requested dose'} 
            {substanceName ? ` of ${substanceName}` : ''}:
          </Text>
          <Text style={[styles.instructionTextLarge, { color: '#1E40AF' }]}>
            No specific recommendation available
          </Text>
          <Text style={[styles.instructionNote, { color: '#1E40AF' }]}>
            Please check your inputs and try again, or consult a healthcare professional.
          </Text>
        </View>
      )}
      {recommendedMarking && (
        <View style={[styles.instructionCard, calculationError && !calculationError.includes('Draw to') ? { backgroundColor: '#FEF3C7', borderColor: '#FBBF24' } : { backgroundColor: '#D1FAE5', borderColor: '#34D399' }]}>
          <Text style={styles.instructionTitle}>
            {calculationError && !calculationError.includes('Draw to') ? '⚠️ Dose Recommendation' : '✅ Dose Calculation Result'}
          </Text>
          <Text style={styles.instructionText}>
            For a {doseValue} {unit} dose of {substanceName || 'this medication'}:
          </Text>
          <Text style={styles.instructionTextLarge}>
            Draw to {parseFloat(recommendedMarking).toFixed(2)} {manualSyringe.type === 'Insulin' ? 'units' : 'ml'}
          </Text>
          <Text style={styles.instructionNote}>
            ({manualSyringe.type === 'Insulin' ? 'Units mark on Insulin Syringe' : 'ml mark on Standard Syringe'})
          </Text>
          {calculatedVolume !== null && calculatedVolume !== undefined && (
            <Text style={styles.instructionNote}>
              (Exact calculated volume: {calculatedVolume.toFixed(3)} ml)
            </Text>
          )}
          {calculatedConcentration !== null && calculatedConcentration !== undefined && (
            <Text style={styles.instructionNote}>
              (Calculated concentration: {calculatedConcentration.toFixed(2)} {concentrationUnit || 'mg/mL'})
            </Text>
          )}
          {calculationError && (
            <Text style={calculationError.includes('Draw to') ? styles.guidanceText : styles.warningText}>
              {calculationError}
            </Text>
          )}
          <View style={styles.illustrationContainer}>
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
      
      {/* Calculation Breakdown Toggle - only show when we have valid calculation results */}
      {(recommendedMarking || (!calculationError && calculatedVolume !== null)) && (
        <View style={styles.calculationBreakdownContainer}>
          <TouchableOpacity 
            style={styles.calculationToggleButton}
            onPress={() => setShowCalculationBreakdown(!showCalculationBreakdown)}
            accessibilityRole="button"
            accessibilityLabel={showCalculationBreakdown ? "Hide calculation breakdown" : "Show calculation breakdown"}
          >
            <Text style={styles.calculationToggleText}>Show Calculation Breakdown</Text>
            {showCalculationBreakdown ? (
              <ChevronUp color="#065F46" size={20} />
            ) : (
              <ChevronDown color="#065F46" size={20} />
            )}
          </TouchableOpacity>
          
          {showCalculationBreakdown && (
            <View style={styles.calculationBreakdownContent}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Target Dose:</Text>
                <Text style={styles.breakdownValue}>
                  {doseValue} {unit}{substanceName ? ` of ${substanceName}` : ''}
                </Text>
              </View>
              
              {getConcentrationForDisplay() !== null && (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Concentration Used:</Text>
                  <Text style={styles.breakdownValue}>
                    {getConcentrationForDisplay()?.toFixed(2)} {concentrationUnit || 'mg/ml'}
                  </Text>
                </View>
              )}
              
              {calculatedVolume !== null && (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Final Volume to Draw:</Text>
                  <Text style={styles.breakdownValue}>
                    {calculatedVolume.toFixed(3)} ml
                  </Text>
                </View>
              )}
              
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Calculation Formula:</Text>
                <Text style={styles.breakdownFormula}>
                  {getCalculationFormula()}
                </Text>
              </View>
            </View>
          )}
        </View>
      )}
      
      <View style={styles.disclaimerContainer}>
        <View style={styles.disclaimerIconContainer}>
          <Info color={'#856404'} size={14} style={styles.disclaimerIcon} />
          <Text style={styles.disclaimerText}>
            {disclaimerText}
          </Text>
        </View>
      </View>
      
      {/* AI Scan Teaser - show only for manual users with remaining scans and successful calculation */}
      {lastActionType === 'manual' && 
       !calculationError && 
       recommendedMarking && 
       usageData && 
       usageData.scansUsed < usageData.limit && 
       onTryAIScan && (
        <View style={styles.scanTeaserContainer}>
          <Text style={styles.scanTeaserText}>
            Want to double-check with a vial/syringe photo?
          </Text>
          <TouchableOpacity 
            style={styles.scanTeaserButton}
            onPress={onTryAIScan}
            accessibilityRole="button"
            accessibilityLabel="Try AI Scan to double-check your calculation"
          >
            <CameraIcon color="#007AFF" size={14} style={{ marginRight: 4 }} />
            <Text style={styles.scanTeaserButtonText}>Try AI Scan</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: '#6B7280' }, isMobileWeb && styles.actionButtonMobile]} 
          onPress={() => handleGoToFeedback('start_over')}
        >
          <RotateCcw color="#fff" size={18} style={{ marginRight: 8 }} />
          <Text style={styles.buttonText}>Start Over</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.actionButton, 
            { backgroundColor: isSaving ? '#9CA3AF' : '#3B82F6' }, 
            isMobileWeb && styles.actionButtonMobile
          ]} 
          onPress={handleSaveDose}
          disabled={isSaving || isLogging}
        >
          <Save color="#fff" size={18} style={{ marginRight: 8 }} />
          <Text style={styles.buttonText}>
            {isSaving 
              ? (pendingSave ? 'Signing in...' : 'Saving...') 
              : 'Save'
            }
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: isSavingPreset ? '#9CA3AF' : '#8B5CF6' },
            isMobileWeb && styles.actionButtonMobile
          ]}
          onPress={handleSavePreset}
          disabled={isSavingPreset}
        >
          <Bookmark color="#fff" size={18} style={{ marginRight: 8 }} />
          <Text style={styles.buttonText}>
            {isSavingPreset ? 'Saving...' : 'Save Preset'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: '#10B981' }, isMobileWeb && styles.actionButtonMobile]} 
          onPress={() => handleGoToFeedback('new_dose')}
        >
          <Plus color="#fff" size={18} style={{ marginRight: 8 }} />
          <Text style={styles.buttonText}>New Dose</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    
    {/* Save Preset Modal */}
    {showPresetModal && (
      <Modal
        animationType="slide"
        transparent={true}
        visible={showPresetModal}
        onRequestClose={handlePresetModalClose}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Save as Preset</Text>
              <TouchableOpacity onPress={handlePresetModalClose} style={styles.closeButton}>
                <X color="#6B7280" size={24} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.presetPreview}>
              <Text style={styles.previewTitle}>Preset Preview:</Text>
              <Text style={styles.previewText}>
                {substanceName} • {doseValue} {unit}
              </Text>
              {concentrationValue && concentrationUnit && (
                <Text style={styles.previewText}>
                  Concentration: {concentrationValue} {concentrationUnit}
                </Text>
              )}
              {totalAmount && totalAmountUnit && (
                <Text style={styles.previewText}>
                  Total: {totalAmount} {totalAmountUnit}
                </Text>
              )}
              {solutionVolume && (
                <Text style={styles.previewText}>
                  Solution: {solutionVolume} ml
                </Text>
              )}
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Preset Name (required)</Text>
              <TextInput
                style={styles.textInput}
                value={presetName}
                onChangeText={setPresetName}
                placeholder="Enter preset name..."
                autoFocus={true}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Notes (optional)</Text>
              <TextInput
                style={[styles.textInput, styles.notesInput]}
                value={presetNotes}
                onChangeText={setPresetNotes}
                placeholder="Add notes about this preset..."
                multiline={true}
                numberOfLines={3}
              />
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handlePresetModalClose}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, isSavingPreset && styles.disabledButton]}
                onPress={handleSavePresetConfirm}
                disabled={isSavingPreset || !presetName.trim()}
              >
                <Text style={styles.saveButtonText}>
                  {isSavingPreset ? 'Saving...' : 'Save Preset'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    )}
    </>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 8, width: '100%', maxWidth: 600, marginBottom: 20 },
  instructionCard: { padding: 16, borderRadius: 12, borderWidth: 2, marginBottom: 16, width: '100%' },
  instructionTitle: { fontSize: 18, fontWeight: 'bold', color: '#065F46', textAlign: 'center', marginBottom: 12 },
  instructionText: { fontSize: 15, color: '#065F46', textAlign: 'center', marginBottom: 8 },
  instructionTextLarge: { fontSize: 24, fontWeight: 'bold', color: '#065F46', textAlign: 'center', marginVertical: 10, paddingVertical: 8, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 6 },
  instructionNote: { fontSize: 13, color: '#065F46', textAlign: 'center', marginTop: 4, fontStyle: 'italic' },
  warningText: { fontSize: 13, color: '#92400E', textAlign: 'center', marginTop: 10, paddingHorizontal: 10, backgroundColor: 'rgba(251, 191, 36, 0.1)', paddingVertical: 6, borderRadius: 6, width: '90%', alignSelf: 'center' },
  guidanceText: { fontSize: 13, color: '#065F46', textAlign: 'center', marginTop: 10, paddingHorizontal: 10, backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingVertical: 6, borderRadius: 6, width: '90%', alignSelf: 'center', fontWeight: '500' },
  illustrationContainer: { marginTop: 20, alignItems: 'center' },
  disclaimerContainer: { 
    backgroundColor: '#FFF3CD', 
    padding: 12, 
    borderRadius: 8, 
    marginVertical: 10, 
    width: '90%', 
    alignSelf: 'center',
    borderLeftWidth: 3,
    borderLeftColor: '#856404',
  },
  disclaimerIconContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  disclaimerIcon: {
    marginRight: 8,
    marginTop: 3,
  },
  disclaimerText: { 
    fontSize: 12, 
    color: '#856404', 
    textAlign: 'left', 
    fontStyle: 'italic',
    flex: 1,
  },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 20, gap: 10 },
  actionButton: { paddingVertical: 14, borderRadius: 8, flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginHorizontal: 5, minHeight: 50 },
  actionButtonMobile: { paddingVertical: 16, minHeight: 60 },
  buttonText: { color: '#f8fafc', fontSize: 16, fontWeight: '500', textAlign: 'center' },
  errorTitle: { fontSize: 16, color: '#991B1B', textAlign: 'center', fontWeight: '600', marginVertical: 8 },
  errorText: { fontSize: 15, color: '#991B1B', textAlign: 'center', fontWeight: '500', marginLeft: 8, flexShrink: 1 },
  errorHelpText: { fontSize: 13, color: '#991B1B', textAlign: 'center', marginTop: 12, paddingVertical: 8, backgroundColor: 'rgba(248, 113, 113, 0.1)', paddingHorizontal: 12, borderRadius: 6, width: '90%', alignSelf: 'center' },
  // Calculation Breakdown Styles
  calculationBreakdownContainer: {
    backgroundColor: '#F8FAFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    marginVertical: 12,
    width: '90%',
    alignSelf: 'center',
  },
  calculationToggleButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  calculationToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
  },
  calculationBreakdownContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E7FF',
  },
  breakdownRow: {
    marginBottom: 8,
  },
  breakdownLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  breakdownValue: {
    fontSize: 13,
    color: '#065F46',
    marginLeft: 8,
  },
  breakdownFormula: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#4B5563',
    marginLeft: 8,
    fontStyle: 'italic',
    backgroundColor: '#F3F4F6',
    padding: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  // AI Scan Teaser Styles
  scanTeaserContainer: {
    alignItems: 'center',
    marginVertical: 12,
    paddingHorizontal: 16,
  },
  scanTeaserText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  scanTeaserButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 16,
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
  },
  scanTeaserButtonText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#065F46',
  },
  closeButton: {
    padding: 4,
  },
  presetPreview: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  previewText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  saveButton: {
    backgroundColor: '#8B5CF6',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});
