import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Modal } from 'react-native';
import { Star, MessageSquare, X } from 'lucide-react-native';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { isMobileWeb } from '../../lib/utils';

interface CommonDose {
  compound: string;
  dosageRange: string;
  notes: string;
  isPopular?: boolean;
}

const COMMON_DOSES: CommonDose[] = [
  {
    compound: 'BPC-157',
    dosageRange: '200–500mcg daily',
    notes: 'Often used for injury healing',
    isPopular: true,
  },
  {
    compound: 'CJC-1295',
    dosageRange: '1000mcg 2–3x/week',
    notes: 'Growth hormone support',
    isPopular: true,
  },
  {
    compound: 'TB-500',
    dosageRange: '2.0–2.5mg weekly',
    notes: 'Tissue and injury recovery',
    isPopular: true,
  },
  {
    compound: 'Semaglutide',
    dosageRange: '0.25–1mg weekly',
    notes: 'GLP-1 agonist for weight management',
    isPopular: true,
  },
  {
    compound: 'Tirzepatide',
    dosageRange: '2.5–15mg weekly',
    notes: 'Dual GLP-1/GIP agonist for weight loss',
    isPopular: true,
  },
  {
    compound: 'Ipamorelin',
    dosageRange: '200–300mcg 2–3x/day',
    notes: 'Growth hormone releasing peptide',
  },
  {
    compound: 'Melanotan II',
    dosageRange: '0.25–1mg daily',
    notes: 'Tanning and appetite suppression',
  },
  {
    compound: 'PT-141',
    dosageRange: '0.5–2mg as needed',
    notes: 'Sexual enhancement',
  },
  {
    compound: 'IGF-1 LR3',
    dosageRange: '20–40mcg daily',
    notes: 'Muscle growth and recovery',
  },
  {
    compound: 'Hexarelin',
    dosageRange: '100mcg 2–3x/day',
    notes: 'Growth hormone release',
  },
  {
    compound: 'Liraglutide',
    dosageRange: '0.6–3mg daily',
    notes: 'GLP-1 agonist for appetite control',
  },
  {
    compound: 'Dulaglutide',
    dosageRange: '0.75–1.5mg weekly',
    notes: 'GLP-1 agonist for metabolic support',
  },
  {
    compound: 'Exenatide',
    dosageRange: '5–10mcg 2x/day',
    notes: 'GLP-1 agonist for blood sugar control',
  },
  {
    compound: 'GHK-Cu',
    dosageRange: '1–3mg daily',
    notes: 'Copper peptide for skin repair and anti-aging',
    isPopular: true,
  },
  {
    compound: 'Matrixyl',
    dosageRange: '0.5–2mg topically',
    notes: 'Palmitoyl pentapeptide for collagen synthesis',
  },
  {
    compound: 'SNAP-8',
    dosageRange: '1–5mg topically',
    notes: 'Acetyl octapeptide for wrinkle reduction',
  },
  {
    compound: 'Epithalon',
    dosageRange: '5–10mg daily',
    notes: 'Tetrapeptide for anti-aging and longevity',
  },
  {
    compound: 'Thymosin Alpha-1',
    dosageRange: '1.6mg 2x/week',
    notes: 'Immune support and anti-aging peptide',
  },
];

