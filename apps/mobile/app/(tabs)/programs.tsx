import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useProgramStore } from '../../src/stores/programStore';
import * as Crypto from 'expo-crypto';

export default function ProgramListScreen() {
  const router = useRouter();
  const { programs, setActiveProgram, deleteProgram, createProgram } = useProgramStore();

  const renderItem = ({ item }: { item: any }) => (
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
      <Pressable style={styles.fab} onPress={() => {
        const newId = Crypto.randomUUID();
        createProgram({ id: newId, name: 'New Program' });
        router.push(`/programs/builder?id=${newId}`);
      }}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>
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
});
