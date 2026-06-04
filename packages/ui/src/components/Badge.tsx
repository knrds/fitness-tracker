import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../ThemeProvider';

export interface BadgeProps {
  label: string;
  variant?: 'default' | 'primary' | 'danger' | 'warning' | 'success';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'default', style }) => {
  const theme = useTheme();

  let backgroundColor = theme.colors.border;
  let textColor = theme.colors.text;

  switch (variant) {
    case 'primary':
      backgroundColor = theme.colors.primary;
      textColor = theme.colors.background;
      break;
    case 'danger':
      backgroundColor = theme.colors.accent;
      textColor = '#FFFFFF';
      break;
    case 'warning':
      backgroundColor = '#FFB800'; // Hardcoded for warning, not explicitly in PRD but needed for some set types
      textColor = '#000000';
      break;
    case 'success':
      backgroundColor = '#00C853';
      textColor = '#FFFFFF';
      break;
    case 'default':
    default:
      backgroundColor = theme.colors.border;
      textColor = theme.colors.text;
      break;
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor,
          borderRadius: theme.radius.sm,
        },
        style,
      ]}
    >
      <Text style={[styles.text, { color: textColor, ...theme.typography.caption }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 24,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  text: {
    textAlign: 'center',
  },
});
