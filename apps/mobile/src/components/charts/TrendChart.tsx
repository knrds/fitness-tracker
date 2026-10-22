import React, { useEffect, useId, useMemo, useState } from 'react';
import { LayoutChangeEvent, Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme, withAlpha } from '@fitness-tracker/ui';
import { hapticFeedback } from '../../utils/haptics';

export interface TrendPoint {
  /** Timestamp in ms. Points must be sorted ascending. */
  t: number;
  y: number;
  /** Drawn as a record marker (e.g. a PR). */
  highlight?: boolean;
  /** Extra text for the tooltip of this point. */
  note?: string;
}

export interface TrendChartProps {
  points: readonly TrendPoint[];
  height?: number;
  color?: string;
  locale: 'de' | 'en';
  formatValue: (value: number) => string;
  /** Optional dashed reference line, e.g. a target weight. */
  goal?: number | null;
  goalLabel?: string;
  selectedIndex?: number | null;
  onSelect?: (index: number | null) => void;
  accessibilityLabel: string;
  testID?: string;
}

const PAD = { top: 16, right: 14, bottom: 26 };
const DAY = 86_400_000;

/** "Nice" axis steps (1, 2, 2.5, 5 × 10^n) so labels read as round numbers. */
export function niceTicks(min: number, max: number, target = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (min === max) return [min];
  const raw = (max - min) / target;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  let step = 10 * pow;
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (raw <= m * pow) {
      step = m * pow;
      break;
    }
  }
  const ticks: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) {
    ticks.push(Math.round(v / step) * step || 0);
  }
  return ticks;
}

/** Monotone cubic interpolation: smooth, but never overshoots between real readings. */
export function monotonePath(xy: readonly [number, number][]): string {
  const n = xy.length;
  if (n === 0) return '';
  if (n === 1) return `M${xy[0]![0]},${xy[0]![1]}`;
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = xy[i + 1]![0] - xy[i]![0];
    slope[i] = dx[i] === 0 ? 0 : (xy[i + 1]![1] - xy[i]![1]) / dx[i]!;
  }
  const tangent: number[] = [slope[0]!];
  for (let i = 1; i < n - 1; i++) {
    const a = slope[i - 1]!;
    const b = slope[i]!;
    tangent[i] = a * b <= 0 ? 0 : (3 * (dx[i - 1]! + dx[i]!)) / ((2 * dx[i]! + dx[i - 1]!) / a + (dx[i]! + 2 * dx[i - 1]!) / b);
  }
  tangent[n - 1] = slope[n - 2]!;
  let d = `M${xy[0]![0].toFixed(1)},${xy[0]![1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = xy[i]!;
    const [x1, y1] = xy[i + 1]!;
    const h = dx[i]! / 3;
    d += ` C${(x0 + h).toFixed(1)},${(y0 + tangent[i]! * h).toFixed(1)} ${(x1 - h).toFixed(1)},${(y1 - tangent[i + 1]! * h).toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
  }
  return d;
}

