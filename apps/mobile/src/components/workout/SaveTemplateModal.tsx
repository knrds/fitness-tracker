import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TextInput, Pressable, Alert, Platform } from 'react-native';
import { useTheme } from '@fitness-tracker/ui';

interface Props {
  visible: boolean;
  defaultName: string;
  onClose: () => void;
  onSave: (name: string) => void;
  onSkip: () => void;
}

export const SaveTemplateModal = ({ visible, defaultName, onClose, onSave, onSkip }: Props) => {
  const theme = useTheme();
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
          alertFn?.('Name is required');
        }
      } else {
        Alert.alert('Error', 'Name is required');
      }
      return;
    }
    onSave(name.trim());
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.lg }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[styles.title, { color: theme.colors.text, ...theme.typography.heading }]}>Save as Template?</Text>
          <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
            Save this workout&apos;s exercises and sets to perform it again later.
          </Text>

          <Text style={[styles.label, { color: theme.colors.muted }]}>Template Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }]}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Leg Day"
            placeholderTextColor={theme.colors.muted}
            autoFocus
          />

          <View style={styles.actions}>
            <Pressable
              style={[styles.btn, { borderColor: theme.colors.border, borderWidth: 1, borderRadius: theme.radius.md }]}
              onPress={onSkip}
            >
              <Text style={[styles.btnText, { color: theme.colors.muted, ...theme.typography.button }]}>Skip</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, { backgroundColor: theme.colors.primary, borderRadius: theme.radius.md }]}
              onPress={handleSave}
            >
              <Text style={[styles.btnText, { color: theme.colors.background, ...theme.typography.button }]}>Save</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 11, 15, 0.85)',
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
