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
  SafeAreaView
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProfileStore } from '../src/stores/profileStore';
import { FitnessGoal, ExperienceLevel, UnitSystem } from '@fitness-tracker/domain';

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, updateProfile, getStatistics, clearAllData, exportData } = useProfileStore();

  const [name, setName] = useState(profile.displayName);
  const [goal, setGoal] = useState<FitnessGoal | ''>(profile.fitnessGoal || '');
  const [level, setLevel] = useState<ExperienceLevel | ''>(profile.experienceLevel || '');
  const [jsonModalVisible, setJsonModalVisible] = useState(false);
  const [exportedJson, setExportedJson] = useState('');

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
    updateProfile(updates);
    Alert.alert('Success', 'Profile updated successfully!');
  };

  const handleToggleUnits = () => {
    const nextUnit: UnitSystem = profile.preferredUnits === 'metric' ? 'imperial' : 'metric';
    updateProfile({ preferredUnits: nextUnit });
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={15} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </Pressable>
        <Text style={styles.headerTitle}>Profile & Settings</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Profile Card Info */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>User Info</Text>
          <Text style={styles.inputLabel}>Display Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Name"
            placeholderTextColor="#94a3b8"
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
              <Ionicons name="options-outline" size={22} color="#475569" />
              <Text style={styles.settingsLabel}>Measurement Units</Text>
            </View>
            <View style={styles.settingsRowRight}>
              <Text style={styles.settingsValue}>
                {profile.preferredUnits === 'metric' ? 'Metric (kg/cm)' : 'Imperial (lbs/in)'}
              </Text>
              <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </View>
          </Pressable>

          <Pressable style={styles.settingsRow} onPress={handleExport}>
            <View style={styles.settingsRowLeft}>
              <Ionicons name="download-outline" size={22} color="#475569" />
              <Text style={styles.settingsLabel}>Export Data (JSON)</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </Pressable>

          <Pressable style={[styles.settingsRow, styles.lastRow]} onPress={handleResetData}>
            <View style={styles.settingsRowLeft}>
              <Ionicons name="trash-outline" size={22} color="#ef4444" />
              <Text style={[styles.settingsLabel, styles.dangerText]}>Reset All Data</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </Pressable>
        </View>
      </ScrollView>

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
                <Ionicons name="close" size={24} color="#64748b" />
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
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    backgroundColor: '#ffffff',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
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
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#3b82f6',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0f172a',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  chipActive: {
    backgroundColor: '#3b82f6',
  },
  chipText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  saveBtn: {
    backgroundColor: '#3b82f6',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  listSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748b',
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
    width: '48%', // roughly half width with gap
    flexGrow: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#334155',
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
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
    fontWeight: '600',
    color: '#334155',
  },
  settingsValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  dangerText: {
    color: '#ef4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  jsonScrollView: {
    padding: 16,
  },
  jsonText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#334155',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
});
