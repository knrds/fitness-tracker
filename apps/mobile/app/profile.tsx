import { Theme, useThemeStyles, useTheme, withAlpha } from '@fitness-tracker/ui';
import { parseDecimalInput } from '../src/utils/decimalInput';
import { LevelProgress } from '../src/components/LevelProgress';
import { AppearanceSettings } from '../src/components/AppearanceSettings';
import { useAchievementStore } from '../src/stores/achievementStore';
import { getStorageScope, isScopeCurrent } from '../src/data/storageScope';
import { scopedAlert as Alert } from '../src/utils/scopedAlert';
import { useI18n } from '../src/i18n';
import React, { useState } from 'react';

const GOAL_OPTIONS: {
  id: FitnessGoal;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}[] = [
  { id: 'build_muscle', icon: 'barbell-outline' },
  { id: 'gain_strength', icon: 'flash-outline' },
  { id: 'lose_fat', icon: 'flame-outline' },
  { id: 'general_fitness', icon: 'heart-outline' },
];
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Share,
  Modal,
  Image,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import { useProfileStore } from '../src/stores/profileStore';
import { useBodyMetricStore } from '../src/stores/bodyMetricStore';
import { useHistoryStore } from '../src/stores/historyStore';
import { FitnessGoal, ExperienceLevel, UnitSystem, BiologicalSex } from '@fitness-tracker/domain';
import { useExerciseStore } from '../src/stores/exerciseStore';
import { extractBigThreePRsFromHistory } from '../src/utils/bigThree';
import { useAuthStore } from '../src/stores/authStore';
import { useCaffeineStore } from '../src/stores/caffeineStore';
import { ExercisePickerModal } from '../src/components/workout/ExercisePickerModal';
import {
  KeyboardDoneAccessory,
  KEYBOARD_DONE_ID,
} from '../src/components/workout/KeyboardDoneAccessory';
import {
  accountDeletionService,
  CONFIRMATION_KEYWORD,
} from '../src/services/accountDeletionService';

