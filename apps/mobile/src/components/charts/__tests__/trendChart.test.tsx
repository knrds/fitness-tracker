import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@fitness-tracker/ui';
import { TrendChart, monotonePath, niceTicks } from '../TrendChart';
import { filterByRange } from '../ChartRangePicker';

describe('TrendChart geometry', () => {
  it('produces round axis steps', () => {
    expect(niceTicks(72.4, 81.9)).toEqual([72.5, 75, 77.5, 80]);
    expect(niceTicks(0, 1000)).toEqual([0, 250, 500, 750, 1000]);
    expect(niceTicks(60, 68)).toEqual([60, 62, 64, 66, 68]);
    expect(niceTicks(-0.4, 0.6)).toContain(0);
    expect(niceTicks(5, 5)).toEqual([5]);
  });

  it('never overshoots between monotone readings', () => {
    const path = monotonePath([
      [0, 100],
      [10, 50],
      [20, 50],
      [30, 0],
    ]);
    const ys = [...path.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map((m) => Number(m[2]));
    expect(Math.max(...ys)).toBeLessThanOrEqual(100);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
    expect(monotonePath([[4, 2]])).toBe('M4,2');
  });

  it('filters trailing ranges without mutating the source', () => {
    const now = new Date(2026, 9, 22).getTime();
    const items = [now - 200 * 86_400_000, now - 40 * 86_400_000, now - 2 * 86_400_000];
    expect(filterByRange(items, '1m', (t) => t, now)).toEqual([items[2]]);
    expect(filterByRange(items, '3m', (t) => t, now)).toHaveLength(2);
    expect(filterByRange(items, 'all', (t) => t, now)).toEqual(items);
  });

  it('exposes an adjustable, labelled chart for screen readers', () => {
    const screen = render(
      <ThemeProvider>
        <TrendChart
          testID="chart"
          points={[
            { t: 1, y: 80 },
            { t: 2, y: 82, highlight: true },
          ]}
          locale="de"
          formatValue={(v) => `${v}`}
          accessibilityLabel="Körpergewicht: 80 → 82 kg"
        />
      </ThemeProvider>,
    );
    const chart = screen.getByTestId('chart');
    expect(chart.props.accessibilityRole).toBe('adjustable');
    expect(chart.props.accessibilityLabel).toBe('Körpergewicht: 80 → 82 kg');
  });
});
