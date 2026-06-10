jest.mock('react-native-reanimated', () => {
  const { Animated } = require('react-native');
  const immediate = (value) => value;

  return {
    __esModule: true,
    default: Animated,
    Easing: {
      linear: immediate,
      quad: immediate,
      out: immediate,
    },
    runOnJS: (fn) => fn,
    useAnimatedStyle: (updater) => updater(),
    useEvent: (handler) => handler,
    useSharedValue: (value) => ({ value }),
    withDelay: (_delay, value) => value,
    withSpring: immediate,
    withTiming: immediate,
  };
});

jest.mock(
  '@react-native-async-storage/async-storage',
  () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
