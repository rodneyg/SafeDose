import type { DoseLogContext } from '../types/doseLog';
import { calculationErrorMessage } from '../lib/calculationErrorMessage';
import { formatDoseNumber } from '../lib/dosing';
import { Exact } from '../lib/dosing/exact';
import { SyringeSelection, getSyringeMarkings } from '../lib/dosing';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { Plus, X, Info, ChevronDown, ChevronUp, RotateCcw, Save, Camera as CameraIcon, Check } from 'lucide-react-native';
import { signInWithGoogle } from '../lib/googleAuth';
import SyringeIllustration from './SyringeIllustration';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { useDoseLogging } from '@/lib/hooks/useDoseLogging';
import { parseLocalDateTimeInput, resolveDoseTimestamp, timestampErrorMessage } from '../lib/doseLogTimestamp';

type Props = {
  calculationError: string | null;
  guidance?: string | null;
  recommendedMarking: string | null;
  doseValue: number | null;
  unit: 'mg' | 'mcg' | 'units' | 'mL';
  concentrationUnit?: 'mg/ml' | 'mcg/ml' | 'units/ml'; // Add concentrationUnit prop
  substanceName: string;
  manualSyringe: SyringeSelection;
  calculatedVolume: number | null;
  calculatedConcentration?: number | null; // Add calculated concentration prop
  concentration?: number | null; // Add concentration prop for breakdown display
  handleStartOver: () => void;
  setScreenStep: (step: 'intro' | 'scan' | 'manualEntry') => void;
  handleGoToFeedback: (nextAction: 'new_dose' | 'scan_again' | 'start_over') => void;
  resolveScheduledDose?: (dose: DoseLogContext) => Promise<string | undefined>;
  onDoseSaved?: (localDoseCount?: number) => void;
  lastActionType: 'manual' | 'scan' | null;
  isMobileWeb: boolean;
  usageData?: { scansUsed: number; limit: number; plan: string };
  onTryAIScan?: () => void;
};

