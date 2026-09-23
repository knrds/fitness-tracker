import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@fitness-tracker/ui';

export interface SupportFeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  language?: 'de' | 'en';
}

export const FALLBACK_SUPPORT_EMAIL = 'support@evaro.app';

export function generateSupportDiagnosticPayload(): {
  appVersion: string;
  platform: string;
  osVersion: string | number;
  diagnosticId: string;
} {
  return {
    appVersion: '0.1.0-beta.7',
    platform: Platform.OS,
    osVersion: Platform.Version ?? 'unknown',
    diagnosticId: Math.random().toString(36).substring(2, 10).toUpperCase(),
  };
}

export function buildSupportMailUrl(language: 'de' | 'en' = 'de'): string {
  const supportEmail = process.env.EXPO_PUBLIC_SUPPORT_EMAIL || FALLBACK_SUPPORT_EMAIL;
  const diagnostics = generateSupportDiagnosticPayload();

  const subject =
    language === 'de'
      ? `EVARO Support-Anfrage [${diagnostics.diagnosticId}]`
      : `EVARO Support Request [${diagnostics.diagnosticId}]`;

  const body =
    language === 'de'
      ? `Hallo EVARO Team,\n\n[Bitte beschreibe hier dein Feedback oder Problem]\n\n---\nTechnische Diagnose (Datensparsam):\nApp Version: ${diagnostics.appVersion}\nPlattform: ${diagnostics.platform}\nOS Version: ${diagnostics.osVersion}\nFehler-ID: ${diagnostics.diagnosticId}\n(Keine Trainingsdaten, Gewichte, Maße oder Chatverläufe enthalten)\n---`
      : `Hi EVARO Team,\n\n[Please describe your issue or feedback here]\n\n---\nTechnical Diagnostics (Privacy Preserved):\nApp Version: ${diagnostics.appVersion}\nPlatform: ${diagnostics.platform}\nOS Version: ${diagnostics.osVersion}\nError ID: ${diagnostics.diagnosticId}\n(Zero workout data, weights, body metrics, or coach chats included)\n---`;

  return `mailto:${encodeURIComponent(supportEmail)}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`;
}

export const SupportFeedbackModal: React.FC<SupportFeedbackModalProps> = ({
  visible,
  onClose,
  language = 'de',
}) => {
  const theme = useTheme();

  const handleSendEmail = () => {
    const url = buildSupportMailUrl(language);
    void Linking.openURL(url).catch(() => {
      // Graceful fallback if no mail client configured
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
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
                name="help-buoy-outline"
                size={22}
                color={theme.colors.primary}
              />
              <Text
                style={[styles.title, { color: theme.colors.text }]}
                accessibilityRole="header"
              >
                {language === 'de' ? 'Hilfe & Support' : 'Help & Support'}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={language === 'de' ? 'Schließen' : 'Close'}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={20} color={theme.colors.muted} />
            </Pressable>
          </View>

          <ScrollView style={styles.content}>
            {/* FAQ Box */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                {language === 'de' ? 'Häufige Fragen (FAQ)' : 'FAQ'}
              </Text>
              <Text style={[styles.cardBody, { color: theme.colors.muted }]}>
                {language === 'de'
                  ? '• Workout pausieren / beenden: Im aktiven Training oben rechts tippen.\n• Daten sichern: In den Profileinstellungen JSON-Backup exportieren.\n• Satzpause: Startet automatisch nach jedem abgehakten Satz.'
                  : '• Pause / finish workout: Tap top right in active workout.\n• Backup data: Export JSON backup in profile settings.\n• Rest timer: Starts automatically after completing a set.'}
              </Text>
            </View>

            {/* Privacy Guarantee Box */}
            <View
              style={[
                styles.privacyCard,
                {
                  backgroundColor: 'rgba(56, 189, 248, 0.08)',
                  borderColor: 'rgba(56, 189, 248, 0.25)',
                },
              ]}
            >
              <Ionicons name="shield-checkmark-outline" size={20} color="#38BDF8" />
              <View style={styles.privacyTextContainer}>
                <Text style={styles.privacyTitle}>
                  {language === 'de' ? 'Privacy by Design' : 'Privacy by Design'}
                </Text>
                <Text style={styles.privacyDescription}>
                  {language === 'de'
                    ? 'Support-Berichte enthalten ausschließlich technische Systemangaben (App-Version, OS). Niemals Workouts, Gewichte, Maße oder Chattexte.'
                    : 'Support reports include strictly technical system info (App version, OS). Never workouts, weights, measurements, or chat texts.'}
                </Text>
              </View>
            </View>

            {/* Support Status / Notice */}
            <View style={styles.noticeRow}>
              <Ionicons name="information-circle-outline" size={16} color={theme.colors.muted} />
              <Text style={[styles.noticeText, { color: theme.colors.muted }]}>
                {language === 'de'
                  ? 'Offizieller Support-Kanal: Vorläufige Adresse (USER_ACTION_REQUIRED)'
                  : 'Official support channel: Provisional address (USER_ACTION_REQUIRED)'}
              </Text>
            </View>

            {/* Send Mail Action */}
            <Pressable
              style={[styles.sendButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleSendEmail}
              accessibilityRole="button"
              accessibilityLabel={language === 'de' ? 'Support-E-Mail verfassen' : 'Compose support email'}
            >
              <Ionicons name="mail-outline" size={18} color="#000" />
              <Text style={styles.sendButtonText}>
                {language === 'de' ? 'Support kontaktieren' : 'Contact Support'}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '85%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    padding: 6,
  },
  content: {
    padding: 20,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  cardBody: {
    fontSize: 13,
    lineHeight: 20,
  },
  privacyCard: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  privacyTextContainer: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38BDF8',
    marginBottom: 4,
  },
  privacyDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: '#94A3B8',
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  noticeText: {
    fontSize: 11,
    fontStyle: 'italic',
    flex: 1,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  sendButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
  },
});
