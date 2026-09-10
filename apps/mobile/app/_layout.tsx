import React, { useEffect, useState } from 'react';
import { Platform, Modal, View, Text, StyleSheet, Pressable, Keyboard } from 'react-native';
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
import { ThemeProvider, useTheme, DialogProvider } from '@fitness-tracker/ui';

import { AchievementCelebration } from '../src/components/workout/AchievementCelebration';
import { WorkoutCompleteModal } from '../src/components/workout/WorkoutCompleteModal';
import { KeyboardDoneAccessory } from '../src/components/workout/KeyboardDoneAccessory';
import { useAuthStore } from '../src/stores/authStore';
import { useWorkoutStore } from '../src/stores/workoutStore';
import { getResumeWorkoutDecision } from '../src/utils/resumeWorkoutGuard';
import { inspectStartupState } from '../src/utils/startup-recovery';

if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync().catch(() => {});
}

function StartupWorkoutChecker() {
  const router = useRouter();
  const { status, resetWorkout, resumeWorkout } = useWorkoutStore();
  const [modalVisible, setModalVisible] = useState(false);
  const theme = useTheme();

  useEffect(() => {
    return inspectStartupState(useWorkoutStore.persist, () => {
      const decision = getResumeWorkoutDecision(useWorkoutStore.getState());
      if (decision === 'prompt') setModalVisible(true);
    });
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleUnload = () => {
        const currentStatus = useWorkoutStore.getState().status;
        if (currentStatus === 'active') {
          useWorkoutStore.getState().pauseWorkout();
        }
      };
      const win = globalThis as unknown as {
        addEventListener?: (type: string, listener: () => void) => void;
        removeEventListener?: (type: string, listener: () => void) => void;
      };
      const add = win.addEventListener;
      const remove = win.removeEventListener;
      if (typeof add === 'function' && typeof remove === 'function') {
        add('beforeunload', handleUnload);
        return () => {
          remove('beforeunload', handleUnload);
        };
      }
    }
  }, []);

  return (
    <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.lg,
            },
          ]}
        >
          <Text
            style={[styles.modalTitle, { color: theme.colors.text, ...theme.typography.heading }]}
          >
            Unfinished Workout
          </Text>
          <Text
            style={[styles.modalMessage, { color: theme.colors.muted, ...theme.typography.body }]}
          >
            You have an active workout session in progress. Resume it or start fresh?
          </Text>
          <View style={styles.modalActions}>
            <Pressable
              style={[
                styles.modalBtn,
                { backgroundColor: theme.colors.primary, borderRadius: theme.radius.md },
              ]}
              onPress={() => {
                if (status === 'paused') {
                  resumeWorkout();
                }
                setModalVisible(false);
                router.push('/workout/session');
              }}
            >
              <Text
                style={[
                  styles.modalBtnText,
                  { color: theme.colors.background, ...theme.typography.button },
                ]}
              >
                Resume Workout
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.modalBtn,
                {
                  backgroundColor: 'transparent',
                  borderColor: theme.colors.border,
                  borderWidth: 1,
                  borderRadius: theme.radius.md,
                },
              ]}
              onPress={() => {
                resetWorkout();
                setModalVisible(false);
              }}
            >
              <Text
                style={[
                  styles.modalBtnText,
                  { color: theme.colors.accent, ...theme.typography.button },
                ]}
              >
                Discard &amp; Start New
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function RootNavigator() {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { initialize, isConfigured, isInitialized, isLoading, session } = useAuthStore();

  useEffect(() => {
    initialize().catch(() => {});
  }, [initialize]);

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
        <ThemeProvider>
          <DialogProvider>
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
            <RootNavigator />
          </DialogProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  bootScreen: {
    flex: 1,
    backgroundColor: '#0B0B0F',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 11, 15, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    borderWidth: 1,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalActions: {
    width: '100%',
    gap: 12,
  },
  modalBtn: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  modalBtnText: {
    fontSize: 15,
  },
});
