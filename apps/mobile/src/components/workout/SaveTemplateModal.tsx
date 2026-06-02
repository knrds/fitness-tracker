import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TextInput, Pressable, Alert, Platform } from 'react-native';

interface Props {
  visible: boolean;
  defaultName: string;
  onClose: () => void;
  onSave: (name: string) => void;
  onSkip: () => void;
}

export const SaveTemplateModal = ({ visible, defaultName, onClose, onSave, onSkip }: Props) => {
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
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Save as Template?</Text>
          <Text style={styles.subtitle}>Save this workout's exercises and sets to easily perform it again later.</Text>

          <Text style={styles.label}>Template Name</Text>
          <TextInput 
            style={styles.input} 
            value={name} 
            onChangeText={setName} 
            placeholder="e.g. Leg Day" 
            placeholderTextColor="#94a3b8"
            autoFocus
          />

          <View style={styles.actions}>
            <Pressable style={[styles.btn, styles.skipBtn]} onPress={onSkip}>
              <Text style={styles.skipBtnText}>Skip</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.saveBtn]} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save & Finish</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0f172a',
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  skipBtn: {
    backgroundColor: '#f1f5f9',
  },
  saveBtn: {
    backgroundColor: '#3b82f6',
  },
  skipBtnText: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 16,
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
});
