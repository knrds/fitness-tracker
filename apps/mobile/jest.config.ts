import type { Config } from 'jest';
import path from 'path';

const resolvePackageRoot = (packageName: string, fromPackageName: string) => {
  const fromPackageRoot = path.dirname(
    require.resolve(`${fromPackageName}/package.json`, { paths: [__dirname] }),
  );
  return path.dirname(
    require.resolve(`${packageName}/package.json`, {
      paths: [fromPackageRoot, __dirname],
    }),
  );
};

const assetsRegistryPath = path.join(
  resolvePackageRoot('@react-native/assets-registry', 'react-native'),
  'registry.js',
);

const config: Config = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['@testing-library/react-native/extend-expect'],
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
  moduleNameMapper: {
    '^@react-native/assets-registry/registry$': assetsRegistryPath,
    '^expo-asset$': resolvePackageRoot('expo-asset', 'expo'),
    '^expo-modules-core$': resolvePackageRoot('expo-modules-core', 'expo'),
  },
  // Expo/RN ship untranspiled ESM + Flow in node_modules and must be Babel-
  // transformed. Under pnpm, packages live in `node_modules/.pnpm/<name>@<ver>/`
  // (scoped names flattened with `+`), so the allow-list matches those prefixes.
  transformIgnorePatterns: [
    'node_modules/.pnpm/(?!(jest-)?react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@unimodules|unimodules|sentry-expo|native-base|@fitness-tracker)',
  ],
};

export default config;
