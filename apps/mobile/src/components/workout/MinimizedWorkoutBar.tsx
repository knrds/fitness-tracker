import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  useReducedMotion,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Theme, useTheme, useThemeStyles } from '@fitness-tracker/ui';
import { useWorkoutStore } from '../../stores/workoutStore';
import { isIOS } from '../../utils/platform';
import { useI18n } from '../../i18n';

export const MinimizedWorkoutBar = () => {
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  const router = useRouter();
  const { t } = useI18n();
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
  const isRestoringRef = useRef(false);
  const reducedMotion = useReducedMotion();

  const isVisible = status !== 'idle' && isMinimized;
  const [mounted, setMounted] = useState(isVisible);
  const progress = useSharedValue(isVisible ? 1 : 0);

  useEffect(() => {
    if (status === 'idle') {
      setMounted(false);
      progress.value = 0;
      return;
    }

    if (isMinimized) {
      setMounted(true);
      progress.value = withTiming(1, {
        duration: reducedMotion ? 0 : theme.motion.standard,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      progress.value = withTiming(
        0,
        {
          duration: reducedMotion ? 0 : theme.motion.fast,
          easing: Easing.in(Easing.cubic),
        },
        (finished) => {
          if (finished) {
            runOnJS(setMounted)(false);
          }
        },
      );
    }
  }, [isMinimized, status, reducedMotion, theme.motion.standard, theme.motion.fast, progress]);

  const animatedBarStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      {
        translateY: (1 - progress.value) * 60,
      },
      {
        scale: 0.96 + progress.value * 0.04,
      },
    ],
  }));

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

  const formatElapsed = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleRestore = useCallback(() => {
    if (isRestoringRef.current) return;
    isRestoringRef.current = true;
    setMinimized(false);
    router.push('/workout/session');
    setTimeout(() => {
      isRestoringRef.current = false;
    }, 350);
  }, [router, setMinimized]);

  const handlePlayPause = useCallback(() => {
    if (status === 'active') {
      pauseWorkout();
    } else if (status === 'paused') {
      resumeWorkout();
    }
  }, [status, pauseWorkout, resumeWorkout]);

  if (status === 'idle' || (!isMinimized && !mounted)) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents={isMinimized ? 'auto' : 'none'}
      style={[
        styles.barContainer,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          bottom: isIOS ? 98 : 76,
        },
        animatedBarStyle,
      ]}
    >
      <Pressable
        style={styles.innerPressable}
        onPress={handleRestore}
        accessibilityRole="button"
        accessibilityLabel={t('workout.expandWorkoutA11y')}
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
              e?.stopPropagation?.();
              handlePlayPause();
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={status === 'active' ? 'Pause' : 'Play'}
          >
            <Ionicons
              name={status === 'active' ? 'pause' : 'play'}
              size={16}
              color={theme.colors.primary}
            />
          </Pressable>

          <View style={styles.expandChevron}>
            <Ionicons name="chevron-up" size={18} color={theme.colors.primary} />
          </View>
        </View>
      </Pressable>
    </Animated.View>
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
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 8,
      zIndex: 9999,
    },
    innerPressable: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      height: '100%',
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
    expandChevron: {
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 2,
    },
  });
