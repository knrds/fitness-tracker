import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import {
  ThemeProvider,
  createTheme,
  COACH_COLORWAYS,
  Card,
  Button,
  PremiumSurface,
  PremiumMotif,
  PremiumEffect,
  calendarVisual,
  heatmapColor,
} from '@fitness-tracker/ui';
import { WaterVessel } from '../WaterVessel';
import { AnatomyFigure } from '../anatomy/AnatomyFigure';
import { PremiumThemePreview } from '../PremiumThemePreview';
import { isColorwayUnlocked } from '../../utils/rewards';
import { useHistoryStore } from '../../stores/historyStore';
import { useHydrationStore } from '../../stores/hydrationStore';

const animated = jest.requireMock('react-native-reanimated');
animated.withSequence = (...values: number[]) => values[values.length - 1];

for (const id of COACH_COLORWAYS) {
  it(`${id}: renders shared materials, accessible controls and signature variants without changing training data`, () => {
    const theme = createTheme(id);
    const before = {
      sessions: useHistoryStore.getState().sessions,
      hydration: useHydrationStore.getState(),
    };
    const pressed = jest.fn();
    const screen = render(
      <ThemeProvider colorway={id}>
        <Card>
          <Text>Real content</Text>
          <Button title="Train" onPress={pressed} />
        </Card>
        <PremiumMotif />
        <PremiumThemePreview theme={theme} />
        <WaterVessel progress={0.65} />
        <AnatomyFigure height={180} color={() => theme.anatomy.heat[3]!} />
      </ThemeProvider>,
    );
    expect(screen.getByText('Real content')).toBeTruthy();
    fireEvent.press(screen.getByText('Train'));
    expect(pressed).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId(`hydration-${theme.premium!.hydrationVariant}`)).toBeTruthy();
    expect(screen.getByTestId(`anatomy-${theme.premium!.heatmapVariant}`)).toBeTruthy();
    expect(screen.getByTestId(`preview-${theme.premium!.surfaceVariant}`)).toBeTruthy();
    expect(theme.anatomy.heat[3]).toBe(theme.premium!.heat[3]);
    expect(heatmapColor(theme, 20, 20)).toBe(theme.premium!.heat[3]);
    expect(heatmapColor(theme, 0, 20)).toBe(theme.anatomy.base);
    expect(heatmapColor(theme, 5, 20)).toBe(theme.premium!.heat[1]);
    expect(theme.colors.error).toBe(createTheme('glacier').colors.error);
    expect(useHistoryStore.getState().sessions).toBe(before.sessions);
    expect(useHydrationStore.getState()).toBe(before.hydration);
    screen.unmount();
  });
}

it('keeps decorations non-interactive and optional motion static when reduced', () => {
  const previous = animated.useReducedMotion;
  animated.useReducedMotion = () => true;
  const timing = jest.spyOn(animated, 'withTiming');
  try {
    const screen = render(
      <ThemeProvider colorway="cherry">
        <PremiumSurface colors={['#FFFFFF', '#FFF0F4']} />
        <PremiumEffect trigger={2} />
      </ThemeProvider>,
    );
    expect(
      screen.getByTestId('premium-surface', { includeHiddenElements: true }).props.pointerEvents,
    ).toBe('none');
    expect(
      screen.getByTestId('premium-effect', { includeHiddenElements: true }).props.pointerEvents,
    ).toBe('none');
    expect(timing).not.toHaveBeenCalled();
    screen.unmount();
  } finally {
    timing.mockRestore();
    animated.useReducedMotion = previous;
  }
});

it('uses distinct calendar materials, differentiating today and record rings', () => {
  for (const id of COACH_COLORWAYS) {
    const theme = createTheme(id);
    const state = { count: 1, selected: false, today: false };
    expect(calendarVisual(theme, { ...state, record: true }).borderColor).toBe(
      theme.premium!.highlight,
    );
    expect(calendarVisual(theme, { ...state, today: true }).borderColor).toBe(theme.colors.text);
  }
  expect(
    calendarVisual(createTheme('mocha'), { count: 1, selected: false, today: false }).borderRadius,
  ).toBe(22);
  expect(
    calendarVisual(createTheme('glacier'), { count: 1, selected: false, today: false }),
  ).toEqual({});
});

it('Gotham is an ordinary level-20 unlock and has no Coach visual capabilities', () => {
  expect(createTheme('gotham').premium).toBeUndefined();
  expect(COACH_COLORWAYS).not.toContain('gotham');
  expect(isColorwayUnlocked('gotham', 19)).toBe(false);
  expect(isColorwayUnlocked('gotham', 20)).toBe(true);
});

function luminance(hex: string) {
  const rgb = hex
    .slice(1)
    .match(/../g)!
    .map((value) => {
      const v = parseInt(value, 16) / 255;
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
  return rgb[0]! * 0.2126 + rgb[1]! * 0.7152 + rgb[2]! * 0.0722;
}
function contrast(a: string, b: string) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0]! + 0.05) / (values[1]! + 0.05);
}
it('keeps premium text and primary button gradient endpoints at readable contrast', () => {
  for (const id of COACH_COLORWAYS) {
    const theme = createTheme(id);
    for (const surface of theme.premium!.surfaceGradient)
      expect(contrast(theme.colors.text, surface)).toBeGreaterThanOrEqual(4.5);
    for (const surface of theme.premium!.buttonGradient)
      expect(contrast('#FFFFFF', surface)).toBeGreaterThanOrEqual(4.5);
  }
});


it.each(['male', 'female'] as const)('keeps %s anatomy interactive with aligned accessories on both sides', (bodyVariant) => {
  for (const id of COACH_COLORWAYS) {
    const selected = jest.fn();
    const screen = render(<ThemeProvider colorway={id}><AnatomyFigure bodyVariant={bodyVariant} color={() => '#8B5CF6'} onSelect={selected} /></ThemeProvider>);
    fireEvent.press(screen.getAllByTestId(/^anatomy-region-chest-/)[0]!);
    expect(selected).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId(`anatomy-body-${bodyVariant}-front`)).toBeTruthy();
    screen.rerender(<ThemeProvider colorway={id}><AnatomyFigure bodyVariant={bodyVariant} side="back" color={() => '#8B5CF6'} onSelect={selected} /></ThemeProvider>);
    expect(screen.getByTestId(`anatomy-body-${bodyVariant}-back`)).toBeTruthy();
    if (id === 'bordeaux') expect(screen.getByTestId('anatomy-cape')).toBeTruthy();
    if (id === 'mocha') expect(screen.getByTestId('anatomy-iced-coffee')).toBeTruthy();
    if (id === 'cherry') expect(screen.getByTestId('anatomy-cherry-basket')).toBeTruthy();
    screen.unmount();
  }
});

it('uses quieter default surfaces while reserving distinct motif variations for selected cards', () => {
  const screen = render(<ThemeProvider colorway="bordeaux"><Card><Text>Quiet</Text></Card><Card materialVariation="detail"><Text>Moon</Text></Card><Card materialVariation="signature"><Text>Tracery</Text></Card></ThemeProvider>);
  expect(screen.queryByTestId('premium-material-thread-quiet', { includeHiddenElements: true })).toBeNull();
  expect(screen.getByTestId('premium-material-thread-detail', { includeHiddenElements: true })).toBeTruthy();
  expect(screen.getByTestId('premium-material-thread-signature', { includeHiddenElements: true })).toBeTruthy();
});
