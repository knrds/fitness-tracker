import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@fitness-tracker/ui';

import { useWorkoutStore } from '../../stores/workoutStore';

export const RestTimer = () => {
  const theme = useTheme();
  const { restTimer, startRestTimer, stopRestTimer, tickRestTimer, resetRestTimer } = useWorkoutStore();
  const [timeLeft, setTimeLeft] = useState(restTimer.durationSeconds);
  const [collapsed, setCollapsed] = useState(false);
  const translateY = useSharedValue(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editVal, setEditVal] = useState('');

  const handleFinishEdit = () => {
    setIsEditing(false);
    let seconds = 0;
    if (editVal.includes(':')) {
      const parts = editVal.split(':');
      const mins = parseInt(parts[0] || '0', 10);
      const secs = parseInt(parts[1] || '0', 10);
      seconds = mins * 60 + secs;
    } else {
      seconds = parseInt(editVal, 10) || 0;
    }
    if (seconds > 0) {
      startRestTimer(seconds);
    }
  };

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

  const totalDuration = restTimer.durationSeconds || 90;
  const elapsedPct = restTimer.isRunning && totalDuration > 0 ? (totalDuration - remaining) / totalDuration : 0;
  const angle = `${elapsedPct * 360}deg`;

  const R = 54;
  const C = 2 * Math.PI * R;
  const strokeDashoffset = C * (1 - elapsedPct);

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
            <Text style={[styles.collapsedTime, { color: theme.colors.text }]}>{formatTime(remaining)}</Text>
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
            
            {/* Circular Clock Face */}
            <View style={[styles.clockFace, { borderColor: theme.colors.border }]}>
              <Svg width={140} height={140} style={{ transform: [{ rotate: '-90deg' }], position: 'absolute' }}>
                <Circle
                  cx="70"
                  cy="70"
                  r={R}
                  stroke={theme.colors.border}
                  strokeWidth="5"
                  fill="transparent"
                />
                {elapsedPct > 0 && (
                  <Circle
                    cx="70"
                    cy="70"
                    r={R}
                    stroke={timerColor}
                    strokeWidth="5"
                    fill="transparent"
                    strokeDasharray={C}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                  />
                )}
              </Svg>
              <View style={[styles.needleContainer, { transform: [{ rotate: angle }] }]}>
                <View style={[styles.needle, { backgroundColor: timerColor }]} />
              </View>
              <View style={[styles.clockDot, { backgroundColor: timerColor }]} />
              
              {isEditing ? (
                <TextInput
                  style={[
                    styles.timerText,
                    {
                      color: theme.colors.text,
                      borderBottomWidth: 1,
                      borderBottomColor: theme.colors.primary,
                      textAlign: 'center',
                      minWidth: 90,
                    }
                  ]}
                  value={editVal}
                  onChangeText={setEditVal}
                  keyboardType="numbers-and-punctuation"
                  autoFocus
                  onSubmitEditing={handleFinishEdit}
                  onBlur={handleFinishEdit}
                />
              ) : (
                <Pressable onPress={() => {
                  if (!restTimer.isRunning) {
                    setIsEditing(true);
                    setEditVal(formatTime(remaining));
                  }
                }}>
                  <Text style={[styles.timerText, { color: theme.colors.text }]}>
                    {formatTime(remaining)}
                  </Text>
                </Pressable>
              )}
            </View>

            <View style={styles.controls}>
              {restTimer.isRunning ? (
                <Pressable style={[styles.btn, { backgroundColor: '#ea580c', borderColor: '#ea580c' }]} onPress={stopRestTimer} testID="stop-timer-btn">
                  <Text style={[styles.btnText, { color: '#ffffff' }]}>Pause</Text>
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
              <Pressable style={[styles.btn, { borderColor: theme.colors.border }]} onPress={resetRestTimer} testID="reset-timer-btn">
                <Text style={[styles.btnText, { color: theme.colors.accent }]}>Reset</Text>
              </Pressable>
            </View>

            {/* Time Adjustments Grid */}
            <View style={styles.gridControls}>
              <Pressable style={[styles.miniBtn, { borderColor: theme.colors.border }]} onPress={() => startRestTimer(Math.max(0, timeLeft - 30))}>
                <Text style={[styles.miniBtnText, { color: theme.colors.text }]}>−30s</Text>
              </Pressable>
              <Pressable style={[styles.miniBtn, { borderColor: theme.colors.border }]} onPress={() => startRestTimer(Math.max(0, timeLeft - 10))}>
                <Text style={[styles.miniBtnText, { color: theme.colors.text }]}>−10s</Text>
              </Pressable>
              <Pressable style={[styles.miniBtn, { borderColor: theme.colors.border }]} onPress={() => startRestTimer(timeLeft + 10)}>
                <Text style={[styles.miniBtnText, { color: theme.colors.text }]}>+10s</Text>
              </Pressable>
              <Pressable style={[styles.miniBtn, { borderColor: theme.colors.border }]} onPress={() => startRestTimer(timeLeft + 30)}>
                <Text style={[styles.miniBtnText, { color: theme.colors.text }]}>+30s</Text>
              </Pressable>
              <Pressable style={[styles.miniBtn, { borderColor: theme.colors.border }]} onPress={() => startRestTimer(timeLeft + 60)}>
                <Text style={[styles.miniBtnText, { color: theme.colors.text }]}>+1m</Text>
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
  clockFace: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginVertical: 16,
  },
  needleContainer: {
    position: 'absolute',
    width: 140,
    height: 140,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  needle: {
    width: 2,
    height: 55,
    marginTop: 10,
    borderRadius: 1,
  },
  clockDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    zIndex: 2,
  },
  timerText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 28,
    fontVariant: ['tabular-nums'],
    zIndex: 1,
  },
  controls: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  btn: {
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 9999,
    minWidth: 80,
    alignItems: 'center',
  },
  btnText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 14,
  },
  gridControls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    marginTop: 12,
  },
  miniBtn: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 50,
    alignItems: 'center',
    backgroundColor: 'rgba(144, 213, 255, 0.05)',
  },
  miniBtnText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 12,
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
