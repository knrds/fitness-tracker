// Pulls in the type augmentation for React Native Testing Library's custom
// Jest matchers (toBeOnTheScreen, toHaveTextContent, …). The matchers are
// registered at runtime via setupFilesAfterEnv in jest.config.ts; this file
// makes their types visible to tsc for every test in the package.
import '@testing-library/react-native/extend-expect';
