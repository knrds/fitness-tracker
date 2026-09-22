import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme, withAlpha } from '@fitness-tracker/ui';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../i18n';
import * as Haptics from 'expo-haptics';

export type PermissionType = 'microphone' | 'photos' | 'notifications';

export interface ContextualPermissionConfig {
  type: PermissionType;
  icon: keyof typeof Ionicons.glyphMap;
  titleDe: string;
  titleEn: string;
  descriptionDe: string;
  descriptionEn: string;
  benefitDe: string;
  benefitEn: string;
}

export const PERMISSION_CONFIGS: Record<PermissionType, ContextualPermissionConfig> = {
  microphone: {
    type: 'microphone',
    icon: 'mic-outline',
    titleDe: 'Mikrofon für Sprachnachrichten',
    titleEn: 'Microphone for Voice Notes',
    descriptionDe:
      'Ermöglicht das bequeme Diktieren von Trainingsfragen an den Coach.',
    descriptionEn:
      'Allows conveniently dictating training questions to your coach.',
    benefitDe:
      'Audio wird nur während des aktiven Haltens der Aufnahmetaste verarbeitet und niemals im Hintergrund abgehört.',
    benefitEn:
      'Audio is only processed while actively recording and never listened to in the background.',
  },
  photos: {
    type: 'photos',
    icon: 'images-outline',
    titleDe: 'Zugriff auf die Fotomediathek',
    titleEn: 'Photo Library Access',
    descriptionDe:
      'Ermöglicht das Auswählen eines Profilbilds oder von Übungsfotos für deinen Coach.',
    descriptionEn:
      'Allows selecting a profile avatar or workout exercise photos for your coach.',
    benefitDe:
      'Die App greift ausschließlich auf die von dir explizit angetippten Bilder zu.',
    benefitEn:
      'The app only accesses the specific images you explicitly select.',
  },
  notifications: {
    type: 'notifications',
    icon: 'notifications-outline',
    titleDe: 'Benachrichtigungen aktivieren',
    titleEn: 'Enable Notifications',
    descriptionDe:
      'Erhalte pünktliche Alarme bei beendeter Satzpause und optionale Trainingserinnerungen.',
    descriptionEn:
      'Receive timely alerts when your rest timer finishes and optional workout reminders.',
    benefitDe:
      'Keine Werbe-Spams ohne gesondertes Opt-in. Sperrbildschirm-Meldungen enthalten niemals sensible Trainingsgewichte.',
    benefitEn:
      'No marketing spam without explicit opt-in. Lock screen alerts never contain sensitive weights or reps.',
  },
};

interface ContextualPermissionModalProps {
  visible: boolean;
  type: PermissionType;
  onContinue: () => void;
  onDismiss: () => void;
}

export function ContextualPermissionModal({
  visible,
  type,
  onContinue,
  onDismiss,
}: ContextualPermissionModalProps) {
  const theme = useTheme();
  const { language } = useI18n();
  const isDe = language === 'de';
  const config = PERMISSION_CONFIGS[type];

  const handleContinue = () => {
    void Haptics.selectionAsync();
    onContinue();
  };

  const handleDismiss = () => {
    void Haptics.selectionAsync();
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.dialog,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          {/* Icon Header */}
          <View
            style={[
              styles.iconWrapper,
              { backgroundColor: withAlpha(theme.colors.accent, 0.12) },
            ]}
          >
            <Ionicons name={config.icon} size={32} color={theme.colors.accent} />
          </View>

          {/* Title & Description */}
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {isDe ? config.titleDe : config.titleEn}
          </Text>
          <Text style={[styles.description, { color: theme.colors.textMuted }]}>
            {isDe ? config.descriptionDe : config.descriptionEn}
          </Text>

          {/* Privacy / Benefit Box */}
          <View
            style={[
              styles.benefitBox,
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
              style={{ marginRight: 8, marginTop: 1 }}
            />
            <Text style={[styles.benefitText, { color: theme.colors.text }]}>
              {isDe ? config.benefitDe : config.benefitEn}
            </Text>
          </View>

          {/* Buttons: Non-manipulative, "Nicht jetzt" is clearly accessible */}
          <View style={styles.actions}>
            <Pressable
              onPress={handleContinue}
              style={[styles.primaryButton, { backgroundColor: theme.colors.accent }]}
              accessibilityRole="button"
              accessibilityLabel={isDe ? 'Weiter' : 'Continue'}
            >
              <Text style={styles.primaryButtonText}>{isDe ? 'Weiter' : 'Continue'}</Text>
            </Pressable>

            <Pressable
              onPress={handleDismiss}
              style={styles.secondaryButton}
              accessibilityRole="button"
              accessibilityLabel={isDe ? 'Nicht jetzt' : 'Not now'}
            >
              <Text style={[styles.secondaryButtonText, { color: theme.colors.textMuted }]}>
                {isDe ? 'Nicht jetzt' : 'Not now'}
              </Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
  },
  benefitBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    width: '100%',
  },
  benefitText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  actions: {
    width: '100%',
    gap: 10,
  },
  primaryButton: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
