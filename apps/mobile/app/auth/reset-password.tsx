import { AuthHeader } from '../../src/components/AuthHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter, Href } from 'expo-router';
import { useTheme, Input, Button, useDialog } from '@fitness-tracker/ui';
import { useAuthStore } from '../../src/stores/authStore';
import { useI18n } from '../../src/i18n';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { showAlert } = useDialog();
  const { language } = useI18n();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { updatePassword, isLoading } = useAuthStore();

  const handleResetPassword = async () => {
    if (!password.trim() || !confirmPassword.trim()) {
      await showAlert({
        title: language === 'de' ? 'Fehler' : 'Error',
        message:
          language === 'de'
            ? 'Bitte fülle beide Passwortfelder aus.'
            : 'Please fill in both password fields.',
        tone: 'danger',
      });
      return;
    }

    if (password !== confirmPassword) {
      await showAlert({
        title: language === 'de' ? 'Fehler' : 'Error',
        message:
          language === 'de' ? 'Passwörter stimmen nicht überein.' : 'Passwords do not match.',
        tone: 'danger',
      });
      return;
    }

    if (password.length < 6) {
      await showAlert({
        title: language === 'de' ? 'Schwaches Passwort' : 'Weak Password',
        message:
          language === 'de'
            ? 'Das Passwort muss mindestens 6 Zeichen lang sein.'
            : 'Password must be at least 6 characters long.',
        tone: 'danger',
      });
      return;
    }

    try {
      const result = await updatePassword(password);
      if (result.error) {
        await showAlert({
          title: language === 'de' ? 'Aktualisierung fehlgeschlagen' : 'Update Failed',
          message: result.error,
          tone: 'danger',
        });
      } else {
        await showAlert({
          title: language === 'de' ? 'Erfolg' : 'Success',
          message:
            language === 'de'
              ? 'Dein Passwort wurde erfolgreich aktualisiert.'
              : 'Your password has been successfully updated.',
          tone: 'success',
        });
        router.replace('/' as Href);
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
        <AuthHeader
          title={language === 'de' ? 'Neues Passwort wählen' : 'Choose a new password'}
        />

        <View style={styles.form}>
          <Text style={[styles.instructionText, { color: theme.colors.muted }]}>
            {language === 'de'
              ? 'Bitte gib unten dein neues Passwort ein.'
              : 'Please enter your new password below.'}
          </Text>

          <Input
            label={language === 'de' ? 'Neues Passwort' : 'New Password'}
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          <Input
            label={language === 'de' ? 'Neues Passwort bestätigen' : 'Confirm New Password'}
            placeholder="••••••••"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          <Button
            title={language === 'de' ? 'PASSWORT AKTUALISIEREN' : 'UPDATE PASSWORD'}
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
});
