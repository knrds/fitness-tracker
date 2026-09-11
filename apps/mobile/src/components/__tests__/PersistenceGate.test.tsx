import React from 'react';
import { Text } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { DialogProvider, ThemeProvider } from '@fitness-tracker/ui';
import { PersistenceGate } from '../PersistenceGate';
import { useStorageHealth } from '../../stores/storageHealth';
import { useAuthStore } from '../../stores/authStore';

let mockReady = false;
let mockHydrationListener: (() => void) | undefined;
jest.mock('../../stores/persistenceLifecycle', () => ({
  isPersistenceReady: () => mockReady,
  subscribeToHydration: (listener: () => void) => {
    mockHydrationListener = listener;
    return () => {
      mockHydrationListener = undefined;
    };
  },
  retryHydration: async () => {
    mockReady = true;
    jest
      .requireActual<typeof import('../../stores/storageHealth')>('../../stores/storageHealth')
      .useStorageHealth.getState()
      .clear('workout-storage');
    mockHydrationListener?.();
  },
}));

const mount = () =>
  render(
    <ThemeProvider>
      <DialogProvider>
        <PersistenceGate>
          <Text>Training controls</Text>
        </PersistenceGate>
      </DialogProvider>
    </ThemeProvider>,
  );
beforeEach(() => {
  mockReady = false;
  useAuthStore.setState(useAuthStore.getInitialState(), true);
  useStorageHealth.setState({ blockedStores: [], writeError: false });
});

it('hides training controls throughout an account transition even when stores were previously ready', () => {
  mockReady = true;
  useAuthStore.setState({ isInitialized: true, isSwitchingAccount: true });
  const screen = mount();
  expect(screen.queryByText('Training controls')).toBeNull();
  act(() => useAuthStore.setState({ isSwitchingAccount: false }));
  expect(screen.getByText('Training controls')).toBeTruthy();
});

it('keeps training actions unavailable until every store has hydrated', () => {
  const screen = mount();
  expect(screen.queryByText('Training controls')).toBeNull();
  act(() => {
    mockReady = true;
    mockHydrationListener?.();
  });
  expect(screen.getByText('Training controls')).toBeTruthy();
});
it('shows a protected recovery state and retries loading without deleting data', async () => {
  useStorageHealth.getState().block('workout-storage');
  const screen = mount();
  expect(screen.getByText('Gespeicherte Daten prüfen')).toBeTruthy();
  expect(screen.queryByText('Training controls')).toBeNull();
  fireEvent.press(screen.getByLabelText('Gespeicherte Daten erneut laden'));
  await waitFor(() => expect(screen.getByText('Training controls')).toBeTruthy());
});
it('reports a failed set write while preserving the mounted workout', async () => {
  mockReady = true;
  const screen = mount();
  act(() => useStorageHealth.getState().reportWriteError());
  await waitFor(() => expect(screen.getByText('Änderung nicht gespeichert')).toBeTruthy());
  // The workout stays mounted underneath the dialog, preserving edit context.
  expect(screen.getByText('Training controls', { includeHiddenElements: true })).toBeTruthy();
});
