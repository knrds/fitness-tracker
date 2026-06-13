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
    interpolate: (value, inputRange, outputRange) => {
      if (value <= inputRange[0]) {
        return outputRange[0];
      }

      const lastInputIndex = inputRange.length - 1;
      if (value >= inputRange[lastInputIndex]) {
        return outputRange[outputRange.length - 1];
      }

      const segmentIndex = inputRange.findIndex((inputValue, index) => {
        const nextValue = inputRange[index + 1];
        return nextValue !== undefined && value >= inputValue && value <= nextValue;
      });

      if (segmentIndex < 0) {
        return outputRange[0];
      }

      const inputStart = inputRange[segmentIndex];
      const inputEnd = inputRange[segmentIndex + 1];
      const outputStart = outputRange[segmentIndex];
      const outputEnd = outputRange[segmentIndex + 1];
      const progress = (value - inputStart) / (inputEnd - inputStart);
      return outputStart + (outputEnd - outputStart) * progress;
    },
  };
});

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
