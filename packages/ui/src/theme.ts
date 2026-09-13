import { TextStyle } from 'react-native';

export type Colorway = 'glacier' | 'amber';
export const colorways: { id: Colorway; name: string; description: string }[] = [
  { id: 'glacier', name: 'Glacier', description: 'Cyan · kühles Graphit' },
  { id: 'amber', name: 'Amber', description: 'Bernstein · warmes Graphit' },
];
export function withAlpha(hex: string, opacity: number) {
  const value = hex.replace('#', '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value;
  return `rgba(${parseInt(full.slice(0, 2), 16)}, ${parseInt(full.slice(2, 4), 16)}, ${parseInt(full.slice(4, 6), 16)}, ${opacity})`;
}
const palettes = {
  glacier: {
    background: '#080B11',
    surface: '#0F141D',
    surfaceElevated: '#161E2B',
    primary: '#00F0FF',
    secondary: '#38BDF8',
    tertiary: '#7DD3FC',
    text: '#F0F6FC',
    muted: '#8BA2B9',
    border: '#253243',
  },
  amber: {
    background: '#100D09',
    surface: '#19150F',
    surfaceElevated: '#252017',
    primary: '#FFB84D',
    secondary: '#F49346',
    tertiary: '#F5D29B',
    text: '#FAF4E9',
    muted: '#B5A58E',
    border: '#3D3428',
  },
};
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
export const radius = { sm: 6, md: 10, lg: 14, full: 9999 };
export const typography: Record<string, TextStyle> = {
  heading: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 26, letterSpacing: -0.6 },
  title: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 20, letterSpacing: -0.3 },
  body: { fontFamily: 'Manrope_500Medium', fontSize: 16, lineHeight: 24 },
  button: { fontFamily: 'Manrope_600SemiBold', fontSize: 15 },
  caption: { fontFamily: 'Manrope_500Medium', fontSize: 12, letterSpacing: 0.3 },
  label: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  display: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.8,
  },
};
export function createTheme(colorway: Colorway) {
  const palette = palettes[colorway];
  const colors = {
    ...palette,
    textPrimary: palette.text,
    textSecondary: palette.muted,
    textMuted: colorway === 'glacier' ? '#73889F' : '#9C8C75',
    onPrimary: palette.background,
    borderActive: withAlpha(palette.primary, 0.5),
    primarySubtle: withAlpha(palette.primary, 0.1),
    success: '#57DFAB',
    warning: '#FFC266',
    error: '#FF6686',
    onError: '#17070B',
    // Existing destructive usages retain their semantics; new code uses error.
    accent: '#FF6686',
    transparent: 'transparent',
    overlay: 'rgba(0, 0, 0, 0.72)',
    shadow: '#000000',
    white: '#FFFFFF',
  };
  return {
    colorway,
    colors,
    spacing,
    radius,
    typography,
    layout: {
      contentWidth: 1040,
      readingWidth: 760,
      gutter: 16,
      controlHeight: 48,
      minimumTarget: 44,
    },
    opacity: { disabled: 0.45, muted: 0.65 },
    motion: { fast: 140, standard: 220, progress: 450 },
    elevation: {
      floating: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 6,
      },
    },
    chart: {
      line: palette.primary,
      secondary: palette.secondary,
      fill: withAlpha(palette.primary, 0.12),
      grid: palette.border,
      label: palette.muted,
      record: colors.warning,
      series: [
        palette.primary,
        palette.secondary,
        palette.tertiary,
        colors.success,
        colors.warning,
      ],
    },
    anatomy: {
      outline: palette.muted,
      base: colorway === 'glacier' ? '#536779' : '#736B5D',
      light: colorway === 'glacier' ? '#A2B5C4' : '#CAB99E',
      heat: [
        palette.surfaceElevated,
        withAlpha(palette.secondary, 0.45),
        palette.secondary,
        palette.tertiary,
      ],
    },
    hydration: {
      light: '#BDEAFF',
      water: '#67C5EC',
      deep: '#246487',
      reflection: '#EAF8FF',
      glass: '#B8DEEE',
    },
    setType: { warmup: colors.warning, dropset: '#C3A0F5', failure: colors.error },
  };
}
export const theme = createTheme('glacier');
export const colors = theme.colors;
export type Theme = ReturnType<typeof createTheme>;
