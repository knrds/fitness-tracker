import { AuthHeader } from '../../src/components/AuthHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter, Href } from 'expo-router';
import { useTheme, Input, Button, useDialog } from '@fitness-tracker/ui';
import { useAuthStore } from '../../src/stores/authStore';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { showAlert } = useDialog();
  const [email, setEmail] = useState('');
  const { sendPasswordResetEmail, isLoading } = useAuthStore();

  const handleRequestLink = async () => {
    if (!email.trim()) {
      await showAlert({
        title: 'Error',
        message: 'Please enter your email address.',
        tone: 'danger',
      });
      return;
    }

    try {
      const result = await sendPasswordResetEmail(email.trim());
      if (result.error) {
        await showAlert({ title: 'Request Failed', message: result.error, tone: 'danger' });
      } else {
        await showAlert({
          title: 'Link Sent',
          message:
            'A password reset link has been sent to ' + email.trim() + '. Please check your inbox.',
          tone: 'success',
        });
        setEmail('');
        router.push('/auth/login' as Href);
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
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(48, insets.top + 24),
            paddingBottom: Math.max(32, insets.bottom + 24),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <AuthHeader title="Reset your password" />

        <View style={styles.form}>
          <Text style={[styles.instructionText, { color: theme.colors.muted }]}>
            Enter the email address associated with your account, and we'll send you a link to reset
            your password.
          </Text>

          <Input
            label="Email Address"
            placeholder="email@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Button
            title="SEND RESET LINK"
            variant="primary"
            isLoading={isLoading}
            onPress={handleRequestLink}
            style={styles.button}
          />
        </View>

        <View style={styles.footer}>
          <Button
            title="Back to Log In"
            variant="ghost"
            onPress={() => router.push('/auth/login' as Href)}
            style={styles.backButton}
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
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
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
  footer: {
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  backButton: {
    width: '100%',
  },
});
