import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { MuscleGroup, Equipment } from '@fitness-tracker/domain';
import { useExerciseStore } from '../../stores/exerciseStore';

export const ExerciseFilter = () => {
  const { selectedMuscleGroup, selectedEquipment, setFilter, resetFilters } = useExerciseStore();

  const handleMuscleSelect = (m: MuscleGroup) => {
    setFilter(selectedMuscleGroup === m ? null : m, selectedEquipment);
  };

  const handleEquipmentSelect = (eq: Equipment) => {
    setFilter(selectedMuscleGroup, selectedEquipment === eq ? null : eq);
  };

  const hasActiveFilters = selectedMuscleGroup !== null || selectedEquipment !== null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Filters</Text>
        {hasActiveFilters && (
          <Pressable onPress={resetFilters}>
            <Text style={styles.resetText}>Reset</Text>
          </Pressable>
        )}
      </View>

      <Text style={styles.subtitle}>Muscle Group</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
        {Object.values(MuscleGroup).map((m) => {
          const isSelected = selectedMuscleGroup === m;
          return (
            <Pressable
              key={m}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => handleMuscleSelect(m)}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {formatName(m)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={styles.subtitle}>Equipment</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
        {Object.values(Equipment).map((eq) => {
          const isSelected = selectedEquipment === eq;
          return (
            <Pressable
              key={eq}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => handleEquipmentSelect(eq)}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {formatName(eq)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const formatName = (str: string) => {
  return str.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  resetText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: '#3b82f6',
  },
  chipText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#ffffff',
  },
});
