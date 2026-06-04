import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MuscleGroup } from '@fitness-tracker/domain';

interface Props {
  muscleGroup: MuscleGroup;
}

const getMuscleGroupColor = (muscle: MuscleGroup) => {
  const colors: Record<string, string> = {
    [MuscleGroup.Chest]: '#E74C3C',
    [MuscleGroup.UpperBack]: '#3498DB',
    [MuscleGroup.Lats]: '#3498DB',
    [MuscleGroup.LowerBack]: '#3498DB',
    [MuscleGroup.Traps]: '#3498DB',
    [MuscleGroup.FrontDelts]: '#E67E22',
    [MuscleGroup.SideDelts]: '#E67E22',
    [MuscleGroup.RearDelts]: '#E67E22',
    [MuscleGroup.Biceps]: '#9B59B6',
    [MuscleGroup.Triceps]: '#9B59B6',
    [MuscleGroup.Forearms]: '#9B59B6',
    [MuscleGroup.Quads]: '#2ECC71',
    [MuscleGroup.Hamstrings]: '#2ECC71',
    [MuscleGroup.Glutes]: '#2ECC71',
    [MuscleGroup.Calves]: '#2ECC71',
    [MuscleGroup.Abs]: '#F1C40F',
    [MuscleGroup.Obliques]: '#F1C40F',
    [MuscleGroup.Neck]: '#95A5A6',
    [MuscleGroup.FullBody]: '#95A5A6',
  };
  return colors[muscle] || '#95A5A6';
};

const formatMuscleName = (muscle: MuscleGroup) => {
  return muscle
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
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
