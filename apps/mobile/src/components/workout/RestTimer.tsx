import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
  useReducedMotion,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@fitness-tracker/ui';
import { useWorkoutStore } from '../../stores/workoutStore';

export const RestTimer = () => {
  const theme = useTheme();
  const { restTimer, startRestTimer, stopRestTimer, tickRestTimer, resetRestTimer } =
    useWorkoutStore();
  const [remaining, setRemaining] = useState(restTimer.durationSeconds);
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');
  const reducedMotion = useReducedMotion();
  const expansion = useSharedValue(0);
  useEffect(() => {
    expansion.value = withTiming(expanded ? 1 : 0, {
      duration: reducedMotion ? 0 : 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [expanded, expansion, reducedMotion]);
  const panelStyle = useAnimatedStyle(() => ({ height: 72 + expansion.value * 150 }));
  const detailStyle = useAnimatedStyle(() => ({
    opacity: expansion.value,
    transform: [{ translateY: (1 - expansion.value) * 8 }],
  }));

  useEffect(() => {
    const update = () => {
      if (restTimer.isRunning && restTimer.endsAt) {
        setRemaining(Math.max(0, Math.ceil((restTimer.endsAt.getTime() - Date.now()) / 1000)));
        tickRestTimer();
      } else setRemaining(restTimer.durationSeconds);
    };
    update();
    if (!restTimer.isRunning) return;
    const timer = setInterval(update, 250);
    return () => clearInterval(timer);
  }, [restTimer.isRunning, restTimer.endsAt, restTimer.durationSeconds, tickRestTimer]);

  const formatTime = (seconds: number) =>
    `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  const finishEdit = () => {
    setEditing(false);
    const value = input.trim();
    let seconds = 0;
    if (/^\d{1,3}:\d{1,2}$/.test(value)) {
      const [minutes = 0, remainder = 0] = value.split(':').map(Number);
      if (remainder < 60) seconds = minutes * 60 + remainder;
    } else if (/^\d+$/.test(value)) seconds = Number(value);
    if (seconds > 0 && seconds <= 86400) startRestTimer(seconds);
  };
  const pan = Gesture.Pan()
    .minDistance(12)
    .failOffsetX([-20, 20])
    .onEnd((event) => {
      if (event.translationY > 24) runOnJS(setExpanded)(false);
      else if (event.translationY < -24) runOnJS(setExpanded)(true);
    });
  const progress =
    restTimer.durationSeconds > 0
      ? Math.min(1, Math.max(0, remaining / restTimer.durationSeconds))
      : 0;

  return (
    <Animated.View
      testID="rest-timer-container"
      style={[
        styles.panel,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        panelStyle,
      ]}
    >
      <View style={styles.header}>
        <GestureDetector gesture={pan}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={expanded ? 'Pausentimer einklappen' : 'Pausentimer öffnen'}
            accessibilityState={{ expanded }}
            onPress={() => {
              setEditing(false);
              setExpanded((value) => !value);
            }}
            style={styles.toggle}
          >
            <Ionicons name="timer-outline" size={22} color={theme.colors.primary} />
            <Text style={{ color: theme.colors.muted, fontSize: 12 }}>REST</Text>
            <Ionicons
              name={expanded ? 'chevron-down' : 'chevron-up'}
              size={16}
              color={theme.colors.muted}
            />
          </Pressable>
        </GestureDetector>
        {editing ? (
          <TextInput
            accessibilityLabel="Pausendauer"
            style={[styles.time, { color: theme.colors.text, minWidth: 90 }]}
            value={input}
            onChangeText={setInput}
            keyboardType="numbers-and-punctuation"
            autoFocus
            onSubmitEditing={finishEdit}
            onBlur={finishEdit}
          />
        ) : (
          <Pressable
            style={styles.timeButton}
            accessibilityRole="button"
            accessibilityLabel="Pausendauer bearbeiten"
            onPress={() => {
              if (!expanded) setExpanded(true);
              else if (!restTimer.isRunning) {
                setInput(formatTime(remaining));
                setEditing(true);
              }
            }}
          >
            <Text style={[styles.time, { color: theme.colors.text }]}>{formatTime(remaining)}</Text>
          </Pressable>
        )}
        <Pressable
          testID={restTimer.isRunning ? 'stop-timer-btn' : 'start-timer-btn'}
          accessibilityRole="button"
          accessibilityLabel={restTimer.isRunning ? 'Pause anhalten' : 'Pause starten'}
          style={[styles.play, { backgroundColor: theme.colors.primary }]}
          onPress={restTimer.isRunning ? stopRestTimer : () => startRestTimer(remaining || 90)}
        >
          <Ionicons
            name={restTimer.isRunning ? 'pause' : 'play'}
            size={20}
            color={theme.colors.background}
          />
        </Pressable>
      </View>
      <Animated.View
        pointerEvents={expanded ? 'auto' : 'none'}
        accessibilityElementsHidden={!expanded}
        importantForAccessibility={expanded ? 'auto' : 'no-hide-descendants'}
        style={[styles.details, detailStyle]}
      >
        <View style={[styles.track, { backgroundColor: theme.colors.border }]}>
          <View
            style={{
              height: 3,
              width: `${progress * 100}%`,
              backgroundColor: theme.colors.primary,
            }}
          />
        </View>
        <View style={styles.adjustments}>
          {[-30, -10, 10, 30, 60].map((amount) => (
            <Pressable
              key={amount}
              accessibilityRole="button"
              accessibilityLabel={`${amount > 0 ? 'Plus' : 'Minus'} ${Math.abs(amount)} Sekunden`}
              style={[styles.adjust, { borderColor: theme.colors.border }]}
              onPress={() => startRestTimer(Math.max(1, remaining + amount))}
            >
              <Text style={{ color: theme.colors.text, fontSize: 13 }}>
                {amount > 0 ? '+' : '−'}
                {Math.abs(amount)}s
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          testID="reset-timer-btn"
          accessibilityRole="button"
          onPress={resetRestTimer}
          style={styles.reset}
        >
          <Text style={{ color: theme.colors.muted }}>Timer zurücksetzen</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
};
const styles = StyleSheet.create({
  panel: {
    width: '94%',
    maxWidth: 560,
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 20,
    overflow: 'hidden',
    marginVertical: 8,
  },
  header: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  toggle: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeButton: { flex: 1, minHeight: 44, justifyContent: 'center', alignItems: 'flex-end' },
  time: { fontSize: 28, fontFamily: 'SpaceGrotesk_700Bold', fontVariant: ['tabular-nums'] },
  play: { height: 44, width: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  details: { paddingHorizontal: 16, paddingBottom: 12, gap: 14 },
  track: { height: 3, borderRadius: 2, overflow: 'hidden' },
  adjustments: { flexDirection: 'row', gap: 6 },
  adjust: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
  },
  reset: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
