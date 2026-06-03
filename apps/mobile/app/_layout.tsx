import React, { useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AchievementCelebration } from '../src/components/workout/AchievementCelebration';
import { useWorkoutStore } from '../src/stores/workoutStore';

function StartupWorkoutChecker() {
  const router = useRouter();
  const { status, resetWorkout, resumeWorkout } = useWorkoutStore();
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if ((status === 'active' || status === 'paused') && !hasChecked) {
      setHasChecked(true);
      const title = 'Unfinished Workout';
      const message = 'You have a workout session in progress. Do you want to resume it or start a new one?';

      if (Platform.OS === 'web') {
        if (typeof globalThis !== 'undefined' && 'confirm' in globalThis) {
          const confirmFn = (globalThis as { confirm?: (msg: string) => boolean }).confirm;
          if (confirmFn?.(message)) {
            if (status === 'paused') {
              resumeWorkout();
            }
            router.push('/workout/session');
          } else {
            resetWorkout();
          }
        }
      } else {
        Alert.alert(
          title,
          message,
          [
            {
              text: 'Resume Workout',
              onPress: () => {
                if (status === 'paused') {
                  resumeWorkout();
                }
                router.push('/workout/session');
              },
            },
            {
              text: 'Discard & Start New',
              style: 'destructive',
              onPress: () => {
                resetWorkout();
              },
            },
          ]
        );
      }
    }
  }, [status, hasChecked, resumeWorkout, resetWorkout, router]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleUnload = () => {
        const currentStatus = useWorkoutStore.getState().status;
        if (currentStatus === 'active') {
          useWorkoutStore.getState().pauseWorkout();
        }
      };
      const win = globalThis as any;
      if (typeof win.addEventListener !== 'undefined') {
        win.addEventListener('beforeunload', handleUnload);
        return () => {
          win.removeEventListener('beforeunload', handleUnload);
        };
      }
    }
  }, []);

  return null;
}

export default function RootLayout() {
  return (
    <>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
      <AchievementCelebration />
      <StartupWorkoutChecker />
    </>
  );
}
