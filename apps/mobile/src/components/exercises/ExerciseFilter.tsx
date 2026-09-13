import { Theme, useThemeStyles } from '@fitness-tracker/ui';
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MuscleGroup, Equipment } from '@fitness-tracker/domain';
import { useExerciseStore } from '../../stores/exerciseStore';
import { HorizontalFadeScroll } from '../HorizontalFadeScroll';

export const ExerciseFilter = () => {
  const styles = useThemeStyles(createStyles);
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
          <Pressable
            accessibilityRole="button"
            style={{ minHeight: 44, justifyContent: 'center' }}
            onPress={resetFilters}
          >
            <Text style={styles.resetText}>Reset</Text>
          </Pressable>
        )}
      </View>

      <Text style={styles.subtitle}>Muscle Group</Text>
      <HorizontalFadeScroll style={styles.scroll}>
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
      </HorizontalFadeScroll>

      <Text style={styles.subtitle}>Equipment</Text>
      <HorizontalFadeScroll style={styles.scroll}>
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
      </HorizontalFadeScroll>
    </View>
  );
};

const formatName = (str: string) => {
  return str
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      paddingVertical: 12,
      backgroundColor: theme.colors.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.surfaceElevated,
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
      color: theme.colors.text,
    },
    resetText: {
      fontSize: 14,
      color: theme.colors.primary,
      fontWeight: '600',
    },
    subtitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.muted,
      paddingHorizontal: 16,
      marginTop: 8,
      marginBottom: 8,
    },
    scroll: {
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    chip: {
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: theme.colors.surfaceElevated,
      marginRight: 8,
    },
    chipSelected: {
      backgroundColor: theme.colors.primary,
    },
    chipText: {
      fontSize: 14,
      color: theme.colors.text,
      fontWeight: '500',
    },
    chipTextSelected: {
      color: theme.colors.onPrimary,
    },
  });
