import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MuscleGroup } from '@fitness-tracker/domain';

interface Props {
  muscleGroup: MuscleGroup;
}

const getMuscleGroupColor = (muscle: MuscleGroup) => {
  const colors: Record<string, string> = {
    [MuscleGroup.Chest]: '#ef4444',
    [MuscleGroup.UpperBack]: '#3b82f6',
    [MuscleGroup.Lats]: '#0ea5e9',
    [MuscleGroup.LowerBack]: '#8b5cf6',
    [MuscleGroup.Traps]: '#a855f7',
    [MuscleGroup.FrontDelts]: '#f97316',
    [MuscleGroup.SideDelts]: '#f59e0b',
    [MuscleGroup.RearDelts]: '#eab308',
    [MuscleGroup.Biceps]: '#84cc16',
    [MuscleGroup.Triceps]: '#22c55e',
    [MuscleGroup.Forearms]: '#10b981',
    [MuscleGroup.Quads]: '#14b8a6',
    [MuscleGroup.Hamstrings]: '#06b6d4',
    [MuscleGroup.Glutes]: '#6366f1',
    [MuscleGroup.Calves]: '#ec4899',
    [MuscleGroup.Abs]: '#f43f5e',
    [MuscleGroup.Obliques]: '#d946ef',
    [MuscleGroup.Neck]: '#64748b',
    [MuscleGroup.FullBody]: '#475569',
  };
  return colors[muscle] || '#94a3b8';
};

const formatMuscleName = (muscle: MuscleGroup) => {
  return muscle.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export const MuscleGroupBadge = ({ muscleGroup }: Props) => {
  const color = getMuscleGroupColor(muscleGroup);
  
  return (
    <View style={[styles.badge, { backgroundColor: color + '20' }]}>
      <Text style={[styles.text, { color }]}>{formatMuscleName(muscleGroup)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
