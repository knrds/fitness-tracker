import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { ThemeProvider } from '@fitness-tracker/ui';
import WorkoutsScreen from '../../../app/(tabs)/workouts';
import { getDefaultTemplates, useProgramStore } from '../../stores/programStore';

let mockLanguage = 'en';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => ({}),
  useFocusEffect: jest.fn(),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@fitness-tracker/ui', () => ({
  ...jest.requireActual('@fitness-tracker/ui'),
  useDialog: () => ({ showConfirm: jest.fn() }),
}));
jest.mock('../../i18n', () => ({
  useI18n: () => ({ language: mockLanguage, t: (key: string) => key }),
}));
jest.mock('../../../app/(tabs)/programs', () => () => null);
jest.mock('../workout/WorkoutPreviewModal', () => ({
  WorkoutPreviewModal: () => null,
  templateToPreviewModel: jest.fn(),
}));
jest.mock('../../stores/workoutStore', () => ({
  useWorkoutStore: () => ({ status: 'idle', startWorkout: jest.fn(), startWorkoutFromTemplate: jest.fn() }),
}));
jest.mock('../../stores/historyStore', () => ({ useHistoryStore: () => ({ sessions: [] }) }));
jest.mock('../../stores/exerciseStore', () => ({ useExerciseStore: () => ({ exercises: [] }) }));
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({ set: jest.fn(), getString: jest.fn(), delete: jest.fn() })),
}));

beforeEach(() => {
  mockLanguage = 'en';
  const defaults = getDefaultTemplates();
  useProgramStore.setState({
    templates: [
      { ...defaults[0]!, name: 'Folder workout', folder: 'Upper' },
      { ...defaults[1]!, name: 'Unassigned workout' },
      { ...defaults[2]!, name: 'Individually hidden workout', folder: 'Upper' },
    ],
    customFolders: ['Upper'],
    expandedFolders: {},
    hiddenFolderNames: [],
    hiddenTemplateIds: [defaults[2]!.id],
    programs: [],
  });
});

it('hides the folder and its top-card templates, then restores them through Show hidden', () => {
  const screen = render(<ThemeProvider><WorkoutsScreen /></ThemeProvider>);
  const templates = useProgramStore.getState().templates;
  expect(screen.getAllByText('Folder workout')).toHaveLength(2);
  fireEvent.press(screen.getByRole('button', { name: 'Hide folder: Upper' }), { stopPropagation: jest.fn() });
  expect(screen.queryByText('UPPER')).toBeNull();
  expect(screen.queryByText('Folder workout')).toBeNull();
  expect(screen.getAllByText('Unassigned workout').length).toBeGreaterThan(0);
  expect(useProgramStore.getState().templates).toBe(templates);

  fireEvent.press(screen.getByRole('switch', { name: 'Show hidden templates and folders' }));
  expect(screen.getByText('UPPER')).toBeTruthy();
  expect(screen.getAllByText('Folder workout').length).toBeGreaterThan(0);
  fireEvent.press(screen.getByRole('button', { name: 'Show folder: Upper' }), { stopPropagation: jest.fn() });
  fireEvent.press(screen.getByRole('switch', { name: 'Show hidden templates and folders' }));
  expect(screen.getByText('UPPER')).toBeTruthy();
  expect(screen.getAllByText('Folder workout')).toHaveLength(2);
  expect(screen.queryByText('Individually hidden workout')).toBeNull();
  expect(useProgramStore.getState().hiddenFolderNames).toEqual([]);
});

it('keeps folders hidden after remount and offers the localized menu action', () => {
  mockLanguage = 'de';
  act(() => useProgramStore.getState().setFolderHidden('Upper', true));
  const screen = render(<ThemeProvider><WorkoutsScreen /></ThemeProvider>);
  expect(screen.queryByText('UPPER')).toBeNull();
  fireEvent.press(screen.getByRole('switch', { name: 'Ausgeblendete Vorlagen und Ordner anzeigen' }));
  fireEvent.press(screen.getByRole('button', { name: 'Ordneroptionen: Upper' }), { stopPropagation: jest.fn() });
  fireEvent.press(screen.getByText('Ordner einblenden'));
  expect(useProgramStore.getState().hiddenFolderNames).toEqual([]);
  expect(screen.getByRole('button', { name: 'Ordner ausblenden: Upper' })).toBeTruthy();
});
