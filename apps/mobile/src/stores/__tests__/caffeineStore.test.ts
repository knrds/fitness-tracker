import {
  CAFFEINE_PRESETS,
  getCaffeineWarningLevel,
  useCaffeineStore,
} from '../caffeineStore';

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    set: jest.fn(),
    getString: jest.fn(),
    delete: jest.fn(),
  })),
}));

describe('caffeineStore', () => {
  beforeEach(() => {
    useCaffeineStore.setState({ isEnabled: true, currentWorkoutMg: 0, lastWorkoutMg: 0 });
  });

  it('adds preset and custom caffeine amounts', () => {
    useCaffeineStore.getState().addPreset('espresso');
    useCaffeineStore.getState().addCustomAmount(37.4);

    expect(useCaffeineStore.getState().currentWorkoutMg).toBe(100);
  });

  it('ignores unknown presets and clamps negative custom input', () => {
    useCaffeineStore.getState().addPreset('unknown');
    useCaffeineStore.getState().addCustomAmount(-50);

    expect(useCaffeineStore.getState().currentWorkoutMg).toBe(0);
  });

  it('captures the finished workout caffeine amount for the completion modal', () => {
    useCaffeineStore.getState().setCurrentWorkoutMg(420);
    useCaffeineStore.getState().captureFinishedWorkout();

    expect(useCaffeineStore.getState().lastWorkoutMg).toBe(420);
  });

  it('exposes warning thresholds for high and extreme caffeine intake', () => {
    expect(getCaffeineWarningLevel(399)).toBe('normal');
    expect(getCaffeineWarningLevel(400)).toBe('high');
    expect(getCaffeineWarningLevel(600)).toBe('extreme');
    expect(CAFFEINE_PRESETS.some((preset) => preset.category === 'preworkout')).toBe(true);
  });
});
