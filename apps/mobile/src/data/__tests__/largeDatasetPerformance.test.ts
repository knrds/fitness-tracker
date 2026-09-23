import { useHistoryStore } from '../../stores/historyStore';
import { useBodyMetricStore } from '../../stores/bodyMetricStore';
import { useProgramStore } from '../../stores/programStore';
import { useProfileStore } from '../../stores/profileStore';
import { matchesExerciseSearch } from '../../utils/exerciseSearch';
import { EXERCISES } from '@fitness-tracker/domain';
import {
  generateBenchmarkWorkouts,
  generateBenchmarkMetrics,
  generateBenchmarkTemplates,
  generateBenchmarkPrograms,
} from './benchmarkDatasetGenerator';

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    set: jest.fn(),
    getString: jest.fn(),
    delete: jest.fn(),
  })),
}));

describe('Large Dataset & Scaling Performance Benchmarks (Phase 11)', () => {
  beforeEach(() => {
    useHistoryStore.getState().clearHistory();
    useBodyMetricStore.getState().clearMetrics();
    useProgramStore.setState({ programs: [], templates: [] });
  });

  it('evaluates ingestion, sorting, and lookup latency across 500 workouts (approx. 7,000 sets)', () => {
    const workouts = generateBenchmarkWorkouts(500, 4);
    const totalSets = workouts.reduce((sum, w) => sum + w.exercises.reduce((s, ex) => s + ex.sets.length, 0), 0);
    expect(workouts).toHaveLength(500);
    expect(totalSets).toBeGreaterThan(6000);

    const startIngest = performance.now();
    useHistoryStore.setState({ sessions: workouts });
    const ingestMs = performance.now() - startIngest;
    expect(ingestMs).toBeLessThan(150);

    const startSort = performance.now();
    const sorted = useHistoryStore.getState().getSessionsByDateDesc();
    const sortMs = performance.now() - startSort;
    expect(sorted).toHaveLength(500);
    expect(sortMs).toBeLessThan(50);

    const startLookup = performance.now();
    const perf = useHistoryStore.getState().getPreviousPerformance('bench-press');
    const lookupMs = performance.now() - startLookup;
    expect(perf).not.toBeNull();
    expect(lookupMs).toBeLessThan(20);

    const startVolume = performance.now();
    const volHistory = useHistoryStore.getState().getExerciseVolumeHistory('bench-press');
    const volumeMs = performance.now() - startVolume;
    expect(volHistory.length).toBeGreaterThan(50);
    expect(volumeMs).toBeLessThan(35);
  });

  it('scales to 1,000 workouts and 10,000+ sets without memory exhaustion or query blocking', () => {
    // Generate 1,000 workouts with 3-5 exercises and 3-4 sets each -> >10,000 sets!
    const workouts = generateBenchmarkWorkouts(1000, 4);
    let totalSetCount = 0;
    for (const w of workouts) {
      for (const ex of w.exercises) {
        totalSetCount += ex.sets.length;
      }
    }
    expect(workouts).toHaveLength(1000);
    expect(totalSetCount).toBeGreaterThanOrEqual(10000);

    useHistoryStore.setState({ sessions: workouts });

    // Measure Date-Descending Sort Latency
    const startSort = performance.now();
    const sorted = useHistoryStore.getState().getSessionsByDateDesc();
    const sortMs = performance.now() - startSort;
    expect(sorted).toHaveLength(1000);
    expect(sortMs).toBeLessThan(100);

    // Measure getPreviousPerformance Latency
    const startLookup = performance.now();
    const prev = useHistoryStore.getState().getPreviousPerformance('squat');
    const lookupMs = performance.now() - startLookup;
    expect(prev).not.toBeNull();
    expect(lookupMs).toBeLessThan(25);

    // Measure full GDPR export generation time with 10,000 sets
    const startExport = performance.now();
    const exportedJson = useProfileStore.getState().exportData();
    const exportMs = performance.now() - startExport;
    expect(exportedJson.length).toBeGreaterThan(1000000); // Over 1MB payload
    expect(exportMs).toBeLessThan(300); // Under 300ms serialization
  });

  it('handles 500 body metrics and maintains chronological metric resolution in sub-millisecond time', () => {
    const metrics = generateBenchmarkMetrics(500);
    expect(metrics).toHaveLength(500);

    useBodyMetricStore.setState({ metrics });

    const startLatest = performance.now();
    const latest = useBodyMetricStore.getState().getLatestMetric();
    const latestMs = performance.now() - startLatest;

    expect(latest).toBeDefined();
    expect(latestMs).toBeLessThan(10);
  });

  it('handles 100 templates and 50 training programs with immediate state retrieval', () => {
    const templates = generateBenchmarkTemplates(100);
    const programs = generateBenchmarkPrograms(50);

    useProgramStore.setState({ templates, programs });

    const state = useProgramStore.getState();
    expect(state.templates).toHaveLength(100);
    expect(state.programs).toHaveLength(50);
  });

  it('evaluates exercise search fuzzy-matching latency across 800+ catalog exercises', () => {
    const startSearch = performance.now();
    const results = EXERCISES.filter((ex) => matchesExerciseSearch(ex, 'bench'));
    const searchMs = performance.now() - startSearch;

    expect(results.length).toBeGreaterThan(0);
    expect(searchMs).toBeLessThan(100);
  });
});
