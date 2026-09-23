import { Theme, useThemeStyles } from '@fitness-tracker/ui';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { summarizeSessionExercise, summarizeWorkout } from '@fitness-tracker/domain';
import { useTheme } from '@fitness-tracker/ui';

import { getCaffeineWarningLevel, useCaffeineStore } from '../../stores/caffeineStore';
import { useExerciseStore } from '../../stores/exerciseStore';
import { useProfileStore } from '../../stores/profileStore';
import { useWorkoutStore } from '../../stores/workoutStore';
import { WorkoutCelebrationOverlay } from './WorkoutCelebrationOverlay';

export const WorkoutCompleteModal = () => {
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  const { lastFinishedSession, clearLastFinishedSession } = useWorkoutStore();
  const { profile } = useProfileStore();
  const exerciseDefinitions = useExerciseStore((state) => state.exercises);
  const caffeineEnabled = useCaffeineStore((state) => state.isEnabled);
  const lastWorkoutCaffeineMg = useCaffeineStore((state) => state.lastWorkoutMg);
  const isImperial = profile.preferredUnits === 'imperial';
  const text = (de: string, en: string) => (profile.language === 'en' ? en : de);

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

    if (volumeKg <= 0)
      return text(
        'Training abgeschlossen. Jede dokumentierte Einheit zählt.',
        'You completed a session. The logbook still respects the ritual.',
      );
    if (volumeKg < 100) {
      const plates = (displayVol / (isImperial ? 5.5 : 2.5)).toFixed(0);
      return text(
        `Du hast ${displayVol} ${unit} bewegt. Das entspricht ungefähr ${plates} kleinen Gewichtsscheiben à 2,5 kg.`,
        `You lifted ${displayVol} ${unit}. That is like quietly moving ${plates} tiny change plates while pretending it was just a warmup.`,
      );
    }
    if (volumeKg < 300) {
      const crates = (displayVol / (isImperial ? 44 : 20)).toFixed(1).replace(/\.0$/, '');
      return text(
        `Du hast ${displayVol} ${unit} bewegt. Das entspricht ungefähr ${crates} vollen Wasserkisten.`,
        `You moved ${displayVol} ${unit}. Gym folklore translation: about ${crates} loaded water crates, but with better form.`,
      );
    }
    if (volumeKg < 800) {
      const benches = (displayVol / (isImperial ? 100 : 45)).toFixed(1).replace(/\.0$/, '');
      return text(
        `${displayVol} ${unit} Trainingsvolumen – ungefähr das Gewicht von ${benches} verstellbaren Hantelbänken.`,
        `${displayVol} ${unit} of work. That is roughly ${benches} adjustable benches worth of iron traffic.`,
      );
    }
    if (volumeKg < 1500) {
      const plates = (displayVol / (isImperial ? 44 : 20)).toFixed(0);
      return text(
        `${displayVol} ${unit} heute. Das entspricht ungefähr ${plates} Gewichtsscheiben à 20 kg.`,
        `${displayVol} ${unit} today. Your workout basically negotiated with ${plates} full-size 20 kg plates.`,
      );
    }
    if (volumeKg < 3000) {
      const machines = (displayVol / (isImperial ? 440 : 200)).toFixed(1).replace(/\.0$/, '');
      return text(
        `${displayVol} ${unit} bewegt – ungefähr ${machines} volle Gewichtsblöcke eines Kabelzugs.`,
        `${displayVol} ${unit} moved. That is about ${machines} cable stacks being politely bullied by your logbook.`,
      );
    }
    if (volumeKg < 6000) {
      const racks = (displayVol / (isImperial ? 990 : 450)).toFixed(1).replace(/\.0$/, '');
      return text(
        `${displayVol} ${unit}. Zusammengerechnet ungefähr das Gewicht von ${racks} voll beladenen Kniebeugenständern.`,
        `${displayVol} ${unit}. That is ${racks} fully loaded squat racks of cumulative chaos.`,
      );
    }
    if (volumeKg < 12000) {
      const cars = (displayVol / (isImperial ? 3300 : 1500)).toFixed(1).replace(/\.0$/, '');
      return text(
        `${displayVol} ${unit}. Dein Trainingsvolumen entspricht ungefähr dem Gewicht von ${cars} Kleinwagen.`,
        `${displayVol} ${unit}. Your session volume could move ${cars} compact cars one disciplined rep at a time.`,
      );
    }
    const trucks = (displayVol / (isImperial ? 22000 : 10000)).toFixed(1).replace(/\.0$/, '');
    return text(
      `${displayVol} ${unit}. Zusammengerechnet ungefähr das Gewicht von ${trucks} kleinen Lastwagen.`,
      `${displayVol} ${unit}. That is ${trucks} small moving trucks of work. Your spreadsheet is probably standing up to applaud.`,
    );
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
      text(
        `Leistungshinweis: ${workingSetCount} Arbeitssätze mit durchschnittlich ${displayVolumePerSet} ${unit} Volumen pro Satz. Etwas mehr Gewicht oder Wiederholungen bei gleicher Satzanzahl können Fortschritt zeigen.`,
        `Performance note: ${workingSetCount} working sets averaged ${displayVolumePerSet} ${unit} each. Same set count plus a little more load or reps is the cleanest progress signal.`,
      ),
    ];

    if (topExercise) {
      facts.push(
        text(
          `Trainingshinweis: ${topExercise.definition?.name ?? 'Eine Übung'} hat heute ${displayTopExerciseVolume} ${unit} Arbeitsvolumen beigetragen.`,
          `Session signal: ${topExercise.definition?.name ?? 'one exercise'} carried ${displayTopExerciseVolume} ${unit} of working volume today.`,
        ),
      );
    }

    if (summary.durationSeconds > 0 && summary.totalVolume > 0) {
      const volumePerHour = Math.round((summary.totalVolume / summary.durationSeconds) * 3600);
      const displayVolumePerHour = isImperial ? Math.round(volumePerHour * 2.20462) : volumePerHour;
      facts.push(
        text(
          `Trainingsdichte: Diese Einheit entspricht etwa ${displayVolumePerHour} ${unit} pro Stunde. Hilfreich für den Vergleich ähnlicher Einheiten.`,
          `Density check: this session moved about ${displayVolumePerHour} ${unit} per hour. Useful when comparing similar workouts later.`,
        ),
      );
    }

    if (hasCardio) {
      facts.push(
        text(
          'Ausdauerhinweis: Lockeres Ausdauertraining unterstützt auch die Erholung zwischen anstrengenden Sätzen.',
          'Cardio note: easy aerobic work is not just calorie math; it also builds the engine that helps you recover between hard sets.',
        ),
        text(
          'Ausdauerwissen: Eine bessere Grundlagenausdauer kann anstrengende Trainingseinheiten leichter machen.',
          'Cardio fact: a stronger aerobic base can make heavy sessions feel less like a software update at 1%.',
        ),
      );
    }

    if (hasWarmups) {
      facts.push(
        text(
          'Aufwärmhinweis: Steigerungssätze bereiten die Bewegung vor. Ziel sind saubere Positionen und gute Bewegungsgeschwindigkeit, nicht zusätzliche Ermüdung.',
          'Warmup fact: ramping sets are rehearsal reps. The goal is better bar speed and cleaner positions, not sneaky fatigue.',
        ),
      );
    }

    if (summary.durationSeconds && summary.durationSeconds >= 2700) {
      facts.push(
        text(
          'Trainingstipp: Längere Pausen können die Qualität der Wiederholungen erhalten. Bei schnellem Leistungsabfall können zwei bis drei ruhige Minuten helfen.',
          'Science tip: longer rests can preserve rep quality. If performance drops fast, two to three calm minutes may beat rushing.',
        ),
      );
    }

    if (summary.setCount >= 12) {
      facts.push(
        text(
          'Planungstipp: Produktiv ist das Trainingsvolumen, von dem du dich erholen kannst. Regelmäßiger Fortschritt zählt mehr als einzelne überladene Einheiten.',
          'Programming tip: productive volume is the volume you can recover from. Repeatable progress beats random heroic set archaeology.',
        ),
      );
    }

    facts.push(
      text(
        'Techniktipp: Dasselbe Gewicht sauberer als beim letzten Mal zu bewegen, ist ebenfalls ein Fortschritt.',
        'Technique tip: the most underrated PR is making the same weight look smoother than last time.',
      ),
      text(
        'Trainingstipp: Für Muskelaufbau zählen anstrengende, nachvollziehbare Sätze und ausreichend Erholung mehr als ein einzelner besonderer Wiederholungsbereich.',
        'Science tip: muscle growth is less about one magical rep range and more about hard, trackable sets with enough recovery.',
      ),
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
      return text(
        `Koffeinhinweis: ${caffeineMg} mg entsprechen ungefähr ${espressoEquivalent} Espressos. Das liegt deutlich über üblichen Tagesrichtwerten. Nimm Erholung und Schlaf ernst.`,
        `Caffeine fact: ${caffeineMg} mg is roughly ${espressoEquivalent} espressos. That is well beyond the usual daily guideline territory, so treat recovery and sleep seriously.`,
      );
    }
    if (warningLevel === 'high') {
      return text(
        `Koffeinhinweis: ${caffeineMg} mg entsprechen ungefähr ${espressoEquivalent} Espressos. Eine hohe Menge kann deinen Schlaf beeinträchtigen.`,
        `Caffeine fact: ${caffeineMg} mg is around ${espressoEquivalent} espressos. Useful as a log entry, but tomorrow's sleep score may want a lawyer.`,
      );
    }
    if (caffeineMg >= 200) {
      return text(
        `Koffeinhinweis: ${caffeineMg} mg entsprechen ungefähr ${espressoEquivalent} Espressos. Viele Menschen spüren diese Menge deutlich.`,
        `Caffeine fact: ${caffeineMg} mg is about ${espressoEquivalent} espressos. A noticeable pre-session push for many people.`,
      );
    }
    return text(
      `Koffeinhinweis: ${caffeineMg} mg entsprechen ungefähr ${espressoEquivalent} Espressos. Auch kleine Mengen können spürbar sein.`,
      `Caffeine fact: ${caffeineMg} mg is about ${espressoEquivalent} espresso shots. Small enough to track, big enough to explain suspiciously enthusiastic warmups.`,
    );
  };

  const workoutFact = getWorkoutFunFact();
  const caffeineFact = caffeineEnabled ? getCaffeineFunFact(lastWorkoutCaffeineMg) : null;
  const displayVolVal = isImperial
    ? Math.round(summary.totalVolume * 2.20462)
    : Math.round(summary.totalVolume);

  return (
    <Modal visible animationType="slide" transparent onRequestClose={clearLastFinishedSession}>
      <Pressable
        style={styles.overlay}
        onPress={clearLastFinishedSession}
        accessibilityRole="button"
        accessibilityLabel={text('Zusammenfassung schließen', 'Close summary')}
      >
        <WorkoutCelebrationOverlay />
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
              {text('Training abgeschlossen', 'Workout completed')} ·{' '}
              {lastFinishedSession.exercises.length} {text('Übungen', 'exercises')}
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
                <Text style={[styles.statLabel, { color: theme.colors.muted }]}>
                  {text('ZEIT', 'TIME')}
                </Text>
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
                <Text style={[styles.statLabel, { color: theme.colors.muted }]}>
                  {text('SÄTZE', 'SETS')}
                </Text>
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
                      {definition?.name ?? text('Übung', 'Exercise')}
                    </Text>
                    <Text style={{ color: theme.colors.muted, fontSize: 12, marginTop: 5 }}>
                      {result.workingSetCount} {text('Arbeitssätze', 'working sets')} ·{' '}
                      {Math.round(result.totalVolume * (isImperial ? 2.20462 : 1))}{' '}
                      {isImperial ? 'lbs' : 'kg'} {text('Volumen', 'volume')}
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
                            set.type === 'warmup' ? text('Aufwärmen', 'Warm-up') : '',
                            set.weight !== undefined
                              ? `${Number((set.weight * (isImperial ? 2.20462 : 1)).toFixed(1))} ${isImperial ? 'lbs' : 'kg'}`
                              : '',
                            set.reps !== undefined ? `× ${set.reps}` : '',
                            set.durationSeconds !== undefined ? `${set.durationSeconds}s` : '',
                          ]
                            .filter(Boolean)
                            .join(' '),
                        )
                        .join('  ·  ') || text('Keine abgeschlossenen Sätze', 'No completed sets')}
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Ionicons name="analytics-outline" size={14} color={theme.colors.primary} />
                <Text style={[styles.factTitle, { color: theme.colors.primary, marginBottom: 0 }]}>
                  {text('TRAININGSAUSWERTUNG', 'SESSION TELEMETRY')}
                </Text>
              </View>
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
            accessibilityRole="button"
            accessibilityLabel={text('Zusammenfassung bestätigen', 'Acknowledge summary')}
          >
            <Text
              style={[
                styles.buttonText,
                { color: theme.colors.background, ...theme.typography.button },
              ]}
            >
              {text('SUPER', 'AWESOME')}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
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
      backgroundColor: theme.colors.primarySubtle,
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