export default function ProfileScreen() {
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  const router = useRouter();
  const achievement = useAchievementStore();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile, getStatistics, clearAllData, exportData } = useProfileStore();
  const { isConfigured: isAuthConfigured, signOut } = useAuthStore();
  const { isEnabled: caffeineEnabled, setEnabled: setCaffeineEnabled } = useCaffeineStore();
  const { t, language, formatGoal, formatLevel, formatSex } = useI18n();
  const isImperial = profile.preferredUnits === 'imperial';

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

  const { exercises } = useExerciseStore();
  const historySessions = useHistoryStore((state) => state.sessions);
  const historyPRs = React.useMemo(
    () => extractBigThreePRsFromHistory(historySessions, exercises),
    [historySessions, exercises],
  );
  const [saveToast, setSaveToast] = useState(false);

  const [weight, setWeight] = useState(() => {
    if (profile.weightKg === undefined) return '';
    return profile.preferredUnits === 'imperial'
      ? (profile.weightKg * 2.20462).toFixed(1)
      : profile.weightKg.toFixed(1);
  });

  const [benchPressMax, setBenchPressMax] = useState(() => {
    const val = profile.benchPressMaxKg ?? historyPRs.benchPressMaxKg;
    if (val === undefined) return '';
    return profile.preferredUnits === 'imperial'
      ? (val * 2.20462).toFixed(1)
      : val.toFixed(1);
  });

  const [squatMax, setSquatMax] = useState(() => {
    const val = profile.squatMaxKg ?? historyPRs.squatMaxKg;
    if (val === undefined) return '';
    return profile.preferredUnits === 'imperial'
      ? (val * 2.20462).toFixed(1)
      : val.toFixed(1);
  });

  const [deadliftMax, setDeadliftMax] = useState(() => {
    const val = profile.deadliftMaxKg ?? historyPRs.deadliftMaxKg;
    if (val === undefined) return '';
    return profile.preferredUnits === 'imperial'
      ? (val * 2.20462).toFixed(1)
      : val.toFixed(1);
  });

  const [jsonModalVisible, setJsonModalVisible] = useState(false);
  const [exportedJson, setExportedJson] = useState('');

  const [isRpePickerVisible, setRpePickerVisible] = useState(false);
  const [isRirPickerVisible, setRirPickerVisible] = useState(false);
  const stats = getStatistics();

  const handleSaveProfile = () => {
    if (!name.trim()) {
      return Alert.alert(
        language === 'de' ? 'Fehler' : 'Error',
        language === 'de' ? 'Anzeigename darf nicht leer sein.' : 'Display Name cannot be empty.',
      );
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
      const hVal = parseDecimalInput(height);
      if (isNaN(hVal) || hVal <= 0)
        return Alert.alert(
          language === 'de' ? 'Fehler' : 'Error',
          language === 'de' ? 'Größe muss eine positive Zahl sein.' : 'Height must be a positive number.',
        );
      updates.heightCm = profile.preferredUnits === 'imperial' ? hVal * 2.54 : hVal;
    }

    if (weight.trim()) {
      const wVal = parseDecimalInput(weight);
      if (isNaN(wVal) || wVal <= 0)
        return Alert.alert(
          language === 'de' ? 'Fehler' : 'Error',
          language === 'de' ? 'Gewicht muss eine positive Zahl sein.' : 'Weight must be a positive number.',
        );
      const canonicalWeight = profile.preferredUnits === 'imperial' ? wVal / 2.20462 : wVal;
      updates.weightKg = canonicalWeight;

      // Sync to body metric tracker!
      useBodyMetricStore.getState().addMetric({
        recordedAt: new Date(),
        weightKg: canonicalWeight,
      });
    }

    if (benchPressMax.trim()) {
      const val = parseDecimalInput(benchPressMax);
      if (isNaN(val) || val <= 0)
        return Alert.alert(
          language === 'de' ? 'Fehler' : 'Error',
          language === 'de'
            ? 'Bankdrücken-Max muss eine positive Zahl sein.'
            : 'Bench Press Max must be a positive number.',
        );
      updates.benchPressMaxKg = profile.preferredUnits === 'imperial' ? val / 2.20462 : val;
    }

    if (squatMax.trim()) {
      const val = parseDecimalInput(squatMax);
      if (isNaN(val) || val <= 0)
        return Alert.alert(
          language === 'de' ? 'Fehler' : 'Error',
          language === 'de'
            ? 'Kniebeuge-Max muss eine positive Zahl sein.'
            : 'Squat Max must be a positive number.',
        );
      updates.squatMaxKg = profile.preferredUnits === 'imperial' ? val / 2.20462 : val;
    }

    if (deadliftMax.trim()) {
      const val = parseDecimalInput(deadliftMax);
      if (isNaN(val) || val <= 0)
        return Alert.alert(
          language === 'de' ? 'Fehler' : 'Error',
          language === 'de'
            ? 'Kreuzheben-Max muss eine positive Zahl sein.'
            : 'Deadlift Max must be a positive number.',
        );
      updates.deadliftMaxKg = profile.preferredUnits === 'imperial' ? val / 2.20462 : val;
    }

    updateProfile(updates);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3500);
    Alert.alert(
      language === 'de' ? 'Erfolg' : 'Success',
      language === 'de' ? 'Profil gespeichert' : 'Profile saved successfully!',
    );
  };

  const handleToggleUnits = () => {
    const nextUnit: UnitSystem = profile.preferredUnits === 'metric' ? 'imperial' : 'metric';
    updateProfile({ preferredUnits: nextUnit });

    const isNowImperial = nextUnit === 'imperial';

    setHeight((prev: string) => {
      if (!prev) return '';
      const val = parseDecimalInput(prev);
      if (isNaN(val)) return '';
      return isNowImperial ? (val / 2.54).toFixed(1) : (val * 2.54).toFixed(1);
    });

    setWeight((prev: string) => {
      if (!prev) return '';
      const val = parseDecimalInput(prev);
      if (isNaN(val)) return '';
      return isNowImperial ? (val * 2.20462).toFixed(1) : (val / 2.20462).toFixed(1);
    });

    setBenchPressMax((prev: string) => {
      if (!prev) return '';
      const val = parseDecimalInput(prev);
      if (isNaN(val)) return '';
      return isNowImperial ? (val * 2.20462).toFixed(1) : (val / 2.20462).toFixed(1);
    });

    setSquatMax((prev: string) => {
      if (!prev) return '';
      const val = parseDecimalInput(prev);
      if (isNaN(val)) return '';
      return isNowImperial ? (val * 2.20462).toFixed(1) : (val / 2.20462).toFixed(1);
    });

    setDeadliftMax((prev: string) => {
      if (!prev) return '';
      const val = parseDecimalInput(prev);
      if (isNaN(val)) return '';
      return isNowImperial ? (val * 2.20462).toFixed(1) : (val / 2.20462).toFixed(1);
    });
  };

  const handleExport = async () => {
    try {
      const dataStr = exportData();
      setExportedJson(dataStr);

      Alert.alert(
        language === 'de' ? 'Daten exportieren' : 'Export Data',
        language === 'de'
          ? 'Möchtest du das Backup teilen oder auf dem Bildschirm ansehen?'
          : 'Would you like to share the backup JSON or view it on screen?',
        [
          {
            text: language === 'de' ? 'Datei teilen / speichern' : 'Share / Save File',
            onPress: async () => {
              await Share.share({
                message: dataStr,
                title: 'EVARO Backup',
              });
            },
          },
          {
            text: language === 'de' ? 'Auf Bildschirm anzeigen' : 'View on Screen',
            onPress: () => setJsonModalVisible(true),
          },
          { text: language === 'de' ? 'Abbrechen' : 'Cancel', style: 'cancel' },
        ],
      );
    } catch {
      Alert.alert(
        language === 'de' ? 'Fehler' : 'Error',
        language === 'de' ? 'Export fehlgeschlagen.' : 'Failed to export data.',
      );
    }
  };

  const handleResetData = () => {
    Alert.alert(
      language === 'de' ? 'Alle Daten zurücksetzen' : 'Reset All Data',
      language === 'de'
        ? 'WARNUNG: Dies löscht unwiderruflich alle deine Trainings, Metriken, benutzerdefinierten Übungen und Einstellungen. Diese Aktion kann nicht rückgängig gemacht werden.'
        : 'WARNING: This will permanently delete all your workouts, metrics, custom exercises, and settings. This action cannot be undone.',
      [
        { text: language === 'de' ? 'Abbrechen' : 'Cancel', style: 'cancel' },
        {
          text: language === 'de' ? 'Alles zurücksetzen' : 'Reset Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllData();
              setName('User');
              setGoal('');
              setLevel('');
              Alert.alert(
                language === 'de' ? 'Daten gelöscht' : 'Data Cleared',
                language === 'de'
                  ? 'Lokale Trainingsdaten und Sicherungen wurden zurückgesetzt. Dein Account und Clouddaten bleiben verfügbar.'
                  : 'Local training data and recovery backups have been reset. Your account and cloud data remain available.',
              );
            } catch {
              Alert.alert(
                language === 'de' ? 'Zurücksetzen fehlgeschlagen' : 'Reset Failed',
                language === 'de'
                  ? 'Lokale Daten konnten nicht vollständig zurückgesetzt werden. Bitte erneut versuchen.'
                  : 'Local data could not be fully reset. Please try again.',
              );
            }
          },
        },
      ],
    );
  };

  const handleSignOut = async () => {
    const result = await signOut();
    if (result.error) {
      Alert.alert(
        language === 'de' ? 'Abmeldung fehlgeschlagen' : 'Sign Out Failed',
        result.error,
      );
    }
  };

  const handleRestorePurchases = () => {
    Alert.alert(
      t('legal.restorePurchases'),
      language === 'de'
        ? 'In der EVARO Beta sind bereits alle Pro-Funktionen uneingeschränkt aktiv. Die Wiederherstellung von Käufen über den App Store / Google Play wird mit dem offiziellen Store-Launch aktiviert.'
        : 'All Pro features are already unlocked in the EVARO Beta. In-app purchase restoration will be activated with the official store release.',
    );
  };

  const handleDeleteAccount = async () => {
    const capability = await accountDeletionService.verifyDeletionCapability();
    if (!capability.available) {
      Alert.alert(
        t('legal.deleteAccount'),
        language === 'de'
          ? `Die Cloud-Account-Löschung ist aktuell noch nicht im Backend eingerichtet (${capability.reason}). Nutze "Alle Daten zurücksetzen" unter Daten & Backup zum Löschen lokaler Daten auf diesem Gerät.`
          : `Cloud account deletion is not yet configured in the backend (${capability.reason}). Use "Reset All Data" under Data & Backup to wipe local device data.`,
      );
      return;
    }

    Alert.alert(
      t('legal.deleteAccount'),
      language === 'de'
        ? 'Möchtest du deinen Account und alle zugehörigen Daten wirklich unwiderruflich löschen?'
        : 'Are you sure you want to permanently delete your account and all associated data?',
      [
        { text: language === 'de' ? 'Abbrechen' : 'Cancel', style: 'cancel' },
        {
          text: language === 'de' ? 'Unwiderruflich löschen' : 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            const res = await accountDeletionService.requestAccountDeletion({
              confirmationText: CONFIRMATION_KEYWORD,
            });
            if (res.success) {
              await accountDeletionService.clearLocalDataAfterConfirmedCloudDeletion();
              Alert.alert(
                language === 'de' ? 'Erfolg' : 'Success',
                language === 'de'
                  ? 'Account wurde erfolgreich gelöscht.'
                  : 'Account deleted successfully.',
              );
            } else {
              Alert.alert(
                language === 'de' ? 'Fehler' : 'Error',
                language === 'de'
                  ? (res.error ?? 'Löschung fehlgeschlagen.')
                  : (res.error ?? 'Deletion failed.'),
              );
            }
          },
        },
      ],
    );
  };

  const handlePickImage = async () => {
    const scope = getStorageScope();
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });
      if (!isScopeCurrent(scope)) return;
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
      Alert.alert(
        language === 'de' ? 'Fehler' : 'Error',
        language === 'de' ? 'Bild konnte nicht ausgewählt werden.' : 'Could not pick image.',
      );
    }
  };

  const profileInitials = (profile.displayName || 'U')
    .split(' ')
    .map((w) => w.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={styles.safeArea}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <Pressable onPress={() => router.back()} hitSlop={15} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('settings.profileAndSettings')}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 16, 40) },
        ]}
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={true}
      >
        {/* Profile Picture */}
        <LevelProgress level={achievement.level} xp={achievement.xp} />
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
              <Ionicons name="camera" size={14} color={theme.colors.background} />
            </View>
          </Pressable>
          <Text style={styles.avatarNameText}>{profile.displayName || 'User'}</Text>
        </View>

        {/* Profile Card Info */}
        <View style={styles.sectionCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Ionicons name="person-outline" size={16} color={theme.colors.primary} />
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>{t('settings.athleteIdentity')}</Text>
          </View>
          <Text style={styles.inputLabel}>{t('settings.displayName')}</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={t('settings.displayName')}
            placeholderTextColor={theme.colors.muted}
            inputAccessoryViewID={KEYBOARD_DONE_ID}
            onSubmitEditing={() => Keyboard.dismiss()}
          />
        </View>
        <View style={styles.sectionCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Ionicons name="fitness-outline" size={16} color={theme.colors.primary} />
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>{t('settings.trainingTargets')}</Text>
          </View>
          <Text style={styles.inputLabel}>{t('settings.fitnessGoal')}</Text>
          <View style={styles.goalsGrid}>
            {GOAL_OPTIONS.map((g) => {
              const isSelected = goal === g.id;
              return (
                <Pressable
                  key={g.id}
                  style={[styles.goalCard, isSelected && styles.goalCardActive]}
                  onPress={() => setGoal(isSelected ? '' : g.id)}
                >
                  <Ionicons
                    name={g.icon}
                    size={16}
                    color={isSelected ? theme.colors.primary : theme.colors.muted}
                  />
                  <Text style={[styles.goalCardText, isSelected && styles.goalCardTextActive]}>
                    {formatGoal(g.id)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.inputLabel}>{t('settings.experienceLevel')}</Text>
          <View style={styles.segmentedRow}>
            {(['beginner', 'intermediate', 'advanced'] as ExperienceLevel[]).map((l) => {
              const isSelected = level === l;
              return (
                <Pressable
                  key={l}
                  style={[styles.segmentedTab, isSelected && styles.segmentedTabActive]}
                  onPress={() => setLevel(isSelected ? '' : l)}
                >
                  <Text style={[styles.segmentedTabText, isSelected && styles.segmentedTabTextActive]}>
                    {formatLevel(l)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.inputLabel}>{t('settings.biologicalSex')}</Text>
          <View style={styles.sexGrid}>
            {(
              [
                { value: 'male' },
                { value: 'female' },
                { value: 'other' },
                { value: 'prefer_not_to_say' },
              ] as { value: BiologicalSex }[]
            ).map((s) => {
              const isSelected = sex === s.value;
              return (
                <Pressable
                  key={s.value}
                  style={[styles.sexCard, isSelected && styles.sexCardActive]}
                  onPress={() => setSex(isSelected ? '' : s.value)}
                >
                  <Text style={[styles.sexCardText, isSelected && styles.sexCardTextActive]}>
                    {formatSex(s.value)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.inputGrid}>
            <View style={styles.gridField}>
              <Text style={styles.inputLabel}>
                {t('settings.height')} ({profile.preferredUnits === 'imperial' ? 'in' : 'cm'})
              </Text>
              <TextInput
                style={styles.input}
                value={height}
                onChangeText={setHeight}
                placeholder={profile.preferredUnits === 'imperial' ? 'e.g. 70' : 'e.g. 180'}
                placeholderTextColor={theme.colors.muted}
                keyboardType="numeric"
                inputAccessoryViewID={KEYBOARD_DONE_ID}
                onSubmitEditing={() => Keyboard.dismiss()}
              />
            </View>
            <View style={styles.gridField}>
              <Text style={styles.inputLabel}>
                {t('settings.weight')} ({profile.preferredUnits === 'imperial' ? 'lbs' : 'kg'})
              </Text>
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={setWeight}
                placeholder={profile.preferredUnits === 'imperial' ? 'e.g. 175' : 'e.g. 80'}
                placeholderTextColor={theme.colors.muted}
                keyboardType="numeric"
                inputAccessoryViewID={KEYBOARD_DONE_ID}
                onSubmitEditing={() => Keyboard.dismiss()}
              />
            </View>
          </View>

          <Text style={styles.sectionDivider}>
            {t('settings.biometrics')} ({profile.preferredUnits === 'imperial' ? 'lbs' : 'kg'})
          </Text>

          <View style={styles.inputGrid}>
            <View style={styles.gridField}>
              <Text style={styles.inputLabel}>{t('settings.benchPressMax')}</Text>
              <TextInput
                style={styles.input}
                value={benchPressMax}
                onChangeText={setBenchPressMax}
                placeholder="Bench"
                placeholderTextColor={theme.colors.muted}
                keyboardType="numeric"
                inputAccessoryViewID={KEYBOARD_DONE_ID}
                onSubmitEditing={() => Keyboard.dismiss()}
              />
              {historyPRs.benchPressMaxKg ? (
                <Text style={styles.prHintText} numberOfLines={1}>
                  ★ {language === 'de' ? 'Training PR:' : 'Gym PR:'}{' '}
                  {(isImperial ? historyPRs.benchPressMaxKg * 2.20462 : historyPRs.benchPressMaxKg)
                    .toFixed(1)
                    .replace(/\.0$/, '')}
                </Text>
              ) : null}
            </View>
            <View style={styles.gridField}>
              <Text style={styles.inputLabel}>{t('settings.squatMax')}</Text>
              <TextInput
                style={styles.input}
                value={squatMax}
                onChangeText={setSquatMax}
                placeholder="Squat"
                placeholderTextColor={theme.colors.muted}
                keyboardType="numeric"
                inputAccessoryViewID={KEYBOARD_DONE_ID}
                onSubmitEditing={() => Keyboard.dismiss()}
              />
              {historyPRs.squatMaxKg ? (
                <Text style={styles.prHintText} numberOfLines={1}>
                  ★ {language === 'de' ? 'Training PR:' : 'Gym PR:'}{' '}
                  {(isImperial ? historyPRs.squatMaxKg * 2.20462 : historyPRs.squatMaxKg)
                    .toFixed(1)
                    .replace(/\.0$/, '')}
                </Text>
              ) : null}
            </View>
            <View style={styles.gridField}>
              <Text style={styles.inputLabel}>{t('settings.deadliftMax')}</Text>
              <TextInput
                style={styles.input}
                value={deadliftMax}
                onChangeText={setDeadliftMax}
                placeholder="Deadlift"
                placeholderTextColor={theme.colors.muted}
                keyboardType="numeric"
                inputAccessoryViewID={KEYBOARD_DONE_ID}
                onSubmitEditing={() => Keyboard.dismiss()}
              />
              {historyPRs.deadliftMaxKg ? (
                <Text style={styles.prHintText} numberOfLines={1}>
                  ★ {language === 'de' ? 'Training PR:' : 'Gym PR:'}{' '}
                  {(isImperial ? historyPRs.deadliftMaxKg * 2.20462 : historyPRs.deadliftMaxKg)
                    .toFixed(1)
                    .replace(/\.0$/, '')}
                </Text>
              ) : null}
            </View>
          </View>

          {saveToast && (
            <View style={styles.saveToast}>
              <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />
              <Text style={styles.saveToastText}>
                {language === 'de' ? 'Profil gespeichert' : 'Profile saved'}
              </Text>
            </View>
          )}

          <Pressable style={styles.saveBtn} onPress={handleSaveProfile}>
            <Text style={styles.saveBtnText}>{t('settings.saveProfile')}</Text>
          </Pressable>
        </View>

        {/* Statistics Grid */}
        <Text style={styles.listSectionTitle}>{t('settings.lifetimeStats')}</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t('workout.workout')}</Text>
            <Text style={styles.statValue}>{stats.totalWorkouts}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t('workout.volume')}</Text>
            <Text style={styles.statValue}>
              {stats.totalVolume.toLocaleString()}{' '}
              {profile.preferredUnits === 'imperial' ? 'lbs' : 'kg'}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t('workout.longestStreak')}</Text>
            <Text style={styles.statValue}>{stats.longestStreak} {t('time.days')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t('workout.currentStreak')}</Text>
            <Text style={styles.statValue}>{stats.currentStreak} {t('time.days')}</Text>
          </View>
        </View>

        {/* Settings options */}
        <Text style={styles.listSectionTitle}>{t('settings.preferences')}</Text>
        <View style={styles.sectionCard}>
          {/* Language Selector */}
          <View style={styles.settingsRowVertical}>
            <View style={styles.settingsRowLeft}>
              <Ionicons name="language-outline" size={22} color={theme.colors.muted} />
              <Text style={styles.settingsLabel}>{t('settings.language')}</Text>
            </View>
            <View style={styles.chipRow}>
              {(
                [
                  { value: 'de', label: t('settings.languageGerman') },
                  { value: 'en', label: t('settings.languageEnglish') },
                ] as const
              ).map((opt) => {
                const isActive = (profile.language || 'de') === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    style={[styles.chip, isActive && styles.chipActive]}
                    onPress={() => updateProfile({ language: opt.value })}
                  >
                    <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Pressable style={styles.settingsRow} onPress={handleToggleUnits}>
            <View style={styles.settingsRowLeft}>
              <Ionicons name="options-outline" size={22} color={theme.colors.muted} />
              <Text style={styles.settingsLabel}>{t('settings.measurementUnits')}</Text>
            </View>
            <View style={styles.settingsRowRight}>
              <Text style={styles.settingsValue}>
                {profile.preferredUnits === 'metric'
                  ? t('settings.metricUnits')
                  : t('settings.imperialUnits')}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
            </View>
          </Pressable>

          <Pressable
            style={styles.settingsRow}
            onPress={() => setCaffeineEnabled(!caffeineEnabled)}
          >
            <View style={styles.settingsRowLeft}>
              <Ionicons name="flash-outline" size={22} color={theme.colors.muted} />
              <Text style={styles.settingsLabel}>{t('settings.caffeineTracker')}</Text>
            </View>
            <View style={styles.settingsRowRight}>
              <Text style={styles.settingsValue}>
                {caffeineEnabled ? t('settings.on') : t('settings.off')}
              </Text>
              <View
                style={[
                  styles.togglePill,
                  caffeineEnabled ? styles.togglePillActive : styles.togglePillInactive,
                ]}
              >
                <View
                  style={[
                    styles.toggleKnob,
                    caffeineEnabled ? styles.toggleKnobActive : styles.toggleKnobInactive,
                  ]}
                />
              </View>
            </View>
          </Pressable>

          <Pressable
            style={styles.settingsRow}
            onPress={() =>
              updateProfile({
                showExerciseDeleteConfirmation: !profile.showExerciseDeleteConfirmation,
              })
            }
          >
            <View style={styles.settingsRowLeft}>
              <Ionicons name="alert-circle-outline" size={22} color={theme.colors.muted} />
              <Text style={styles.settingsLabel}>{t('settings.confirmDelete')}</Text>
            </View>
            <View style={styles.settingsRowRight}>
              <Text style={styles.settingsValue}>
                {profile.showExerciseDeleteConfirmation !== false
                  ? t('settings.on')
                  : t('settings.off')}
              </Text>
              <View
                style={[
                  styles.togglePill,
                  profile.showExerciseDeleteConfirmation !== false
                    ? styles.togglePillActive
                    : styles.togglePillInactive,
                ]}
              >
                <View
                  style={[
                    styles.toggleKnob,
                    profile.showExerciseDeleteConfirmation !== false
                      ? styles.toggleKnobActive
                      : styles.toggleKnobInactive,
                  ]}
                />
              </View>
            </View>
          </Pressable>

          <View style={styles.settingsRowVertical}>
            <View style={styles.settingsRowLeft}>
              <Ionicons name="eye-outline" size={22} color={theme.colors.muted} />
              <Text style={styles.settingsLabel}>{t('settings.rpeTracking')}</Text>
            </View>
            <View style={styles.chipRow}>
              {(
                [
                  { value: 'always_on', label: t('settings.alwaysShow') },
                  { value: 'always_off', label: t('settings.alwaysHide') },
                  { value: 'selected_exercises', label: t('settings.forSelected') },
                ] as const
              ).map((opt) => {
                const isActive = (profile.rpeMode || 'always_on') === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    style={[styles.chip, isActive && styles.chipActive]}
                    onPress={() => updateProfile({ rpeMode: opt.value })}
                  >
                    <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {profile.rpeMode === 'selected_exercises' && (
              <View style={styles.selectedExercisesContainer}>
                <Pressable style={styles.selectBtn} onPress={() => setRpePickerVisible(true)}>
                  <Text style={styles.selectBtnText}>
                    {t('settings.selectExercises')} ({profile.rpeEnabledExerciseIds?.length || 0})
                  </Text>
                </Pressable>
                {profile.rpeEnabledExerciseIds && profile.rpeEnabledExerciseIds.length > 0 && (
                  <Text style={styles.selectedExercisesText}>
                    {t('workout.completed')}:{' '}
                    {profile.rpeEnabledExerciseIds
                      .map((id) => exercises.find((e) => e.id === id)?.name)
                      .filter(Boolean)
                      .join(', ')}
                  </Text>
                )}
              </View>
            )}
          </View>

          <View style={styles.settingsRowVertical}>
            <View style={styles.settingsRowLeft}>
              <Ionicons name="eye-outline" size={22} color={theme.colors.muted} />
              <Text style={styles.settingsLabel}>{t('settings.rirTracking')}</Text>
            </View>
            <View style={styles.chipRow}>
              {(
                [
                  { value: 'always_on', label: t('settings.alwaysShow') },
                  { value: 'always_off', label: t('settings.alwaysHide') },
                  { value: 'selected_exercises', label: t('settings.forSelected') },
                ] as const
              ).map((opt) => {
                const isActive = (profile.rirMode || 'always_on') === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    style={[styles.chip, isActive && styles.chipActive]}
                    onPress={() => updateProfile({ rirMode: opt.value })}
                  >
                    <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {profile.rirMode === 'selected_exercises' && (
              <View style={styles.selectedExercisesContainer}>
                <Pressable style={styles.selectBtn} onPress={() => setRirPickerVisible(true)}>
                  <Text style={styles.selectBtnText}>
                    {t('settings.selectExercises')} ({profile.rirEnabledExerciseIds?.length || 0})
                  </Text>
                </Pressable>
                {profile.rirEnabledExerciseIds && profile.rirEnabledExerciseIds.length > 0 && (
                  <Text style={styles.selectedExercisesText}>
                    {t('workout.completed')}:{' '}
                    {profile.rirEnabledExerciseIds
                      .map((id) => exercises.find((e) => e.id === id)?.name)
                      .filter(Boolean)
                      .join(', ')}
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Haptics Toggle */}
          <Pressable
            style={styles.settingsRow}
            accessibilityRole="switch"
            accessibilityState={{ checked: profile.hapticsEnabled ?? true }}
            onPress={() =>
              updateProfile({
                hapticsEnabled: !(profile.hapticsEnabled ?? true),
              })
            }
          >
            <View style={styles.settingsRowLeft}>
              <Ionicons name="hardware-chip-outline" size={22} color={theme.colors.muted} />
              <Text style={styles.settingsLabel}>{t('settings.haptics')}</Text>
            </View>
            <View style={styles.settingsRowRight}>
              <Text style={styles.settingsValue}>
                {(profile.hapticsEnabled ?? true) ? t('settings.on') : t('settings.off')}
              </Text>
              <View
                style={[
                  styles.togglePill,
                  (profile.hapticsEnabled ?? true)
                    ? styles.togglePillActive
                    : styles.togglePillInactive,
                ]}
              >
                <View
                  style={[
                    styles.toggleKnob,
                    (profile.hapticsEnabled ?? true)
                      ? styles.toggleKnobActive
                      : styles.toggleKnobInactive,
                  ]}
                />
              </View>
            </View>
          </Pressable>

          {/* Sound Toggle */}
          <Pressable
            style={[styles.settingsRow, styles.lastRow]}
            accessibilityRole="switch"
            accessibilityState={{ checked: profile.soundEnabled ?? true }}
            onPress={() =>
              updateProfile({
                soundEnabled: !(profile.soundEnabled ?? true),
              })
            }
          >
            <View style={styles.settingsRowLeft}>
              <Ionicons name="volume-medium-outline" size={22} color={theme.colors.muted} />
              <Text style={styles.settingsLabel}>{t('settings.timerSounds')}</Text>
            </View>
            <View style={styles.settingsRowRight}>
              <Text style={styles.settingsValue}>
                {(profile.soundEnabled ?? true) ? t('settings.on') : t('settings.off')}
              </Text>
              <View
                style={[
                  styles.togglePill,
                  (profile.soundEnabled ?? true)
                    ? styles.togglePillActive
                    : styles.togglePillInactive,
                ]}
              >
                <View
                  style={[
                    styles.toggleKnob,
                    (profile.soundEnabled ?? true)
                      ? styles.toggleKnobActive
                      : styles.toggleKnobInactive,
                  ]}
                />
              </View>
            </View>
          </Pressable>
        </View>
        <AppearanceSettings />
        <View style={styles.sectionCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Ionicons name="server-outline" size={16} color={theme.colors.primary} />
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>
              {t('settings.dataAndBackup')}
            </Text>
          </View>
          <Pressable style={styles.settingsRow} onPress={handleExport}>
            <View style={styles.settingsRowLeft}>
              <Ionicons name="download-outline" size={22} color={theme.colors.muted} />
              <Text style={styles.settingsLabel}>{t('settings.exportBackup')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
          </Pressable>

          <Pressable style={[styles.settingsRow, styles.lastRow]} onPress={handleResetData}>
            <View style={styles.settingsRowLeft}>
              <Ionicons name="trash-outline" size={22} color={theme.colors.error} />
              <Text style={[styles.settingsLabel, styles.dangerText]}>
                {t('settings.resetAllData')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
          </Pressable>
        </View>
        <View style={styles.sectionCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Ionicons name="shield-checkmark-outline" size={16} color={theme.colors.primary} />
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>
              {t('settings.accountAndSync')}
            </Text>
          </View>
          {!isAuthConfigured && (
            <Text style={{ color: theme.colors.muted, lineHeight: 22 }}>
              {profile.language === 'en'
                ? 'Local profile · Your training is stored on this device.'
                : 'Lokales Profil · Dein Training wird auf diesem Gerät gespeichert.'}
            </Text>
          )}
          {isAuthConfigured && (
            <Pressable style={styles.settingsRow} onPress={handleSignOut}>
              <View style={styles.settingsRowLeft}>
                <Ionicons name="log-out-outline" size={22} color={theme.colors.muted} />
                <Text style={styles.settingsLabel}>{t('settings.signOut')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
            </Pressable>
          )}

          <Pressable
            style={styles.settingsRow}
            onPress={() => {
              // TODO: Final subscription management pending.
              // ASTRA_REVIEW_REQUIRED: Connect to RevenueCat / StoreKit manage subscription flow.
              Alert.alert(t('legal.manageSubscription'), t('legal.pendingPlaceholder'));
            }}
          >
            <View style={styles.settingsRowLeft}>
              <Ionicons name="card-outline" size={22} color={theme.colors.muted} />
              <Text style={styles.settingsLabel}>{t('legal.manageSubscription')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
          </Pressable>

          <Pressable style={styles.settingsRow} onPress={handleRestorePurchases}>
            <View style={styles.settingsRowLeft}>
              <Ionicons name="refresh-circle-outline" size={22} color={theme.colors.muted} />
              <Text style={styles.settingsLabel}>{t('legal.restorePurchases')}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View
                style={{
                  backgroundColor: withAlpha(theme.colors.primary, 0.12),
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 6,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.primary }}>
                  Beta
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
            </View>
          </Pressable>

          <Pressable style={[styles.settingsRow, styles.lastRow]} onPress={handleDeleteAccount}>
            <View style={styles.settingsRowLeft}>
              <Ionicons name="person-remove-outline" size={22} color={theme.colors.error} />
              <Text style={[styles.settingsLabel, styles.dangerText]}>
                {t('legal.deleteAccount')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
          </Pressable>
        </View>

        <View style={styles.sectionCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Ionicons name="document-text-outline" size={16} color={theme.colors.primary} />
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>{t('legal.title')}</Text>
          </View>

          {/* Legal navigation entries */}
          <Pressable
            style={styles.settingsRow}
            onPress={() => {
              // TODO: Final legal content / URL pending.
              // LEGAL_REVIEW_REQUIRED / ASTRA_REVIEW_REQUIRED
              Alert.alert(t('legal.impressum'), t('legal.pendingPlaceholder'));
            }}
          >
            <View style={styles.settingsRowLeft}>
              <Ionicons name="business-outline" size={22} color={theme.colors.muted} />
              <Text style={styles.settingsLabel}>{t('legal.impressum')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
          </Pressable>

          <Pressable
            style={styles.settingsRow}
            onPress={() => {
              // TODO: Final legal content / URL pending.
              // LEGAL_REVIEW_REQUIRED / ASTRA_REVIEW_REQUIRED
              Alert.alert(t('legal.privacyPolicy'), t('legal.pendingPlaceholder'));
            }}
          >
            <View style={styles.settingsRowLeft}>
              <Ionicons name="shield-checkmark-outline" size={22} color={theme.colors.muted} />
              <Text style={styles.settingsLabel}>{t('legal.privacyPolicy')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
          </Pressable>

          <Pressable
            style={styles.settingsRow}
            onPress={() => {
              // TODO: Final legal content / URL pending.
              // LEGAL_REVIEW_REQUIRED / ASTRA_REVIEW_REQUIRED
              Alert.alert(t('legal.termsOfService'), t('legal.pendingPlaceholder'));
            }}
          >
            <View style={styles.settingsRowLeft}>
              <Ionicons name="document-outline" size={22} color={theme.colors.muted} />
              <Text style={styles.settingsLabel}>{t('legal.termsOfService')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
          </Pressable>

          <Pressable
            style={[styles.settingsRow, { marginBottom: 16 }]}
            onPress={() => {
              // TODO: Final legal content / URL pending.
              // ASTRA_REVIEW_REQUIRED: Support contact / FAQ URL.
              Alert.alert(t('legal.support'), t('legal.pendingPlaceholder'));
            }}
          >
            <View style={styles.settingsRowLeft}>
              <Ionicons name="help-circle-outline" size={22} color={theme.colors.muted} />
              <Text style={styles.settingsLabel}>{t('legal.support')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
          </Pressable>
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
              <Ionicons
                name="shield-outline"
                size={18}
                color={theme.colors.muted}
                style={{ marginTop: 2 }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: 'SpaceGrotesk_600SemiBold',
                    fontSize: 13,
                    color: theme.colors.text,
                  }}
                >
                  {t('legal.gdprTitle')}
                </Text>
                <Text
                  style={{ fontSize: 12, color: theme.colors.muted, lineHeight: 18, marginTop: 2 }}
                >
                  {t('legal.gdprDesc')}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
              <Ionicons
                name="medkit-outline"
                size={18}
                color={theme.colors.muted}
                style={{ marginTop: 2 }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: 'SpaceGrotesk_600SemiBold',
                    fontSize: 13,
                    color: theme.colors.text,
                  }}
                >
                  {t('legal.disclaimerTitle')}
                </Text>
                <Text
                  style={{ fontSize: 12, color: theme.colors.muted, lineHeight: 18, marginTop: 2 }}
                >
                  {t('legal.disclaimerDesc')}
                </Text>
              </View>
            </View>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: 6,
                borderTopWidth: 1,
                borderTopColor: theme.colors.border,
              }}
            >
              <Text style={{ fontSize: 11, color: theme.colors.muted }}>EVARO</Text>
              <Text
                style={{
                  fontFamily: 'SpaceGrotesk_700Bold',
                  fontSize: 11,
                  color: theme.colors.primary,
                }}
              >
                {`v${Constants.expoConfig?.version ?? '0.1.0'} (Beta)`}
              </Text>
            </View>
          </View>
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
                <Ionicons name="close" size={24} color={theme.colors.muted} />
              </Pressable>
            </View>
            <ScrollView style={styles.jsonScrollView}>
              <Text selectable style={styles.jsonText}>
                {exportedJson}
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
      <KeyboardDoneAccessory />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    backBtn: {
      width: 44,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontFamily: 'SpaceGrotesk_700Bold',
      color: theme.colors.text,
    },
    headerRight: {
      width: 44,
      height: 44,
    },
    container: {
      flex: 1,
    },
    scrollContent: {
      width: '100%',
      maxWidth: 760,
      alignSelf: 'center',
      padding: 16,
      paddingBottom: 40,
    },
    sectionCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 20,
    },
    saveToast: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: withAlpha(theme.colors.success, 0.15),
      borderWidth: 1,
      borderColor: theme.colors.success,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 14,
      marginBottom: 16,
    },
    saveToastText: {
      color: theme.colors.success,
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 14,
    },
    prHintText: {
      fontSize: 11,
      color: theme.colors.primary,
      fontFamily: 'SpaceGrotesk_600SemiBold',
      marginTop: 4,
    },
    sectionTitle: {
      fontSize: 14,
      fontFamily: 'SpaceGrotesk_700Bold',
      color: theme.colors.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 13,
      fontFamily: 'SpaceGrotesk_600SemiBold',
      color: theme.colors.muted,
      marginBottom: 6,
      marginTop: 12,
      textTransform: 'uppercase',
    },
    input: {
      minHeight: 44,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      fontFamily: 'Manrope_500Medium',
      color: theme.colors.text,
    },
    goalsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 4,
      marginBottom: 6,
    },
    goalCard: {
      flexBasis: '48%',
      flexGrow: 1,
      height: 42,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceElevated,
    },
    goalCardActive: {
      borderColor: theme.colors.primary,
      backgroundColor: withAlpha(theme.colors.primary, 0.14),
    },
    goalCardText: {
      color: theme.colors.muted,
      fontSize: 12.5,
      fontFamily: 'SpaceGrotesk_600SemiBold',
    },
    goalCardTextActive: {
      color: theme.colors.primary,
      fontFamily: 'SpaceGrotesk_700Bold',
    },
    segmentedRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 4,
      marginBottom: 6,
    },
    segmentedTab: {
      flex: 1,
      height: 38,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceElevated,
    },
    segmentedTabActive: {
      borderColor: theme.colors.primary,
      backgroundColor: withAlpha(theme.colors.primary, 0.14),
    },
    segmentedTabText: {
      color: theme.colors.muted,
      fontSize: 12,
      fontFamily: 'SpaceGrotesk_600SemiBold',
    },
    segmentedTabTextActive: {
      color: theme.colors.primary,
      fontFamily: 'SpaceGrotesk_700Bold',
    },
    sexGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 4,
      marginBottom: 6,
    },
    sexCard: {
      flexBasis: '48%',
      flexGrow: 1,
      height: 38,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceElevated,
      paddingHorizontal: 8,
    },
    sexCardActive: {
      borderColor: theme.colors.primary,
      backgroundColor: withAlpha(theme.colors.primary, 0.14),
    },
    sexCardText: {
      color: theme.colors.muted,
      fontSize: 12,
      fontFamily: 'SpaceGrotesk_600SemiBold',
    },
    sexCardTextActive: {
      color: theme.colors.primary,
      fontFamily: 'SpaceGrotesk_700Bold',
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 4,
    },
    chip: {
      height: 34,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipActive: {
      borderColor: theme.colors.primary,
      backgroundColor: withAlpha(theme.colors.primary, 0.14),
    },
    chipText: {
      color: theme.colors.muted,
      fontSize: 12,
      fontFamily: 'SpaceGrotesk_600SemiBold',
    },
    chipTextActive: {
      color: theme.colors.primary,
      fontFamily: 'SpaceGrotesk_700Bold',
    },
    saveBtn: {
      backgroundColor: theme.colors.primary,
      padding: 14,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 24,
    },
    saveBtnText: {
      color: theme.colors.background,
      fontSize: 15,
      fontFamily: 'SpaceGrotesk_700Bold',
    },
    listSectionTitle: {
      fontSize: 13,
      fontFamily: 'SpaceGrotesk_700Bold',
      color: theme.colors.muted,
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
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    statLabel: {
      fontSize: 11,
      fontFamily: 'SpaceGrotesk_600SemiBold',
      color: theme.colors.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    statValue: {
      fontSize: 20,
      fontFamily: 'SpaceGrotesk_700Bold',
      color: theme.colors.text,
    },
    settingsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    settingsRowVertical: {
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
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
      color: theme.colors.text,
    },
    settingsValue: {
      fontSize: 14,
      fontFamily: 'Manrope_500Medium',
      color: theme.colors.muted,
    },
    togglePill: {
      width: 42,
      height: 24,
      borderRadius: 12,
      padding: 3,
      justifyContent: 'center',
    },
    togglePillActive: {
      backgroundColor: theme.colors.primary,
    },
    togglePillInactive: {
      backgroundColor: theme.colors.border,
    },
    toggleKnob: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: theme.colors.background,
    },
    toggleKnobActive: {
      alignSelf: 'flex-end',
    },
    toggleKnobInactive: {
      alignSelf: 'flex-start',
    },
    dangerText: {
      color: theme.colors.error,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      height: '75%',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontFamily: 'SpaceGrotesk_700Bold',
      color: theme.colors.text,
    },
    jsonScrollView: {
      padding: 16,
    },
    jsonText: {
      fontFamily: 'monospace',
      fontSize: 12,
      color: theme.colors.text,
      backgroundColor: theme.colors.background,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
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
      color: theme.colors.primary,
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
      backgroundColor: theme.colors.border,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 8,
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    selectBtnText: {
      color: theme.colors.primary,
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 14,
    },
    selectedExercisesText: {
      fontSize: 13,
      color: theme.colors.muted,
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
      borderColor: theme.colors.primary,
    },
    avatarPlaceholder: {
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarInitials: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 32,
      color: theme.colors.primary,
    },
    avatarEditBadge: {
      position: 'absolute',
      bottom: 2,
      right: 2,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: theme.colors.background,
    },
    avatarNameText: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 20,
      color: theme.colors.text,
      textTransform: 'uppercase',
    },
  });
