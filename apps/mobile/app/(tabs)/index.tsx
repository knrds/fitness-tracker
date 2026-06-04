import React from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Image, Animated, Platform, Modal } from 'react-native';
import { useRouter, Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WorkoutSession } from '@fitness-tracker/domain';
import { useWorkoutStore } from '../../src/stores/workoutStore';
import { useProfileStore } from '../../src/stores/profileStore';
import { useHistoryStore } from '../../src/stores/historyStore';
import { useAchievementStore } from '../../src/stores/achievementStore';
import { useProgramStore } from '../../src/stores/programStore';
import { useExerciseStore } from '../../src/stores/exerciseStore';
import { getLevelBadge } from '../../src/utils/level';
import { Button, Card, useTheme } from '@fitness-tracker/ui';

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  
  const { startWorkout, status } = useWorkoutStore();
  const { profile } = useProfileStore();
  const { getStreak, getSessionsByDateDesc } = useHistoryStore();
  const { level, xp } = useAchievementStore();
  const { programs } = useProgramStore();
  const { exercises } = useExerciseStore();

  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(20)).current;
  const [showXpTooltip, setShowXpTooltip] = React.useState(false);
  const [selectedSession, setSelectedSession] = React.useState<WorkoutSession | null>(null);

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: Platform.OS !== 'web',
      })
    ]).start();
  }, []);

  const streak = getStreak();
  const sessions = getSessionsByDateDesc();
  const activeProgram = programs.find(p => p.isActive);

  const handleStartWorkout = () => {
    if (status === 'idle' || status === 'finished') {
      startWorkout('Quick Workout');
    }
    router.push('/workout/session');
  };

  // Profile avatar initials
  const initials = (profile.displayName || 'U')
    .split(' ')
    .map(w => w.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Logic for Weekly Consistency Chart
  const today = new Date();
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - 3 + i);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const getIsDayTrained = (date: Date) => {
    return sessions.some(s => {
      const sessionDate = new Date(s.startedAt);
      return sessionDate.getDate() === date.getDate() &&
             sessionDate.getMonth() === date.getMonth() &&
             sessionDate.getFullYear() === date.getFullYear();
    });
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.content}>
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], gap: 16 }}>
        {/* Top Header — entire row tappable to navigate to profile */}
        <Pressable 
        style={styles.headerRow} 
        onPress={() => router.push('/profile' as Href)}
      >
        {/* Profile Avatar */}
        <View style={styles.headerLeft}>
          {profile.profileImageUri ? (
            <Image 
              source={{ uri: profile.profileImageUri }} 
              style={[styles.avatar, { borderColor: theme.colors.primary }]} 
            />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback, { borderColor: theme.colors.primary, backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.avatarInitials, { color: theme.colors.primary }]}>{initials}</Text>
            </View>
          )}
          <View>
            <Text style={[{ color: theme.colors.muted, marginBottom: 2 }, theme.typography.caption]}>
              READY TO GRIND,
            </Text>
            <Text style={[{ color: theme.colors.text }, theme.typography.heading]}>
              {profile.displayName || 'ATHLETE'}
            </Text>
          </View>
        </View>
        <View style={styles.readinessContainer}>
          <Text style={[{ color: theme.colors.primary, fontSize: 32, lineHeight: 36 }, theme.typography.display]}>
            {streak}
          </Text>
          <Text style={[{ color: theme.colors.muted }, theme.typography.caption]}>
            STREAK 🔥
          </Text>
        </View>
      </Pressable>

      <Pressable 
        style={styles.levelWrapper}
        onPress={() => setShowXpTooltip(prev => !prev)}
        onPointerEnter={() => setShowXpTooltip(true)}
        onPointerLeave={() => setShowXpTooltip(false)}
      >
        <View style={styles.levelHeaderRow}>
          <Text style={[styles.levelText, { color: theme.colors.text, ...theme.typography.caption }]}>
            LEVEL {level} • {getLevelBadge(level).title} {getLevelBadge(level).icon}
          </Text>
          <Text style={[styles.xpTextInline, { color: theme.colors.primary, ...theme.typography.caption, opacity: showXpTooltip ? 1 : 0 }]}>
            {xp % 500} / 500 XP
          </Text>
        </View>
        <View style={[styles.xpBarBackground, { backgroundColor: theme.colors.border }]}>
          <View style={[styles.xpBarFill, { backgroundColor: theme.colors.primary, width: `${(xp % 500) / 5}%` }]} />
        </View>
      </Pressable>

      {/* "Today" Card */}
      <Text style={[{ color: theme.colors.text, fontSize: 20, marginTop: 16, marginBottom: 16 }, theme.typography.heading]}>TODAY</Text>
      <Card style={styles.todayCard} padding="lg">
        {activeProgram ? (
          <View>
            <Text style={[{ color: theme.colors.text, fontSize: 24, marginBottom: 8 }, theme.typography.heading]}>
              {activeProgram.name}
            </Text>
            <Text style={[{ color: theme.colors.muted, ...theme.typography.body, marginBottom: 24 }]}>
              Ready for the next workout
            </Text>
          </View>
        ) : (
          <View>
            <Text style={[{ color: theme.colors.text, fontSize: 24, marginBottom: 8 }, theme.typography.heading]}>
              FREE TRAINING
            </Text>
            <Text style={[{ color: theme.colors.muted, ...theme.typography.body, marginBottom: 24 }]}>
              No program active. Time to build the baseline.
            </Text>
          </View>
        )}
        <Button 
          title={status === 'active' || status === 'paused' ? 'RESUME WORKOUT' : 'START WORKOUT'}
          variant="primary"
          onPress={handleStartWorkout}
        />
        {!activeProgram && (
          <Button 
            title="BROWSE PROGRAMS"
            variant="ghost"
            style={{ marginTop: 16 }}
            onPress={() => router.push('/programs')}
          />
        )}
      </Card>

      {/* Recent Workouts */}
      {sessions.length > 0 && (
        <>
          <Text style={[{ color: theme.colors.text, fontSize: 20, marginTop: 16, marginBottom: 16 }, theme.typography.heading]}>RECENT WORKOUTS</Text>
          <View style={{ gap: 12, marginBottom: 16 }}>
            {sessions.slice(0, 4).map(session => {
              const exerciseNames = session.exercises
                .map(se => exercises.find(e => e.id === se.exerciseId)?.name)
                .filter(Boolean)
                .join(', ');
              
              const totalSets = session.exercises.reduce((sum, ex) => sum + ex.sets.filter(s => s.completed).length, 0);
              const totalVolume = session.exercises.reduce((sum, ex) => sum + ex.sets.filter(s => s.completed && s.weight).reduce((sSum, s) => sSum + s.weight! * (s.reps || 0), 0), 0);
              
              return (
                <Card 
                  key={session.id}
                  padding="md" 
                  onPress={() => setSelectedSession(session)}
                  style={styles.recentActivityCard}
                >
                  <View style={styles.recentActivityHeader}>
                    <Text style={[{ color: theme.colors.text, ...theme.typography.body, fontWeight: 'bold' }]}>
                      {session.name || 'Workout'}
                    </Text>
                    <Text style={[{ color: theme.colors.muted, ...theme.typography.caption }]}>
                      {new Date(session.startedAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={[{ color: theme.colors.muted, fontSize: 14, fontFamily: 'Manrope_500Medium', marginVertical: 6 }]} numberOfLines={2} ellipsizeMode="tail">
                    {exerciseNames || `${session.exercises.length} Exercises`}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
                    <Text style={[{ color: theme.colors.muted }, theme.typography.caption]}>
                      Sets: <Text style={{ color: theme.colors.text }}>{totalSets}</Text>
                    </Text>
                    <Text style={[{ color: theme.colors.muted }, theme.typography.caption]}>
                      Vol: <Text style={{ color: theme.colors.text }}>{Math.round(totalVolume)} kg</Text>
                    </Text>
                  </View>
                </Card>
              );
            })}
          </View>
        </>
      )}

      {/* Weekly Consistency */}
      <Text style={[{ color: theme.colors.text, fontSize: 20, marginTop: 16, marginBottom: 16 }, theme.typography.heading]}>CONSISTENCY</Text>
      <Card padding="md" style={styles.consistencyCard}>
        <View style={styles.weekContainer}>
          {last7Days.map((date, idx) => {
            const isToday = date.toDateString() === today.toDateString();
            const isTrained = getIsDayTrained(date);
            return (
              <View key={idx} style={styles.dayColumn}>
                <View style={[
                  styles.dayCircle,
                  isTrained 
                    ? { backgroundColor: theme.colors.primary }
                    : { backgroundColor: 'transparent', borderColor: theme.colors.border, borderWidth: 2 },
                  isToday && { 
                    borderColor: '#ffffff',
                    borderWidth: 2,
                    shadowColor: theme.colors.primary,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.8,
                    shadowRadius: 6,
                    elevation: 5,
                    ...(!isTrained && { backgroundColor: 'rgba(144, 213, 255, 0.15)' }),
                  },
                ]}>
                  {isTrained && <Ionicons name="checkmark" size={14} color={theme.colors.background} />}
                </View>
                <Text style={[
                  { ...theme.typography.caption, fontSize: 10, marginTop: 8 },
                  { color: isToday ? theme.colors.primary : theme.colors.muted },
                  isToday && { fontFamily: 'SpaceGrotesk_700Bold', fontWeight: 'bold' },
                ]}>
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'][date.getDay()]}
                </Text>
              </View>
            );
          })}
        </View>
      </Card>

      </Animated.View>

      {/* Workout Summary Popup */}
      <Modal 
        visible={selectedSession !== null} 
        transparent 
        animationType="slide" 
        onRequestClose={() => setSelectedSession(null)}
      >
        <Pressable style={styles.summaryOverlay} onPress={() => setSelectedSession(null)}>
          <View style={styles.summarySheet} onStartShouldSetResponder={() => true}>
            {selectedSession && (
              <>
                <View style={styles.summaryGripArea}>
                  <View style={[styles.summaryGrip, { backgroundColor: theme.colors.border }]} />
                </View>
                <Text style={[styles.summaryTitle, { color: theme.colors.text, ...theme.typography.heading }]}>
                  {selectedSession.name}
                </Text>
                <Text style={[styles.summaryDate, { color: theme.colors.muted, ...theme.typography.caption }]}>
                  {new Date(selectedSession.startedAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </Text>
                
                <View style={styles.summaryStatsRow}>
                  <View style={styles.summaryStat}>
                    <Text style={[styles.summaryStatValue, { color: theme.colors.primary, ...theme.typography.display }]}>
                      {selectedSession.durationSeconds ? `${Math.floor(selectedSession.durationSeconds / 60)}m` : '--'}
                    </Text>
                    <Text style={[styles.summaryStatLabel, { color: theme.colors.muted, ...theme.typography.caption }]}>DURATION</Text>
                  </View>
                  <View style={styles.summaryStat}>
                    <Text style={[styles.summaryStatValue, { color: theme.colors.primary, ...theme.typography.display }]}>
                      {Math.round(selectedSession.exercises.reduce((sum, ex) => sum + ex.sets.filter(s => s.completed && s.weight).reduce((sSum, s) => sSum + s.weight! * (s.reps || 0), 0), 0))}
                    </Text>
                    <Text style={[styles.summaryStatLabel, { color: theme.colors.muted, ...theme.typography.caption }]}>VOLUME</Text>
                  </View>
                  <View style={styles.summaryStat}>
                    <Text style={[styles.summaryStatValue, { color: theme.colors.primary, ...theme.typography.display }]}>
                      {selectedSession.exercises.reduce((sum, ex) => sum + ex.sets.filter(s => s.completed).length, 0)}
                    </Text>
                    <Text style={[styles.summaryStatLabel, { color: theme.colors.muted, ...theme.typography.caption }]}>SETS</Text>
                  </View>
                </View>
                
                <ScrollView style={styles.summaryExercises} showsVerticalScrollIndicator={false}>
                  {selectedSession.exercises.map((ex) => {
                    const exInfo = exercises.find(e => e.id === ex.exerciseId);
                    const completedSets = ex.sets.filter(s => s.completed);
                    return (
                      <View key={ex.id} style={styles.summaryExRow}>
                        <Text style={[styles.summaryExName, { color: theme.colors.text, ...theme.typography.body }]}>
                          {exInfo?.name || 'Unknown'}
                        </Text>
                        <Text style={[styles.summaryExDetail, { color: theme.colors.muted, ...theme.typography.caption }]}>
                          {completedSets.length} sets
                          {completedSets[0]?.weight ? ` · ${completedSets[0].weight}kg × ${completedSets[0].reps ?? '?'}` : ''}
                        </Text>
                      </View>
                    );
                  })}
                </ScrollView>
                
                <Pressable
                  style={[styles.summaryDetailBtn, { backgroundColor: theme.colors.primary }]}
                  onPress={() => {
                    const id = selectedSession.id;
                    setSelectedSession(null);
                    router.push(`/history/${id}` as unknown as Parameters<typeof router.push>[0]);
                  }}
                >
                  <Text style={[styles.summaryDetailBtnText, { color: theme.colors.background, ...theme.typography.button }]}>
                    VIEW FULL DETAILS
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 100,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
  },
  avatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
  },
  readinessContainer: {
    alignItems: 'flex-end',
  },
  levelWrapper: {
    marginBottom: 48,
  },
  levelHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  levelText: {
    marginRight: 12,
  },
  xpTextInline: {
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  xpBarBackground: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
  },
  todayCard: {
    marginBottom: 32,
  },
  consistencyCard: {
    marginBottom: 32,
  },
  weekContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  dayColumn: {
    alignItems: 'center',
  },
  dayCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentActivityCard: {
    marginBottom: 16,
  },
  recentActivityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 11, 15, 0.85)',
    justifyContent: 'flex-end',
  },
  summarySheet: {
    backgroundColor: '#1A1C23',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 34,
    borderWidth: 1,
    borderColor: '#2A2B31',
  },
  summaryGripArea: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  summaryGrip: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  summaryTitle: {
    fontSize: 22,
    marginBottom: 4,
  },
  summaryDate: {
    marginBottom: 20,
  },
  summaryStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    paddingVertical: 12,
    backgroundColor: '#0B0B0F',
    borderRadius: 12,
  },
  summaryStat: {
    alignItems: 'center',
  },
  summaryStatValue: {
    fontSize: 20,
    marginBottom: 4,
  },
  summaryStatLabel: {
    fontSize: 10,
  },
  summaryExercises: {
    marginBottom: 24,
    gap: 12,
    maxHeight: 180,
  },
  summaryExRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryExName: {
    fontSize: 15,
  },
  summaryExDetail: {
    fontSize: 13,
  },
  summaryDetailBtn: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryDetailBtnText: {
    fontSize: 14,
  },
});
