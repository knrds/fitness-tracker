import { ActivityRing } from './ActivityRing';
import { dashboardSummary } from '../utils/dashboardSummary';
import React from 'react';
import { Image, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Button, Card, useTheme, withAlpha } from '@fitness-tracker/ui';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { WorkoutTemplate, MuscleGroup } from '@fitness-tracker/domain';
import { useProfileStore } from '../stores/profileStore';
import { useHistoryStore } from '../stores/historyStore';
import { useAchievementStore } from '../stores/achievementStore';
import { useExerciseStore } from '../stores/exerciseStore';
import { useRouter } from 'expo-router';
import { AnatomyFigure } from './anatomy/AnatomyFigure';
import { VoltBackdrop } from './VoltBackdrop';
import { LevelProgress } from './LevelProgress';
import { SyncIndicator } from './SyncIndicator';
import voltEmblem from '../../assets/volt-emblem.png';
import { MuscleHeatmap } from './MuscleHeatmap';
import { AnimatedDisclosure } from '@fitness-tracker/ui';

export function VoltDashboard({
  template,
  programName,
  week,
  durationWeeks,
  templates,
  activity,
  onStart,
  onTemplate,
  resume,
}: {
  template: WorkoutTemplate | null;
  programName: string | undefined;
  week: number;
  durationWeeks: number | undefined;
  templates: WorkoutTemplate[];
  activity: Partial<Record<MuscleGroup, number>>;
  onStart: () => void;
  onTemplate: (template: WorkoutTemplate) => void;
  resume: boolean;
}) {
  const theme = useTheme();
  const c = theme.colors;
  const router = useRouter();
  const [expandedAnatomy, setExpandedAnatomy] = React.useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = React.useState<number | null>(null);
  const [activeStatFact, setActiveStatFact] = React.useState<'volume' | 'sets' | 'rpe' | null>(null);
  const [statFactIndex, setStatFactIndex] = React.useState(0);
  const [ringAnimationKey, setRingAnimationKey] = React.useState(0);
  const [showMuscleDetails, setShowMuscleDetails] = React.useState(false);
  const wide = useWindowDimensions().width >= 800;
  const { profile } = useProfileStore();
  const { level, xp } = useAchievementStore();
  const { exercises } = useExerciseStore();
  const history = useHistoryStore();
  const sessions = history.getSessionsByDateDesc();
  const today = new Date();
  const { monday, weekly, setCount, volume, averageRpe } = dashboardSummary(sessions, today);
  const topMuscles = Object.entries(activity)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const maxActivity = Math.max(1, ...Object.values(activity));
  const totalActivity = Object.values(activity).reduce((n, v) => n + v, 0);
  const label = { ...theme.typography.caption, color: c.muted, fontSize: 10, letterSpacing: 1 };
  const heading = { ...theme.typography.heading, color: c.text, fontSize: 18 };
  const openPrograms = () =>
    router.navigate({ pathname: '/workouts', params: { tab: 'programs' } });
  const caption = (text: string) => <Text style={label}>{text}</Text>;
  const panelTitle = (
    text: string,
    icon: React.ComponentProps<typeof Ionicons>['name'],
    detail?: string,
  ) => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
        flexWrap: 'wrap',
      }}
    >
      <Ionicons name={icon} size={16} color={c.primary} />
      <Text style={[label, { color: c.text, flex: 1 }]}>{text}</Text>
      {detail && <Text style={[label, { color: c.primary }]}>{detail}</Text>}
    </View>
  );
  const names = (t: WorkoutTemplate) =>
    t.exercises
      .map((e) => exercises.find((x) => x.id === e.exerciseId)?.name)
      .filter(Boolean)
      .join(' · ');
  const weekCard = (
    <Card padding="md" style={{ flex: wide ? 1 : undefined, justifyContent: 'center' }}>
      {panelTitle(
        'WEEKLY MICROCYCLE'.toUpperCase(),
        'calendar-outline',
        `${weekly.length} SESSIONS`,
      )}
      <View style={{ flexDirection: 'row', gap: 5 }}>
        {Array.from({ length: 7 }, (_, i) => {
          const date = new Date(monday);
          date.setDate(date.getDate() + i);
          const trained = weekly.some(
            (s) => new Date(s.startedAt).toDateString() === date.toDateString(),
          );
          const active = date.toDateString() === today.toDateString();
          const isSelected = selectedDayIndex === i;
          return (
            <Pressable
              key={i}
              onPress={() => setSelectedDayIndex(isSelected ? null : i)}
              accessibilityRole="button"
              accessibilityLabel={`${date.toLocaleDateString()}: ${trained ? 'trainiert' : 'kein Training'}`}
              style={{
                flex: 1,
                minWidth: 0,
                minHeight: 62,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: isSelected
                  ? c.primary
                  : active
                  ? withAlpha(c.primary, 0.6)
                  : c.border,
                backgroundColor: isSelected
                  ? withAlpha(c.primary, 0.18)
                  : active
                  ? c.primary
                  : c.surfaceElevated,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                paddingVertical: 6,
              }}
            >
              <Text
                style={[
                  label,
                  {
                    color: active && !isSelected ? c.onPrimary : isSelected ? c.primary : c.muted,
                    letterSpacing: 0,
                    fontWeight: isSelected || active ? '700' : '500',
                  },
                ]}
              >
                {['M', 'D', 'M', 'D', 'F', 'S', 'S'][i]}
              </Text>
              <Ionicons
                name={trained ? 'checkmark-circle' : active ? 'radio-button-on' : 'ellipse-outline'}
                size={18}
                color={active && !isSelected ? c.onPrimary : trained || isSelected ? c.primary : c.muted}
              />
              <Text
                style={{
                  fontSize: 10,
                  color: active && !isSelected ? c.onPrimary : c.muted,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {date.getDate()}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {selectedDayIndex !== null && (() => {
        const selDate = new Date(monday);
        selDate.setDate(selDate.getDate() + selectedDayIndex);
        const daySessions = weekly.filter(
          (s) => new Date(s.startedAt).toDateString() === selDate.toDateString(),
        );
        const dayNames = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
        return (
          <View
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 10,
              backgroundColor: c.surfaceElevated,
              borderWidth: 1,
              borderColor: withAlpha(c.primary, 0.25),
              gap: 6,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 13, color: c.text }}>
                {dayNames[selectedDayIndex]} · {selDate.toLocaleDateString()}
              </Text>
              <Pressable onPress={() => setSelectedDayIndex(null)} hitSlop={10}>
                <Ionicons name="close" size={16} color={c.muted} />
              </Pressable>
            </View>
            {daySessions.length > 0 ? (
              daySessions.map((s) => (
                <View key={s.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                  <Text style={{ color: c.primary, fontSize: 13, fontWeight: '600', flex: 1 }} numberOfLines={1}>
                    {s.name}
                  </Text>
                  <Text style={{ color: c.muted, fontSize: 12, fontVariant: ['tabular-nums'] }}>
                    {s.durationSeconds ? `${Math.round(s.durationSeconds / 60)} Min · ` : ''}
                    {s.exercises.reduce((acc, ex) => acc + ex.sets.filter((st) => st.completed).length, 0)} Sätze
                  </Text>
                </View>
              ))
            ) : (
              <Text style={{ color: c.muted, fontSize: 12, fontStyle: 'italic' }}>
                Ruhetag · Keine Einheit geloggt
              </Text>
            )}
          </View>
        );
      })()}
    </Card>
  );
  const hero = (
    <Card padding="md" style={{ borderColor: c.borderActive, overflow: 'hidden', gap: 16 }}>
      <VoltBackdrop />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: withAlpha(c.primary, 0.12),
            borderWidth: 1,
            borderColor: withAlpha(c.primary, 0.3),
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 12,
            alignSelf: 'flex-start',
          }}
        >
          <Ionicons name="calendar-outline" size={12} color={c.primary} />
          <Text
            style={{
              color: c.primary,
              fontFamily: 'SpaceGrotesk_700Bold',
              fontSize: 11,
              letterSpacing: 0.8,
            }}
          >
            {programName ? `WOCHE ${String(week).padStart(2, '0')} · ${durationWeeks}` : 'DEIN TRAINING'}
          </Text>
        </View>
        <Pressable
          onPress={openPrograms}
          accessibilityRole="button"
          style={{ minHeight: 44, justifyContent: 'center' }}
        >
          <Text style={[label, { color: c.primary }]}>PROGRAMS ↗</Text>
        </Pressable>
      </View>
      <View style={{ gap: 6 }}>
        <Text style={[label, { color: c.primary }]}>TODAY’S SESSION</Text>
        <Text style={[heading, { fontSize: 26, lineHeight: 31 }]}>
          {resume
            ? 'CONTINUE YOUR SESSION'
            : template?.name || (programName ? 'RECOVERY DAY' : 'QUICK WORKOUT')}
        </Text>
        <Text
          numberOfLines={2}
          style={{ color: c.muted, fontFamily: 'Manrope_500Medium', lineHeight: 21 }}
        >
          {template
            ? names(template)
            : programName
              ? `${programName} · No scheduled workout today.`
              : 'Your pace. Your exercises. Make the next set count.'}
        </Text>
      </View>
      {template && (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[
            ['MOVEMENTS', `${template.exercises.length} exercises`],
            ['WORKING SETS', `${template.exercises.reduce((n, e) => n + e.targetSets, 0)} planned`],
          ].map(([name, value]) => (
            <View
              key={name}
              style={{
                flex: 1,
                minWidth: 0,
                backgroundColor: c.background,
                borderRadius: 8,
                padding: 12,
                gap: 5,
              }}
            >
              {caption(name!)}
              <Text style={{ color: c.text, fontWeight: '600' }}>{value}</Text>
            </View>
          ))}
        </View>
      )}
      <Button
        title={resume ? 'RESUME WORKOUT →' : template ? 'START SESSION →' : 'START WORKOUT →'}
        onPress={onStart}
      />
    </Card>
  );
  return (
    <View style={{ gap: 20 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <Text style={[heading, { fontSize: 16, letterSpacing: 1, flex: 1, minWidth: 0 }]}>HOME DASHBOARD</Text>
        <SyncIndicator />
      </View>
      <Card
        padding="md"
        onPress={() => router.push('/profile')}
        style={{ borderColor: c.borderActive }}
      >
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          {profile.profileImageUri ? (
            <Image
              source={{ uri: profile.profileImageUri }}
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                borderWidth: 1,
                borderColor: c.primary,
              }}
            />
          ) : (
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                borderWidth: 1,
                borderColor: c.primary,
                backgroundColor: c.primarySubtle,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Image source={voltEmblem} style={{ width: 50, height: 50, borderRadius: 25 }} />
            </View>
          )}
          <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
            <Text style={[heading, { fontSize: 17 }]}>
              {profile.displayName || 'ATHLETE'}{' '}
              <Text style={{ color: c.primary, fontSize: 11 }}>LVL {level}</Text>
            </Text>
            <Text style={[label, { color: c.primary, letterSpacing: 0.6 }]}>
              {history.getStreak()} DAY STREAK · {xp} XP
            </Text>
          </View>
          <Ionicons name="options-outline" size={20} color={c.muted} />
        </View>
      </Card>
      <LevelProgress level={level} xp={xp} compact />
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 18, alignItems: 'stretch' }}>
        <View style={{ flex: wide ? 1 : undefined, minWidth: 0 }}>{weekCard}</View>
        <View style={{ flex: wide ? 1.4 : undefined, minWidth: 0 }}>{hero}</View>
      </View>
      {/* Templates — prioritized before analytics */}
      {templates.length > 0 && (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            {caption('ACTIVE TEMPLATES')}
            <Pressable
              accessibilityRole="button"
              onPress={() => router.navigate('/workouts')}
              style={{ minHeight: 44, justifyContent: 'center' }}
            >
              <Text style={{ color: c.primary, fontSize: 12 }}>View all ↗</Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {templates.slice(0, 4).map((t) => (
              <View key={t.id} style={{ flexBasis: wide ? '22%' : '46%', flexGrow: 1, minWidth: 0 }}>
                <Card padding="md" onPress={() => onTemplate(t)} style={{ flex: 1, gap: 12 }}>
                  <Ionicons name="barbell-outline" size={24} color={c.primary} />
                  <Text style={[heading, { fontSize: 16 }]}>{t.name}</Text>
                  <Text numberOfLines={2} style={{ color: c.muted, fontSize: 11, lineHeight: 17 }}>
                    {names(t)}
                  </Text>
                  <Text style={[label, { color: c.primary, marginTop: 'auto', letterSpacing: 0 }]}>
                    {t.exercises.length} Exercises · {t.exercises.reduce((n, e) => n + e.targetSets, 0)}{' '}
                    Sets ↗
                  </Text>
                </Card>
              </View>
            ))}
          </View>
        </>
      )}
      {/* Analytics — after templates */}
      {caption('WEEKLY LOAD DISTRIBUTION (TIPPEN FÜR FUN-FACTS)')}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {([
          ['VOLUME', `${(volume / 1000).toFixed(1)} t`, 'Recorded load', 'volume'],
          ['SETS', `${setCount}`, 'Completed', 'sets'],
          ['AVG RPE', averageRpe === null ? '—' : averageRpe.toFixed(1), 'Logged effort', 'rpe'],
        ] as const).map(([name, value, detail, key]) => {
          const isSelected = activeStatFact === key;
          return (
            <Card
              key={name}
              padding="sm"
              onPress={() => {
                setActiveStatFact(isSelected ? null : key);
                setStatFactIndex(0);
              }}
              style={{
                flex: 1,
                minWidth: 0,
                gap: 7,
                borderWidth: 1,
                borderColor: isSelected ? c.primary : c.border,
                backgroundColor: isSelected ? withAlpha(c.primary, 0.08) : c.surface,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                {caption(name)}
                <Ionicons
                  name={isSelected ? 'sparkles' : 'information-circle-outline'}
                  size={12}
                  color={isSelected ? c.primary : c.muted}
                />
              </View>
              <Text
                adjustsFontSizeToFit
                numberOfLines={1}
                style={[heading, { fontSize: 25, fontVariant: ['tabular-nums'] }]}
              >
                {value}
              </Text>
              <Text style={{ color: isSelected ? c.primary : c.muted, fontSize: 10 }}>{detail}</Text>
            </Card>
          );
        })}
      </View>
      {activeStatFact && (
        <Pressable
          onPress={() => setStatFactIndex((prev) => prev + 1)}
          style={{
            padding: 14,
            borderRadius: 12,
            backgroundColor: withAlpha(c.primary, 0.08),
            borderWidth: 1,
            borderColor: withAlpha(c.primary, 0.28),
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons
                name={
                  activeStatFact === 'volume'
                    ? 'barbell-outline'
                    : activeStatFact === 'sets'
                    ? 'repeat-outline'
                    : 'speedometer-outline'
                }
                size={14}
                color={c.primary}
              />
              <Text style={[label, { color: c.primary }]}>
                {activeStatFact === 'volume'
                  ? 'VOLUMEN-ÄQUIVALENT (TIPPEN FÜR WEITEREN VERGLEICH)'
                  : activeStatFact === 'sets'
                  ? 'SATZ-INSIGHT (TIPPEN FÜR MEHR)'
                  : 'RPE-GUIDE (TIPPEN FÜR MEHR)'}
              </Text>
            </View>
            <Text style={{ color: c.text, fontSize: 13, fontFamily: 'Manrope_600SemiBold', lineHeight: 19 }}>
              {activeStatFact === 'volume'
                ? [
                    `Dieses Wochenvolumen (${(volume / 1000).toFixed(1)} t) entspricht ca. ${(volume / 5000).toFixed(1)} Afrikanischen Elefanten 🐘`,
                    `Du hast das Gewicht von ${(volume / 450).toFixed(0)} Steinway-Konzertflügeln gestemmt 🎹`,
                    `Entspricht dem Gewicht von ${(volume / 1200).toFixed(1)} Kleinwagen 🚗`,
                    `Bewegtes Gewicht entspricht ca. ${(volume / 8000).toFixed(1)} Tyrannosaurus Rex 🦖`,
                  ][statFactIndex % 4]
                : activeStatFact === 'sets'
                ? [
                    `Geschätzte Gesamtzeit unter Muskelspannung (TUT): ~${Math.round(setCount * 45 / 60)} Minuten ⏱️`,
                    `${setCount >= 16 ? 'Top-Volumen für optimalen Muskelwachstumsreiz! 🔥' : 'Fokussiertes, sauberes Volumen. Kontinuität schlägt Hype! ⚡'}`,
                  ][statFactIndex % 2]
                : averageRpe !== null
                ? [
                    averageRpe >= 8.5
                      ? `Durchschnittliches RPE ${averageRpe.toFixed(1)}: Hohe ZNS-Auslastung (~1 Rep im Tank). Auf ausreichende Regeneration achten!`
                      : averageRpe >= 7
                      ? `Durchschnittliches RPE ${averageRpe.toFixed(1)}: Perfekter Reizbereich (2–3 RIR). Optimaler Muskelaufbau ohne Überlastung.`
                      : `Durchschnittliches RPE ${averageRpe.toFixed(1)}: Moderater Belastungsbereich. Ideal für Bewegungsqualität und Erholung.`,
                    'RPE = Rate of Perceived Exertion. 10 = Max, 9 = 1 Wdh. im Tank, 8 = 2 Wdh. im Tank.',
                  ][statFactIndex % 2]
                : 'Trage bei deinen Sätzen RPE ein, um deine Anstrengung präzise zu steuern.'}
            </Text>
          </View>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: withAlpha(c.primary, 0.15),
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="shuffle" size={16} color={c.primary} />
          </View>
        </Pressable>
      )}
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 18 }}>
        <Card
          padding="md"
          onPress={() => {
            setShowMuscleDetails((prev) => !prev);
            setRingAnimationKey((k) => k + 1);
          }}
          style={{ flex: wide ? 1 : undefined, minWidth: 0 }}
        >
          {panelTitle(
            'MUSCLE DISTRIBUTION',
            'disc-outline',
            showMuscleDetails ? 'DETAILS ↗' : '7 DAYS (TIPPEN)',
          )}
          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            <View style={{ width: 124, height: 124 }}>
              <Svg width={124} height={124} viewBox="0 0 124 124">
                {[0, 1, 2].map((i) => {
                  const r = 54 - i * 12;
                  const ratio = (topMuscles[i]?.[1] || 0) / Math.max(1, totalActivity);
                  const color = [c.primary, c.secondary, c.tertiary][i];
                  return (
                    <React.Fragment key={i}>
                      <Circle
                        cx={62}
                        cy={62}
                        r={r}
                        stroke={c.surfaceElevated}
                        strokeWidth={7}
                        fill="none"
                      />
                      <ActivityRing
                        key={`${ringAnimationKey}-${i}`}
                        radius={r}
                        ratio={ratio}
                        color={color ?? c.primary}
                        delay={i * 140}
                      />
                    </React.Fragment>
                  );
                })}
              </Svg>
              <View
                style={{
                  position: 'absolute',
                  inset: 0,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="flash" color={c.primary} size={20} />
                {caption('SETS')}
              </View>
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 14 }}>
              {topMuscles.length ? (
                topMuscles.map(([name, value], i) => (
                  <View key={name} style={{ gap: 5 }}>
                    <Text style={{ color: c.text, fontSize: 11 }}>
                      {name.replaceAll('_', ' ')} · {Math.round((value / totalActivity) * 100)}%
                    </Text>
                    <View
                      style={{ height: 5, backgroundColor: c.surfaceElevated, borderRadius: 3 }}
                    >
                      <View
                        style={{
                          height: 5,
                          borderRadius: 3,
                          width: `${(value / totalActivity) * 100}%`,
                          backgroundColor: [c.primary, c.secondary, c.tertiary][i],
                        }}
                      />
                    </View>
                  </View>
                ))
              ) : (
                <Text style={{ color: c.muted }}>Complete a workout to see your distribution.</Text>
              )}
            </View>
          </View>
          {showMuscleDetails && (
            <View
              style={{
                marginTop: 14,
                padding: 10,
                borderRadius: 8,
                backgroundColor: c.surfaceElevated,
                gap: 6,
              }}
            >
              <Text style={[label, { color: c.primary }]}>FOKUS-AUFTEILUNG DIESE WOCHE</Text>
              <Text style={{ color: c.text, fontSize: 12, lineHeight: 18 }}>
                Gesamt: {totalActivity} dokumentierte Arbeitssätze aufgeteilt auf die führenden
                Muskelpartien. Tippe erneut, um die Aktivitätsringe neu zu animieren.
              </Text>
            </View>
          )}
          <Text style={[label, { marginTop: 14, letterSpacing: 0 }]}>
            Share of recorded primary-muscle set assignments.
          </Text>
        </Card>
        <Card
          padding="md"
          style={{ flex: wide ? 1 : undefined, minWidth: 0, borderColor: c.borderActive }}
        >
          {panelTitle('MUSCLE ACTIVITY', 'body-outline', '7 DAYS')}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Explore muscle activity"
            accessibilityState={{ expanded: expandedAnatomy }}
            onPress={() => setExpandedAnatomy((value) => !value)}
            style={{
              flexDirection: 'row',
              gap: 16,
              alignItems: 'center',
              backgroundColor: c.background,
              borderRadius: 10,
              padding: 12,
            }}
          >
            <View style={{ width: 88 }}>
              <AnatomyFigure
                height={150}
                color={(muscle) =>
                  activity[muscle]
                    ? withAlpha(c.primary, 0.3 + (0.7 * activity[muscle]!) / maxActivity)
                    : theme.anatomy.base
                }
              />
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 12 }}>
              {topMuscles.length ? (
                topMuscles.map(([name, value]) => (
                  <View key={name}>
                    <Text style={{ color: c.text, fontSize: 12 }}>{name.replaceAll('_', ' ')}</Text>
                    <Text style={[label, { color: c.primary }]}>{value} SETS</Text>
                  </View>
                ))
              ) : (
                <Text style={{ color: c.muted }}>Your training, mapped to muscle groups.</Text>
              )}
            </View>
          </Pressable>
          <AnimatedDisclosure expanded={expandedAnatomy}>
            <MuscleHeatmap
              activity={activity}
              onSelect={(muscle) =>
                router.push({ pathname: '/body', params: { tab: 'exercises', muscle } })
              }
            />
          </AnimatedDisclosure>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.navigate('/coach')}
            style={{
              marginTop: 14,
              padding: 14,
              borderRadius: 10,
              backgroundColor: c.surfaceElevated,
              gap: 8,
            }}
          >
            <Text style={[label, { color: c.primary }]}>COACH INTEL ↗</Text>
            <Text style={{ color: c.text, fontSize: 13, lineHeight: 20 }}>
              Review your training and plan your next session with your coach.
            </Text>
          </Pressable>
        </Card>
      </View>
    </View>
  );
}
