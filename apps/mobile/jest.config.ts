import type { Config } from 'jest';

const config: Config = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js', '@testing-library/react-native/extend-expect'],
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
  // Expo/RN ship untranspiled ESM + Flow in node_modules and must be Babel-
  // transformed. Under pnpm, packages live in `node_modules/.pnpm/<name>@<ver>/`
  // (scoped names flattened with `+`), so the allow-list matches those prefixes.
  transformIgnorePatterns: [
    'node_modules/.pnpm/(?!(jest-)?react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@unimodules|unimodules|sentry-expo|native-base|@fitness-tracker)',
  ],
  moduleNameMapper: {
    '^react$': '<rootDir>/node_modules/react',
    '^react/(.*)$': '<rootDir>/node_modules/react/$1',
    '^@react-native/assets-registry/(.*)$':
      '<rootDir>/node_modules/@react-native/assets-registry/$1',
  },
};

export default config;
