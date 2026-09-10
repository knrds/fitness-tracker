import { getResumeWorkoutDecision } from '../resumeWorkoutGuard';

describe('getResumeWorkoutDecision', () => {
  const now = new Date('2026-06-11T12:00:00.000Z').getTime();

  it('ignores non-active workout statuses', () => {
    expect(
      getResumeWorkoutDecision({
        status: 'idle',
        startedAt: new Date(now - 60_000),
        exercises: [{}],
        now,
      }),
    ).toBe('ignore');
  });

  it('preserves empty or invalid active workout state by prompting', () => {
    expect(
      getResumeWorkoutDecision({
        status: 'active',
        startedAt: 'not-a-date',
        exercises: [{}],
        now,
      }),
    ).toBe('prompt');

    expect(
      getResumeWorkoutDecision({
        status: 'paused',
        startedAt: new Date(now - 60_000),
        exercises: [],
        name: '  ',
        notes: '',
        now,
      }),
    ).toBe('prompt');
  });

  it('preserves stale sessions and prompts for real unfinished sessions', () => {
    expect(
      getResumeWorkoutDecision({
        status: 'active',
        startedAt: new Date(now - 13 * 60 * 60 * 1000),
        exercises: [{ sets: [{ completed: true }] }],
        now,
      }),
    ).toBe('prompt');

    expect(
      getResumeWorkoutDecision({
        status: 'paused',
        startedAt: new Date(now - 30 * 60 * 1000),
        exercises: [{ sets: [{ completed: true }] }],
        name: 'Paused workout',
        now,
      }),
    ).toBe('prompt');
  });

  it('preserves active workout sessions with no completed sets', () => {
    expect(
      getResumeWorkoutDecision({
        status: 'active',
        startedAt: new Date(now - 30 * 60 * 1000),
        exercises: [{ sets: [{ completed: false }] }],
        now,
      }),
    ).toBe('prompt');
  });
});
