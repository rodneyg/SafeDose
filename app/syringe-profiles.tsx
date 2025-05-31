import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { PlusCircle, Edit3, Trash2, RefreshCw } from 'lucide-react-native';
import {
  getSyringeProfiles,
  saveSyringeProfile,
  deleteSyringeProfile,
  updateSyringeProfile,
  SyringeProfile,
  SyringeProfileData,
} from '../lib/syringeProfileUtils'; // Adjust path if needed

type ScreenMode = 'list' | 'add' | 'edit';

export default function SyringeProfilesScreen() {
  const [profiles, setProfiles] = useState<SyringeProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [screenMode, setScreenMode] = useState<ScreenMode>('list');
  const [currentProfile, setCurrentProfile] = useState<SyringeProfile | null>(null);

  // Form state for adding/editing
  const [profileName, setProfileName] = useState('');
  const [syringeType, setSyringeType] = useState<'Insulin' | 'Standard'>('Standard');
  const [volume, setVolume] = useState('');
  const [markings, setMarkings] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const fetchProfiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedProfiles = await getSyringeProfiles();
      setProfiles(fetchedProfiles);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch profiles.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProfiles();
      setScreenMode('list'); // Reset to list mode on focus
    }, [fetchProfiles])
  );

  const handleAddNew = () => {
    setCurrentProfile(null);
    setProfileName('');
    setSyringeType('Standard');
    setVolume('');
    setMarkings('');
    setFormError(null);
    setScreenMode('add');
  };

  const handleEdit = (profile: SyringeProfile) => {
    setCurrentProfile(profile);
    setProfileName(profile.profileName);
    setSyringeType(profile.syringeType);
    setVolume(profile.volume);
    setMarkings(profile.markings);
    setFormError(null);
    setScreenMode('edit');
  };

  const handleDelete = (profileId: string) => {
    Alert.alert(
      'Delete Profile',
      'Are you sure you want to delete this syringe profile?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            const success = await deleteSyringeProfile(profileId);
            if (success) {
              fetchProfiles(); // Refresh list
            } else {
              Alert.alert('Error', 'Failed to delete profile.');
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const validateForm = (): boolean => {
    if (!profileName.trim()) {
      setFormError('Profile name cannot be empty.');
      return false;
    }
    if (!volume.trim()) {
      setFormError('Volume cannot be empty.');
      return false;
    }
    if (!markings.trim()) {
      setFormError('Markings cannot be empty.');
      return false;
    }
    const markingValues = markings.split(',').map(m => parseFloat(m.trim()));
    if (markingValues.some(isNaN)) {
      setFormError('Markings must be comma-separated numbers (e.g., 0.1,0.2,0.3).');
      return false;
    }
    setFormError(null);
    return true;
  };

  const handleSaveProfile = async () => {
    if (!validateForm()) {
      return;
    }
    setIsLoading(true);
    const dataToSave: SyringeProfileData = { profileName, syringeType, volume, markings };

    let success = false;
    if (screenMode === 'edit' && currentProfile?.id) {
      success = await updateSyringeProfile(currentProfile.id, dataToSave);
    } else {
      const newId = await saveSyringeProfile(dataToSave);
      success = !!newId;
    }

    if (success) {
      fetchProfiles();
      setScreenMode('list');
    } else {
      Alert.alert('Error', `Failed to ${screenMode === 'edit' ? 'update' : 'save'} profile.`);
      setIsLoading(false); // Keep form open on error
    }
  };

  const renderProfileItem = ({ item }: { item: SyringeProfile }) => (
    <View style={styles.itemContainer}>
      <View style={styles.itemTextContainer}>
        <Text style={styles.itemTitle}>{item.profileName}</Text>
        <Text style={styles.itemSubtitle}>
          {item.syringeType} - {item.volume}
        </Text>
        <Text style={styles.itemMarkings} numberOfLines={1}>
          Markings: {item.markings}
        </Text>
      </View>
      <View style={styles.itemActions}>
        <TouchableOpacity onPress={() => handleEdit(item)} style={styles.actionButton}>
          <Edit3 size={20} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item.id!)} style={styles.actionButton}>
          <Trash2 size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderListScreen = () => (
    <>
      {isLoading && profiles.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
          <Text>Loading profiles...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.button} onPress={fetchProfiles}><Text style={styles.buttonText}>Retry</Text></TouchableOpacity>
        </View>
      ) : profiles.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No custom syringe profiles found.</Text>
          <Text style={styles.emptyHelpText}>Add a new profile to get started.</Text>
        </View>
      ) : (
        <FlatList
          data={profiles}
          renderItem={renderProfileItem}
          keyExtractor={(item) => item.id!}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </>
  );

  const renderFormScreen = () => (
    <ScrollView style={styles.formContainer}>
      <Text style={styles.formLabel}>Profile Name</Text>
      <TextInput
        style={styles.input}
        value={profileName}
        onChangeText={setProfileName}
        placeholder="e.g., My BD 1mL Syringe"
      />

      <Text style={styles.formLabel}>Syringe Type</Text>
      <View style={styles.segmentedControl}>
        <TouchableOpacity
          style={[styles.segmentButton, syringeType === 'Standard' && styles.segmentActive]}
          onPress={() => setSyringeType('Standard')}>
          <Text style={[styles.segmentText, syringeType === 'Standard' && styles.segmentActiveText]}>Standard</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentButton, syringeType === 'Insulin' && styles.segmentActive]}
          onPress={() => setSyringeType('Insulin')}>
          <Text style={[styles.segmentText, syringeType === 'Insulin' && styles.segmentActiveText]}>Insulin</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.formLabel}>Total Volume</Text>
      <TextInput
        style={styles.input}
        value={volume}
        onChangeText={setVolume}
        placeholder="e.g., 1 mL, 0.5 mL, 100 units"
      />

      <Text style={styles.formLabel}>Markings (comma-separated)</Text>
      <TextInput
        style={styles.input}
        value={markings}
        onChangeText={setMarkings}
        placeholder="e.g., 0.1,0.2,0.3,0.4,0.5"
        multiline
        numberOfLines={3}
      />
      <Text style={styles.inputHelper}>Enter all numerical markings on the syringe, separated by commas.</Text>

      {formError && <Text style={styles.formErrorText}>{formError}</Text>}

      <TouchableOpacity style={[styles.button, styles.saveButton, isLoading && styles.disabledButton]} onPress={handleSaveProfile} disabled={isLoading}>
        {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save Profile</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => setScreenMode('list')}>
        <Text style={styles.buttonText}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {screenMode === 'list' ? 'Syringe Profiles' : screenMode === 'add' ? 'Add New Profile' : 'Edit Profile'}
        </Text>
        {screenMode === 'list' && (
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={fetchProfiles} style={styles.headerButton} disabled={isLoading}>
              {isLoading && profiles.length > 0 ? <ActivityIndicator /> : <RefreshCw size={22} color="#007AFF" />}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleAddNew} style={styles.headerButton} disabled={isLoading}>
              <PlusCircle size={24} color="#007AFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>
      {screenMode === 'list' ? renderListScreen() : renderFormScreen()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F2F2F7' },
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'android' ? 25 : 12, // Adjust for status bar on Android
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#D1D1D6',
  },
  title: { fontSize: 22, fontWeight: 'bold' },
  headerActions: { flexDirection: 'row' },
  headerButton: { padding: 8, marginLeft: 8 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 16, color: 'red', textAlign: 'center', marginBottom: 10 },
  emptyText: { fontSize: 18, color: '#333', textAlign: 'center', marginBottom: 5 },
  emptyHelpText: { fontSize: 14, color: '#666', textAlign: 'center' },
  listContent: { padding: 16 },
  itemContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 15,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  itemTextContainer: { flex: 1, marginRight: 10 },
  itemTitle: { fontSize: 17, fontWeight: '500', color: '#1C1C1E' },
  itemSubtitle: { fontSize: 14, color: '#555', marginTop: 2 },
  itemMarkings: { fontSize: 12, color: '#777', marginTop: 4, fontStyle: 'italic' },
  itemActions: { flexDirection: 'row' },
  actionButton: { padding: 8, marginLeft: 8 },
  formContainer: { flex: 1, padding: 20 },
  formLabel: { fontSize: 16, fontWeight: '500', color: '#333', marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D1D6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 4,
  },
  inputHelper: { fontSize: 12, color: '#666', marginBottom: 12 },
  segmentedControl: { flexDirection: 'row', marginBottom: 12 },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentActive: { backgroundColor: '#007AFF' },
  segmentText: { fontSize: 15, color: '#007AFF' },
  segmentActiveText: { color: '#FFFFFF' },
  formErrorText: { fontSize: 14, color: 'red', textAlign: 'center', marginTop: 8, marginBottom: 10 },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '500' },
  saveButton: { backgroundColor: '#34C759' }, // Green for save
  cancelButton: { backgroundColor: '#FF3B30', marginTop: 10 }, // Red for cancel
  disabledButton: { opacity: 0.7 },
});
