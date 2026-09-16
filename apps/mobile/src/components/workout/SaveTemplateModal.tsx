import { Theme, useThemeStyles } from '@fitness-tracker/ui';
import { scopedAlert as Alert } from '../../utils/scopedAlert';
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Platform,
  Keyboard,
} from 'react-native';
import { useTheme } from '@fitness-tracker/ui';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useI18n } from '../../i18n';

interface Props {
  visible: boolean;
  defaultName: string;
  onClose: () => void;
  onSave: (name: string) => void;
  onSkip: () => void;
  templateId?: string | undefined;
  onUpdate?: () => void;
}

export const SaveTemplateModal = ({
  visible,
  defaultName,
  onClose,
  onSave,
  onSkip,
  templateId,
  onUpdate,
}: Props) => {
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  const { language } = useI18n();
  const [name, setName] = useState(defaultName);

  useEffect(() => {
    if (visible) {
      setName(defaultName);
    }
  }, [visible, defaultName]);

  const handleSave = () => {
    if (!name.trim()) {
      if (Platform.OS === 'web') {
        if (typeof globalThis !== 'undefined' && 'alert' in globalThis) {
          const alertFn = (globalThis as { alert?: (msg: string) => void }).alert;
          alertFn?.(language === 'de' ? 'Name ist erforderlich' : 'Name is required');
        }
      } else {
        Alert.alert(
          language === 'de' ? 'Fehler' : 'Error',
          language === 'de' ? 'Name ist erforderlich' : 'Name is required',
        );
      }
      return;
    }
    onSave(name.trim());
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.lg,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[styles.title, { color: theme.colors.text, ...theme.typography.heading }]}>
            {templateId
              ? language === 'de'
                ? 'Template aktualisieren?'
                : 'Update Template?'
              : language === 'de'
              ? 'Als Template speichern?'
              : 'Save as Template?'}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
            {templateId
              ? language === 'de'
                ? 'Du hast das Training angepasst. Möchtest du das bestehende Template überschreiben oder ein neues erstellen?'
                : 'You adjusted this workout. Do you want to update the existing template or create a new one?'
              : language === 'de'
              ? 'Speichere dieses Training als Template ab, um es später einfach wiederholen zu können.'
              : 'Save this workout as a template to easily repeat it later.'}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
            {language === 'de'
              ? 'Für alle Arbeitssätze gelten die Zielwerte des ersten Arbeitssatzes. Aufwärmsätze und individuelle Satzdetails bleiben im Trainingsverlauf.'
              : 'Target values of the first working set apply to all working sets. Warm-up sets and individual set details remain in workout history.'}
          </Text>

          {templateId && onUpdate && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                language === 'de'
                  ? 'Bestehendes Template aktualisieren'
                  : 'Update Existing Template'
              }
              style={({ pressed }) => [
                styles.updateBtn,
                {
                  backgroundColor: theme.colors.primary,
                  borderRadius: theme.radius.md,
                },
                pressed && styles.updateBtnPressed,
              ]}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                }
                onUpdate();
              }}
            >
              <Ionicons
                name="refresh-outline"
                size={22}
                color={theme.colors.background}
                style={styles.updateBtnIcon}
              />
              <Text
                style={[
                  styles.updateBtnText,
                  {
                    color: theme.colors.background,
                    ...theme.typography.button,
                  },
                ]}
              >
                {language === 'de'
                  ? 'Template aktualisieren'
                  : 'Update Template'}
              </Text>
            </Pressable>
          )}

          {templateId && (
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
              <Text style={[styles.dividerText, { color: theme.colors.muted }]}>
                {language === 'de' ? 'ODER' : 'OR'}
              </Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
            </View>
          )}

          <Text style={[styles.label, { color: theme.colors.muted }]}>
            {templateId
              ? language === 'de'
                ? 'Oder als neues speichern unter:'
                : 'Or save as new template under:'
              : language === 'de'
              ? 'Template-Name'
              : 'Template Name'}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.border,
                color: theme.colors.text,
              },
            ]}
            value={name}
            onChangeText={setName}
            placeholder={language === 'de' ? 'z. B. Push Workout' : 'e.g. Push Workout'}
            placeholderTextColor={theme.colors.muted}
            autoFocus={!templateId}
            onSubmitEditing={() => Keyboard.dismiss()}
          />

          <View style={styles.actions}>
            <Pressable
              style={[
                styles.btn,
                { borderColor: theme.colors.border, borderWidth: 1, borderRadius: theme.radius.md },
              ]}
              onPress={onSkip}
            >
              <Text
                style={[styles.btnText, { color: theme.colors.muted, ...theme.typography.button }]}
              >
                {language === 'de' ? 'Nicht speichern' : 'Don’t Save'}
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.btn,
                {
                  backgroundColor: templateId ? 'transparent' : theme.colors.primary,
                  borderColor: templateId ? theme.colors.primary : 'transparent',
                  borderWidth: templateId ? 1 : 0,
                  borderRadius: theme.radius.md,
                },
              ]}
              onPress={handleSave}
            >
              <Text
                style={[
                  styles.btnText,
                  {
                    color: templateId ? theme.colors.primary : theme.colors.background,
                    ...theme.typography.button,
                  },
                ]}
              >
                {templateId
                  ? language === 'de'
                    ? 'Als neues speichern'
                    : 'Save as New'
                  : language === 'de'
                  ? 'Speichern'
                  : 'Save'}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      justifyContent: 'center',
      padding: 24,
    },
    card: {
      borderWidth: 1,
      padding: 24,
    },
    title: {
      fontSize: 20,
      marginBottom: 8,
    },
    subtitle: {
      fontFamily: 'Manrope_500Medium',
      fontSize: 14,
      marginBottom: 20,
      lineHeight: 20,
    },
    label: {
      fontFamily: 'SpaceGrotesk_400Regular',
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 14,
      fontFamily: 'Manrope_500Medium',
      fontSize: 16,
      marginBottom: 24,
    },
    updateBtn: {
      width: '100%',
      minHeight: 56,
      paddingVertical: 16,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
    updateBtnPressed: {
      opacity: 0.88,
      transform: [{ scale: 0.98 }],
    },
    updateBtnIcon: {
      marginRight: 10,
    },
    updateBtnText: {
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
      gap: 12,
    },
    dividerLine: {
      flex: 1,
      height: 1,
    },
    dividerText: {
      fontFamily: 'SpaceGrotesk_400Regular',
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    actions: {
      flexDirection: 'row',
      gap: 12,
    },
    btn: {
      flex: 1,
      height: 52,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnText: {
      fontSize: 15,
    },
  });
