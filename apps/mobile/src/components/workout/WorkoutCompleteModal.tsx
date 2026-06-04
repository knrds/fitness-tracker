import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@fitness-tracker/ui';
import { useWorkoutStore } from '../../stores/workoutStore';
import { useProfileStore } from '../../stores/profileStore';

import { Animated, Dimensions } from 'react-native';

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
          style={{
            position: 'absolute',
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
          }}
        />
      ))}
    </View>
  );
};

export const WorkoutCompleteModal = () => {
  const theme = useTheme();
  const { lastFinishedSession, clearLastFinishedSession } = useWorkoutStore();
  const { profile } = useProfileStore();
  const isImperial = profile.preferredUnits === 'imperial';

  if (!lastFinishedSession) return null;

  const totalSets = lastFinishedSession.exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.completed).length,
    0,
  );

  const totalVolume = lastFinishedSession.exercises.reduce(
    (sum, ex) =>
      sum +
      ex.sets
        .filter((s) => s.completed && s.weight)
        .reduce((sSum, s) => sSum + s.weight! * (s.reps || 0), 0),
    0,
  );

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

    if (volumeKg <= 0) return `You completed a session!`;

    if (volumeKg < 100) {
      const p = (displayVol / (isImperial ? 22 : 10)).toFixed(1).replace(/\.0$/, '');
      return `You lifted ${displayVol} ${unit}! That's equivalent to the weight of ${p} adult house cats. 🐱`;
    }
    if (volumeKg < 300) {
      const p = (displayVol / (isImperial ? 110 : 50)).toFixed(1).replace(/\.0$/, '');
      return `You lifted ${displayVol} ${unit}! That's about the weight of ${p} heavy punching bags. 🥊`;
    }
    if (volumeKg < 800) {
      const pStr = (displayVol / (isImperial ? 330 : 150)).toFixed(1).replace(/\.0$/, '');
      return `You lifted ${displayVol} ${unit}! That's equivalent to the weight of ${pStr} classic Vespa scooters. 🛵`;
    }
    if (volumeKg < 1500) {
      const pStr = (displayVol / (isImperial ? 1100 : 500)).toFixed(1).replace(/\.0$/, '');
      return `You lifted ${displayVol} ${unit}! That's about the weight of ${pStr} grand pianos. 🎹`;
    }
    if (volumeKg < 3000) {
      const pStr = (displayVol / (isImperial ? 2200 : 1000)).toFixed(1).replace(/\.0$/, '');
      return `You lifted ${displayVol} ${unit}! That's equivalent to the weight of ${pStr} saltwater crocodiles. 🐊`;
    }
    if (volumeKg < 6000) {
      const pStr = (displayVol / (isImperial ? 4400 : 2000)).toFixed(1).replace(/\.0$/, '');
      return `You lifted ${displayVol} ${unit}! That's about the weight of ${pStr} hippopotamuses. 🦛`;
    }
    if (volumeKg < 12000) {
      const pStr = (displayVol / (isImperial ? 11000 : 5000)).toFixed(1).replace(/\.0$/, '');
      return `You lifted ${displayVol} ${unit}! That's equivalent to the weight of ${pStr} fully grown African elephants. 🐘`;
    }
    const pStr = (displayVol / (isImperial ? 26400 : 12000)).toFixed(1).replace(/\.0$/, '');
    return `You lifted ${displayVol} ${unit}! That's about the weight of ${pStr} double-decker buses! 🚌 Absolutely massive!`;
  };

  const displayVolVal = isImperial ? Math.round(totalVolume * 2.20462) : Math.round(totalVolume);

  return (
    <Modal
      visible={true}
      animationType="slide"
      transparent
      onRequestClose={clearLastFinishedSession}
    >
      <Pressable style={styles.overlay} onPress={clearLastFinishedSession}>
        <SubtleConfetti />
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
          <View style={styles.iconContainer}>
            <Ionicons name="barbell" size={48} color={theme.colors.primary} />
          </View>

          <Text style={[styles.title, { color: theme.colors.text, ...theme.typography.heading }]}>
            WORKOUT COMPLETED!
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
            Great session! Here is what you achieved today:
          </Text>

          {/* Stats Grid */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text
                style={[
                  styles.statVal,
                  { color: theme.colors.primary, ...theme.typography.display },
                ]}
              >
                {formatDuration(lastFinishedSession.durationSeconds)}
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
                {totalSets}
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

          {/* Fun Fact Section */}
          <View
            style={[
              styles.factContainer,
              { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
            ]}
          >
            <Text style={[styles.factTitle, { color: theme.colors.primary }]}>💡 FUN FACT</Text>
            <Text style={[styles.factText, { color: theme.colors.text }]}>
              {getVolumeFunFact(totalVolume)}
            </Text>
          </View>

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
  card: {
    borderWidth: 1,
    width: '100%',
    maxWidth: 400,
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(144, 213, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
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
    padding: 16,
    marginBottom: 24,
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
