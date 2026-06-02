import { useBodyMetricStore } from '../bodyMetricStore';

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    set: jest.fn(),
    getString: jest.fn(),
    delete: jest.fn(),
  }))
}));

describe('bodyMetricStore', () => {
  beforeEach(() => {
    useBodyMetricStore.getState().clearMetrics();
  });

  it('should initialize with empty metrics list', () => {
    const state = useBodyMetricStore.getState();
    expect(state.metrics).toEqual([]);
    expect(state.getLatestMetric()).toBeNull();
  });

  it('should add body metrics and sort them newest first', () => {
    const store = useBodyMetricStore.getState();
    
    const dateOld = new Date('2026-06-01T10:00:00.000Z');
    const dateNew = new Date('2026-06-02T10:00:00.000Z');

    store.addMetric({
      recordedAt: dateOld,
      weightKg: 80.5,
      bodyFatPercentage: 15.2,
    });

    store.addMetric({
      recordedAt: dateNew,
      weightKg: 80.0,
      bodyFatPercentage: 15.0,
    });

    const updatedState = useBodyMetricStore.getState();
    expect(updatedState.metrics.length).toBe(2);
    // Newest should be first
    expect(updatedState.metrics[0]?.recordedAt).toEqual(dateNew);
    expect(updatedState.metrics[1]?.recordedAt).toEqual(dateOld);
    
    // Test getLatestMetric
    const latest = updatedState.getLatestMetric();
    expect(latest).not.toBeNull();
    expect(latest?.weightKg).toBe(80.0);
  });

  it('should return correct metric history sorted oldest first', () => {
    const store = useBodyMetricStore.getState();
    
    const d1 = new Date('2026-06-01T10:00:00.000Z');
    const d2 = new Date('2026-06-02T10:00:00.000Z');
    const d3 = new Date('2026-06-03T10:00:00.000Z');

    // Add oldest first, but store sorts descending automatically
    store.addMetric({ recordedAt: d1, weightKg: 80 });
    store.addMetric({ recordedAt: d2, bodyFatPercentage: 15 });
    store.addMetric({ recordedAt: d3, weightKg: 79, bodyFatPercentage: 14 });

    const weightHistory = store.getMetricHistory('weight');
    const fatHistory = store.getMetricHistory('fat');

    // History should filter out records without that value and sort oldest first (reverse)
    expect(weightHistory.length).toBe(2);
    expect(weightHistory[0]?.recordedAt).toEqual(d1);
    expect(weightHistory[1]?.recordedAt).toEqual(d3);

    expect(fatHistory.length).toBe(2);
    expect(fatHistory[0]?.recordedAt).toEqual(d2);
    expect(fatHistory[1]?.recordedAt).toEqual(d3);
  });

  it('should delete metric correctly', () => {
    const store = useBodyMetricStore.getState();
    store.addMetric({
      recordedAt: new Date(),
      weightKg: 70,
    });

    const added = useBodyMetricStore.getState().metrics[0]!;
    expect(added).toBeDefined();

    store.deleteMetric(added.id);
    expect(useBodyMetricStore.getState().metrics.length).toBe(0);
  });
});
