import React from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Image } from 'react-native';
import { useRouter, Href } from 'expo-router';
import { useWorkoutStore } from '../../src/stores/workoutStore';
import { useProfileStore } from '../../src/stores/profileStore';
import { useHistoryStore } from '../../src/stores/historyStore';
import { useAchievementStore } from '../../src/stores/achievementStore';
import { useProgramStore } from '../../src/stores/programStore';
import { Button, Card, useTheme } from '@fitness-tracker/ui';

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  
  const { startWorkout, status } = useWorkoutStore();
  const { profile } = useProfileStore();
  const { getStreak, getSessionsByDateDesc } = useHistoryStore();
  const { level, xp } = useAchievementStore();
  const { programs } = useProgramStore();

  const streak = getStreak();
  const sessions = getSessionsByDateDesc();
  const activeProgram = programs.find(p => p.isActive);
  const lastSession = sessions[0];

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
    d.setDate(today.getDate() - (6 - i));
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

      <View style={styles.levelContainer}>
        <Text style={[styles.levelText, { color: theme.colors.text, ...theme.typography.caption }]}>LEVEL {level}</Text>
        <View style={[styles.xpBarBackground, { backgroundColor: theme.colors.border }]}>
          <View style={[styles.xpBarFill, { backgroundColor: theme.colors.primary, width: `${(xp % 500) / 5}%` }]} />
        </View>
      </View>

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

      {/* Weekly Consistency */}
      <Text style={[{ color: theme.colors.text, fontSize: 20, marginTop: 16, marginBottom: 16 }, theme.typography.heading]}>CONSISTENCY</Text>
      <Card padding="md" style={styles.consistencyCard}>
        <View style={styles.weekContainer}>
          {last7Days.map((date, idx) => {
            const isToday = idx === 6;
            const isTrained = getIsDayTrained(date);
            return (
              <View key={idx} style={styles.dayColumn}>
                <View style={[
                  styles.dayCircle,
                  isTrained 
                    ? { backgroundColor: theme.colors.primary }
                    : { backgroundColor: 'transparent', borderColor: theme.colors.border, borderWidth: 2 },
                  isToday && { 
                    borderColor: theme.colors.primary,
                    borderWidth: 3,
                    ...(!isTrained && { backgroundColor: 'rgba(144, 213, 255, 0.1)' }),
                  },
                ]} />
                <Text style={[
                  { ...theme.typography.caption, fontSize: 10, marginTop: 8 },
                  { color: isToday ? theme.colors.primary : theme.colors.muted },
                  isToday && { fontFamily: 'SpaceGrotesk_700Bold' },
                ]}>
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'][date.getDay()]}
                </Text>
              </View>
            );
          })}
        </View>
      </Card>

      {/* Recent Activity */}
      <Text style={[{ color: theme.colors.text, fontSize: 20, marginTop: 16, marginBottom: 16 }, theme.typography.heading]}>RECENT ACTIVITY</Text>
      {lastSession ? (
        <Card 
          padding="md" 
          onPress={() => router.push(`/history/${lastSession.id}` as Href)}
          style={styles.recentActivityCard}
        >
          <View style={styles.recentActivityHeader}>
            <Text style={[{ color: theme.colors.text, ...theme.typography.body, fontWeight: 'bold' }]}>
              {lastSession.name || 'Workout'}
            </Text>
            <Text style={[{ color: theme.colors.muted, ...theme.typography.caption }]}>
              {new Date(lastSession.startedAt).toLocaleDateString()}
            </Text>
          </View>
          <Text style={[{ color: theme.colors.muted, ...theme.typography.caption }]}>
            {lastSession.exercises.length} Exercises
          </Text>
        </Card>
      ) : (
        <Text style={[{ color: theme.colors.muted, ...theme.typography.body }]}>
          No recent workouts. Time to build the baseline.
        </Text>
      )}

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
  levelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 48,
  },
  levelText: {
    marginRight: 12,
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
});
