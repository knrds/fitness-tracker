import React, { useEffect, useState } from 'react';
import { Platform, Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  SpaceGrotesk_400Regular,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { Manrope_500Medium } from '@expo-google-fonts/manrope';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useTheme } from '@fitness-tracker/ui';

import { AchievementCelebration } from '../src/components/workout/AchievementCelebration';
import { useWorkoutStore } from '../src/stores/workoutStore';

SplashScreen.preventAutoHideAsync();

function StartupWorkoutChecker() {
  const router = useRouter();
  const { status, resetWorkout, resumeWorkout, startedAt } = useWorkoutStore();
  const [hasChecked, setHasChecked] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const theme = useTheme();

  useEffect(() => {
    if ((status === 'active' || status === 'paused') && !hasChecked) {
      setHasChecked(true);

      const startedTime = startedAt ? new Date(startedAt) : null;
      if (startedTime) {
        const hoursElapsed = (Date.now() - startedTime.getTime()) / (1000 * 60 * 60);
        if (hoursElapsed > 12) {
          // Timeout: discard the stale workout silently
          resetWorkout();
          return;
        }
      }

      setModalVisible(true);
    }
  }, [status, hasChecked, startedAt, resetWorkout]);

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
          <Text style={[styles.modalTitle, { color: theme.colors.text, ...theme.typography.heading }]}>
            Unfinished Workout
          </Text>
          <Text style={[styles.modalMessage, { color: theme.colors.muted, ...theme.typography.body }]}>
            You have an active workout session in progress. Resume it or start fresh?
          </Text>
          <View style={styles.modalActions}>
            <Pressable
              style={[styles.modalBtn, { backgroundColor: theme.colors.primary, borderRadius: theme.radius.md }]}
              onPress={() => {
                if (status === 'paused') {
                  resumeWorkout();
                }
                setModalVisible(false);
                router.push('/workout/session');
              }}
            >
              <Text style={[styles.modalBtnText, { color: theme.colors.background, ...theme.typography.button }]}>
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
              <Text style={[styles.modalBtnText, { color: theme.colors.accent, ...theme.typography.button }]}>
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

  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerTitleStyle: { fontFamily: 'SpaceGrotesk_700Bold', color: theme.colors.text },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="light" />
      <AchievementCelebration />
      <StartupWorkoutChecker />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    Manrope_500Medium,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <RootNavigator />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
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