export default function FinalResultDisplay({
  calculationError,
  guidance,
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
  resolveScheduledDose,
  onDoseSaved,
  lastActionType,
  isMobileWeb,
  usageData,
  onTryAIScan,
}: Props) {
  const { disclaimerText } = useUserProfile();
  const { user, auth } = useAuth();
  const { logDose, isLogging } = useDoseLogging();

  const [showCalculationBreakdown, setShowCalculationBreakdown] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saveInFlight = useRef(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [pendingSave, setPendingSave] = useState(false); // Track if we're waiting for auth to complete save
  const [takenAtText, setTakenAtText] = useState(''); // Optional time taken, blank means now
  const [takenAtError, setTakenAtError] = useState<string | null>(null);

  // Returns the ISO time to log, undefined for now, or null when the text is not valid.
  const readTakenAt = useCallback((): string | undefined | null => {
    const parsed = parseLocalDateTimeInput(takenAtText);
    if (parsed === null) { setTakenAtError(timestampErrorMessage('invalid')); return null; }
    if (parsed === undefined) { setTakenAtError(null); return undefined; }
    const check = resolveDoseTimestamp(parsed);
    if (!check.ok) { setTakenAtError(timestampErrorMessage(check.reason)); return null; }
    setTakenAtError(null);
    return parsed;
  }, [takenAtText]);
  
  // Effect to handle automatic saving after successful authentication
  useEffect(() => {
    const handleAuthenticatedSave = async () => {
      if (pendingSave && user && !user.isAnonymous && !isSaving && !isLogging && !calculationError && recommendedMarking) {
        setPendingSave(false);
        setIsSaving(true);
        
        try {
          const loggedAt = readTakenAt();
          if (loggedAt === null) return;
          const doseInfo = {
            ...(loggedAt && { loggedAt }),
            substanceName,
            doseValue,
            unit,
            calculatedVolume,
            syringeType: manualSyringe.type as 'Insulin' | 'Standard',
            recommendedMarking,
            insulinScale: manualSyringe.insulinScale,
          };

          const protocolOccurrence = await resolveScheduledDose?.(doseInfo);
          const result = await logDose(protocolOccurrence ? { ...doseInfo, protocolOccurrence } : doseInfo);
          
          if (result.success) {
            Alert.alert('Dose Saved', 'Your dose has been saved to your log.');
            onDoseSaved?.(result.localDoseCount);
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
    pendingSave, user, isSaving, isLogging, logDose, resolveScheduledDose, onDoseSaved, readTakenAt,
    substanceName, doseValue, unit, calculatedVolume, 
    manualSyringe, recommendedMarking, calculationError
  ]);
  
  // Helper function to trigger Google sign-in
  const handleSignIn = useCallback(async (): Promise<boolean> => {
    try {
      const result = await signInWithGoogle(auth);
      if (!result?.user) return false;
      console.log('Google Sign-In OK:', result.user.uid);
      return true;
    } catch (error) {
      console.error('Google Sign-In error:', error);
      if ((error as { code?: string }).code === 'auth/popup-closed-by-user' ||
          (error as { code?: string }).code === 'auth/cancelled-popup-request') return false;
      Alert.alert(
        'Sign-in Failed', 
        'There was an error signing in with Google. Please try again.'
      );
      return false;
    }
  }, [auth]);

  // Handler for saving dose
  const handleSaveDose = useCallback(async () => {
    if (saveInFlight.current || pendingSave || isSaving || isLogging || calculationError || !recommendedMarking) return;
    saveInFlight.current = true;
    
    setIsSaving(true);
    
    try {
      // Do not start sign-in with a time that would be rejected later
      if (readTakenAt() === null) return;

      // Check if user is authenticated
      if (!user || user.isAnonymous) {
        // Start sign-in without queuing a save until the popup succeeds
        setIsSigningIn(true);
        const signInSuccessful = await handleSignIn();
        if (!signInSuccessful) {
          setPendingSave(false);
          setIsSaving(false);
          return;
        }
        // Queue only after popup success, then wait for AuthContext to update.
        setPendingSave(true);
        return;
      }

      // User is already authenticated, proceed with saving immediately
      const loggedAt = readTakenAt();
      if (loggedAt === null) return;
      const doseInfo = {
        ...(loggedAt && { loggedAt }),
        substanceName,
        doseValue,
        unit,
        calculatedVolume,
        syringeType: manualSyringe.type as 'Insulin' | 'Standard',
        recommendedMarking,
        insulinScale: manualSyringe.insulinScale,
      };

      const protocolOccurrence = await resolveScheduledDose?.(doseInfo);
      const result = await logDose(protocolOccurrence ? { ...doseInfo, protocolOccurrence } : doseInfo);
      
      if (result.success) {
        Alert.alert('Dose Saved', 'Your dose has been saved to your log.');
        onDoseSaved?.(result.localDoseCount);
      } else if (result.limitReached) {
        Alert.alert('Log Limit Reached', 'You have reached your dose logging limit.');
      } else {
        Alert.alert('Save Failed', 'There was an error saving your dose. Please try again.');
      }
    } catch (error) {
      console.error('Error saving dose:', error);
      Alert.alert('Save Failed', 'There was an error saving your dose. Please try again.');
    } finally {
      saveInFlight.current = false;
      setIsSigningIn(false);
      setIsSaving(false);
    }
  }, [
    pendingSave, isSaving, isLogging, user, handleSignIn, logDose, resolveScheduledDose, onDoseSaved, readTakenAt,
    substanceName, doseValue, unit, calculatedVolume, 
    manualSyringe, recommendedMarking, calculationError
  ]);
  
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
    <ScrollView contentContainerStyle={styles.container}>
      {calculationError && (
        <View style={[styles.instructionCard, { backgroundColor: '#FEE2E2', borderColor: '#F87171', flexDirection: 'column', alignItems: 'center' }]}>
          <X color="#f87171" size={24} style={{ marginBottom: 10 }} />
          <Text style={styles.errorTitle}>Calculation Error</Text>
          <Text style={styles.errorText}>{calculationErrorMessage(calculationError)}</Text>
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
            Calculation Result
          </Text>
          <Text style={[styles.instructionText, { color: '#1E40AF' }]}>
            {doseValue ? `For ${doseValue} ${unit} dose` : 'For the requested dose'} 
            {substanceName ? ` of ${substanceName}` : ''}:
          </Text>
          <Text style={[styles.instructionTextLarge, { color: '#1E40AF' }]}>
            Unable to calculate volume
          </Text>
          <Text style={[styles.instructionNote, { color: '#1E40AF' }]}>
            Please check your inputs and try again. Confirm all values match your prescription.
          </Text>
        </View>
      )}
      {!calculationError && recommendedMarking && (
        <View style={[styles.instructionCard, { backgroundColor: '#D1FAE5', borderColor: '#34D399' }]}>
          <Text style={styles.instructionTitle}>
            ✅ Calculation Result
          </Text>
          <Text style={styles.instructionText}>
            For a {doseValue} {unit} dose of {substanceName || 'this medication'}:
          </Text>
          <Text style={styles.instructionTextLarge}>
            Draw to {new Exact(recommendedMarking).fixed(2)} {manualSyringe.type === 'Insulin' ? 'units' : 'ml'}
          </Text>
          <Text style={styles.instructionNote}>
            Display above rounds to 2 decimals, with halfway values rounded away from zero. No rounding to syringe gradations is applied.
          </Text>
          <Text style={styles.instructionNote}>
            ({manualSyringe.type === 'Insulin' ? `Units mark on ${manualSyringe.insulinScale || 'U-100'} Insulin Syringe` : 'ml mark on Standard Syringe'})
          </Text>
          {calculatedVolume !== null && calculatedVolume !== undefined && (
            <Text style={styles.instructionNote}>
              (Calculated volume: {calculatedVolume} ml; no rounding to syringe marks applied)
            </Text>
          )}
          {calculatedConcentration !== null && calculatedConcentration !== undefined && (
            <Text style={styles.instructionNote}>
              (Calculated concentration: {formatDoseNumber(calculatedConcentration, 3)} {concentrationUnit || 'mg/mL'})
            </Text>
          )}
          {guidance && <Text style={styles.guidanceText}>{guidance}</Text>}
          <View style={styles.illustrationContainer}>
            <Text style={styles.instructionNote}>Syringe Illustration (calculated mark highlighted)</Text>
            <SyringeIllustration
              syringeType={manualSyringe.type}
              syringeVolume={manualSyringe.volume}
              recommendedMarking={recommendedMarking}
              syringeOptions={{ [manualSyringe.type]: { [manualSyringe.volume]: getSyringeMarkings(manualSyringe) || '' } }}
            />
          </View>
          <View style={styles.verificationReminder}>
            <Info color="#065F46" size={14} />
            <Text style={styles.verificationReminderText}>
              Confirm this matches your healthcare provider's prescription before proceeding.
            </Text>
          </View>
        </View>
      )}
      
      {/* Calculation Breakdown Toggle - only show when we have valid calculation results */}
      {(!calculationError && (recommendedMarking || calculatedVolume !== null)) && (
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
                    {formatDoseNumber(getConcentrationForDisplay()!, 3)} {concentrationUnit || 'mg/ml'}
                  </Text>
                </View>
              )}
              
              {calculatedVolume !== null && (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Final Volume to Draw:</Text>
                  <Text style={styles.breakdownValue}>
                    {formatDoseNumber(calculatedVolume, 3)} ml
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
            Scan a vial or syringe to fill in details faster.
          </Text>
          <TouchableOpacity 
            style={styles.scanTeaserButton}
            onPress={onTryAIScan}
            accessibilityRole="button"
            accessibilityLabel="Try AI Scan to enter vial or syringe details"
          >
            <CameraIcon color="#007AFF" size={14} style={{ marginRight: 4 }} />
            <Text style={styles.scanTeaserButtonText}>Try AI Scan</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <View style={styles.takenAtContainer}>
        <Text style={styles.takenAtLabel}>Time taken (optional)</Text>
        <TextInput
          style={styles.takenAtInput}
          value={takenAtText}
          onChangeText={(t) => { setTakenAtText(t); setTakenAtError(null); }}
          placeholder="Now. Or type YYYY-MM-DD HH:MM"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Time the dose was taken, optional. Leave blank for now."
        />
        <Text style={styles.takenAtHint}>Leave blank for now. Up to 30 days back, not in the future.</Text>
        {takenAtError ? <Text style={styles.takenAtError}>{takenAtError}</Text> : null}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: '#007AFF' }, isMobileWeb && styles.actionButtonMobile]} 
          onPress={() => handleGoToFeedback('start_over')}
        >
          <Check color="#fff" size={18} style={{ marginRight: 8 }} />
          <Text style={styles.buttonText}>Done</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.actionButton, 
            { backgroundColor: isSaving ? '#9CA3AF' : '#3B82F6' }, 
            isMobileWeb && styles.actionButtonMobile
          ]} 
          onPress={handleSaveDose}
          disabled={isSaving || isSigningIn || pendingSave || isLogging || !!calculationError || !recommendedMarking}
        >
          <Save color="#fff" size={18} style={{ marginRight: 8 }} />
          <Text style={styles.buttonText}>
            {isSigningIn || pendingSave ? 'Signing in...' : isSaving || isLogging ? 'Saving...' : 'Save'
            }
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
  );
}

const styles = StyleSheet.create({
  takenAtContainer: { marginTop: 16, width: '100%' },
  takenAtLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  takenAtInput: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: '#111827', backgroundColor: '#fff' },
  takenAtHint: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  takenAtError: { fontSize: 13, color: '#DC2626', marginTop: 4 },
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
  buttonContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', width: '100%', marginTop: 20, gap: 10 },
  actionButton: { paddingVertical: 14, paddingHorizontal: 8, borderRadius: 8, flex: 1, flexBasis: 140, minWidth: 140, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginHorizontal: 5, minHeight: 50 },
  actionButtonMobile: { paddingVertical: 16, minHeight: 60 },
  buttonText: { color: '#f8fafc', fontSize: 16, fontWeight: '500', textAlign: 'center', flexShrink: 1 },
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
  verificationReminder: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(6, 95, 70, 0.2)',
    gap: 8,
  },
  verificationReminderText: {
    fontSize: 13,
    color: '#065F46',
    flex: 1,
    fontWeight: '500',
  },
});
