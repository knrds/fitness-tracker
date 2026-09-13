import React, { useState } from 'react';
import { View, TextInput, TextInputProps, Text, StyleSheet } from 'react-native';
import { useTheme } from '../ThemeProvider';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  style,
  multiline,
  returnKeyType,
  blurOnSubmit,
  ...props
}) => {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? theme.colors.error
    : focused
      ? theme.colors.borderActive
      : theme.colors.border;
  const isMultiline = multiline === true;

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
            fontSize: 16,
          },
          style,
        ]}
        placeholderTextColor={theme.colors.muted}
        {...props}
        accessibilityLabel={props.accessibilityLabel ?? label}
        onFocus={(event) => {
          setFocused(true);
          props.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          props.onBlur?.(event);
        }}
        multiline={multiline}
        returnKeyType={returnKeyType ?? (isMultiline ? 'default' : 'done')}
        blurOnSubmit={blurOnSubmit ?? !isMultiline}
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
    minHeight: 48,
    paddingVertical: 12,
    minWidth: 0,
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
