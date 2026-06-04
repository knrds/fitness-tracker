import React from 'react';
import { View, TextInput, TextInputProps, Text, StyleSheet } from 'react-native';
import { useTheme } from '../ThemeProvider';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, helperText, style, ...props }) => {
  const theme = useTheme();

  const borderColor = error ? theme.colors.accent : theme.colors.border;

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: theme.colors.text, ...theme.typography.caption }]}>
          {label}
        </Text>
      )}
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.surface,
            borderColor: borderColor,
            color: theme.colors.text,
            borderRadius: theme.radius.md,
            ...theme.typography.body,
          },
          style,
        ]}
        placeholderTextColor={theme.colors.muted}
        {...props}
      />
      {error && (
        <Text
          style={[styles.errorText, { color: theme.colors.accent, ...theme.typography.caption }]}
        >
          {error}
        </Text>
      )}
      {helperText && !error && (
        <Text
          style={[styles.helperText, { color: theme.colors.muted, ...theme.typography.caption }]}
        >
          {helperText}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
  },
  input: {
    height: 56,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  errorText: {
    marginTop: 4,
  },
  helperText: {
    marginTop: 4,
  },
});
