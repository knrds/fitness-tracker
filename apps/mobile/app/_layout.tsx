import React, { useEffect, useState } from 'react';
import { Platform, Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AchievementCelebration } from '../src/components/workout/AchievementCelebration';
import { useWorkoutStore } from '../src/stores/workoutStore';

import { useTheme } from '@fitness-tracker/ui';

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
          // Timeout: Discard the workout silently
          resetWorkout();
          return;
        }
      }

      // Show the premium custom in-app modal
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
    <Modal
      visible={modalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {}}
    >
      <View style={[styles.modalOverlay, { backgroundColor: 'rgba(11, 11, 15, 0.8)' }]}>
        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderWidth: 1,
              borderRadius: theme.radius.lg,
            },
          ]}
        >
          <Text style={[styles.modalTitle, { color: theme.colors.text, ...theme.typography.heading }]}>
            Unfinished Workout
          </Text>
          <Text style={[styles.modalMessage, { color: theme.colors.muted, ...theme.typography.body }]}>
            You have an active workout session in progress. Do you want to resume it or start a new one?
          </Text>
          <View style={styles.modalActions}>
            <Pressable
              style={[
                styles.modalBtn,
                styles.resumeBtn,
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
                  styles.resumeBtnText,
                  { color: theme.colors.background, ...theme.typography.button },
                ]}
              >
                Resume Workout
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.modalBtn,
                styles.discardBtn,
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
                  styles.discardBtnText,
                  { color: theme.colors.accent, ...theme.typography.button },
                ]}
              >
                Discard & Start New
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

import { useFonts, SpaceGrotesk_400Regular, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { Manrope_500Medium } from '@expo-google-fonts/manrope';
import { ThemeProvider } from '@fitness-tracker/ui';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

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
    <ThemeProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="light" />
      <AchievementCelebration />
      <StartupWorkoutChecker />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalActions: {
    width: '100%',
    gap: 12,
  },
  modalBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  resumeBtn: {
    backgroundColor: '#3b82f6',
  },
  resumeBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  discardBtn: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  discardBtnText: {
    color: '#ef4444',
    fontWeight: '700',
    fontSize: 16,
  },
});
