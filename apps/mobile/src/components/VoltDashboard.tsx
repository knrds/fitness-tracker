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
import { LevelRankBadge } from './LevelRankBadge';
import { BattlePassModal } from './BattlePassModal';
import { SyncIndicator } from './SyncIndicator';
import voltEmblem from '../../assets/volt-emblem.png';
import { MuscleHeatmap } from './MuscleHeatmap';
import { AnimatedDisclosure } from '@fitness-tracker/ui';
import { useI18n } from '../i18n';

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
  const [battlePassVisible, setBattlePassVisible] = React.useState(false);
  const { profile } = useProfileStore();
  const { t, formatMuscle, language } = useI18n();
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
  const dayInitials =
    language === 'en'
      ? ['M', 'T', 'W', 'T', 'F', 'S', 'S']
      : ['M', 'D', 'M', 'D', 'F', 'S', 'S'];
  const dayNames =
    language === 'en'
      ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      : ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
  const weekCard = (
    <Card padding="md" style={{ flex: wide ? 1 : undefined, justifyContent: 'center' }}>
      {panelTitle(
        language === 'en' ? 'WEEKLY MICROCYCLE' : 'WOCHEN-MIKROZYKLUS',
        'calendar-outline',
        `${weekly.length} ${language === 'en' ? 'SESSIONS' : 'EINHEITEN'}`,
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
                {dayInitials[i]}
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
                    {s.exercises.reduce((acc, ex) => acc + ex.sets.filter((st) => st.completed).length, 0)} {t('workout.sets')}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={{ color: c.muted, fontSize: 12, fontStyle: 'italic' }}>
                {language === 'en' ? 'Rest day · No session logged' : 'Ruhetag · Keine Einheit geloggt'}
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
            {programName
              ? `${language === 'en' ? 'WEEK' : 'WOCHE'} ${String(week).padStart(2, '0')} · ${durationWeeks}`
              : (language === 'en' ? 'YOUR TRAINING' : 'DEIN TRAINING')}
          </Text>
        </View>
        <Pressable
          onPress={openPrograms}
          accessibilityRole="button"
          style={{ minHeight: 44, justifyContent: 'center' }}
        >
          <Text style={[label, { color: c.primary }]}>{t('plans.programs').toUpperCase()} ↗</Text>
        </Pressable>
      </View>
      <View style={{ gap: 6 }}>
        <Text style={[label, { color: c.primary }]}>{language === 'en' ? "TODAY'S SESSION" : 'HEUTIGE EINHEIT'}</Text>
        <Text style={[heading, { fontSize: 26, lineHeight: 31 }]}>
          {resume
            ? t('workout.resumeWorkout').toUpperCase()
            : template?.name || (programName ? (language === 'en' ? 'RECOVERY DAY' : 'REGENERATIONSTAG') : 'QUICK WORKOUT')}
        </Text>
        <Text
          numberOfLines={2}
          style={{ color: c.muted, fontFamily: 'Manrope_500Medium', lineHeight: 21 }}
        >
          {template
            ? names(template)
            : programName
              ? `${programName} · ${language === 'en' ? 'No scheduled workout today.' : 'Heute kein geplantes Workout.'}`
              : (language === 'en' ? 'Your pace. Your exercises. Make the next set count.' : 'Dein Tempo. Deine Übungen. Jeder Satz zählt.')}
        </Text>
      </View>
      {template && (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[
            [language === 'en' ? 'MOVEMENTS' : 'ÜBUNGEN', `${template.exercises.length} ${t('plans.exercisesCount')}`],
            [language === 'en' ? 'WORKING SETS' : 'ARBEITSSÄTZE', `${template.exercises.reduce((n, e) => n + e.targetSets, 0)} ${language === 'en' ? 'planned' : 'geplant'}`],
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
        title={resume ? `${t('workout.resumeWorkout').toUpperCase()} →` : template ? (language === 'en' ? 'START SESSION →' : 'SESSION STARTEN →') : `${t('workout.startWorkout').toUpperCase()} →`}
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[heading, { fontSize: 17 }]} numberOfLines={1}>
                {profile.displayName || 'ATHLETE'}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Level ${level} Pass öffnen`}
                onPress={() => setBattlePassVisible(true)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2, paddingHorizontal: 4, borderRadius: 6 }}
              >
                <LevelRankBadge level={level} size={28} />
                <Text style={{ color: c.primary, fontSize: 12, fontFamily: 'SpaceGrotesk_600SemiBold' }}>
                  LVL {level}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={c.primary} />
              </Pressable>
            </View>
            <Text style={[label, { color: c.primary, letterSpacing: 0.6 }]}>
              {history.getStreak()} {language === 'en' ? 'DAY STREAK' : 'TAGE STREAK'} · {xp} XP
            </Text>
          </View>
          <Ionicons name="options-outline" size={20} color={c.muted} />
        </View>
      </Card>
      <LevelProgress level={level} xp={xp} compact onPress={() => setBattlePassVisible(true)} />
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 18, alignItems: 'stretch' }}>
        <View style={{ flex: wide ? 1 : undefined, minWidth: 0 }}>{weekCard}</View>
        <View style={{ flex: wide ? 1.4 : undefined, minWidth: 0 }}>{hero}</View>
      </View>
      {/* Templates — prioritized before analytics */}
      {templates.length > 0 && (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            {caption(language === 'en' ? 'ACTIVE TEMPLATES' : 'AKTIVE VORLAGEN')}
            <Pressable
              accessibilityRole="button"
              onPress={() => router.navigate('/workouts')}
              style={{ minHeight: 44, justifyContent: 'center' }}
            >
              <Text style={{ color: c.primary, fontSize: 12 }}>{language === 'en' ? 'View all ↗' : 'Alle ansehen ↗'}</Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {templates.slice(0, 4).map((tmpl) => (
              <View key={tmpl.id} style={{ flexBasis: wide ? '22%' : '46%', flexGrow: 1, minWidth: 0 }}>
                <Card padding="md" onPress={() => onTemplate(tmpl)} style={{ flex: 1, gap: 12 }}>
                  <Ionicons name="barbell-outline" size={24} color={c.primary} />
                  <Text style={[heading, { fontSize: 16 }]}>{tmpl.name}</Text>
                  <Text numberOfLines={2} style={{ color: c.muted, fontSize: 11, lineHeight: 17 }}>
                    {names(tmpl)}
                  </Text>
                  <Text style={[label, { color: c.primary, marginTop: 'auto', letterSpacing: 0 }]}>
                    {tmpl.exercises.length} {t('plans.exercisesCount')} · {tmpl.exercises.reduce((n, e) => n + e.targetSets, 0)}{' '}
                    {t('workout.sets')} ↗
                  </Text>
                </Card>
              </View>
            ))}
          </View>
        </>
      )}
      {/* Analytics — after templates */}
      {caption(t('muscles.weeklyLoad').toUpperCase())}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {([
          [t('workout.volume').toUpperCase(), `${(volume / 1000).toFixed(1)} t`, language === 'en' ? 'Recorded load' : 'Erfasste Last', 'volume', 'trending-up-outline'],
          [t('workout.sets').toUpperCase(), `${setCount}`, language === 'en' ? 'Completed' : 'Abgeschlossen', 'sets', 'checkmark-circle-outline'],
          ['AVG RPE', averageRpe === null ? '—' : averageRpe.toFixed(1), language === 'en' ? 'Logged effort' : 'Geloggte Intensität', 'rpe', 'speedometer-outline'],
        ] as const).map(([name, value, detail, key, icon]) => {
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
                  name={icon}
                  size={14}
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
                    ? 'trending-up-outline'
                    : activeStatFact === 'sets'
                    ? 'layers-outline'
                    : 'speedometer-outline'
                }
                size={14}
                color={c.primary}
              />
              <Text style={[label, { color: c.primary }]}>
                {language === 'en'
                  ? activeStatFact === 'volume'
                    ? 'VOLUME TELEMETRY (TAP TO SWITCH)'
                    : activeStatFact === 'sets'
                    ? 'SET ANALYSIS (TAP TO SWITCH)'
                    : 'RPE MANAGEMENT (TAP TO SWITCH)'
                  : activeStatFact === 'volume'
                  ? 'VOLUMEN-TELEMETRIE (TIPPEN FÜR WECHSEL)'
                  : activeStatFact === 'sets'
                  ? 'SATZ-ANALYSE (TIPPEN FÜR WECHSEL)'
                  : 'RPE-STEUERUNG (TIPPEN FÜR WECHSEL)'}
              </Text>
            </View>
            <Text style={{ color: c.text, fontSize: 13, fontFamily: 'Manrope_600SemiBold', lineHeight: 19 }}>
              {activeStatFact === 'volume'
                ? (language === 'en'
                  ? [
                      `Weekly volume: ${(volume / 1000).toFixed(1)} t cumulative load. Equivalent to ~${Math.round(volume / 20)} moved 20 kg barbell plates.`,
                      `Total tonnage matches ${((volume / 1000) / 1.2).toFixed(1)} compact cars in iron moved this training week.`,
                      `Matches the cumulative cable load of ~${Math.round(volume / 200)} standard cable weight stacks.`,
                    ]
                  : [
                      `Wochenvolumen: ${(volume / 1000).toFixed(1)} t kumulierte Last. Entspricht rund ${Math.round(volume / 20)} bewegten 20-kg-Hantelscheiben.`,
                      `Gesamte Tonnage entspricht ${((volume / 1000) / 1.2).toFixed(1)} Kleinwagen an bewegter Eisenmasse in dieser Trainingswoche.`,
                      `Entspricht der kumulierten Zuglast von rund ${Math.round(volume / 200)} Standard-Kabelzug-Gewichtsblöcken.`,
                    ])[statFactIndex % 3]
                : activeStatFact === 'sets'
                ? (language === 'en'
                  ? [
                      `Estimated time under tension (TUT): ~${Math.round((setCount * 45) / 60)} minutes at 45s per set.`,
                      `${setCount >= 16 ? 'Hypertrophy optimum: Effective set volume for maximum mechanical stimulus.' : 'Focused set volume: High movement quality and targeted stimulus density.'}`,
                    ]
                  : [
                      `Geschätzte Zeit unter Muskelspannung (TUT): ~${Math.round((setCount * 45) / 60)} Minuten bei 45s pro Satz.`,
                      `${setCount >= 16 ? 'Hypertrophie-Optimum: Effektives Satzvolumen für maximalen mechanischen Reiz.' : 'Fokussiertes Satzvolumen: Hohe Bewegungsqualität und zielgerichtete Reizdichte.'}`,
                    ])[statFactIndex % 2]
                : averageRpe !== null
                ? (language === 'en'
                  ? [
                      averageRpe >= 8.5
                        ? `Average RPE ${averageRpe.toFixed(1)}: High CNS fatigue (~1 rep left in reserve). Plan sufficient recovery between sessions.`
                        : averageRpe >= 7
                        ? `Average RPE ${averageRpe.toFixed(1)}: Optimal hypertrophy zone (2–3 RIR). High muscle-building stimulus with manageable fatigue.`
                        : `Average RPE ${averageRpe.toFixed(1)}: Moderate exertion zone. Ideal for technique focus, strength foundation, and deloads.`,
                      'RPE (Rate of Perceived Exertion): 10 = Maximum effort limit, 9 = 1 rep in reserve, 8 = 2 reps in reserve.',
                    ]
                  : [
                      averageRpe >= 8.5
                        ? `Durchschnittliches RPE ${averageRpe.toFixed(1)}: Hohe ZNS-Auslastung (~1 Rep im Tank). Ausreichende Regeneration zwischen den Einheiten einplanen.`
                        : averageRpe >= 7
                        ? `Durchschnittliches RPE ${averageRpe.toFixed(1)}: Optimaler Hypertrophiebereich (2–3 RIR). Hoher Wachstumsreiz bei kontrollierter Ermüdung.`
                        : `Durchschnittliches RPE ${averageRpe.toFixed(1)}: Moderater Belastungsbereich. Ideal für Technikfokus, Kraftaufbau und Deloads.`,
                      'RPE (Rate of Perceived Exertion): 10 = Maximales Limit, 9 = 1 Wiederholung in Reserve, 8 = 2 Wiederholungen in Reserve.',
                    ])[statFactIndex % 2]
                : language === 'en'
                ? 'Log RPE on your sets to precisely monitor and guide your training intensity.'
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
            <Ionicons name="swap-horizontal-outline" size={16} color={c.primary} />
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
            t('muscles.muscleDistribution').toUpperCase(),
            'disc-outline',
            showMuscleDetails
              ? 'DETAILS ↗'
              : language === 'en'
              ? '7 DAYS (TAP)'
              : '7 TAGE (TIPPEN)',
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
                {caption(t('workout.sets').toUpperCase())}
              </View>
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 14 }}>
              {topMuscles.length ? (
                topMuscles.map(([name, value], i) => (
                  <View key={name} style={{ gap: 5 }}>
                    <Text style={{ color: c.text, fontSize: 11 }}>
                      {formatMuscle(name)} · {Math.round((value / totalActivity) * 100)}%
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
                <Text style={{ color: c.muted }}>
                  {language === 'en'
                    ? 'Complete a workout to see your distribution.'
                    : 'Absolviere ein Workout, um deine Verteilung zu sehen.'}
                </Text>
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
              <Text style={[label, { color: c.primary }]}>
                {language === 'en' ? 'FOCUS DISTRIBUTION THIS WEEK' : 'FOKUS-AUFTEILUNG DIESE WOCHE'}
              </Text>
              <Text style={{ color: c.text, fontSize: 12, lineHeight: 18 }}>
                {language === 'en'
                  ? `Total: ${totalActivity} recorded working sets across primary muscle groups. Tap again to re-animate rings.`
                  : `Gesamt: ${totalActivity} dokumentierte Arbeitssätze aufgeteilt auf die führenden Muskelpartien. Tippe erneut, um die Aktivitätsringe neu zu animieren.`}
              </Text>
            </View>
          )}
          <Text style={[label, { marginTop: 14, letterSpacing: 0 }]}>
            {language === 'en'
              ? 'Share of recorded primary-muscle set assignments.'
              : 'Anteil der erfassten Hauptmuskel-Satzzuordnungen.'}
          </Text>
        </Card>
        <Card
          padding="md"
          style={{ flex: wide ? 1 : undefined, minWidth: 0, borderColor: c.borderActive }}
        >
          {panelTitle(
            language === 'en' ? 'MUSCLE ACTIVITY' : 'MUSKELAKTIVITÄT',
            'body-outline',
            language === 'en' ? '7 DAYS' : '7 TAGE',
          )}
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
                    <Text style={{ color: c.text, fontSize: 12 }}>{formatMuscle(name)}</Text>
                    <Text style={[label, { color: c.primary }]}>
                      {value} {t('workout.sets').toUpperCase()}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={{ color: c.muted }}>
                  {language === 'en'
                    ? 'Your training, mapped to muscle groups.'
                    : 'Dein Training, zugeordnet nach Muskelgruppen.'}
                </Text>
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
      <BattlePassModal
        visible={battlePassVisible}
        onClose={() => setBattlePassVisible(false)}
        level={level}
        xp={xp}
      />
    </View>
  );
}