export default function ReferenceScreen() {
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [compoundName, setCompoundName] = useState('');
  const [dosageRange, setDosageRange] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSuggestCompound = () => {
    setShowFeedbackModal(true);
  };

  const handleSubmitSuggestion = async () => {
    if (!compoundName.trim()) {
      Alert.alert('Error', 'Please enter a compound name.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Store suggestion in Firebase
      await addDoc(collection(db, 'compound-suggestions'), {
        compoundName: compoundName.trim(),
        dosageRange: dosageRange.trim(),
        notes: notes.trim(),
        timestamp: new Date(),
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Unknown',
      });

      Alert.alert(
        'Thank you!',
        'Your compound suggestion has been submitted successfully.',
        [{ text: 'OK', onPress: () => setShowFeedbackModal(false) }]
      );

      // Reset form
      setCompoundName('');
      setDosageRange('');
      setNotes('');
    } catch (error) {
      console.error('Error submitting compound suggestion:', error);
      Alert.alert(
        'Error',
        'Failed to submit suggestion. Please try again later.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseFeedbackModal = () => {
    setShowFeedbackModal(false);
    setCompoundName('');
    setDosageRange('');
    setNotes('');
  };

  const renderDoseRow = (dose: CommonDose, index: number) => (
    <View key={index} style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven]}>
      <View style={styles.compoundCell}>
        <View style={styles.compoundHeader}>
          <Text style={styles.compoundName}>{dose.compound}</Text>
          {dose.isPopular && (
            <View style={styles.popularBadge}>
              <Star size={12} color="#fff" fill="#fff" />
              <Text style={styles.popularText}>Most Searched</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.dosageCell}>
        <Text style={styles.dosageText}>{dose.dosageRange}</Text>
      </View>
      <View style={styles.notesCell}>
        <Text style={styles.notesText}>{dose.notes}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Fixed Disclaimer */}
      <View style={styles.disclaimerContainer}>
        <Text style={styles.disclaimerText}>
          ⚠️ This information is for educational purposes only. SafeDose does not provide medical advice. Always consult a healthcare professional before using any compound.
        </Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Common Peptide Doses</Text>
          <Text style={styles.subtitle}>
            Reference information for popular compounds
          </Text>
        </View>

        {/* Table Header */}
        <View style={styles.tableHeader}>
          <View style={styles.compoundHeaderCell}>
            <Text style={styles.headerText}>Compound</Text>
          </View>
          <View style={styles.dosageHeaderCell}>
            <Text style={styles.headerText}>Common Range</Text>
          </View>
          <View style={styles.notesHeaderCell}>
            <Text style={styles.headerText}>Notes / Use Cases</Text>
          </View>
        </View>

        {/* Table Content */}
        <View style={styles.tableContainer}>
          {COMMON_DOSES.map((dose, index) => renderDoseRow(dose, index))}
        </View>

        {/* Feedback Section */}
        <View style={styles.feedbackSection}>
          <TouchableOpacity 
            style={styles.feedbackButton}
            onPress={handleSuggestCompound}
          >
            <MessageSquare size={16} color="#007AFF" />
            <Text style={styles.feedbackButtonText}>
              Suggest a compound to add
            </Text>
          </TouchableOpacity>
        </View>

        {/* Additional Info */}
        <View style={styles.additionalInfo}>
          <Text style={styles.infoTitle}>Important Notes:</Text>
          <Text style={styles.infoText}>
            • Dosages can vary significantly based on individual factors
          </Text>
          <Text style={styles.infoText}>
            • Start with lower doses and adjust as needed
          </Text>
          <Text style={styles.infoText}>
            • Frequency and timing may vary by compound and individual goals
          </Text>
          <Text style={styles.infoText}>
            • Always verify compound purity and authenticity
          </Text>
        </View>
      </ScrollView>

      {/* Feedback Modal */}
      <Modal
        visible={showFeedbackModal}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={handleCloseFeedbackModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Suggest a Compound</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={handleCloseFeedbackModal}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalDescription}>
              Help us expand our reference list by suggesting a compound and its common dosage information.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Compound Name *</Text>
              <TextInput
                style={styles.textInput}
                value={compoundName}
                onChangeText={setCompoundName}
                placeholder="e.g., GHRP-6"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Common Dosage Range</Text>
              <TextInput
                style={styles.textInput}
                value={dosageRange}
                onChangeText={setDosageRange}
                placeholder="e.g., 100-200mcg 2x/day"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Notes / Use Cases</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="e.g., Growth hormone releasing peptide"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleSubmitSuggestion}
              disabled={isSubmitting}
            >
              <Text style={[styles.submitButtonText, isSubmitting && styles.submitButtonTextDisabled]}>
                {isSubmitting ? 'Submitting...' : 'Submit Suggestion'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  disclaimerContainer: {
    backgroundColor: '#FFF3CD',
    borderBottomWidth: 1,
    borderBottomColor: '#FFEAA7',
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...(!isMobileWeb && {
      paddingTop: 16, // Extra padding for mobile status bar
    }),
  },
  disclaimerText: {
    fontSize: 13,
    color: '#856404',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 18,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 2,
    borderBottomColor: '#E5E5EA',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  compoundHeaderCell: {
    flex: 2,
  },
  dosageHeaderCell: {
    flex: 2,
    paddingLeft: 8,
  },
  notesHeaderCell: {
    flex: 3,
    paddingLeft: 8,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableContainer: {
    backgroundColor: '#fff',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    minHeight: 60,
  },
  tableRowEven: {
    backgroundColor: '#FAFAFA',
  },
  compoundCell: {
    flex: 2,
    justifyContent: 'center',
  },
  compoundHeader: {
    flexDirection: 'column',
    gap: 4,
  },
  compoundName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  popularBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    gap: 3,
  },
  popularText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '500',
  },
  dosageCell: {
    flex: 2,
    paddingLeft: 8,
    justifyContent: 'center',
  },
  dosageText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  notesCell: {
    flex: 3,
    paddingLeft: 8,
    justifyContent: 'center',
  },
  notesText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  feedbackSection: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    backgroundColor: '#fff',
    marginTop: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E5EA',
  },
  feedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    gap: 8,
  },
  feedbackButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  additionalInfo: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#fff',
    marginTop: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 6,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    ...(!isMobileWeb && {
      paddingTop: 50, // Account for status bar on mobile
    }),
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButtonTextDisabled: {
    color: '#8E8E93',
  },
});