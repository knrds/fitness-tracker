import { useTheme } from '@fitness-tracker/ui';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MuscleGroup } from '@fitness-tracker/domain';

import { useI18n } from '../../i18n';

interface Props {
  muscleGroup: MuscleGroup;
}

export const MuscleGroupBadge = ({ muscleGroup }: Props) => {
  const theme = useTheme();
  const { formatMuscle } = useI18n();
  const color = theme.colors.tertiary;

  return (
    <View style={[styles.badge, { backgroundColor: theme.colors.primarySubtle }]}>
      <Text style={[styles.text, { color }]}>{formatMuscle(muscleGroup)}</Text>
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
