import { scopedAlert as Alert } from '../../utils/scopedAlert';
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MuscleGroup, Equipment, MovementPattern } from '@fitness-tracker/domain';
import { useTheme } from '@fitness-tracker/ui';
import { KEYBOARD_DONE_ID } from '../workout/KeyboardDoneAccessory';

import { useExerciseStore } from '../../stores/exerciseStore';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const CustomExerciseModal = ({ visible, onClose }: Props) => {
  const theme = useTheme();
  const { addCustomExercise } = useExerciseStore();
  const [name, setName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | ''>('');
  const [equipment, setEq] = useState<Equipment | ''>('');
  const [trackMode, setTrackMode] = useState<'reps' | 'duration'>('reps');

  useEffect(() => {
    if (visible) {
      setName('');
      setInstructions('');
      setMuscle('');
      setEq('');
      setTrackMode('reps');
    }
  }, [visible]);

  const handleSave = () => {
    if (!name.trim()) return Alert.alert('Error', 'Name is required');
    if (!muscle) return Alert.alert('Error', 'Muscle group is required');
    if (!equipment) return Alert.alert('Error', 'Equipment is required');

    try {
      addCustomExercise({
        name: name.trim(),
        instructions: instructions.trim(),
        primaryMuscles: [muscle as MuscleGroup],
        secondaryMuscles: [],
        equipment: equipment as Equipment,
        movementPattern:
          trackMode === 'duration' ? MovementPattern.Cardio : MovementPattern.Isolation,
      });
      setName('');
      setInstructions('');
      setMuscle('');
      setEq('');
      setTrackMode('reps');
      onClose();
    } catch {
      Alert.alert('Error', 'Could not create exercise.');
    }
  };

  const renderChip = (active: boolean, label: string, onPress: () => void, key: string) => (
    <Pressable
      key={key}
      style={[styles.chip, { borderColor: active ? theme.colors.primary : theme.colors.border }]}
      onPress={onPress}
    >
      <Text
        style={[styles.chipText, { color: active ? theme.colors.primary : theme.colors.muted }]}
      >
        {label.replace(/_/g, ' ').toUpperCase()}
      </Text>
    </Pressable>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.title, { color: theme.colors.text, ...theme.typography.heading }]}>
            New Exercise
          </Text>
          <Pressable onPress={onClose} hitSlop={15} style={styles.cancelBtn}>
            <Text style={[styles.cancelText, { color: theme.colors.muted }]}>Cancel</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.form}
          contentContainerStyle={styles.formContent}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true}
        >
          <Text style={[styles.label, { color: theme.colors.muted }]}>Name</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.text,
              },
            ]}
            value={name}
            onChangeText={setName}
            placeholder="e.g. My Custom Lift"
            placeholderTextColor={theme.colors.muted}
            inputAccessoryViewID={KEYBOARD_DONE_ID}
            onSubmitEditing={() => Keyboard.dismiss()}
          />

          <Text style={[styles.label, { color: theme.colors.muted }]}>Tracking Mode</Text>
          <View style={styles.chipContainer}>
            {renderChip(
              trackMode === 'reps',
              'Reps & Weight',
              () => setTrackMode('reps'),
              'mode-reps',
            )}
            {renderChip(
              trackMode === 'duration',
              'Duration & Level',
              () => setTrackMode('duration'),
              'mode-duration',
            )}
          </View>

          <Text style={[styles.label, { color: theme.colors.muted }]}>Muscle Group</Text>
          <View style={styles.chipContainer}>
            {Object.values(MuscleGroup).map((m) =>
              renderChip(muscle === m, m, () => setMuscle(m), m),
            )}
          </View>

          <Text style={[styles.label, { color: theme.colors.muted }]}>Equipment</Text>
          <View style={styles.chipContainer}>
            {Object.values(Equipment).map((e) => renderChip(equipment === e, e, () => setEq(e), e))}
          </View>

          <Text style={[styles.label, { color: theme.colors.muted }]}>Instructions (Optional)</Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.text,
              },
            ]}
            value={instructions}
            onChangeText={setInstructions}
            placeholder="Add notes..."
            placeholderTextColor={theme.colors.muted}
            multiline
            inputAccessoryViewID={KEYBOARD_DONE_ID}
          />

          <Pressable
            style={[
              styles.saveBtn,
              { backgroundColor: theme.colors.primary, borderRadius: theme.radius.md },
            ]}
            onPress={handleSave}
          >
            <Text
              style={[
                styles.saveBtnText,
                { color: theme.colors.background, ...theme.typography.button },
              ]}
            >
              Create Exercise
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
  },
  cancelText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 16,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  cancelBtn: {
    minWidth: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 12,
  },
  form: {
    flex: 1,
  },
  formContent: {
    padding: 20,
    paddingBottom: 40,
  },
  label: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Manrope_500Medium',
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  chipText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  saveBtn: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
  },
  saveBtnText: {
    fontSize: 16,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
});
