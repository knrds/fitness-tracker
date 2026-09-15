import { AuthHeader } from '../../src/components/AuthHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
} from 'react-native';
import { useRouter, Href } from 'expo-router';
import { useTheme, Input, Button, useDialog } from '@fitness-tracker/ui';
import { useAuthStore } from '../../src/stores/authStore';
import { useI18n } from '../../src/i18n';

export default function LoginScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { showAlert } = useDialog();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, isLoading } = useAuthStore();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      await showAlert({
        title: t('common.error'),
        message: t('auth.fillAllFields'),
        tone: 'danger',
      });
      return;
    }

    try {
      const result = await signIn({
        email: email.trim(),
        password,
      });

      if (result.error) {
        await showAlert({
          title: t('auth.loginFailed'),
          message: result.error,
          tone: 'danger',
        });
      } else {
        // Auth state listener in _layout.tsx will navigate to (tabs) automatically
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : t('auth.unexpectedError');
      await showAlert({
        title: t('common.error'),
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
        <AuthHeader title={t('auth.loginTitle')} />

        <View style={styles.form}>
          <Input
            label={t('auth.emailLabel')}
            placeholder={t('auth.emailPlaceholder')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Input
            label={t('auth.passwordLabel')}
            placeholder={t('auth.passwordPlaceholder')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          <Pressable
            style={styles.forgotPasswordContainer}
            onPress={() => router.push('/auth/forgot-password' as Href)}
          >
            <Text style={[styles.forgotPasswordText, { color: theme.colors.primary }]}>
              {t('auth.forgotPassword')}
            </Text>
          </Pressable>

          <Button
            title={t('auth.loginButton').toUpperCase()}
            variant="primary"
            isLoading={isLoading}
            onPress={handleLogin}
            style={styles.button}
          />
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.colors.muted }]}>
            {t('auth.noAccountPrompt')}{' '}
          </Text>
          <Pressable
            accessibilityRole="button"
            style={{ minHeight: 44, justifyContent: 'center' }}
            onPress={() => router.push('/auth/register' as Href)}
          >
            <Text style={[styles.link, { color: theme.colors.primary }]}>
              {t('auth.registerButton')}
            </Text>
          </Pressable>
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
    marginBottom: 48,
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
  },
  button: {
    marginTop: 8,
  },
  footer: {
    gap: 4,
    flexWrap: 'wrap',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    fontSize: 14,
    fontFamily: 'Manrope_500Medium',
  },
  link: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  forgotPasswordContainer: {
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-end',
    marginBottom: 20,
    marginTop: -8,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
});
