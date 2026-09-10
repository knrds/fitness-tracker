import { useWorkoutStore } from '../workoutStore';

const mockBacking: Record<string, string> = {};
const uuid = '46a26651-02df-41d4-84ca-8452ebd20001';
jest.mock('expo-crypto', () => ({ randomUUID: () => '46a26651-02df-41d4-84ca-8452ebd20001' }));
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    getString: (key: string) => mockBacking?.[key],
    set: (key: string, value: string) => {
      mockBacking[key] = value;
    },
    delete: (key: string) => {
      delete mockBacking[key];
    },
  })),
}));

describe('workout persistence contract', () => {
  it.each([0, 1])(
    'preserves IDs, sets and ISO-text notes while hydrating version %s',
    async (version) => {
      // Real persist middleware, codec and migration; only the native IO boundary is replaced.
      await useWorkoutStore.persist.rehydrate();
      useWorkoutStore.getState().startWorkout('Restart test');
      useWorkoutStore.getState().addExercise(uuid);
      const exercise = useWorkoutStore.getState().exercises[0]!;
      useWorkoutStore
        .getState()
        .updateSet(exercise.id, exercise.sets[0]!.id, { weight: 20, reps: 10, rir: 2 });
      useWorkoutStore.setState({
        templateId: uuid,
        programId: uuid,
        notes: '2026-09-10T10:00:00.000Z',
      });
      const saved = useWorkoutStore.getState();
      const raw = JSON.stringify({ state: saved, version });
      useWorkoutStore.getState().resetWorkout();
      mockBacking['workout-storage'] = raw;
      await useWorkoutStore.persist.rehydrate();
      const restored = useWorkoutStore.getState();
      expect(restored.sessionId).toBe(uuid);
      expect(restored.templateId).toBe(uuid);
      expect(restored.programId).toBe(uuid);
      expect(restored.startedAt).toEqual(saved.startedAt);
      expect(restored.exercises).toEqual(saved.exercises);
      expect(restored.notes).toBe('2026-09-10T10:00:00.000Z');
      expect(restored.status).toBe('active');
    },
  );
});
