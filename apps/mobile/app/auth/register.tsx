import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Pressable,
} from 'react-native';
import { useRouter, Href } from 'expo-router';
import { useTheme, Input, Button } from '@fitness-tracker/ui';
import { supabase } from '../../src/utils/supabase';

export default function RegisterScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      return Alert.alert('Error', 'Please fill in all fields.');
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: name.trim(),
          },
        },
      });

      if (error) {
        Alert.alert('Sign Up Failed', error.message);
      } else {
        Alert.alert(
          'Success',
          'Registration successful! Please check your email for a verification link.',
          [{ text: 'OK', onPress: () => router.push('/auth/login' as Href) }],
        );
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      Alert.alert('Error', errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>VOLT</Text>
          <Text style={[styles.subtitle, { color: theme.colors.primary }]}>PERFORMANCE</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Name / Username"
            placeholder="John Doe"
            value={name}
            onChangeText={setName}
          />

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

          <Button
            title="SIGN UP"
            variant="primary"
            isLoading={loading}
            onPress={handleRegister}
            style={styles.button}
          />
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.colors.muted }]}>
            Already have an account?{' '}
          </Text>
          <Pressable onPress={() => router.push('/auth/login' as Href)}>
            <Text style={[styles.link, { color: theme.colors.primary }]}>Log In</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
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
});
