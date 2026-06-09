import { formatDateLocal } from '@fitness-tracker/domain';

import { useHydrationStore } from '../hydrationStore';

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    set: jest.fn(),
    getString: jest.fn(),
    delete: jest.fn(),
  })),
}));

describe('hydrationStore', () => {
  beforeEach(() => {
    useHydrationStore.setState({
      dateKey: formatDateLocal(new Date()),
      dailyGoalMl: 2500,
      todayIntakeMl: 0,
    });
  });

  it('adds water and rounds the amount', () => {
    useHydrationStore.getState().addWater(249.6);
    useHydrationStore.getState().addWater(500);

    expect(useHydrationStore.getState().todayIntakeMl).toBe(750);
  });

  it('keeps a minimum daily goal of 250 ml', () => {
    useHydrationStore.getState().setDailyGoal(100);

    expect(useHydrationStore.getState().dailyGoalMl).toBe(250);
  });

  it('removes water without going below zero', () => {
    useHydrationStore.getState().addWater(500);
    useHydrationStore.getState().removeWater(250);
    useHydrationStore.getState().removeWater(1000);

    expect(useHydrationStore.getState().todayIntakeMl).toBe(0);
  });

  it('resets stale persisted intake when the local date changes', () => {
    useHydrationStore.setState({
      dateKey: '2026-01-01',
      dailyGoalMl: 3000,
      todayIntakeMl: 1500,
    });

    useHydrationStore.getState().addWater(250);

    expect(useHydrationStore.getState().dateKey).toBe(formatDateLocal(new Date()));
    expect(useHydrationStore.getState().todayIntakeMl).toBe(250);
    expect(useHydrationStore.getState().dailyGoalMl).toBe(3000);
  });
});
