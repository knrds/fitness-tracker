import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Modal, TextInput, Alert, Platform } from 'react-native';

import { useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';

import { Program } from '@fitness-tracker/domain';

import { useProgramStore } from '../../src/stores/programStore';

export default function ProgramListScreen() {
  const router = useRouter();
  const { programs, setActiveProgram, deleteProgram, createProgram } = useProgramStore();

  const [isCreateModalVisible, setCreateModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [durationWeeks, setDurationWeeks] = useState('4');

  const handleCreateProgram = () => {
    if (!name.trim()) {
      if (Platform.OS === 'web') {
        if (typeof globalThis !== 'undefined' && 'alert' in globalThis) {
          const alertFn = (globalThis as { alert?: (msg: string) => void }).alert;
          alertFn?.('Program name is required.');
        }
      } else {
        Alert.alert('Error', 'Program name is required.');
      }
      return;
    }

    const newId = Crypto.randomUUID();
    createProgram({
      id: newId,
      name: name.trim(),
      ...(description.trim() ? { description: description.trim() } : {}),
      durationWeeks: parseInt(durationWeeks, 10) || 4,
    });
    
    setCreateModalVisible(false);
    setName('');
    setDescription('');
    setDurationWeeks('4');
    
    router.push(`/programs/builder?id=${newId}` as unknown as Parameters<typeof router.push>[0]);
  };

  const renderItem = ({ item }: { item: Program }) => (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardSubtitle}>{item.durationWeeks} Weeks</Text>
      </View>
      <View style={styles.cardActions}>
        {item.isActive ? (
          <Text style={styles.activeLabel}>Active</Text>
        ) : (
          <Pressable style={styles.btn} onPress={() => setActiveProgram(item.id)}>
            <Text style={styles.btnText}>Set Active</Text>
          </Pressable>
        )}
        <Pressable style={styles.editBtn} onPress={() => router.push(`/programs/builder?id=${item.id}`)}>
          <Text style={styles.editBtnText}>Edit</Text>
        </Pressable>
        <Pressable style={styles.deleteBtn} onPress={() => deleteProgram(item.id)}>
          <Text style={styles.deleteBtnText}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={programs}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No programs found. Click + to create one.</Text>}
      />
      <Pressable style={styles.fab} onPress={() => setCreateModalVisible(true)}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      <Modal visible={isCreateModalVisible} animationType="slide" transparent={true} onRequestClose={() => setCreateModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create Program</Text>
            
            <Text style={styles.label}>Program Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Hypertrophy Plan"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.label}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="e.g. 4-day split focusing on upper/lower body"
              placeholderTextColor="#94a3b8"
              multiline
            />

            <Text style={styles.label}>Duration (Weeks)</Text>
            <TextInput
              style={styles.input}
              value={durationWeeks}
              onChangeText={setDurationWeeks}
              keyboardType="numeric"
              placeholder="4"
              placeholderTextColor="#94a3b8"
            />

            <View style={styles.modalActions}>
              <Pressable style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setCreateModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, styles.createBtn]} onPress={handleCreateProgram}>
                <Text style={styles.createBtnText}>Create</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  list: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  cardSubtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
  cardInfo: { marginBottom: 12 },
  cardActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  btn: { backgroundColor: '#3b82f6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  editBtn: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  deleteBtn: { backgroundColor: '#fee2e2', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  btnText: { color: '#fff', fontWeight: '600' },
  editBtnText: { color: '#475569', fontWeight: '600' },
  deleteBtnText: { color: '#ef4444', fontWeight: '600' },
  activeLabel: { color: '#10b981', fontWeight: '700', paddingVertical: 8, paddingHorizontal: 4 },
  empty: { textAlign: 'center', marginTop: 40, color: '#64748b', fontSize: 16 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#3b82f6',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabText: { color: '#fff', fontSize: 32, fontWeight: '400', lineHeight: 36 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 20,
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
    paddingVertical: 10,
    fontSize: 16,
    color: '#0f172a',
    marginBottom: 16,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: '#f1f5f9',
  },
  createBtn: {
    backgroundColor: '#3b82f6',
  },
  cancelBtnText: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 16,
  },
  createBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
});
