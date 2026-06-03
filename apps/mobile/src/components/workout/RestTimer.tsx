import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@fitness-tracker/ui';

import { useWorkoutStore } from '../../stores/workoutStore';

export const RestTimer = () => {
  const theme = useTheme();
  const { restTimer, startRestTimer, stopRestTimer, tickRestTimer, resetRestTimer } = useWorkoutStore();
  const [timeLeft, setTimeLeft] = useState(restTimer.durationSeconds);
  const [collapsed, setCollapsed] = useState(false);
  const translateY = useSharedValue(0);

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

  const setCollapsedJS = (v: boolean) => setCollapsed(v);

  // Drag the handle up to expand, down to minimize.
  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      if (e.translationY > 24) {
        runOnJS(setCollapsedJS)(true);
      } else if (e.translationY < -24) {
        runOnJS(setCollapsedJS)(false);
      }
      translateY.value = withSpring(0, { damping: 18, stiffness: 200 });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const remaining = Math.max(0, timeLeft);
  const isLow = restTimer.isRunning && remaining <= 10;
  const timerColor = isLow ? theme.colors.accent : theme.colors.primary;

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[
          styles.container,
          { backgroundColor: theme.colors.surface, borderColor: timerColor, borderRadius: theme.radius.lg },
          animatedStyle,
        ]}
        testID="rest-timer-container"
      >
        <Pressable onPress={() => setCollapsed((c) => !c)} style={styles.gripArea} hitSlop={8}>
          <View style={[styles.grip, { backgroundColor: theme.colors.border }]} />
        </Pressable>

        {collapsed ? (
          <Pressable style={styles.collapsedRow} onPress={() => setCollapsed(false)}>
            <Text style={[styles.collapsedLabel, { color: theme.colors.muted }]}>REST</Text>
            <Text style={[styles.collapsedTime, { color: timerColor }]}>{formatTime(remaining)}</Text>
            <View style={styles.collapsedControls}>
              {restTimer.isRunning ? (
                <Pressable hitSlop={8} onPress={stopRestTimer} testID="stop-timer-btn">
                  <Ionicons name="pause" size={22} color={theme.colors.text} />
                </Pressable>
              ) : (
                <Pressable hitSlop={8} onPress={() => startRestTimer(timeLeft || 90)} testID="start-timer-btn">
                  <Ionicons name="play" size={22} color={theme.colors.primary} />
                </Pressable>
              )}
              <Ionicons name="chevron-up" size={20} color={theme.colors.muted} />
            </View>
          </Pressable>
        ) : (
          <>
            <Text style={[styles.label, { color: theme.colors.muted }]}>Rest Timer</Text>
            <Text style={[styles.timerText, { color: timerColor }]}>{formatTime(remaining)}</Text>
            <View style={styles.controls}>
              {restTimer.isRunning ? (
                <Pressable style={[styles.btn, { borderColor: theme.colors.border }]} onPress={stopRestTimer} testID="stop-timer-btn">
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
              <Pressable style={[styles.btn, { borderColor: theme.colors.border }]} onPress={() => startRestTimer(Math.max(0, timeLeft - 10))}>
                <Text style={[styles.btnText, { color: theme.colors.text }]}>−10s</Text>
              </Pressable>
              <Pressable style={[styles.btn, { borderColor: theme.colors.border }]} onPress={() => startRestTimer(timeLeft + 30)}>
                <Text style={[styles.btnText, { color: theme.colors.text }]}>+30s</Text>
              </Pressable>
              <Pressable style={[styles.btn, { borderColor: theme.colors.border }]} onPress={resetRestTimer} testID="reset-timer-btn">
                <Text style={[styles.btnText, { color: theme.colors.accent }]}>Reset</Text>
              </Pressable>
            </View>
          </>
        )}
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 6,
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 8,
  },
  gripArea: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 6,
  },
  grip: {
    width: 40,
    height: 4,
    borderRadius: 2,
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
  collapsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 12,
  },
  collapsedLabel: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  collapsedTime: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 24,
    fontVariant: ['tabular-nums'],
    flex: 1,
  },
  collapsedControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
});
