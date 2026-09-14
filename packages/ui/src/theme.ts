import { TextStyle } from 'react-native';

export type Colorway =
  | 'glacier'
  | 'arctic'
  | 'avionics'
  | 'telemetry'
  | 'titanium'
  | 'ember'
  | 'verde'
  | 'solar'
  | 'alpine'
  | 'rose'
  | 'crimson'
  | 'amber'; // retained for backwards-compatibility

export const colorways: {
  id: Colorway;
  name: string;
  description: string;
  isLight?: boolean;
}[] = [
  // Dark Themes
  { id: 'glacier', name: 'Glacier Core', description: 'Cyan · Kühles Graphit' },
  { id: 'crimson', name: 'Crimson Neon', description: 'Neon Magenta · Velvet Obsidian' },
  { id: 'verde', name: 'EVARO Verde', description: 'Mint Bio-Signal · Obsidian' },
  { id: 'telemetry', name: 'Telemetry Cyber', description: 'Electric Lime · Midnight Navy' },
  { id: 'ember', name: 'EVARO Ember', description: 'Ember Orange · Deep Carbon' },
  { id: 'avionics', name: 'Avionics Stealth', description: 'Zinc Matrix · Acid Lime' },
  { id: 'titanium', name: 'Royal Titanium', description: 'Champagne Gold · Luxury' },
  // Light Themes
  { id: 'arctic', name: 'Arctic Lab (Light)', description: 'Clean White · Ocean Cyan', isLight: true },
  { id: 'solar', name: 'Solar Dune (Light)', description: 'Warm Sand · Amber Gold', isLight: true },
  { id: 'rose', name: 'Porcelain Rose (Light)', description: 'Porzellan · Korallen-Rose', isLight: true },
  { id: 'alpine', name: 'Alpine Mist (Light)', description: 'Studio Snow · Electric Indigo', isLight: true },
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

const palettes: Record<
  Colorway,
  {
    background: string;
    surface: string;
    surfaceElevated: string;
    primary: string;
    secondary: string;
    tertiary: string;
    text: string;
    muted: string;
    border: string;
  }
> = {
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
  arctic: {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceElevated: '#F1F5F9',
    primary: '#0284C7',
    secondary: '#0EA5E9',
    tertiary: '#38BDF8',
    text: '#0F172A',
    muted: '#64748B',
    border: '#E2E8F0',
  },
  avionics: {
    background: '#0A0A0A',
    surface: '#141414',
    surfaceElevated: '#1F1F1F',
    primary: '#D9F99D',
    secondary: '#71717A',
    tertiary: '#A1A1AA',
    text: '#F4F4F5',
    muted: '#8F9282',
    border: '#27272A',
  },
  telemetry: {
    background: '#080E1E',
    surface: '#0F1C33',
    surfaceElevated: '#162947',
    primary: '#CCFF00',
    secondary: '#34D399',
    tertiary: '#38BDF8',
    text: '#F8FAFC',
    muted: '#8B9CB5',
    border: '#1B2E52',
  },
  titanium: {
    background: '#0A0A0C',
    surface: '#151518',
    surfaceElevated: '#1E1E22',
    primary: '#E6C687',
    secondary: '#C5A059',
    tertiary: '#F5E5C9',
    text: '#F4F4F6',
    muted: '#A1A1A8',
    border: '#26262B',
  },
  ember: {
    background: '#0B0C0E',
    surface: '#15171B',
    surfaceElevated: '#1E2126',
    primary: '#EA580C',
    secondary: '#FB923C',
    tertiary: '#DC2626',
    text: '#F5F3EE',
    muted: '#9CA3AF',
    border: '#2A2E36',
  },
  verde: {
    background: '#0A120E',
    surface: '#111E18',
    surfaceElevated: '#162820',
    primary: '#34D399',
    secondary: '#10B981',
    tertiary: '#059669',
    text: '#E2E8F0',
    muted: '#8B9D93',
    border: '#1A2F25',
  },
  solar: {
    background: '#FBF9F5',
    surface: '#FFFFFF',
    surfaceElevated: '#F4EFE6',
    primary: '#D97706',
    secondary: '#B45309',
    tertiary: '#F59E0B',
    text: '#1C1917',
    muted: '#78716C',
    border: '#E7E0D3',
  },
  alpine: {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceElevated: '#F1F5F9',
    primary: '#4F46E5',
    secondary: '#6366F1',
    tertiary: '#818CF8',
    text: '#0F172A',
    muted: '#64748B',
    border: '#CBD5E1',
  },
  rose: {
    background: '#FCF8F9',
    surface: '#FFFFFF',
    surfaceElevated: '#F9ECEF',
    primary: '#E11D48',
    secondary: '#F43F5E',
    tertiary: '#FB7185',
    text: '#1C1014',
    muted: '#7A6B71',
    border: '#F2DCE2',
  },
  crimson: {
    background: '#0D070B',
    surface: '#180D14',
    surfaceElevated: '#24141E',
    primary: '#FF2A6D',
    secondary: '#FB7185',
    tertiary: '#E11D48',
    text: '#FDF2F4',
    muted: '#A88B95',
    border: '#361927',
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
  const palette = palettes[colorway] ?? palettes.glacier;
  const isLight =
    colorway === 'arctic' ||
    colorway === 'solar' ||
    colorway === 'alpine' ||
    colorway === 'rose';
  const isDark = !isLight;
  const colors = {
    ...palette,
    textPrimary: palette.text,
    textSecondary: palette.muted,
    textMuted: withAlpha(palette.muted, 0.82),
    onPrimary: isLight ? '#FFFFFF' : palette.background,
    borderActive: withAlpha(palette.primary, 0.5),
    primarySubtle: withAlpha(palette.primary, isLight ? 0.12 : 0.1),
    success: '#57DFAB',
    warning: '#FFC266',
    onWarning: '#211500',
    error: '#FF6686',
    onError: '#17070B',
    // Existing destructive usages retain their semantics; new code uses error.
    accent: '#FF6686',
    transparent: 'transparent',
    overlay: isLight ? 'rgba(15, 23, 42, 0.65)' : 'rgba(0, 0, 0, 0.72)',
    shadow: '#000000',
    white: '#FFFFFF',
  };
  return {
    colorway,
    isDark,
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
      base: palette.border,
      light: palette.muted,
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
