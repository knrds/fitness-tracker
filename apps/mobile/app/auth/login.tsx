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

export default function LoginScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { showAlert } = useDialog();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, isLoading } = useAuthStore();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      await showAlert({ title: 'Error', message: 'Please fill in all fields.', tone: 'danger' });
      return;
    }

    try {
      const result = await signIn({
        email: email.trim(),
        password,
      });

      if (result.error) {
        await showAlert({ title: 'Login Failed', message: result.error, tone: 'danger' });
      } else {
        // Auth state listener in _layout.tsx will navigate to (tabs) automatically
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
        <AuthHeader title="Welcome back" />

        <View style={styles.form}>
          <Input
            label="Email Address"
            placeholder="email@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Input
            label="Password"
            placeholder="••••••••"
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
              Forgot Password?
            </Text>
          </Pressable>

          <Button
            title="LOG IN"
            variant="primary"
            isLoading={isLoading}
            onPress={handleLogin}
            style={styles.button}
          />
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.colors.muted }]}>
            Don't have an account?{' '}
          </Text>
          <Pressable
            accessibilityRole="button"
            style={{ minHeight: 44, justifyContent: 'center' }}
            onPress={() => router.push('/auth/register' as Href)}
          >
            <Text style={[styles.link, { color: theme.colors.primary }]}>Sign Up</Text>
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
