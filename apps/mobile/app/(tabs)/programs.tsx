import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Modal, TextInput, Alert, Platform, ScrollView } from 'react-native';

import { useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';

import { Program, WorkoutTemplate } from '@fitness-tracker/domain';

import { useProgramStore } from '../../src/stores/programStore';
import { useWorkoutStore } from '../../src/stores/workoutStore';

export default function ProgramListScreen() {
  const router = useRouter();
  const { programs, templates, setActiveProgram, deleteProgram, createProgram } = useProgramStore();

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

  const activeProgram = programs.find(p => p.isActive);
  const { status: activeWorkoutStatus, startWorkoutFromTemplate } = useWorkoutStore();
  const [selectedWeek, setSelectedWeek] = useState(1);

  const handleStartTemplate = (template: WorkoutTemplate | undefined, programId: string) => {
    if (!template) return;
    
    const start = () => {
      startWorkoutFromTemplate(template, programId);
      router.push('/workout/session');
    };

    if (activeWorkoutStatus === 'active' || activeWorkoutStatus === 'paused') {
      if (Platform.OS === 'web') {
        const confirmFn = (globalThis as { confirm?: (msg: string) => boolean }).confirm;
        if (confirmFn?.("An active workout is already in progress. Do you want to discard it and start this template instead?")) {
          start();
        }
      } else {
        Alert.alert(
          "Workout In Progress",
          "An active workout is already in progress. Do you want to discard it and start this template instead?",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Discard & Start", style: "destructive", onPress: start }
          ]
        );
      }
    } else {
      start();
    }
  };

  const renderHeader = () => {
    if (!activeProgram) return null;

    const getDayName = (d: number) => {
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      return days[d - 1];
    };

    return (
      <View style={styles.activeProgramSection}>
        <View style={styles.activeProgramHeader}>
          <View style={styles.activeInfoCol}>
            <Text style={styles.activeBadge}>⭐ ACTIVE PLAN</Text>
            <Text style={styles.activeTitle}>{activeProgram.name}</Text>
            {activeProgram.description ? (
              <Text style={styles.activeDesc}>{activeProgram.description}</Text>
            ) : null}
            <Text style={styles.activeDuration}>Duration: {activeProgram.durationWeeks} Weeks</Text>
          </View>
          <Pressable 
            style={styles.deactivateBtn} 
            onPress={() => {
              if (Platform.OS === 'web') {
                const confirmFn = (globalThis as { confirm?: (msg: string) => boolean }).confirm;
                if (confirmFn?.("Are you sure you want to deactivate this program?")) {
                  setActiveProgram(null);
                }
                return;
              }
              Alert.alert(
                "Deactivate Program",
                "Are you sure you want to deactivate this program?",
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Deactivate", style: "destructive", onPress: () => setActiveProgram(null) }
                ]
              );
            }}
          >
            <Text style={styles.deactivateBtnText}>Deactivate</Text>
          </Pressable>
        </View>

        {/* Week Selector Tabs */}
        <Text style={styles.calendarTitle}>Weekly Schedule</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekTabsScroll}>
          {Array.from({ length: activeProgram.durationWeeks }, (_, i) => i + 1).map(w => {
            const isSelected = w === selectedWeek;
            return (
              <Pressable 
                key={w} 
                style={[styles.weekTab, isSelected && styles.weekTabSelected]}
                onPress={() => setSelectedWeek(w)}
              >
                <Text style={[styles.weekTabText, isSelected && styles.weekTabTextSelected]}>
                  Week {w}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Days List */}
        <View style={styles.daysList}>
          {[1, 2, 3, 4, 5, 6, 7].map(day => {
            const dayWorkouts = activeProgram.workouts.filter(
              w => w.week === selectedWeek && w.dayOfWeek === day
            );

            return (
              <View key={day} style={styles.dayRow}>
                <View style={styles.dayInfo}>
                  <Text style={styles.dayLabel}>{getDayName(day)}</Text>
                  {dayWorkouts.length > 0 ? (
                    dayWorkouts.map(w => {
                      const template = templates.find(t => t.id === w.templateId);
                      return (
                        <View key={w.id} style={styles.scheduledWorkout}>
                          <Text style={styles.workoutTemplateName}>
                            🏋️ {template?.name || 'Unknown Template'}
                          </Text>
                          <Pressable 
                            style={styles.startWorkoutBtn}
                            onPress={() => handleStartTemplate(template, activeProgram.id)}
                          >
                            <Text style={styles.startWorkoutBtnText}>Start</Text>
                          </Pressable>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={styles.restDayText}>💤 Rest Day</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
        
        <View style={styles.divider} />
        <Text style={styles.sectionHeaderTitle}>All Programs</Text>
      </View>
    );
  };

  const renderItem = ({ item }: { item: Program }) => (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardSubtitle}>{item.durationWeeks} Weeks</Text>
      </View>
      <View style={styles.cardActions}>
        {item.isActive ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.activeLabel}>Active</Text>
            <Pressable style={styles.deactivateBtnInline} onPress={() => {
              if (Platform.OS === 'web') {
                const confirmFn = (globalThis as { confirm?: (msg: string) => boolean }).confirm;
                if (confirmFn?.("Are you sure you want to deactivate this program?")) {
                  setActiveProgram(null);
                }
                return;
              }
              Alert.alert(
                "Deactivate Program",
                "Are you sure you want to deactivate this program?",
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Deactivate", style: "destructive", onPress: () => setActiveProgram(null) }
                ]
              );
            }}>
              <Text style={styles.deactivateBtnTextInline}>Deactivate</Text>
            </Pressable>
          </View>
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
        ListHeaderComponent={renderHeader}
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
  deactivateBtnInline: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  deactivateBtnTextInline: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
  },
  activeProgramSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 3,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  activeProgramHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  activeInfoCol: {
    flex: 1,
    marginRight: 12,
  },
  activeBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#3b82f6',
    backgroundColor: '#eff6ff',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  activeTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  activeDesc: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 8,
    lineHeight: 18,
  },
  activeDuration: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  deactivateBtn: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  deactivateBtnText: {
    color: '#ef4444',
    fontWeight: '700',
    fontSize: 13,
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 10,
    marginTop: 8,
  },
  weekTabsScroll: {
    marginBottom: 16,
  },
  weekTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  weekTabSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  weekTabText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 14,
  },
  weekTabTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  daysList: {
    gap: 8,
  },
  dayRow: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dayInfo: {
    width: '100%',
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  scheduledWorkout: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginTop: 4,
  },
  workoutTemplateName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    flex: 1,
  },
  startWorkoutBtn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  startWorkoutBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  restDayText: {
    fontSize: 13,
    color: '#94a3b8',
    fontStyle: 'italic',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 20,
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
});
