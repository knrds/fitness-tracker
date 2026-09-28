import React from 'react';
import * as ReactNative from 'react-native';
import { fireEvent, render, within } from '@testing-library/react-native';
import { DialogProvider, ThemeProvider } from '@fitness-tracker/ui';
import WorkoutSessionScreen from '../../../../app/workout/session';
import { useWorkoutStore } from '../../../stores/workoutStore';
import { useProfileStore } from '../../../stores/profileStore';
import { useCaffeineStore } from '../../../stores/caffeineStore';

jest.mock('expo-router', () => ({
  useRouter: () => ({ navigate: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  Stack: { Screen: () => null },
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));
jest.mock('../SessionExerciseCard', () => ({ SessionExerciseCard: () => null }));
jest.mock('../RestTimer', () => ({ RestTimer: () => null }));
jest.mock('../ExercisePickerModal', () => ({ ExercisePickerModal: () => null }));
jest.mock('../SaveTemplateModal', () => ({ SaveTemplateModal: () => null }));

const workoutName = 'Oberkörper mit einem besonders langen Trainingsnamen';

function renderSession(width: number, fontScale: number) {
  jest.spyOn(ReactNative.Dimensions, 'get').mockReturnValue({
    width, height: 844, scale: 3, fontScale,
  });
  return render(
    <ThemeProvider>
      <DialogProvider>
        <WorkoutSessionScreen />
      </DialogProvider>
    </ThemeProvider>,
  );
}

beforeEach(() => {
  useWorkoutStore.setState({
    status: 'active', name: workoutName, exercises: [], notes: '',
    isMinimized: false, startedAt: new Date(), pausedAt: undefined,
    accumulatedPauseMs: 0,
  });
  useProfileStore.setState({
    profile: { ...useProfileStore.getState().profile, language: 'de' },
  });
  useCaffeineStore.setState({ isEnabled: false });
});

afterEach(() => jest.restoreAllMocks());

it.each([[320, 1], [390, 2]])(
  'gives the title and timer their own row at %i px and font scale %i',
  (width, fontScale) => {
    const screen = renderSession(width, fontScale);
    const actions = screen.getByTestId('workout-session-actions');
    expect(within(actions).queryByText(workoutName)).toBeNull();
    expect(screen.getByText(workoutName).props.numberOfLines).toBe(2);
    expect(screen.getByRole('button', { name: 'Beenden' })).toBeTruthy();
    const header = screen.getByTestId('workout-session-header');
    expect(ReactNative.StyleSheet.flatten(header.props.style).height).toBeUndefined();

    fireEvent(header, 'layout', { nativeEvent: { layout: { width, height: 265, x: 0, y: 0 } } });
    const contentStyle = ReactNative.StyleSheet.flatten(
      screen.getByTestId('workout-session-content').props.contentContainerStyle,
    );
    expect(contentStyle.paddingTop).toBe(281);
    // Rotation or reducing font size must also release the obsolete large clearance.
    fireEvent(header, 'layout', { nativeEvent: { layout: { width, height: 190, x: 0, y: 0 } } });
    expect(ReactNative.StyleSheet.flatten(
      screen.getByTestId('workout-session-content').props.contentContainerStyle,
    ).paddingTop).toBe(206);
  },
);

it('keeps the normal desktop header on one row', () => {
  const screen = renderSession(1024, 1);
  const actions = screen.getByTestId('workout-session-actions');
  expect(within(actions).getByText(workoutName)).toBeTruthy();
  expect(screen.getByText(workoutName).props.numberOfLines).toBe(1);
});
