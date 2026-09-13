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
      textColor = theme.colors.onError;
      break;
    case 'warning':
      backgroundColor = theme.colors.warning;
      textColor = theme.colors.onPrimary;
      break;
    case 'success':
      backgroundColor = theme.colors.success;
      textColor = theme.colors.onPrimary;
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
    minHeight: 24,
    paddingVertical: 4,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  text: {
    textAlign: 'center',
  },
});
