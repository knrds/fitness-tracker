import { CelebrationPreviewHost } from '../src/components/workout/CelebrationPreview';
import { PaywallHost } from '../src/components/paywall/PaywallHost';
import React, { useEffect, useState } from 'react';
import { Platform, View, StyleSheet, Keyboard } from 'react-native';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  SpaceGrotesk_400Regular,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { Manrope_500Medium, Manrope_600SemiBold } from '@expo-google-fonts/manrope';
import * as SplashScreen from 'expo-splash-screen';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  ThemeProvider,
  useTheme,
  DialogProvider,
  theme as defaultTheme,
} from '@fitness-tracker/ui';

import { AchievementCelebration } from '../src/components/workout/AchievementCelebration';
import { WorkoutCompleteModal } from '../src/components/workout/WorkoutCompleteModal';
import { KeyboardDoneAccessory } from '../src/components/workout/KeyboardDoneAccessory';
import { StartupWorkoutChecker } from '../src/components/workout/StartupWorkoutChecker';
import { useAuthStore } from '../src/stores/authStore';
import { PersistenceGate } from '../src/components/PersistenceGate';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { useProfileStore } from '../src/stores/profileStore';
import { validateEnvironment } from '../src/utils/envValidation';

if (typeof __DEV__ !== 'undefined' && __DEV__) {
  validateEnvironment(true);
}

if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync().catch(() => {});
}

function RootNavigator() {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { isConfigured, isInitialized, isLoading, session } = useAuthStore();

  useEffect(() => {
    Keyboard.dismiss();
  }, [pathname]);

  useEffect(() => {
    if (!isConfigured || !isInitialized || isLoading) return;

    const isAuthRoute = pathname.startsWith('/auth');
    if (!session && !isAuthRoute) {
      router.replace('/auth/login');
    } else if (session && isAuthRoute) {
      router.replace('/');
    }
  }, [isConfigured, isInitialized, isLoading, pathname, router, session]);

  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.primary,
          headerTitleStyle: { fontFamily: 'SpaceGrotesk_700Bold', color: theme.colors.text },
          headerShadowVisible: false,
          gestureEnabled: true,
          fullScreenGestureEnabled: false,
          gestureDirection: 'horizontal',
          headerBackTitle: '',
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ headerShown: false }} />
        <Stack.Screen name="auth/register" options={{ headerShown: false }} />
        <Stack.Screen name="auth/verify" options={{ headerShown: false }} />
        <Stack.Screen name="auth/forgot-password" options={{ headerShown: false }} />
        <Stack.Screen name="auth/reset-password" options={{ headerShown: false }} />
        <Stack.Screen name="programs/template-builder" options={{ headerShown: false }} />
        <Stack.Screen name="workout/quick-start" options={{ headerShown: false }} />
        <Stack.Screen
          name="workout/session"
          options={{
            headerShown: false,
            animation: 'fade',
          }}
        />
      </Stack>
      <StatusBar style="light" />
      <AchievementCelebration />
      <WorkoutCompleteModal />
      <StartupWorkoutChecker />
      <KeyboardDoneAccessory />
    </>
  );
}

export default function RootLayout() {
  const dialogScope = useAuthStore((state) =>
    state.isSwitchingAccount ? 'changing-account' : (state.user?.id ?? 'local'),
  );
  const [fontWaitTimedOut, setFontWaitTimedOut] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    Manrope_500Medium,
    Manrope_600SemiBold,
  });
  const canRender = fontsLoaded || Boolean(fontError) || fontWaitTimedOut;
  const isStaticWebRender = Platform.OS === 'web' && !('window' in globalThis);

  useEffect(() => {
    if (canRender) return;

    const timeout = setTimeout(
      () => {
        setFontWaitTimedOut(true);
      },
      Platform.OS === 'web' ? 2500 : 8000,
    );

    return () => clearTimeout(timeout);
  }, [canRender]);

  useEffect(() => {
    if (canRender && Platform.OS !== 'web') {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [canRender]);

  if (!canRender && !isStaticWebRender) {
    if (Platform.OS === 'web') {
      return <View style={styles.bootScreen} />;
    }
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppTheme>
          <DialogProvider key={dialogScope}>
            {Platform.OS === 'web' && (
              <style
                dangerouslySetInnerHTML={{
                  __html: `
                * {
                  scrollbar-width: thin;
                  scrollbar-color: rgba(255, 255, 255, 0.25) transparent;
                }
                ::-webkit-scrollbar {
                  width: 6px;
                  height: 6px;
                }
                ::-webkit-scrollbar-track {
                  background: transparent;
                }
                ::-webkit-scrollbar-thumb {
                  background: rgba(255, 255, 255, 0.25);
                  border-radius: 999px;
                }
                ::-webkit-scrollbar-thumb:hover {
                  background: rgba(255, 255, 255, 0.45);
                }
              `,
                }}
              />
            )}
            <PersistenceGate>
              <ErrorBoundary>
                <RootNavigator />
              </ErrorBoundary>
            </PersistenceGate>
            <PaywallHost />
          <CelebrationPreviewHost />
          </DialogProvider>
        </AppTheme>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppTheme({ children }: { children: React.ReactNode }) {
  const colorway = useProfileStore((state) => state.profile.colorway ?? 'glacier');
  return <ThemeProvider colorway={colorway}>{children}</ThemeProvider>;
}

const styles = StyleSheet.create({
  bootScreen: {
    flex: 1,
    backgroundColor: defaultTheme.colors.background,
  },
});
