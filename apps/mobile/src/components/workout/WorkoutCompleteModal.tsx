import React from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useReducedMotion } from 'react-native-reanimated';

import { summarizeSessionExercise, summarizeWorkout } from '@fitness-tracker/domain';
import { useTheme } from '@fitness-tracker/ui';

import { getCaffeineWarningLevel, useCaffeineStore } from '../../stores/caffeineStore';
import { useExerciseStore } from '../../stores/exerciseStore';
import { useProfileStore } from '../../stores/profileStore';
import { useWorkoutStore } from '../../stores/workoutStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CONFETTI_COLORS = ['#90D5FF', '#5FBDFF', '#C5E8FF', '#FFFFFF', '#FFD700', '#FF9F43'];

interface ConfettiParticle {
  id: number;
  x: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  animY: Animated.Value;
  animX: Animated.Value;
  animRotate: Animated.Value;
}

const SubtleConfetti = () => {
  const particles = React.useRef<ConfettiParticle[]>(
    Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      x: Math.random() * SCREEN_WIDTH,
      size: Math.random() * 8 + 6,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)] || '#90D5FF',
      delay: Math.random() * 1200,
      duration: Math.random() * 1500 + 2000,
      animY: new Animated.Value(-20),
      animX: new Animated.Value(0),
      animRotate: new Animated.Value(0),
    })),
  ).current;

  React.useEffect(() => {
    particles.forEach((p) => {
      Animated.sequence([
        Animated.delay(p.delay),
        Animated.parallel([
          Animated.timing(p.animY, {
            toValue: SCREEN_HEIGHT + 20,
            duration: p.duration,
            useNativeDriver: true,
          }),
          Animated.timing(p.animX, {
            toValue: (Math.random() - 0.5) * 120,
            duration: p.duration,
            useNativeDriver: true,
          }),
          Animated.timing(p.animRotate, {
            toValue: Math.random() * 360,
            duration: p.duration,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    });
  }, [particles]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p) => (
        <Animated.View
          key={p.id}
          style={[
            styles.confettiParticle,
            {
              left: p.x,
              width: p.size,
              height: p.size,
              borderRadius: p.size / 2,
              backgroundColor: p.color,
              transform: [
                { translateY: p.animY },
                { translateX: p.animX },
                {
                  rotate: p.animRotate.interpolate({
                    inputRange: [0, 360],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
};

export const WorkoutCompleteModal = () => {
  const reducedMotion = useReducedMotion();
  const theme = useTheme();
  const { lastFinishedSession, clearLastFinishedSession } = useWorkoutStore();
  const { profile } = useProfileStore();
  const exerciseDefinitions = useExerciseStore((state) => state.exercises);
  const caffeineEnabled = useCaffeineStore((state) => state.isEnabled);
  const lastWorkoutCaffeineMg = useCaffeineStore((state) => state.lastWorkoutMg);
  const isImperial = profile.preferredUnits === 'imperial';

  if (!lastFinishedSession) return null;

  const summary = summarizeWorkout(lastFinishedSession);

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${s}s`;
  };

  const getVolumeFunFact = (volumeKg: number): string => {
    const displayVol = isImperial ? Math.round(volumeKg * 2.20462) : Math.round(volumeKg);
    const unit = isImperial ? 'lbs' : 'kg';

    if (volumeKg <= 0) return 'You completed a session. The logbook still respects the ritual.';
    if (volumeKg < 100) {
      const plates = (displayVol / (isImperial ? 5.5 : 2.5)).toFixed(0);
      return `You lifted ${displayVol} ${unit}. That is like quietly moving ${plates} tiny change plates while pretending it was just a warmup.`;
    }
    if (volumeKg < 300) {
      const crates = (displayVol / (isImperial ? 44 : 20)).toFixed(1).replace(/\.0$/, '');
      return `You moved ${displayVol} ${unit}. Gym folklore translation: about ${crates} loaded water crates, but with better form.`;
    }
    if (volumeKg < 800) {
      const benches = (displayVol / (isImperial ? 100 : 45)).toFixed(1).replace(/\.0$/, '');
      return `${displayVol} ${unit} of work. That is roughly ${benches} adjustable benches worth of iron traffic.`;
    }
    if (volumeKg < 1500) {
      const plates = (displayVol / (isImperial ? 44 : 20)).toFixed(0);
      return `${displayVol} ${unit} today. Your workout basically negotiated with ${plates} full-size 20 kg plates.`;
    }
    if (volumeKg < 3000) {
      const machines = (displayVol / (isImperial ? 440 : 200)).toFixed(1).replace(/\.0$/, '');
      return `${displayVol} ${unit} moved. That is about ${machines} cable stacks being politely bullied by your logbook.`;
    }
    if (volumeKg < 6000) {
      const racks = (displayVol / (isImperial ? 990 : 450)).toFixed(1).replace(/\.0$/, '');
      return `${displayVol} ${unit}. That is ${racks} fully loaded squat racks of cumulative chaos.`;
    }
    if (volumeKg < 12000) {
      const cars = (displayVol / (isImperial ? 3300 : 1500)).toFixed(1).replace(/\.0$/, '');
      return `${displayVol} ${unit}. Your session volume could move ${cars} compact cars one disciplined rep at a time.`;
    }
    const trucks = (displayVol / (isImperial ? 22000 : 10000)).toFixed(1).replace(/\.0$/, '');
    return `${displayVol} ${unit}. That is ${trucks} small moving trucks of work. Your spreadsheet is probably standing up to applaud.`;
  };

  const getDeterministicIndex = (values: string[], modulo: number) => {
    if (modulo <= 0) return 0;
    return (
      values
        .join('|')
        .split('')
        .reduce((sum, char) => sum + char.charCodeAt(0), 0) % modulo
    );
  };

  const getWorkoutFunFact = (): string => {
    const sessionExerciseIds = lastFinishedSession.exercises.map((exercise) => exercise.exerciseId);
    const sessionDefinitions = sessionExerciseIds
      .map((exerciseId) => exerciseDefinitions.find((exercise) => exercise.id === exerciseId))
      .filter(Boolean);
    const hasCardio = sessionDefinitions.some(
      (exercise) =>
        exercise?.movementPattern === 'cardio' || exercise?.equipment === 'cardio_machine',
    );
    const hasWarmups = lastFinishedSession.exercises.some((exercise) =>
      exercise.sets.some((set) => set.completed && set.type === 'warmup'),
    );
    const workingSummaries = lastFinishedSession.exercises
      .map((exercise) => {
        const exerciseSummary = summarizeSessionExercise(exercise);
        const definition = exerciseDefinitions.find((item) => item.id === exercise.exerciseId);
        return {
          exercise,
          definition,
          summary: exerciseSummary,
        };
      })
      .filter((item) => item.summary.totalVolume > 0);
    const topExercise = workingSummaries.reduce<(typeof workingSummaries)[number] | null>(
      (best, item) => {
        if (!best || item.summary.totalVolume > best.summary.totalVolume) return item;
        return best;
      },
      null,
    );
    const workingSetCount = workingSummaries.reduce(
      (sum, item) => sum + item.summary.workingSetCount,
      0,
    );
    const volumePerSet = workingSetCount > 0 ? summary.totalVolume / workingSetCount : 0;
    const displayVolumePerSet = isImperial
      ? Math.round(volumePerSet * 2.20462)
      : Math.round(volumePerSet);
    const displayTopExerciseVolume =
      topExercise && isImperial
        ? Math.round(topExercise.summary.totalVolume * 2.20462)
        : Math.round(topExercise?.summary.totalVolume ?? 0);
    const unit = isImperial ? 'lbs' : 'kg';
    const facts = [
      getVolumeFunFact(summary.totalVolume),
      getVolumeFunFact(summary.totalVolume),
      `Performance note: ${workingSetCount} working sets averaged ${displayVolumePerSet} ${unit} each. Same set count plus a little more load or reps is the cleanest progress signal.`,
    ];

    if (topExercise) {
      facts.push(
        `Session signal: ${topExercise.definition?.name ?? 'one exercise'} carried ${displayTopExerciseVolume} ${unit} of working volume today.`,
      );
    }

    if (summary.durationSeconds > 0 && summary.totalVolume > 0) {
      const volumePerHour = Math.round((summary.totalVolume / summary.durationSeconds) * 3600);
      const displayVolumePerHour = isImperial ? Math.round(volumePerHour * 2.20462) : volumePerHour;
      facts.push(
        `Density check: this session moved about ${displayVolumePerHour} ${unit} per hour. Useful when comparing similar workouts later.`,
      );
    }

    if (hasCardio) {
      facts.push(
        'Cardio note: easy aerobic work is not just calorie math; it also builds the engine that helps you recover between hard sets.',
        'Cardio fact: a stronger aerobic base can make heavy sessions feel less like a software update at 1%.',
      );
    }

    if (hasWarmups) {
      facts.push(
        'Warmup fact: ramping sets are rehearsal reps. The goal is better bar speed and cleaner positions, not sneaky fatigue.',
      );
    }

    if (summary.durationSeconds && summary.durationSeconds >= 2700) {
      facts.push(
        'Science tip: longer rests can preserve rep quality. If performance drops fast, two to three calm minutes may beat rushing.',
      );
    }

    if (summary.setCount >= 12) {
      facts.push(
        'Programming tip: productive volume is the volume you can recover from. Repeatable progress beats random heroic set archaeology.',
      );
    }

    facts.push(
      'Technique tip: the most underrated PR is making the same weight look smoother than last time.',
      'Science tip: muscle growth is less about one magical rep range and more about hard, trackable sets with enough recovery.',
    );

    return facts[
      getDeterministicIndex([lastFinishedSession.id, String(summary.setCount)], facts.length)
    ]!;
  };

  const getCaffeineFunFact = (caffeineMg: number): string | null => {
    if (caffeineMg <= 0) return null;

    const warningLevel = getCaffeineWarningLevel(caffeineMg);
    const espressoEquivalent = (caffeineMg / 63).toFixed(1).replace(/\.0$/, '');
    if (warningLevel === 'extreme') {
      return `Caffeine fact: ${caffeineMg} mg is roughly ${espressoEquivalent} espressos. That is well beyond the usual daily guideline territory, so treat recovery and sleep seriously.`;
    }
    if (warningLevel === 'high') {
      return `Caffeine fact: ${caffeineMg} mg is around ${espressoEquivalent} espressos. Useful as a log entry, but tomorrow's sleep score may want a lawyer.`;
    }
    if (caffeineMg >= 200) {
      return `Caffeine fact: ${caffeineMg} mg is about ${espressoEquivalent} espressos. A noticeable pre-session push for many people.`;
    }
    return `Caffeine fact: ${caffeineMg} mg is about ${espressoEquivalent} espresso shots. Small enough to track, big enough to explain suspiciously enthusiastic warmups.`;
  };

  const workoutFact = getWorkoutFunFact();
  const caffeineFact = caffeineEnabled ? getCaffeineFunFact(lastWorkoutCaffeineMg) : null;
  const displayVolVal = isImperial
    ? Math.round(summary.totalVolume * 2.20462)
    : Math.round(summary.totalVolume);

  return (
    <Modal visible animationType="slide" transparent onRequestClose={clearLastFinishedSession}>
      <Pressable style={styles.overlay} onPress={clearLastFinishedSession}>
        {!reducedMotion && <SubtleConfetti />}
        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.lg,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={styles.contentScrollInner}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="barbell" size={48} color={theme.colors.primary} />
            </View>

            <Text style={[styles.title, { color: theme.colors.text, ...theme.typography.heading }]}>
              {lastFinishedSession.name}
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
              Workout completed · {lastFinishedSession.exercises.length} exercises
            </Text>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text
                  style={[
                    styles.statVal,
                    { color: theme.colors.primary, ...theme.typography.display },
                  ]}
                >
                  {formatDuration(summary.durationSeconds)}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.muted }]}>TIME</Text>
              </View>
              <View style={styles.statBox}>
                <Text
                  style={[
                    styles.statVal,
                    { color: theme.colors.primary, ...theme.typography.display },
                  ]}
                >
                  {summary.setCount}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.muted }]}>SETS</Text>
              </View>
              <View style={styles.statBox}>
                <Text
                  style={[
                    styles.statVal,
                    { color: theme.colors.primary, ...theme.typography.display },
                  ]}
                >
                  {displayVolVal}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.muted }]}>
                  {isImperial ? 'LBS' : 'KG'}
                </Text>
              </View>
            </View>

            <View style={{ width: '100%', marginBottom: 16 }}>
              {lastFinishedSession.exercises.map((exercise) => {
                const definition = exerciseDefinitions.find(
                  (item) => item.id === exercise.exerciseId,
                );
                const result = summarizeSessionExercise(exercise);
                return (
                  <View
                    key={exercise.id}
                    style={{
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderColor: theme.colors.border,
                    }}
                  >
                    <Text
                      style={{
                        color: theme.colors.text,
                        fontSize: 15,
                        fontFamily: 'SpaceGrotesk_600SemiBold',
                      }}
                    >
                      {definition?.name ?? 'Exercise'}
                    </Text>
                    <Text style={{ color: theme.colors.muted, fontSize: 12, marginTop: 5 }}>
                      {result.workingSetCount} working sets ·{' '}
                      {Math.round(result.totalVolume * (isImperial ? 2.20462 : 1))}{' '}
                      {isImperial ? 'lbs' : 'kg'} volume
                    </Text>
                    <Text
                      style={{
                        color: theme.colors.primary,
                        fontSize: 13,
                        marginTop: 5,
                        lineHeight: 20,
                      }}
                    >
                      {exercise.sets
                        .filter((set) => set.completed)
                        .map((set) =>
                          [
                            set.type === 'warmup' ? 'Warm-up' : '',
                            set.weight !== undefined
                              ? `${Number((set.weight * (isImperial ? 2.20462 : 1)).toFixed(1))} ${isImperial ? 'lbs' : 'kg'}`
                              : '',
                            set.reps !== undefined ? `× ${set.reps}` : '',
                            set.durationSeconds !== undefined ? `${set.durationSeconds}s` : '',
                          ]
                            .filter(Boolean)
                            .join(' '),
                        )
                        .join('  ·  ') || 'No completed sets'}
                    </Text>
                  </View>
                );
              })}
            </View>
            <View
              style={[
                styles.factContainer,
                { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
              ]}
            >
              <Text style={[styles.factTitle, { color: theme.colors.primary }]}>💡 FUN FACT</Text>
              <Text style={[styles.factText, { color: theme.colors.text }]}>{workoutFact}</Text>
              {caffeineFact && (
                <Text
                  style={[styles.factText, styles.factTextSecondary, { color: theme.colors.text }]}
                >
                  {caffeineFact}
                </Text>
              )}
            </View>
          </ScrollView>

          <Pressable
            style={[
              styles.button,
              { backgroundColor: theme.colors.primary, borderRadius: theme.radius.md },
            ]}
            onPress={clearLastFinishedSession}
          >
            <Text
              style={[
                styles.buttonText,
                { color: theme.colors.background, ...theme.typography.button },
              ]}
            >
              AWESOME
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 11, 15, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confettiParticle: {
    position: 'absolute',
  },
  card: {
    borderWidth: 1,
    width: '100%',
    maxWidth: 600,
    padding: 20,
    alignItems: 'center',
    maxHeight: '88%',
  },
  contentScroll: {
    width: '100%',
  },
  contentScrollInner: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(144, 213, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statVal: {
    fontSize: 18,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  factContainer: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  factTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 8,
  },
  factText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    lineHeight: 18,
  },
  factTextSecondary: {
    marginTop: 10,
  },
  button: {
    height: 52,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 15,
  },
});
