import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter, Href } from 'expo-router';
import { useTheme, Input, Button, useDialog } from '@fitness-tracker/ui';
import { useAuthStore } from '../../src/stores/authStore';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { showAlert } = useDialog();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { updatePassword, isLoading } = useAuthStore();

  const handleResetPassword = async () => {
    if (!password.trim() || !confirmPassword.trim()) {
      await showAlert({
        title: 'Error',
        message: 'Please fill in both password fields.',
        tone: 'danger',
      });
      return;
    }

    if (password !== confirmPassword) {
      await showAlert({
        title: 'Error',
        message: 'Passwords do not match.',
        tone: 'danger',
      });
      return;
    }

    if (password.length < 6) {
      await showAlert({
        title: 'Weak Password',
        message: 'Password must be at least 6 characters long.',
        tone: 'danger',
      });
      return;
    }

    try {
      const result = await updatePassword(password);
      if (result.error) {
        await showAlert({ title: 'Update Failed', message: result.error, tone: 'danger' });
      } else {
        await showAlert({
          title: 'Success',
          message: 'Your password has been successfully updated.',
          tone: 'success',
        });
        router.replace('/' as Href);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      await showAlert({ title: 'Error', message: errMsg, tone: 'danger' });
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>VOLT</Text>
          <Text style={[styles.subtitle, { color: theme.colors.primary }]}>PERFORMANCE</Text>
        </View>

        <View style={styles.form}>
          <Text style={[styles.instructionText, { color: theme.colors.muted }]}>
            Please enter your new password below.
          </Text>

          <Input
            label="New Password"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          <Input
            label="Confirm New Password"
            placeholder="••••••••"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          <Button
            title="UPDATE PASSWORD"
            variant="primary"
            isLoading={isLoading}
            onPress={handleResetPassword}
            style={styles.button}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 42,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 6,
    marginTop: -4,
    textTransform: 'uppercase',
  },
  form: {
    width: '100%',
    marginBottom: 24,
  },
  instructionText: {
    fontSize: 15,
    fontFamily: 'Manrope_500Medium',
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
  },
  button: {
    marginTop: 8,
  },
});
