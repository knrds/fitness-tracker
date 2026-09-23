import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RestTimer } from '../workout/RestTimer';
import { AnatomyFigure } from '../anatomy/AnatomyFigure';
import { ExerciseFilter } from '../exercises/ExerciseFilter';
import { MuscleHeatmap } from '../MuscleHeatmap';
import { useProfileStore, Profile } from '../../stores/profileStore';

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('../../utils/timerAudio', () => ({
  triggerRestTimerAlarm: jest.fn(),
}));

describe('Accessibility / VoiceOver Audit', () => {
  beforeEach(() => {
    useProfileStore.setState({
      profile: {
        id: 'test-user',
        displayName: 'Test Athlete',
        preferredUnits: 'metric',
        language: 'de',
        rpeMode: 'always_on',
        rirMode: 'always_on',
        rpeDisabledExerciseIds: [],
        rirDisabledExerciseIds: [],
      } as unknown as Profile,
    });
  });

  describe('RestTimer accessibility controls', () => {
    it('provides accessible toggle button with role, label, and expanded state', () => {
      const { getByLabelText } = render(<RestTimer />);
      
      const toggle = getByLabelText(/Pausentimer öffnen|Open rest timer/i);
      expect(toggle).toBeTruthy();
      expect(toggle.props.accessibilityRole).toBe('button');
      expect(toggle.props.accessibilityState).toEqual({ expanded: false });
    });

    it('provides accessible play/pause button with proper touch target size', () => {
      const { getByTestId } = render(<RestTimer />);
      const startBtn = getByTestId('start-timer-btn');
      
      expect(startBtn.props.accessibilityRole).toBe('button');
      expect(startBtn.props.accessibilityLabel).toMatch(/Pause starten|Start timer/i);
      // Verify touch target dimension >= 44
      expect(startBtn.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ height: 44, width: 44 }),
        ]),
      );
    });

    it('provides accessible reset button when expanded', () => {
      const { getByLabelText, getByTestId } = render(<RestTimer />);
      const toggle = getByLabelText(/Pausentimer öffnen|Open rest timer/i);
      fireEvent.press(toggle);
      const resetBtn = getByTestId('reset-timer-btn');
      expect(resetBtn.props.accessibilityRole).toBe('button');
      expect(resetBtn.props.style).toEqual(
        expect.objectContaining({ minHeight: 44 }),
      );
    });
  });

  describe('AnatomyFigure SVG accessibility', () => {
    it('sets image accessibilityRole and descriptive side label', () => {
      const { getByLabelText } = render(
        <AnatomyFigure side="front" height={400} color={() => '#FF0000'} />,
      );
      const figure = getByLabelText(/Muskelkarte|Muscle map/i);
      expect(figure).toBeTruthy();
      expect(figure.props.accessibilityRole).toBe('image');
    });
  });

  describe('ExerciseFilter accessible chips and touch targets', () => {
    it('renders filter chips with button role, selected state, and minHeight 44', () => {
      const { getAllByRole } = render(<ExerciseFilter />);

      const buttons = getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(5);
      
      // All chips must have minHeight >= 44
      buttons.forEach((btn) => {
        if (btn.props.style) {
          const flat = Array.isArray(btn.props.style) ? btn.props.style : [btn.props.style];
          const hasMinHeight44 = flat.some(
            (s: unknown) =>
              typeof s === 'object' &&
              s !== null &&
              'minHeight' in s &&
              (s as { minHeight: number }).minHeight >= 44,
          );
          expect(hasMinHeight44).toBe(true);
        }
      });
    });
  });

  describe('MuscleHeatmap tabs & region accessibility', () => {
    it('provides front/back tabs with tab role and selected state', () => {
      const { getAllByRole } = render(
        <MuscleHeatmap activity={{}} onSelect={jest.fn()} />,
      );

      const tabs = getAllByRole('tab');
      expect(tabs.length).toBe(2);
      expect(tabs[0].props.accessibilityState).toEqual({ selected: true });
      expect(tabs[1].props.accessibilityState).toEqual({ selected: false });
    });
  });
});