export function TrendChart({
  points,
  height = 200,
  color,
  locale,
  formatValue,
  goal = null,
  goalLabel,
  selectedIndex: controlledIndex,
  onSelect,
  accessibilityLabel,
  testID,
}: TrendChartProps) {
  const theme = useTheme();
  const c = theme.colors;
  const stroke = color ?? theme.chart.line;
  const gradientId = `trend-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [width, setWidth] = useState(0);
  const [internalIndex, setInternalIndex] = useState<number | null>(null);
  const [tipWidth, setTipWidth] = useState(0);
  const selected = controlledIndex !== undefined ? controlledIndex : internalIndex;

  // A new dataset has different coordinates; never carry an old selection into it.
  useEffect(() => {
    setInternalIndex(null);
  }, [points]);

  const geometry = useMemo(() => {
    if (points.length === 0 || width <= 0) return null;
    const ys = points.map((p) => p.y);
    let ymin = Math.min(...ys);
    let ymax = Math.max(...ys);
    if (goal != null && Number.isFinite(goal)) {
      ymin = Math.min(ymin, goal);
      ymax = Math.max(ymax, goal);
    }
    if (ymin === ymax) {
      ymin -= Math.max(1, Math.abs(ymin) * 0.05);
      ymax += Math.max(1, Math.abs(ymax) * 0.05);
    }
    const pad = (ymax - ymin) * 0.14;
    ymin -= pad;
    ymax += pad;
    const ticks = niceTicks(ymin, ymax).filter((v) => v >= ymin && v <= ymax);
    const labelChars = Math.max(...ticks.map((v) => formatValue(v).length), 2);
    const left = Math.min(56, 10 + labelChars * 6.4);
    const t0 = points[0]!.t;
    const t1 = points[points.length - 1]!.t;
    const plotW = Math.max(1, width - left - PAD.right);
    const plotH = Math.max(1, height - PAD.top - PAD.bottom);
    const X = (t: number) => (t1 === t0 ? left + plotW / 2 : left + ((t - t0) / (t1 - t0)) * plotW);
    const Y = (y: number) => PAD.top + (1 - (y - ymin) / (ymax - ymin)) * plotH;
    const xy = points.map((p) => [X(p.t), Y(p.y)] as [number, number]);

    const span = t1 - t0;
    const dateFmt = new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
      day: 'numeric',
      month: 'short',
    });
    const monthFmt = new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', { month: 'short' });
    const xTicks: { x: number; label: string; anchor: 'start' | 'middle' | 'end' }[] = [];
    if (span > 50 * DAY) {
      const first = new Date(t0);
      let m = new Date(first.getFullYear(), first.getMonth() + 1, 1);
      const months: Date[] = [];
      while (m.getTime() <= t1) {
        months.push(m);
        m = new Date(m.getFullYear(), m.getMonth() + 1, 1);
      }
      const every = Math.max(1, Math.ceil(months.length / Math.max(2, Math.floor(plotW / 56))));
      months.forEach((month, i) => {
        if (i % every) return;
        xTicks.push({ x: X(month.getTime()), label: monthFmt.format(month), anchor: 'middle' });
      });
    } else if (span > 0) {
      xTicks.push({ x: left, label: dateFmt.format(new Date(t0)), anchor: 'start' });
      if (plotW > 220) xTicks.push({ x: left + plotW / 2, label: dateFmt.format(new Date(t0 + span / 2)), anchor: 'middle' });
      xTicks.push({ x: left + plotW, label: dateFmt.format(new Date(t1)), anchor: 'end' });
    } else {
      xTicks.push({ x: left + plotW / 2, label: dateFmt.format(new Date(t0)), anchor: 'middle' });
    }
    return { X, Y, xy, ticks, xTicks, left, plotW, plotH, ymin };
  }, [points, width, height, goal, formatValue, locale]);

  const select = (index: number | null) => {
    if (index === selected) return;
    if (index !== null) void hapticFeedback.selection();
    if (controlledIndex === undefined) setInternalIndex(index);
    onSelect?.(index);
  };

  const indexAt = (x: number) => {
    if (!geometry) return null;
    let best = 0;
    geometry.xy.forEach(([px], i) => {
      if (Math.abs(px - x) < Math.abs(geometry.xy[best]![0] - x)) best = i;
    });
    return best;
  };

  // Horizontal scrubbing claims the gesture before the tab swipe; vertical drags keep scrolling.
  const scrub = Gesture.Pan()
    .activeOffsetX([-6, 6])
    .failOffsetY([-12, 12])
    .runOnJS(true)
    .onBegin((e) => select(indexAt(e.x)))
    .onUpdate((e) => select(indexAt(e.x)));
  const tap = Gesture.Tap().runOnJS(true).onEnd((e) => select(indexAt(e.x)));
  const gesture = Gesture.Race(scrub, tap);

  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));
  const active = selected != null && geometry ? geometry.xy[selected] : null;
  const activePoint = selected != null ? points[selected] : undefined;
  const dateFmtLong = new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const gridColor = withAlpha(c.muted, 0.22);
  const recordColor = theme.chart.record;
  // Individual readings stay legible on short series; long series read as one curve.
  const showDots = points.length <= 16;

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={
        activePoint
          ? { text: `${dateFmtLong.format(new Date(activePoint.t))}: ${formatValue(activePoint.y)}` }
          : undefined
      }
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => {
        const last = points.length - 1;
        const current = selected ?? last;
        if (event.nativeEvent.actionName === 'increment') select(Math.min(last, current + 1));
        if (event.nativeEvent.actionName === 'decrement') select(Math.max(0, current - 1));
      }}
      onLayout={onLayout}
      style={{ width: '100%', height }}
    >
      {geometry && (
        <GestureDetector gesture={gesture}>
          <View style={StyleSheet.absoluteFill} collapsable={false}>
            <Svg width={width} height={height}>
              <Defs>
                <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={stroke} stopOpacity={0.3} />
                  <Stop offset="1" stopColor={stroke} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              {geometry.ticks.map((v) => (
                <React.Fragment key={`y${v}`}>
                  <Line
                    x1={geometry.left}
                    x2={geometry.left + geometry.plotW}
                    y1={geometry.Y(v)}
                    y2={geometry.Y(v)}
                    stroke={gridColor}
                    strokeWidth={1}
                    strokeDasharray="2 5"
                  />
                  <SvgText
                    x={geometry.left - 8}
                    y={geometry.Y(v) + 3.5}
                    textAnchor="end"
                    fontSize={10}
                    fontFamily="SpaceGrotesk_500Medium"
                    fill={c.muted}
                  >
                    {formatValue(v)}
                  </SvgText>
                </React.Fragment>
              ))}
              {geometry.xTicks.map((tick, i) => (
                <SvgText
                  key={`x${i}`}
                  x={tick.x}
                  y={height - 8}
                  textAnchor={tick.anchor}
                  fontSize={10}
                  fontFamily="SpaceGrotesk_500Medium"
                  fill={c.muted}
                >
                  {tick.label}
                </SvgText>
              ))}
              {goal != null && Number.isFinite(goal) && (
                <>
                  <Line
                    x1={geometry.left}
                    x2={geometry.left + geometry.plotW}
                    y1={geometry.Y(goal)}
                    y2={geometry.Y(goal)}
                    stroke={c.warning}
                    strokeWidth={1.5}
                    strokeDasharray="6 4"
                  />
                  <SvgText
                    x={geometry.left + geometry.plotW - 2}
                    y={geometry.Y(goal) - 5}
                    textAnchor="end"
                    fontSize={10}
                    fontFamily="SpaceGrotesk_700Bold"
                    fill={c.warning}
                  >
                    {goalLabel ?? formatValue(goal)}
                  </SvgText>
                </>
              )}
              {geometry.xy.length > 1 && (
                <Path
                  d={`${monotonePath(geometry.xy)} L${geometry.xy[geometry.xy.length - 1]![0].toFixed(1)},${(PAD.top + geometry.plotH).toFixed(1)} L${geometry.xy[0]![0].toFixed(1)},${(PAD.top + geometry.plotH).toFixed(1)} Z`}
                  fill={`url(#${gradientId})`}
                />
              )}
              <Path
                d={monotonePath(geometry.xy)}
                fill="none"
                stroke={stroke}
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {geometry.xy.map(([x, y], i) => {
                const point = points[i]!;
                const isLast = i === points.length - 1;
                if (point.highlight) {
                  return (
                    <Circle key={i} cx={x} cy={y} r={4.5} fill={recordColor} stroke={c.surface} strokeWidth={2} />
                  );
                }
                if (!showDots && !isLast) return null;
                return (
                  <Circle
                    key={i}
                    cx={x}
                    cy={y}
                    r={isLast ? 4.5 : 2.6}
                    fill={stroke}
                    stroke={c.surface}
                    strokeWidth={isLast ? 2 : 1}
                  />
                );
              })}
              {active && (
                <>
                  <Line
                    x1={active[0]}
                    x2={active[0]}
                    y1={PAD.top}
                    y2={PAD.top + geometry.plotH}
                    stroke={withAlpha(c.text, 0.35)}
                    strokeWidth={1}
                    strokeDasharray="3 3"
                  />
                  <Circle cx={active[0]} cy={active[1]} r={6} fill={stroke} stroke={c.surface} strokeWidth={2.5} />
                </>
              )}
            </Svg>
            {active && activePoint && (
              <View
                pointerEvents="none"
                onLayout={(e) => setTipWidth(e.nativeEvent.layout.width)}
                style={[
                  styles.tip,
                  {
                    backgroundColor: c.surfaceElevated,
                    borderColor: activePoint.highlight ? recordColor : withAlpha(stroke, 0.45),
                    left: Math.max(4, Math.min(width - tipWidth - 4, active[0] - tipWidth / 2)),
                    // Parked at the top unless that would cover the point it describes.
                    top: active[1] < 52 ? Math.min(height - 44, active[1] + 14) : 2,
                    opacity: tipWidth ? 1 : 0,
                  },
                ]}
              >
                <Text style={[styles.tipValue, { color: c.text }]}>{formatValue(activePoint.y)}</Text>
                <Text style={[styles.tipDate, { color: c.muted }]}>
                  {dateFmtLong.format(new Date(activePoint.t))}
                  {activePoint.note ? ` · ${activePoint.note}` : ''}
                </Text>
              </View>
            )}
          </View>
        </GestureDetector>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tip: {
    position: 'absolute',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { userSelect: 'none' as const } : {}),
  },
  tipValue: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 14, fontVariant: ['tabular-nums'] },
  tipDate: { fontFamily: 'Manrope_500Medium', fontSize: 11 },
});
