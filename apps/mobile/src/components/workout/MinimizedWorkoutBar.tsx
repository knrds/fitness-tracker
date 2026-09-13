import { Theme, useThemeStyles } from '@fitness-tracker/ui';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@fitness-tracker/ui';
import { useWorkoutStore } from '../../stores/workoutStore';
import { isIOS } from '../../utils/platform';

export const MinimizedWorkoutBar = () => {
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  const router = useRouter();
  const {
    status,
    name,
    startedAt,
    pausedAt,
    accumulatedPauseMs,
    isMinimized,
    restTimer,
    setMinimized,
    pauseWorkout,
    resumeWorkout,
  } = useWorkoutStore();

  const [elapsed, setElapsed] = useState(0);
  const [restRemaining, setRestRemaining] = useState(0);

  // Active workout timer
  useEffect(() => {
    if (status === 'idle' || !isMinimized) return;

    const calculateElapsed = () => {
      if (!startedAt) return 0;
      const startedTime = startedAt instanceof Date ? startedAt : new Date(startedAt);
      const pausedTime = pausedAt
        ? pausedAt instanceof Date
          ? pausedAt
          : new Date(pausedAt)
        : null;
      const endTime = pausedTime || new Date();
      return Math.max(
        0,
        Math.floor((endTime.getTime() - startedTime.getTime() - accumulatedPauseMs) / 1000),
      );
    };

    setElapsed(calculateElapsed());

    let interval: ReturnType<typeof setInterval> | undefined;
    if (status === 'active') {
      interval = setInterval(() => {
        setElapsed(calculateElapsed());
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status, startedAt, pausedAt, accumulatedPauseMs, isMinimized]);

  // Rest timer
  useEffect(() => {
    if (status === 'idle' || !isMinimized || !restTimer.isRunning) return;

    let timer: ReturnType<typeof setInterval> | undefined;
    const endsAt = restTimer.endsAt;

    if (restTimer.isRunning && endsAt) {
      const update = () => {
        const endsAtTime = endsAt instanceof Date ? endsAt.getTime() : new Date(endsAt).getTime();
        const rem = Math.max(0, Math.ceil((endsAtTime - Date.now()) / 1000));
        setRestRemaining(rem);
      };
      update();
      timer = setInterval(update, 500);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [status, restTimer.isRunning, restTimer.endsAt, isMinimized]);

  if (status === 'idle' || !isMinimized) {
    return null;
  }

  const formatElapsed = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleRestore = () => {
    setMinimized(false);
    router.push('/workout/session');
  };

  const handlePlayPause = () => {
    if (status === 'active') {
      pauseWorkout();
    } else if (status === 'paused') {
      resumeWorkout();
    }
  };

  return (
    <Pressable
      style={[
        styles.barContainer,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          bottom: isIOS ? 98 : 76,
        },
      ]}
      onPress={handleRestore}
    >
      <View style={styles.leftCol}>
        <Ionicons name="barbell-outline" size={20} color={theme.colors.primary} />
        <View style={styles.textContainer}>
          <Text style={[styles.titleText, { color: theme.colors.text }]} numberOfLines={1}>
            {name || 'Laufendes Training'}
          </Text>
          <Text style={[styles.durationText, { color: theme.colors.muted }]}>
            {formatElapsed(elapsed)}
          </Text>
        </View>
      </View>

      <View style={styles.rightCol}>
        {restTimer.isRunning && restRemaining > 0 && (
          <View
            style={[
              styles.restBadge,
              { backgroundColor: 'rgba(74, 222, 128, 0.15)', borderColor: theme.colors.success },
            ]}
          >
            <Ionicons name="timer-outline" size={12} color={theme.colors.success} />
            <Text style={styles.restText}>Rest: {formatElapsed(restRemaining)}</Text>
          </View>
        )}

        <Pressable
          style={[styles.actionButton, { backgroundColor: theme.colors.background }]}
          onPress={(e) => {
            e.stopPropagation();
            handlePlayPause();
          }}
          hitSlop={8}
        >
          <Ionicons
            name={status === 'active' ? 'pause' : 'play'}
            size={16}
            color={theme.colors.primary}
          />
        </Pressable>
      </View>
    </Pressable>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    barContainer: {
      position: 'absolute',
      left: 12,
      right: 12,
      height: 56,
      borderRadius: 12,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 8,
      zIndex: 9999,
    },
    leftCol: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: 12,
    },
    textContainer: {
      marginLeft: 12,
      flex: 1,
    },
    titleText: {
      fontSize: 14,
      fontFamily: 'SpaceGrotesk_700Bold',
    },
    durationText: {
      fontSize: 12,
      fontFamily: 'Manrope_600SemiBold',
      marginTop: 1,
    },
    rightCol: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    restBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    restText: {
      color: theme.colors.success,
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 11,
    },
    actionButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
