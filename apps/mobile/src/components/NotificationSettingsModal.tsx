import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useTheme, withAlpha } from '@fitness-tracker/ui';
import { Ionicons } from '@expo/vector-icons';
import { useNotificationPreferenceStore } from '../stores/notificationPreferenceStore';
import { useI18n } from '../i18n';
import * as Haptics from 'expo-haptics';

interface NotificationSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function NotificationSettingsModal({
  visible,
  onClose,
}: NotificationSettingsModalProps) {
  const theme = useTheme();
  const { language } = useI18n();
  const isDe = language === 'de';
  const { preferences, setPreference } = useNotificationPreferenceStore();

  const handleToggle = (
    key: 'restTimer' | 'workoutReminder' | 'progressCoach' | 'productOffers',
    val: boolean,
  ) => {
    void Haptics.selectionAsync();
    setPreference(key, val);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons
                name="notifications-outline"
                size={22}
                color={theme.colors.accent}
                style={{ marginRight: 8 }}
              />
              <Text style={[styles.title, { color: theme.colors.text }]}>
                {isDe ? 'Benachrichtigungen' : 'Notification Preferences'}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={isDe ? 'Schließen' : 'Close'}
              style={styles.closeBtn}
              hitSlop={8}
            >
              <Ionicons name="close" size={24} color={theme.colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.scrollContent}>
            <Text style={[styles.sectionSubtitle, { color: theme.colors.textMuted }]}>
              {isDe
                ? 'Passe an, welche Benachrichtigungen du erhalten möchtest. Marketing-Hinweise sind strikt separat und standardmäßig deaktiviert.'
                : 'Control which alerts you receive. Marketing updates are strictly separate and opt-in by default.'}
            </Text>

            {/* Item 1: Rest Timer */}
            <View
              style={[
                styles.preferenceRow,
                {
                  backgroundColor: withAlpha(theme.colors.text, 0.03),
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View style={styles.textContainer}>
                <Text style={[styles.preferenceLabel, { color: theme.colors.text }]}>
                  {isDe ? 'Satzpause-Timer' : 'Rest Timer'}
                </Text>
                <Text style={[styles.preferenceDesc, { color: theme.colors.textMuted }]}>
                  {isDe
                    ? 'Lokaler Alarm, wenn die Satzpause beendet ist (funktioniert offline).'
                    : 'Local alert when your rest period ends (works offline).'}
                </Text>
              </View>
              <Switch
                value={preferences.restTimer}
                onValueChange={(val) => handleToggle('restTimer', val)}
                trackColor={{
                  false: withAlpha(theme.colors.text, 0.2),
                  true: theme.colors.accent,
                }}
                thumbColor="#ffffff"
                accessibilityLabel={isDe ? 'Satzpause-Timer' : 'Rest Timer'}
              />
            </View>

            {/* Item 2: Workout Reminder */}
            <View
              style={[
                styles.preferenceRow,
                {
                  backgroundColor: withAlpha(theme.colors.text, 0.03),
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View style={styles.textContainer}>
                <Text style={[styles.preferenceLabel, { color: theme.colors.text }]}>
                  {isDe ? 'Trainingserinnerungen' : 'Workout Reminders'}
                </Text>
                <Text style={[styles.preferenceDesc, { color: theme.colors.textMuted }]}>
                  {isDe
                    ? 'Erinnerungen an geplante Workouts und deine Trainingsfrequenz.'
                    : 'Reminders for scheduled workouts and planned training days.'}
                </Text>
              </View>
              <Switch
                value={preferences.workoutReminder}
                onValueChange={(val) => handleToggle('workoutReminder', val)}
                trackColor={{
                  false: withAlpha(theme.colors.text, 0.2),
                  true: theme.colors.accent,
                }}
                thumbColor="#ffffff"
                accessibilityLabel={isDe ? 'Trainingserinnerungen' : 'Workout Reminders'}
              />
            </View>

            {/* Item 3: Progress & Coach */}
            <View
              style={[
                styles.preferenceRow,
                {
                  backgroundColor: withAlpha(theme.colors.text, 0.03),
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View style={styles.textContainer}>
                <Text style={[styles.preferenceLabel, { color: theme.colors.text }]}>
                  {isDe ? 'Fortschritt & Coach' : 'Progress & Coach'}
                </Text>
                <Text style={[styles.preferenceDesc, { color: theme.colors.textMuted }]}>
                  {isDe
                    ? 'Wöchentliche Zusammenfassungen, Streaks und Coach-Tipps.'
                    : 'Weekly summaries, streaks, and training coach tips.'}
                </Text>
              </View>
              <Switch
                value={preferences.progressCoach}
                onValueChange={(val) => handleToggle('progressCoach', val)}
                trackColor={{
                  false: withAlpha(theme.colors.text, 0.2),
                  true: theme.colors.accent,
                }}
                thumbColor="#ffffff"
                accessibilityLabel={isDe ? 'Fortschritt & Coach' : 'Progress & Coach'}
              />
            </View>

            {/* Item 4: Marketing / Product Offers (STRICTLY SEPARATE) */}
            <View
              style={[
                styles.preferenceRow,
                {
                  backgroundColor: withAlpha(theme.colors.text, 0.03),
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View style={styles.textContainer}>
                <View style={styles.badgeRow}>
                  <Text style={[styles.preferenceLabel, { color: theme.colors.text }]}>
                    {isDe ? 'Produktangebote & Neuigkeiten' : 'Product Offers & News'}
                  </Text>
                  <View
                    style={[
                      styles.optInBadge,
                      { backgroundColor: withAlpha(theme.colors.accent, 0.15) },
                    ]}
                  >
                    <Text style={[styles.optInBadgeText, { color: theme.colors.accent }]}>
                      {isDe ? 'Opt-In' : 'Opt-In'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.preferenceDesc, { color: theme.colors.textMuted }]}>
                  {isDe
                    ? 'Informationen zu neuen Features und zeitlich begrenzten Rabatten (strikt freiwillig).'
                    : 'Updates about new features and promotional discounts (strictly voluntary).'}
                </Text>
              </View>
              <Switch
                value={preferences.productOffers}
                onValueChange={(val) => handleToggle('productOffers', val)}
                trackColor={{
                  false: withAlpha(theme.colors.text, 0.2),
                  true: theme.colors.accent,
                }}
                thumbColor="#ffffff"
                accessibilityLabel={
                  isDe ? 'Produktangebote & Neuigkeiten' : 'Product Offers & News'
                }
              />
            </View>

            {/* Privacy notice banner */}
            <View
              style={[
                styles.privacyCard,
                {
                  backgroundColor: withAlpha(theme.colors.accent, 0.08),
                  borderColor: withAlpha(theme.colors.accent, 0.2),
                },
              ]}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color={theme.colors.accent}
                style={{ marginTop: 2, marginRight: 8 }}
              />
              <Text style={[styles.privacyText, { color: theme.colors.text }]}>
                {isDe
                  ? 'Datenschutz: Sperrbildschirm-Benachrichtigungen enthalten niemals Trainingsgewichte, Wiederholungszahlen oder sensible Gesundheitsdaten.'
                  : 'Privacy: Lock screen notifications never contain exercise weights, rep counts, or sensitive health data.'}
              </Text>
            </View>
          </ScrollView>

          {/* Footer Close Button */}
          <View style={styles.footer}>
            <Pressable
              onPress={onClose}
              style={[styles.doneButton, { backgroundColor: theme.colors.accent }]}
              accessibilityRole="button"
              accessibilityLabel={isDe ? 'Fertig' : 'Done'}
            >
              <Text style={styles.doneButtonText}>{isDe ? 'Fertig' : 'Done'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingVertical: 16,
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  optInBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  optInBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  preferenceLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },
  preferenceDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 6,
    marginBottom: 16,
  },
  privacyText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 12,
  },
  doneButton: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
});
