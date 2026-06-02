import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useWorkoutStore } from '../../src/stores/workoutStore';

export default function HomeScreen() {
  const router = useRouter();
  const { startWorkout, status } = useWorkoutStore();

  const handleStartWorkout = () => {
    if (status === 'idle' || status === 'finished') {
      startWorkout('Quick Workout');
    }
    router.push('/workout/session');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fitness Tracker</Text>
      <Text style={styles.subtitle}>Track your workouts and progress</Text>
      
      <Pressable style={styles.startBtn} onPress={handleStartWorkout}>
        <Text style={styles.startBtnText}>
          {status === 'active' || status === 'paused' ? 'Resume Workout' : 'Start Quick Workout'}
        </Text>
      </Pressable>

      <Pressable style={styles.secondaryBtn} onPress={() => router.push('/workout/quick-start' as unknown as Parameters<typeof router.push>[0])}>
        <Text style={styles.secondaryBtnText}>Quick Start / Templates</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  startBtn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    width: '100%',
    alignItems: 'center',
  },
  startBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryBtn: {
    marginTop: 16,
    borderWidth: 2,
    borderColor: '#3b82f6',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#3b82f6',
    fontSize: 18,
    fontWeight: '700',
  },
});
