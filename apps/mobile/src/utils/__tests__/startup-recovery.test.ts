import { inspectStartupState } from '../startup-recovery';

describe('startup hydration boundary', () => {
  it('inspects an already hydrated idle state once, not later workouts', () => {
    let listener!: () => void;
    const inspect = jest.fn();
    const unsubscribe = jest.fn();
    const cleanup = inspectStartupState(
      {
        hasHydrated: () => true,
        onFinishHydration: (callback) => {
          listener = callback;
          return unsubscribe;
        },
      },
      inspect,
    );
    listener();
    expect(inspect).toHaveBeenCalledTimes(1);
    cleanup();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
  it('waits for asynchronous storage instead of inspecting defaults', () => {
    let listener!: () => void;
    const inspect = jest.fn();
    inspectStartupState(
      {
        hasHydrated: () => false,
        onFinishHydration: (callback) => {
          listener = callback;
          return () => {};
        },
      },
      inspect,
    );
    expect(inspect).not.toHaveBeenCalled();
    listener();
    expect(inspect).toHaveBeenCalledTimes(1);
  });
});
