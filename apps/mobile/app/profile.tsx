import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Pressable, 
  TextInput, 
  Alert, 
  Share,
  Modal,
  SafeAreaView,
  Image,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useProfileStore } from '../src/stores/profileStore';
import { useBodyMetricStore } from '../src/stores/bodyMetricStore';
import { FitnessGoal, ExperienceLevel, UnitSystem, BiologicalSex } from '@fitness-tracker/domain';
import { useExerciseStore } from '../src/stores/exerciseStore';
import { ExercisePickerModal } from '../src/components/workout/ExercisePickerModal';

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, updateProfile, getStatistics, clearAllData, exportData } = useProfileStore();

  const [name, setName] = useState(profile.displayName);
  const [goal, setGoal] = useState<FitnessGoal | ''>(profile.fitnessGoal || '');
  const [level, setLevel] = useState<ExperienceLevel | ''>(profile.experienceLevel || '');
  const [sex, setSex] = useState<BiologicalSex | ''>(profile.biologicalSex || '');
  
  const [height, setHeight] = useState(() => {
    if (profile.heightCm === undefined) return '';
    return profile.preferredUnits === 'imperial'
      ? (profile.heightCm / 2.54).toFixed(1)
      : profile.heightCm.toFixed(1);
  });
  
  const [weight, setWeight] = useState(() => {
    if (profile.weightKg === undefined) return '';
    return profile.preferredUnits === 'imperial'
      ? (profile.weightKg * 2.20462).toFixed(1)
      : profile.weightKg.toFixed(1);
  });

  const [benchPressMax, setBenchPressMax] = useState(() => {
    if (profile.benchPressMaxKg === undefined) return '';
    return profile.preferredUnits === 'imperial'
      ? (profile.benchPressMaxKg * 2.20462).toFixed(1)
      : profile.benchPressMaxKg.toFixed(1);
  });

  const [squatMax, setSquatMax] = useState(() => {
    if (profile.squatMaxKg === undefined) return '';
    return profile.preferredUnits === 'imperial'
      ? (profile.squatMaxKg * 2.20462).toFixed(1)
      : profile.squatMaxKg.toFixed(1);
  });

  const [deadliftMax, setDeadliftMax] = useState(() => {
    if (profile.deadliftMaxKg === undefined) return '';
    return profile.preferredUnits === 'imperial'
      ? (profile.deadliftMaxKg * 2.20462).toFixed(1)
      : profile.deadliftMaxKg.toFixed(1);
  });

  const [jsonModalVisible, setJsonModalVisible] = useState(false);
  const [exportedJson, setExportedJson] = useState('');

  const { exercises } = useExerciseStore();
  const [isRpePickerVisible, setRpePickerVisible] = useState(false);
  const [isRirPickerVisible, setRirPickerVisible] = useState(false);
  const stats = getStatistics();

  const handleSaveProfile = () => {
    if (!name.trim()) {
      return Alert.alert('Error', 'Display Name cannot be empty.');
    }
    const updates: Partial<typeof profile> = {
      displayName: name.trim(),
    };
    if (goal) {
      updates.fitnessGoal = goal;
    }
    if (level) {
      updates.experienceLevel = level;
    }
    if (sex) {
      updates.biologicalSex = sex;
    }

    if (height.trim()) {
      const hVal = parseFloat(height);
      if (isNaN(hVal) || hVal <= 0) return Alert.alert('Error', 'Height must be a positive number.');
      updates.heightCm = profile.preferredUnits === 'imperial' ? hVal * 2.54 : hVal;
    }

    if (weight.trim()) {
      const wVal = parseFloat(weight);
      if (isNaN(wVal) || wVal <= 0) return Alert.alert('Error', 'Weight must be a positive number.');
      const canonicalWeight = profile.preferredUnits === 'imperial' ? wVal / 2.20462 : wVal;
      updates.weightKg = canonicalWeight;
      
      // Sync to body metric tracker!
      useBodyMetricStore.getState().addMetric({
        recordedAt: new Date(),
        weightKg: canonicalWeight,
      });
    }

    if (benchPressMax.trim()) {
      const val = parseFloat(benchPressMax);
      if (isNaN(val) || val <= 0) return Alert.alert('Error', 'Bench Press Max must be a positive number.');
      updates.benchPressMaxKg = profile.preferredUnits === 'imperial' ? val / 2.20462 : val;
    }

    if (squatMax.trim()) {
      const val = parseFloat(squatMax);
      if (isNaN(val) || val <= 0) return Alert.alert('Error', 'Squat Max must be a positive number.');
      updates.squatMaxKg = profile.preferredUnits === 'imperial' ? val / 2.20462 : val;
    }

    if (deadliftMax.trim()) {
      const val = parseFloat(deadliftMax);
      if (isNaN(val) || val <= 0) return Alert.alert('Error', 'Deadlift Max must be a positive number.');
      updates.deadliftMaxKg = profile.preferredUnits === 'imperial' ? val / 2.20462 : val;
    }

    updateProfile(updates);
    Alert.alert('Success', 'Profile updated successfully!');
  };

  const handleToggleUnits = () => {
    const nextUnit: UnitSystem = profile.preferredUnits === 'metric' ? 'imperial' : 'metric';
    updateProfile({ preferredUnits: nextUnit });

    const isNowImperial = nextUnit === 'imperial';

    setHeight((prev: string) => {
      if (!prev) return '';
      const val = parseFloat(prev);
      if (isNaN(val)) return '';
      return isNowImperial ? (val / 2.54).toFixed(1) : (val * 2.54).toFixed(1);
    });

    setWeight((prev: string) => {
      if (!prev) return '';
      const val = parseFloat(prev);
      if (isNaN(val)) return '';
      return isNowImperial ? (val * 2.20462).toFixed(1) : (val / 2.20462).toFixed(1);
    });

    setBenchPressMax((prev: string) => {
      if (!prev) return '';
      const val = parseFloat(prev);
      if (isNaN(val)) return '';
      return isNowImperial ? (val * 2.20462).toFixed(1) : (val / 2.20462).toFixed(1);
    });

    setSquatMax((prev: string) => {
      if (!prev) return '';
      const val = parseFloat(prev);
      if (isNaN(val)) return '';
      return isNowImperial ? (val * 2.20462).toFixed(1) : (val / 2.20462).toFixed(1);
    });

    setDeadliftMax((prev: string) => {
      if (!prev) return '';
      const val = parseFloat(prev);
      if (isNaN(val)) return '';
      return isNowImperial ? (val * 2.20462).toFixed(1) : (val / 2.20462).toFixed(1);
    });
  };

  const handleExport = async () => {
    try {
      const dataStr = exportData();
      setExportedJson(dataStr);
      
      Alert.alert(
        'Export Data',
        'Would you like to share the backup JSON or view it on screen?',
        [
          {
            text: 'Share / Save File',
            onPress: async () => {
              await Share.share({
                message: dataStr,
                title: 'Fitness Tracker Backup',
              });
            }
          },
          {
            text: 'View on Screen',
            onPress: () => setJsonModalVisible(true)
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } catch {
      Alert.alert('Error', 'Failed to export data.');
    }
  };

  const handleResetData = () => {
    Alert.alert(
      'Reset All Data',
      'WARNING: This will permanently delete all your workouts, metrics, custom exercises, and settings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset Everything', 
          style: 'destructive',
          onPress: () => {
            clearAllData();
            setName('User');
            setGoal('');
            setLevel('');
            Alert.alert('Data Cleared', 'All local data has been reset.');
          }
        }
      ]
    );
  };

  const formatGoal = (g: FitnessGoal) => {
    return g.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.base64) {
          const uri = `data:image/jpeg;base64,${asset.base64}`;
          updateProfile({ profileImageUri: uri });
        } else if (asset.uri) {
          updateProfile({ profileImageUri: asset.uri });
        }
      }
    } catch {
      Alert.alert('Error', 'Could not pick image.');
    }
  };

  const profileInitials = (profile.displayName || 'U')
    .split(' ')
    .map(w => w.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={15} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#90D5FF" />
        </Pressable>
        <Text style={styles.headerTitle}>Profile & Settings</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Profile Picture */}
        <View style={styles.avatarSection}>
          <Pressable onPress={handlePickImage} style={styles.avatarContainer}>
            {profile.profileImageUri ? (
              <Image source={{ uri: profile.profileImageUri }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarImage, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitials}>{profileInitials}</Text>
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              <Ionicons name="camera" size={14} color="#0B0B0F" />
            </View>
          </Pressable>
          <Text style={styles.avatarNameText}>{profile.displayName || 'User'}</Text>
        </View>

        {/* Profile Card Info */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>User Info</Text>
          <Text style={styles.inputLabel}>Display Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Name"
            placeholderTextColor="#8A8D9F"
          />

          <Text style={styles.inputLabel}>Training Goal</Text>
          <View style={styles.chipRow}>
            {(['build_muscle', 'gain_strength', 'lose_fat', 'general_fitness'] as FitnessGoal[]).map(g => (
              <Pressable
                key={g}
                style={[styles.chip, goal === g && styles.chipActive]}
                onPress={() => setGoal(goal === g ? '' : g)}
              >
                <Text style={[styles.chipText, goal === g && styles.chipTextActive]}>{formatGoal(g)}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.inputLabel}>Lifting Experience</Text>
          <View style={styles.chipRow}>
            {(['beginner', 'intermediate', 'advanced'] as ExperienceLevel[]).map(l => (
              <Pressable
                key={l}
                style={[styles.chip, level === l && styles.chipActive]}
                onPress={() => setLevel(level === l ? '' : l)}
              >
                <Text style={[styles.chipText, level === l && styles.chipTextActive]}>
                  {l.charAt(0).toUpperCase() + l.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.inputLabel}>Biological Sex</Text>
          <View style={styles.chipRow}>
            {([
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
              { value: 'other', label: 'Other' },
              { value: 'prefer_not_to_say', label: 'Prefer not to say' }
            ] as { value: BiologicalSex; label: string }[]).map(s => (
              <Pressable
                key={s.value}
                style={[styles.chip, sex === s.value && styles.chipActive]}
                onPress={() => setSex(sex === s.value ? '' : s.value)}
              >
                <Text style={[styles.chipText, sex === s.value && styles.chipTextActive]}>
                  {s.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.inputGrid}>
            <View style={styles.gridField}>
              <Text style={styles.inputLabel}>Height ({profile.preferredUnits === 'imperial' ? 'in' : 'cm'})</Text>
              <TextInput
                style={styles.input}
                value={height}
                onChangeText={setHeight}
                placeholder={profile.preferredUnits === 'imperial' ? 'e.g. 70' : 'e.g. 180'}
                placeholderTextColor="#8A8D9F"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.gridField}>
              <Text style={styles.inputLabel}>Weight ({profile.preferredUnits === 'imperial' ? 'lbs' : 'kg'})</Text>
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={setWeight}
                placeholder={profile.preferredUnits === 'imperial' ? 'e.g. 175' : 'e.g. 80'}
                placeholderTextColor="#8A8D9F"
                keyboardType="numeric"
              />
            </View>
          </View>

          <Text style={styles.sectionDivider}>Key Lift Maxes ({profile.preferredUnits === 'imperial' ? 'lbs' : 'kg'})</Text>
          
          <View style={styles.inputGrid}>
            <View style={styles.gridField}>
              <Text style={styles.inputLabel}>Bench Press</Text>
              <TextInput
                style={styles.input}
                value={benchPressMax}
                onChangeText={setBenchPressMax}
                placeholder="Bench"
                placeholderTextColor="#8A8D9F"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.gridField}>
              <Text style={styles.inputLabel}>Squat</Text>
              <TextInput
                style={styles.input}
                value={squatMax}
                onChangeText={setSquatMax}
                placeholder="Squat"
                placeholderTextColor="#8A8D9F"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.gridField}>
              <Text style={styles.inputLabel}>Deadlift</Text>
              <TextInput
                style={styles.input}
                value={deadliftMax}
                onChangeText={setDeadliftMax}
                placeholder="Deadlift"
                placeholderTextColor="#8A8D9F"
                keyboardType="numeric"
              />
            </View>
          </View>

          <Pressable style={styles.saveBtn} onPress={handleSaveProfile}>
            <Text style={styles.saveBtnText}>Save Profile</Text>
          </Pressable>
        </View>

        {/* Statistics Grid */}
        <Text style={styles.listSectionTitle}>Lifetime Stats</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Workouts</Text>
            <Text style={styles.statValue}>{stats.totalWorkouts}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Volume</Text>
            <Text style={styles.statValue}>
              {stats.totalVolume.toLocaleString()} {profile.preferredUnits === 'imperial' ? 'lbs' : 'kg'}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Longest Streak</Text>
            <Text style={styles.statValue}>{stats.longestStreak} days</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Current Streak</Text>
            <Text style={styles.statValue}>{stats.currentStreak} days</Text>
          </View>
        </View>

        {/* Settings options */}
        <Text style={styles.listSectionTitle}>Application Settings</Text>
        <View style={styles.sectionCard}>
          <Pressable style={styles.settingsRow} onPress={handleToggleUnits}>
            <View style={styles.settingsRowLeft}>
              <Ionicons name="options-outline" size={22} color="#8A8D9F" />
              <Text style={styles.settingsLabel}>Measurement Units</Text>
            </View>
            <View style={styles.settingsRowRight}>
              <Text style={styles.settingsValue}>
                {profile.preferredUnits === 'metric' ? 'Metric (kg/cm)' : 'Imperial (lbs/in)'}
              </Text>
              <Ionicons name="chevron-forward" size={18} color="#8A8D9F" />
            </View>
          </Pressable>

          <View style={styles.settingsRowVertical}>
            <View style={styles.settingsRowLeft}>
              <Ionicons name="eye-outline" size={22} color="#8A8D9F" />
              <Text style={styles.settingsLabel}>RPE Column Tracking</Text>
            </View>
            <View style={styles.chipRow}>
              {([
                { value: 'always_on', label: 'Always Show' },
                { value: 'always_off', label: 'Always Hide' },
                { value: 'selected_exercises', label: 'For Selected' }
              ] as const).map(opt => {
                const isActive = (profile.rpeMode || 'always_on') === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    style={[styles.chip, isActive && styles.chipActive]}
                    onPress={() => updateProfile({ rpeMode: opt.value })}
                  >
                    <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            {profile.rpeMode === 'selected_exercises' && (
              <View style={styles.selectedExercisesContainer}>
                <Pressable style={styles.selectBtn} onPress={() => setRpePickerVisible(true)}>
                  <Text style={styles.selectBtnText}>
                    Select Exercises ({profile.rpeEnabledExerciseIds?.length || 0} selected)
                  </Text>
                </Pressable>
                {profile.rpeEnabledExerciseIds && profile.rpeEnabledExerciseIds.length > 0 && (
                  <Text style={styles.selectedExercisesText}>
                    Selected: {profile.rpeEnabledExerciseIds.map(id => exercises.find(e => e.id === id)?.name).filter(Boolean).join(', ')}
                  </Text>
                )}
              </View>
            )}
          </View>

          <View style={styles.settingsRowVertical}>
            <View style={styles.settingsRowLeft}>
              <Ionicons name="eye-outline" size={22} color="#8A8D9F" />
              <Text style={styles.settingsLabel}>RIR Column Tracking</Text>
            </View>
            <View style={styles.chipRow}>
              {([
                { value: 'always_on', label: 'Always Show' },
                { value: 'always_off', label: 'Always Hide' },
                { value: 'selected_exercises', label: 'For Selected' }
              ] as const).map(opt => {
                const isActive = (profile.rirMode || 'always_on') === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    style={[styles.chip, isActive && styles.chipActive]}
                    onPress={() => updateProfile({ rirMode: opt.value })}
                  >
                    <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            {profile.rirMode === 'selected_exercises' && (
              <View style={styles.selectedExercisesContainer}>
                <Pressable style={styles.selectBtn} onPress={() => setRirPickerVisible(true)}>
                  <Text style={styles.selectBtnText}>
                    Select Exercises ({profile.rirEnabledExerciseIds?.length || 0} selected)
                  </Text>
                </Pressable>
                {profile.rirEnabledExerciseIds && profile.rirEnabledExerciseIds.length > 0 && (
                  <Text style={styles.selectedExercisesText}>
                    Selected: {profile.rirEnabledExerciseIds.map(id => exercises.find(e => e.id === id)?.name).filter(Boolean).join(', ')}
                  </Text>
                )}
              </View>
            )}
          </View>

          <Pressable style={styles.settingsRow} onPress={handleExport}>
            <View style={styles.settingsRowLeft}>
              <Ionicons name="download-outline" size={22} color="#8A8D9F" />
              <Text style={styles.settingsLabel}>Export Data (JSON)</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#8A8D9F" />
          </Pressable>

          <Pressable style={[styles.settingsRow, styles.lastRow]} onPress={handleResetData}>
            <View style={styles.settingsRowLeft}>
              <Ionicons name="trash-outline" size={22} color="#ef4444" />
              <Text style={[styles.settingsLabel, styles.dangerText]}>Reset All Data</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#8A8D9F" />
          </Pressable>
        </View>
      </ScrollView>

      {/* Exercise Selection Modals */}
      <ExercisePickerModal
        visible={isRpePickerVisible}
        onClose={() => setRpePickerVisible(false)}
        onSelect={(exerciseIds) => updateProfile({ rpeEnabledExerciseIds: exerciseIds })}
      />
      <ExercisePickerModal
        visible={isRirPickerVisible}
        onClose={() => setRirPickerVisible(false)}
        onSelect={(exerciseIds) => updateProfile({ rirEnabledExerciseIds: exerciseIds })}
      />

      {/* JSON Backup viewer Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={jsonModalVisible}
        onRequestClose={() => setJsonModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Backup JSON</Text>
              <Pressable onPress={() => setJsonModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color="#8A8D9F" />
              </Pressable>
            </View>
            <ScrollView style={styles.jsonScrollView}>
              <Text selectable style={styles.jsonText}>{exportedJson}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B0B0F',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 14 : 48,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2B31',
    backgroundColor: '#1A1C23',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#F4F5F7',
    textTransform: 'uppercase',
  },
  headerRight: {
    width: 28,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionCard: {
    backgroundColor: '#1A1C23',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2B31',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#90D5FF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_600SemiBold',
    color: '#8A8D9F',
    marginBottom: 6,
    marginTop: 12,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#0B0B0F',
    borderWidth: 1,
    borderColor: '#2A2B31',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: 'Manrope_500Medium',
    color: '#F4F5F7',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    backgroundColor: '#2A2B31',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  chipActive: {
    backgroundColor: '#90D5FF',
  },
  chipText: {
    color: '#8A8D9F',
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  chipTextActive: {
    color: '#0B0B0F',
  },
  saveBtn: {
    backgroundColor: '#90D5FF',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnText: {
    color: '#0B0B0F',
    fontSize: 15,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  listSectionTitle: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#8A8D9F',
    marginBottom: 12,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: '#1A1C23',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2B31',
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_600SemiBold',
    color: '#8A8D9F',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#F4F5F7',
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2B31',
  },
  settingsRowVertical: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2B31',
    gap: 8,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  settingsRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  settingsLabel: {
    fontSize: 15,
    fontFamily: 'Manrope_500Medium',
    color: '#F4F5F7',
  },
  settingsValue: {
    fontSize: 14,
    fontFamily: 'Manrope_500Medium',
    color: '#8A8D9F',
  },
  dangerText: {
    color: '#ef4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 11, 15, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1A1C23',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '75%',
    borderWidth: 1,
    borderColor: '#2A2B31',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2B31',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#F4F5F7',
  },
  jsonScrollView: {
    padding: 16,
  },
  jsonText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#F4F5F7',
    backgroundColor: '#0B0B0F',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A2B31',
  },
  inputGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  gridField: {
    flex: 1,
  },
  sectionDivider: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#90D5FF',
    marginTop: 20,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectedExercisesContainer: {
    marginTop: 6,
    paddingLeft: 4,
  },
  selectBtn: {
    backgroundColor: '#2A2B31',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#2A2B31',
  },
  selectBtnText: {
    color: '#90D5FF',
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
  },
  selectedExercisesText: {
    fontSize: 13,
    color: '#8A8D9F',
    marginTop: 6,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 8,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: '#90D5FF',
  },
  avatarPlaceholder: {
    backgroundColor: '#1A1C23',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 32,
    color: '#90D5FF',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#90D5FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0B0B0F',
  },
  avatarNameText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 20,
    color: '#F4F5F7',
    textTransform: 'uppercase',
  },
});
