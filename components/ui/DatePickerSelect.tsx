import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, Modal, ScrollView, TouchableOpacity } from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import { ChevronDown } from 'lucide-react-native';
import { isMobileWeb } from '@/lib/utils';

interface DatePickerSelectProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  items: Array<{ label: string; value: string }>;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
}

export default function DatePickerSelect({
  label,
  value,
  onValueChange,
  items,
  placeholder = `Select ${label.toLowerCase()}`,
  disabled = false,
  error = false
}: DatePickerSelectProps) {
  const [open, setOpen] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const closePicker = () => {
    setShowOptions(false);
    setOpen(false);
  };
  // A modal keeps the option list outside sibling controls' stacking contexts.
  if (Platform.OS === 'web') {
    const dialogLabel = `Select ${label.toLowerCase()}`;
    return (
      <View style={[styles.container, isMobileWeb && styles.containerMobile]}>
        <Text style={styles.label}>{label}</Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={value ? `${label}, ${items.find(item => item.value === value)?.label || value}` : label}
          accessibilityState={{ disabled, expanded: open }}
          disabled={disabled}
          style={[styles.pickerContainer, disabled && styles.pickerContainerDisabled]}
          onPress={() => setOpen(true)}
        >
          <Text style={styles.pickerInput}>{items.find(item => item.value === value)?.label || placeholder}</Text>
        </TouchableOpacity>
        {/* Wait for the web modal to install its focus trap before showing the options. */}
        <Modal
          visible={open}
          transparent
          animationType="none"
          accessibilityLabel={dialogLabel}
          onShow={() => setShowOptions(true)}
          onRequestClose={closePicker}
        >
          {showOptions && (
            <View style={styles.overlay}>
              <View style={styles.options} accessibilityViewIsModal>
                <Text style={styles.label}>{dialogLabel}</Text>
                <ScrollView style={{ maxHeight: 320 }}>
                  {items.map(item => (
                    <TouchableOpacity key={item.value} accessibilityRole="button"
                      accessibilityLabel={item.label} accessibilityState={{ selected: item.value === value }}
                      onPress={() => { onValueChange(item.value); closePicker(); }}>
                      <Text style={styles.pickerInput}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity accessibilityRole="button" onPress={closePicker}>
                  <Text style={styles.pickerInput}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Modal>
      </View>
    );
  }
  return (
    <View style={[styles.container, isMobileWeb && styles.containerMobile]}>
      <Text style={[
        styles.label,
        isMobileWeb && styles.labelMobile,
        error && styles.labelError,
        disabled && styles.labelDisabled
      ]}>
        {label}
      </Text>
      <View style={[
        styles.pickerContainer,
        isMobileWeb && styles.pickerContainerMobile,
        error && styles.pickerContainerError,
        disabled && styles.pickerContainerDisabled
      ]}>
        <RNPickerSelect
          onValueChange={onValueChange}
          items={items}
          value={value}
          placeholder={{
            label: placeholder,
            value: '',
            color: '#8E8E93'
          }}
          disabled={disabled}
          style={{
            inputIOS: [
              styles.pickerInput,
              isMobileWeb && styles.pickerInputMobile,
              disabled && styles.pickerInputDisabled
            ],
            inputAndroid: [
              styles.pickerInput,
              isMobileWeb && styles.pickerInputMobile,
              disabled && styles.pickerInputDisabled
            ],
            inputWeb: [
              styles.pickerInput,
              styles.pickerInputWeb,
              isMobileWeb && styles.pickerInputMobile,
              disabled && styles.pickerInputDisabled
            ],
            placeholder: {
              color: '#8E8E93',
              fontSize: isMobileWeb ? 15 : 16
            }
          }}
          useNativeAndroidPickerStyle={false}
          Icon={() => (
            <ChevronDown 
              size={isMobileWeb ? 16 : 18} 
              color={disabled ? '#C7C7CC' : '#8E8E93'} 
              style={styles.chevronIcon}
            />
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  options: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, width: '100%', maxWidth: 350, maxHeight: '85%' },
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  labelError: {
    color: '#FF3B30',
  },
  labelDisabled: {
    color: '#8E8E93',
  },
  pickerContainer: {
    backgroundColor: '#F9F9F9',
    borderWidth: 2,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    position: 'relative',
  },
  pickerContainerError: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  pickerContainerDisabled: {
    backgroundColor: '#F2F2F7',
    borderColor: '#D1D1D6',
  },
  pickerInput: {
    fontSize: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    paddingRight: 40,
    color: '#000000',
    fontWeight: '500',
  },
  pickerInputWeb: {
    position: 'relative',
    width: '100%',
    height: 54,
  },
  pickerInputDisabled: {
    color: '#8E8E93',
  },
  chevronIcon: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -9,
  },

  // Mobile-specific styles
  containerMobile: {
    marginBottom: 14,
  },
  labelMobile: {
    fontSize: 15,
    marginBottom: 6,
  },
  pickerContainerMobile: {
    borderRadius: 10,
  },
  pickerInputMobile: {
    fontSize: 15,
    paddingVertical: 14,
    paddingRight: 36,
  },
});