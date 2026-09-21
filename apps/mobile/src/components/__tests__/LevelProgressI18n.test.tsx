import React from 'react';
import { render, act } from '@testing-library/react-native';
import { ThemeProvider } from '@fitness-tracker/ui';
import { LevelProgress } from '../LevelProgress';
import { useProfileStore } from '../../stores/profileStore';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

describe('LevelProgress i18n and progression parity', () => {
  beforeEach(() => {
    act(() => {
      useProfileStore.setState({
        profile: {
          displayName: 'Athlete',
          language: 'de',
          preferredUnits: 'metric',
        },
      });
    });
  });

  it('renders German level, XP remaining, and next rank strings', () => {
    const { getByText } = render(
      <ThemeProvider>
        <LevelProgress level={1} xp={0} />
      </ThemeProvider>,
    );

    expect(getByText('Level 1 · Rang 1 (Novice Lifter)')).toBeTruthy();
    expect(getByText('0 / 1000 XP · 1000 bis Level 2')).toBeTruthy();
    expect(
      getByText('Rank 1 (Lvl 1–5) · Nächster Rank bei Level 6'),
    ).toBeTruthy();
  });

  it('renders English level, XP remaining, and next rank strings', () => {
    act(() => {
      useProfileStore.setState({
        profile: {
          displayName: 'Athlete',
          language: 'en',
          preferredUnits: 'imperial',
        },
      });
    });
    const { getByText } = render(
      <ThemeProvider>
        <LevelProgress level={1} xp={0} />
      </ThemeProvider>,
    );

    expect(getByText('Level 1 · Rank 1 (Novice Lifter)')).toBeTruthy();
    expect(getByText('0 / 1000 XP · 1000 to Level 2')).toBeTruthy();
    expect(
      getByText('Rank 1 (Lvl 1–5) · Next rank at Level 6'),
    ).toBeTruthy();
  });

  it('renders max rank reached in both German and English', () => {
    // German max rank
    act(() => {
      useProfileStore.setState({
        profile: { displayName: 'Master', language: 'de', preferredUnits: 'metric' },
      });
    });
    const { getByText, rerender } = render(
      <ThemeProvider>
        <LevelProgress level={50} xp={519400} />
      </ThemeProvider>,
    );
    expect(getByText('Max Rank 10 (EVARO Master) erreicht')).toBeTruthy();

    // English max rank
    act(() => {
      useProfileStore.setState({
        profile: { displayName: 'Master', language: 'en', preferredUnits: 'imperial' },
      });
    });
    rerender(
      <ThemeProvider>
        <LevelProgress level={50} xp={519400} />
      </ThemeProvider>,
    );
    expect(getByText('Max Rank 10 (EVARO Master) reached')).toBeTruthy();
  });
});
