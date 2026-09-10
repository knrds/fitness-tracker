import { getResumeWorkoutDecision } from '../resumeWorkoutGuard';

describe('workout recovery must preserve user input', () => {
  it.each([
    { startedAt: new Date(0), exercises: [{ sets: [{ completed: true }] }] },
    { startedAt: new Date(), exercises: [{ sets: [{ completed: false }] }] },
    { startedAt: 'broken timestamp', exercises: [{ sets: [{ completed: true }] }] },
    { startedAt: new Date(), exercises: [] },
  ])('offers recovery instead of deleting active input: %j', (fixture) => {
    expect(getResumeWorkoutDecision({ status: 'active', ...fixture })).toBe('prompt');
  });
});
