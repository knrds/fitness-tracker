import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@fitness-tracker/ui';

import { useWorkoutStore } from '../../stores/workoutStore';

export const RestTimer = () => {
  const theme = useTheme();
  const { restTimer, startRestTimer, stopRestTimer, tickRestTimer, resetRestTimer } = useWorkoutStore();
  const [timeLeft, setTimeLeft] = useState(restTimer.durationSeconds);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;

    if (restTimer.isRunning && restTimer.endsAt) {
      const endsAt = restTimer.endsAt;
      interval = setInterval(() => {
        tickRestTimer();
        const remaining = Math.ceil((endsAt.getTime() - Date.now()) / 1000);
        setTimeLeft(remaining <= 0 ? 0 : remaining);
      }, 250);
    } else {
      setTimeLeft(restTimer.durationSeconds);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [restTimer.isRunning, restTimer.endsAt, restTimer.durationSeconds, tickRestTimer]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const remaining = Math.max(0, timeLeft);
  const isLow = restTimer.isRunning && remaining <= 10;
  const timerColor = isLow ? theme.colors.accent : theme.colors.primary;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderColor: timerColor,
          borderRadius: theme.radius.lg,
        },
      ]}
      testID="rest-timer-container"
    >
      <Text style={[styles.label, { color: theme.colors.muted }]}>Rest Timer</Text>
      <Text style={[styles.timerText, { color: timerColor }]}>{formatTime(remaining)}</Text>
      <View style={styles.controls}>
        {restTimer.isRunning ? (
          <Pressable
            style={[styles.btn, { borderColor: theme.colors.border }]}
            onPress={stopRestTimer}
            testID="stop-timer-btn"
          >
            <Text style={[styles.btnText, { color: theme.colors.text }]}>Pause</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.btn, { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}
            onPress={() => startRestTimer(timeLeft || 90)}
            testID="start-timer-btn"
          >
            <Text style={[styles.btnText, { color: theme.colors.background }]}>Start</Text>
          </Pressable>
        )}
        <Pressable
          style={[styles.btn, { borderColor: theme.colors.border }]}
          onPress={() => startRestTimer(Math.max(0, timeLeft - 10))}
        >
          <Text style={[styles.btnText, { color: theme.colors.text }]}>−10s</Text>
        </Pressable>
        <Pressable
          style={[styles.btn, { borderColor: theme.colors.border }]}
          onPress={() => startRestTimer(timeLeft + 30)}
        >
          <Text style={[styles.btnText, { color: theme.colors.text }]}>+30s</Text>
        </Pressable>
        <Pressable
          style={[styles.btn, { borderColor: theme.colors.border }]}
          onPress={resetRestTimer}
          testID="reset-timer-btn"
        >
          <Text style={[styles.btnText, { color: theme.colors.accent }]}>Reset</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 8,
  },
  label: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  timerText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 52,
    marginBottom: 16,
    fontVariant: ['tabular-nums'],
  },
  controls: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  btn: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9999,
    minWidth: 64,
    alignItems: 'center',
  },
  btnText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 14,
  },
});
