import { useTheme } from '@fitness-tracker/ui';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MuscleGroup } from '@fitness-tracker/domain';

interface Props {
  muscleGroup: MuscleGroup;
}

const formatMuscleName = (muscle: MuscleGroup) => {
  return muscle
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const MuscleGroupBadge = ({ muscleGroup }: Props) => {
  const theme = useTheme();
  const color = theme.colors.tertiary;

  return (
    <View style={[styles.badge, { backgroundColor: theme.colors.primarySubtle }]}>
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
