import { AuthHeader } from '../../src/components/AuthHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter, Href } from 'expo-router';
import { useTheme, Input, Button, useDialog } from '@fitness-tracker/ui';
import { useAuthStore } from '../../src/stores/authStore';
import { useI18n } from '../../src/i18n';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { showAlert } = useDialog();
  const { language } = useI18n();
  const [email, setEmail] = useState('');
  const { sendPasswordResetEmail, isLoading } = useAuthStore();

  const handleRequestLink = async () => {
    if (!email.trim()) {
      await showAlert({
        title: language === 'de' ? 'Fehler' : 'Error',
        message:
          language === 'de'
            ? 'Bitte gib deine E-Mail-Adresse ein.'
            : 'Please enter your email address.',
        tone: 'danger',
      });
      return;
    }

    try {
      const result = await sendPasswordResetEmail(email.trim());
      if (result.error) {
        await showAlert({
          title: language === 'de' ? 'Anfrage fehlgeschlagen' : 'Request Failed',
          message: result.error,
          tone: 'danger',
        });
      } else {
        await showAlert({
          title: language === 'de' ? 'Link gesendet' : 'Link Sent',
          message:
            language === 'de'
              ? 'Ein Link zum Zurücksetzen des Passworts wurde an ' +
                email.trim() +
                ' gesendet. Bitte prüfe deinen Posteingang.'
              : 'A password reset link has been sent to ' +
                email.trim() +
                '. Please check your inbox.',
          tone: 'success',
        });
        setEmail('');
        router.push('/auth/login' as Href);
      }
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error
          ? err.message
          : language === 'de'
            ? 'Ein unerwarteter Fehler ist aufgetreten.'
            : 'An unexpected error occurred.';
      await showAlert({
        title: language === 'de' ? 'Fehler' : 'Error',
        message: errMsg,
        tone: 'danger',
      });
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
        <AuthHeader title={language === 'de' ? 'Passwort zurücksetzen' : 'Reset your password'} />

        <View style={styles.form}>
          <Text style={[styles.instructionText, { color: theme.colors.muted }]}>
            {language === 'de'
              ? 'Gib die mit deinem Konto verknüpfte E-Mail-Adresse ein. Wir senden dir einen Link zum Zurücksetzen deines Passworts.'
              : "Enter the email address associated with your account, and we'll send you a link to reset your password."}
          </Text>

          <Input
            label={language === 'de' ? 'E-Mail-Adresse' : 'Email Address'}
            placeholder="email@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Button
            title={language === 'de' ? 'LINK SENDEN' : 'SEND RESET LINK'}
            variant="primary"
            isLoading={isLoading}
            onPress={handleRequestLink}
            style={styles.button}
          />
        </View>

        <View style={styles.footer}>
          <Button
            title={language === 'de' ? 'Zurück zur Anmeldung' : 'Back to Log In'}
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
