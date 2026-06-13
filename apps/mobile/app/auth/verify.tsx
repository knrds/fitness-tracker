import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams, Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Button, useDialog } from '@fitness-tracker/ui';
import { useAuthStore } from '../../src/stores/authStore';

export default function VerifyScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { showAlert } = useDialog();
  const { email = '' } = useLocalSearchParams<{ email?: string }>();
  const { initialize, resendVerificationEmail, isLoading } = useAuthStore();

  const handleCheckStatus = async () => {
    try {
      // Re-initialize store which fetches active session if confirmed
      await initialize();
      const session = useAuthStore.getState().session;
      if (session) {
        await showAlert({
          title: 'Success',
          message: 'Email successfully verified! Welcome to Volt.',
          tone: 'success',
        });
        router.replace('/' as Href);
      } else {
        await showAlert({
          title: 'Not Verified Yet',
          message: 'We could not detect an active session. Please make sure to open the link inside your confirmation email first.',
          tone: 'default',
        });
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      await showAlert({ title: 'Error', message: errMsg, tone: 'danger' });
    }
  };

  const handleResendEmail = async () => {
    if (!email) {
      await showAlert({
        title: 'Error',
        message: 'No email address found to resend verification.',
        tone: 'danger',
      });
      return;
    }

    try {
      const result = await resendVerificationEmail(email);
      if (result.error) {
        await showAlert({ title: 'Error', message: result.error, tone: 'danger' });
      } else {
        await showAlert({
          title: 'Success',
          message: 'A new verification link has been sent to ' + email,
          tone: 'success',
        });
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      await showAlert({ title: 'Error', message: errMsg, tone: 'danger' });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>VOLT</Text>
          <Text style={[styles.subtitle, { color: theme.colors.primary }]}>PERFORMANCE</Text>
        </View>

        <View style={styles.body}>
          <Ionicons
            name="mail-open-outline"
            size={80}
            color={theme.colors.primary}
            style={styles.icon}
          />
          <Text style={[styles.bodyTitle, { color: theme.colors.text }]}>Verify your Email</Text>
          <Text style={[styles.bodyText, { color: theme.colors.muted }]}>
            We've sent a verification link to:
          </Text>
          <Text style={[styles.emailText, { color: theme.colors.text }]}>{email}</Text>
          <Text style={[styles.bodyText, { color: theme.colors.muted }]}>
            Please tap the link inside that email to complete your registration, then click check status below.
          </Text>
        </View>

        <View style={styles.actions}>
          <Button
            title="I HAVE VERIFIED MY EMAIL"
            variant="primary"
            isLoading={isLoading}
            onPress={handleCheckStatus}
            style={styles.button}
          />

          <Button
            title="RESEND EMAIL"
            variant="secondary"
            isLoading={isLoading}
            onPress={handleResendEmail}
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
    </View>
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
    marginBottom: 32,
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
  body: {
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  icon: {
    marginBottom: 24,
  },
  bodyTitle: {
    fontSize: 24,
    fontFamily: 'SpaceGrotesk_700Bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  bodyText: {
    fontSize: 15,
    fontFamily: 'Manrope_500Medium',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 8,
  },
  emailText: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_600SemiBold',
    textAlign: 'center',
    marginBottom: 16,
  },
  actions: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  button: {
    width: '100%',
  },
  footer: {
    alignItems: 'center',
  },
  backButton: {
    width: '100%',
  },
});
