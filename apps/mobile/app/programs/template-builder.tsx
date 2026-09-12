import { useMeasuredReorder } from '../../src/hooks/useMeasuredReorder';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  Animated,
  Keyboard,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProgramStore } from '../../src/stores/programStore';
import { useExerciseStore } from '../../src/stores/exerciseStore';
import { ExercisePickerModal } from '../../src/components/workout/ExercisePickerModal';
import { useTheme, Card } from '@fitness-tracker/ui';
import { TemplateExercise } from '@fitness-tracker/domain';
import * as Crypto from 'expo-crypto';
import {
  KeyboardDoneAccessory,
  KEYBOARD_DONE_ID,
} from '../../src/components/workout/KeyboardDoneAccessory';

export default function WorkoutTemplateBuilderScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { programId, templateId, dayOfWeek, week } = useLocalSearchParams<{
    programId?: string;
    templateId?: string;
    dayOfWeek?: string;
    week?: string;
  }>();

  const { programs, templates, updateProgram, createTemplate, updateTemplate } = useProgramStore();
  const { exercises } = useExerciseStore();

  const program = programId ? programs.find((p) => p.id === programId) : undefined;
  const existingTemplate = templates.find((t) => t.id === templateId);

  const [name, setName] = useState(existingTemplate?.name || '');
  const [description, setDescription] = useState(existingTemplate?.description || '');
  const [templateExercises, setTemplateExercises] = useState<TemplateExercise[]>(
    existingTemplate?.exercises || [],
  );

  const [isExerciseModalVisible, setExerciseModalVisible] = useState(false);

  const sorter = useMeasuredReorder(templateExercises, (items) =>
    setTemplateExercises(items.map((item, order) => ({ ...item, order }))),
  );
  if (programId && !program) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: '#F4F5F7' }}>Program not found.</Text>
      </View>
    );
  }

  const handleSave = () => {
    if (!name.trim()) return;

    if (existingTemplate) {
      updateTemplate(existingTemplate.id, { name, description, exercises: templateExercises });
    } else {
      const newTemplateId = Crypto.randomUUID();
      createTemplate({ id: newTemplateId, name, description, exercises: templateExercises });

      if (program && dayOfWeek) {
        const targetWeek = week ? parseInt(week, 10) : 1;
        const newWorkout = {
          id: Crypto.randomUUID(),
          templateId: newTemplateId,
          dayOfWeek: parseInt(dayOfWeek, 10),
          week: targetWeek,
          order: program.workouts.filter(
            (w) => w.dayOfWeek === parseInt(dayOfWeek) && w.week === targetWeek,
          ).length,
        };

        updateProgram(program.id, {
          workouts: [...program.workouts, newWorkout],
        });
      }
    }
    router.back();
  };

  const removeExercise = (id: string) => {
    setTemplateExercises(templateExercises.filter((e) => e.id !== id));
  };

  const updateTemplateExercise = (id: string, updates: Partial<TemplateExercise>) => {
    setTemplateExercises(templateExercises.map((e) => (e.id === id ? { ...e, ...updates } : e)));
  };

  const adjustSets = (id: string, currentSets: number, amount: number) => {
    const nextSets = Math.max(1, currentSets + amount);
    updateTemplateExercise(id, { targetSets: nextSets });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={15} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {existingTemplate ? 'Edit Workout' : 'New Workout'}
        </Text>
        <Pressable
          onPress={handleSave}
          style={[styles.saveBtn, { backgroundColor: theme.colors.primary }]}
        >
          <Text style={[styles.saveBtnText, { color: theme.colors.background }]}>Save</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={sorter.scrollViewRef}
        onLayout={sorter.onLayout}
        onContentSizeChange={sorter.onContentSizeChange}
        onScroll={(e) => {
          sorter.onScroll(e);
        }}
        scrollEventThrottle={16}
        contentContainerStyle={styles.content}
        scrollEnabled={sorter.scrollEnabled}
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={true}
      >
        <Text style={styles.label}>Workout Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Push Day"
          placeholderTextColor="#8A8D9F"
          inputAccessoryViewID={KEYBOARD_DONE_ID}
          onSubmitEditing={() => Keyboard.dismiss()}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={styles.input}
          value={description}
          onChangeText={setDescription}
          placeholder="e.g. Focused on chest and triceps"
          placeholderTextColor="#8A8D9F"
          inputAccessoryViewID={KEYBOARD_DONE_ID}
          onSubmitEditing={() => Keyboard.dismiss()}
        />

        <Text style={styles.sectionTitle}>Exercises</Text>
        {templateExercises.map((te, index) => {
          const ex = exercises.find((e) => e.id === te.exerciseId);

          return (
            <Animated.View
              key={te.id}
              onLayout={(e) => {
                if (!sorter.activeDragId) sorter.itemLayouts.current[te.id] = e.nativeEvent.layout;
              }}
              style={[sorter.getRowStyle(te.id)]}
            >
              <Card padding="md" style={styles.exerciseCard}>
                <View style={styles.exHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View
                      style={[
                        styles.dragHandle,
                        sorter.handleStyle,
                        {
                          minWidth: 44,
                          minHeight: 44,
                          alignItems: 'center',
                          justifyContent: 'center',
                        },
                      ]}
                      {...sorter.getHandleProps(te.id)}
                    >
                      <Ionicons name="reorder-two" size={24} color={theme.colors.primary} />
                    </View>
                    {index > 0 && (
                      <Pressable
                        style={{ padding: 4 }}
                        onPress={() => {
                          const reordered = [...templateExercises];
                          const temp = reordered[index];
                          reordered[index] = reordered[index - 1]!;
                          reordered[index - 1] = temp!;
                          const finalReordered = reordered.map((item, idx) => ({
                            ...item,
                            order: idx,
                          }));
                          setTemplateExercises(finalReordered);
                        }}
                        hitSlop={8}
                      >
                        <Ionicons name="chevron-up" size={20} color={theme.colors.primary} />
                      </Pressable>
                    )}
                    {index < templateExercises.length - 1 && (
                      <Pressable
                        style={{ padding: 4 }}
                        onPress={() => {
                          const reordered = [...templateExercises];
                          const temp = reordered[index];
                          reordered[index] = reordered[index + 1]!;
                          reordered[index + 1] = temp!;
                          const finalReordered = reordered.map((item, idx) => ({
                            ...item,
                            order: idx,
                          }));
                          setTemplateExercises(finalReordered);
                        }}
                        hitSlop={8}
                      >
                        <Ionicons name="chevron-down" size={20} color={theme.colors.primary} />
                      </Pressable>
                    )}
                    <Text
                      style={[
                        styles.exName,
                        { color: theme.colors.text, ...theme.typography.heading, fontSize: 18 },
                      ]}
                    >
                      {index + 1}. {ex?.name || 'Unknown'}
                    </Text>
                  </View>
                  <Pressable onPress={() => removeExercise(te.id)} hitSlop={10}>
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                  </Pressable>
                </View>

                {/* Table Column Headers */}
                {true && (
                  <>
                    <View style={styles.tableHeaderRow}>
                      <Text
                        style={[
                          styles.tableColHeader,
                          styles.setCol,
                          { color: theme.colors.muted },
                        ]}
                      >
                        Set
                      </Text>
                      <Text
                        style={[
                          styles.tableColHeader,
                          styles.inputCol,
                          { color: theme.colors.muted },
                        ]}
                      >
                        kg
                      </Text>
                      <Text
                        style={[
                          styles.tableColHeader,
                          styles.inputCol,
                          { color: theme.colors.muted },
                        ]}
                      >
                        Reps
                      </Text>
                      <Text
                        style={[
                          styles.tableColHeader,
                          styles.inputCol,
                          { color: theme.colors.muted },
                        ]}
                      >
                        RPE
                      </Text>
                      <View style={styles.actionColHeader} />
                    </View>

                    {/* Redesigned Template Set Rows (Visual Match to Active Workout SetRow) */}
                    {Array.from({ length: te.targetSets }).map((_, setIdx) => {
                      const setNum = setIdx + 1;
                      return (
                        <View key={setIdx} style={styles.tableRowContainer}>
                          <View style={styles.tableRow}>
                            <Text style={[styles.setColText, { color: theme.colors.text }]}>
                              {setNum}
                            </Text>

                            {/* Target Weight input */}
                            <TextInput
                              style={[
                                styles.inputField,
                                styles.inputCol,
                                {
                                  color: theme.colors.text,
                                  backgroundColor: theme.colors.background,
                                  borderColor: 'transparent',
                                },
                              ]}
                              value={te.targetWeight ? te.targetWeight.toString() : ''}
                              onChangeText={(t) => {
                                let val = parseFloat(t) || 0;
                                if (val > 9999) val = 9999;
                                updateTemplateExercise(te.id, { targetWeight: val });
                              }}
                              keyboardType="numeric"
                              placeholder="-"
                              placeholderTextColor={theme.colors.muted}
                              selectTextOnFocus={true}
                              inputAccessoryViewID={KEYBOARD_DONE_ID}
                              onSubmitEditing={() => Keyboard.dismiss()}
                            />

                            {/* Target Reps input */}
                            <TextInput
                              style={[
                                styles.inputField,
                                styles.inputCol,
                                {
                                  color: theme.colors.text,
                                  backgroundColor: theme.colors.background,
                                  borderColor: 'transparent',
                                },
                              ]}
                              value={te.targetReps ? te.targetReps.toString() : ''}
                              onChangeText={(t) => {
                                let val = parseInt(t, 10) || 0;
                                if (val > 999) val = 999;
                                updateTemplateExercise(te.id, { targetReps: val });
                              }}
                              keyboardType="numeric"
                              placeholder="-"
                              placeholderTextColor={theme.colors.muted}
                              selectTextOnFocus={true}
                              inputAccessoryViewID={KEYBOARD_DONE_ID}
                              onSubmitEditing={() => Keyboard.dismiss()}
                            />

                            {/* Target RPE input */}
                            <TextInput
                              style={[
                                styles.inputField,
                                styles.inputCol,
                                {
                                  color: theme.colors.text,
                                  backgroundColor: theme.colors.background,
                                  borderColor: 'transparent',
                                },
                              ]}
                              value={te.targetRpe ? te.targetRpe.toString() : ''}
                              onChangeText={(t) => {
                                let val = parseFloat(t) || 0;
                                if (val > 10) val = 10;
                                updateTemplateExercise(te.id, { targetRpe: val });
                              }}
                              keyboardType="numeric"
                              placeholder="-"
                              placeholderTextColor={theme.colors.muted}
                              selectTextOnFocus={true}
                              inputAccessoryViewID={KEYBOARD_DONE_ID}
                              onSubmitEditing={() => Keyboard.dismiss()}
                            />

                            {/* Delete button to decrement set count */}
                            <Pressable
                              onPress={() => adjustSets(te.id, te.targetSets, -1)}
                              style={[
                                styles.deleteSetBtn,
                                {
                                  borderColor: theme.colors.border,
                                  backgroundColor: theme.colors.background,
                                },
                              ]}
                              hitSlop={5}
                            >
                              <Ionicons name="trash-outline" size={16} color="#ef4444" />
                            </Pressable>
                          </View>
                        </View>
                      );
                    })}

                    {/* Full Width Add Set Button */}
                    <Pressable
                      style={[styles.addSetRow, { borderTopColor: theme.colors.border }]}
                      onPress={() => adjustSets(te.id, te.targetSets, 1)}
                    >
                      <Ionicons name="add" size={18} color={theme.colors.primary} />
                      <Text style={[styles.addSetRowText, { color: theme.colors.primary }]}>
                        ADD SET
                      </Text>
                    </Pressable>
                  </>
                )}
              </Card>
            </Animated.View>
          );
        })}

        <Pressable
          style={[styles.addExBtn, { borderColor: theme.colors.border }]}
          onPress={() => setExerciseModalVisible(true)}
        >
          <Text style={[styles.addExText, { color: theme.colors.primary }]}>+ Add Exercise</Text>
        </Pressable>
      </ScrollView>

      <ExercisePickerModal
        visible={isExerciseModalVisible}
        onClose={() => setExerciseModalVisible(false)}
        onSelect={(exerciseIds) => {
          const newExercises = exerciseIds.map((exerciseId, idx) => ({
            id: Crypto.randomUUID(),
            exerciseId,
            order: templateExercises.length + idx,
            targetSets: 3,
            targetReps: 10,
          }));
          setTemplateExercises([...templateExercises, ...newExercises]);
          setExerciseModalVisible(false);
        }}
      />
      <KeyboardDoneAccessory />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B0F' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0B0B0F' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingTop: 50,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold', textTransform: 'uppercase' },
  saveBtn: {
    height: 36,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  saveBtnText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  content: { padding: 16, paddingBottom: 40 },
  label: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_600SemiBold',
    color: '#8A8D9F',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#1A1C23',
    borderWidth: 1,
    borderColor: '#2A2B31',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Manrope_500Medium',
    color: '#F4F5F7',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#90D5FF',
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  exerciseCard: {
    marginBottom: 16,
  },
  exHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    alignItems: 'center',
  },
  exName: { fontSize: 16, fontFamily: 'SpaceGrotesk_700Bold' },

  tableHeaderRow: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  tableColHeader: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  setCol: { width: 30, textAlign: 'center' },
  setColText: {
    width: 30,
    textAlign: 'center',
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 15,
  },
  inputCol: { flex: 1, textAlign: 'center' },
  actionColHeader: { width: 34, marginLeft: 4 },
  deleteSetBtn: {
    width: 34,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  tableRowContainer: {
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  inputField: {
    borderRadius: 8,
    marginHorizontal: 4,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
    borderWidth: 1,
    borderColor: 'transparent',
    height: 42,
  },
  addSetRow: {
    flexDirection: 'row',
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    marginHorizontal: -16,
    marginBottom: -16,
    marginTop: 16,
    gap: 6,
  },
  addSetRowText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    fontWeight: '700',
  },
  addExBtn: {
    backgroundColor: 'transparent',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addExText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, textTransform: 'uppercase' },
  dragHandle: {
    paddingRight: 8,
    paddingVertical: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
