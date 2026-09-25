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
  | 'linen'
  | 'sage'
  | 'slate'
  | 'lavender'
  | 'mocha'
  | 'ultraviolet'
  | 'cherry'
  | 'bordeaux'
  | 'amber'; // retained for backwards-compatibility

export function migrateColorway(value: string): Colorway {
  const replacements: Record<string, Colorway> = { pearl: 'mocha', nocturne: 'ultraviolet', prism: 'cherry', eclipse: 'bordeaux' };
  return replacements[value] ?? value as Colorway;
}

export const COACH_COLORWAYS: readonly Colorway[] = ['mocha', 'ultraviolet', 'cherry', 'bordeaux'];

export const colorways: {
  id: Colorway;
  name: string;
  description: string;
  isLight?: boolean;
}[] = [
  { id: 'mocha', name: 'Mocha Cream', description: 'Cream · Espresso · Caramel', isLight: true },
  { id: 'ultraviolet', name: 'Ultraviolet', description: 'Deep Violet · Electric Purple · Cyan' },
  { id: 'cherry', name: 'Ink & Cherry', description: 'Soft White · Ink · Cherry', isLight: true },
  { id: 'bordeaux', name: 'Bordeaux Noir', description: 'Wine Black · Burgundy · Blush' },
  // Dark Themes
  { id: 'glacier', name: 'Glacier Core', description: 'Cyan · Kühles Graphit' },
  { id: 'crimson', name: 'Crimson Neon', description: 'Neon Magenta · Velvet Obsidian' },
  { id: 'verde', name: 'Verde Grove', description: 'Mint Bio-Signal · Obsidian' },
  { id: 'telemetry', name: 'Telemetry Cyber', description: 'Electric Lime · Midnight Navy' },
  { id: 'ember', name: 'Ember Glow', description: 'Ember Orange · Deep Carbon' },
  { id: 'avionics', name: 'Avionics Stealth', description: 'Zinc Matrix · Acid Lime' },
  { id: 'titanium', name: 'Titanium Luxe', description: 'Champagne Gold · Luxury' },
  { id: 'slate', name: 'Soft Slate', description: 'Slate · Sky' },
  { id: 'linen', name: 'Linen Terra', description: 'Linen · Terracotta', isLight: true },
  { id: 'sage', name: 'Sage Garden', description: 'Sage · Forest', isLight: true },
  // Light Themes
  { id: 'arctic', name: 'Arctic Lab', description: 'Clean White · Ocean Cyan', isLight: true },
  { id: 'solar', name: 'Solar Dune', description: 'Warm Sand · Amber Gold', isLight: true },
  { id: 'rose', name: 'Porcelain Rose', description: 'Porzellan · Korallen-Rose', isLight: true },
  { id: 'alpine', name: 'Alpine Mist', description: 'Studio Snow · Electric Indigo', isLight: true },
  { id: 'lavender', name: 'Lavender Mist', description: 'Soft Lilac · Violet', isLight: true },
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
  mocha: { background: '#F7F0E8', surface: '#FFF8F1', surfaceElevated: '#E9D8C8', primary: '#8A5A3C', secondary: '#C98B68', tertiary: '#E9D8C8', text: '#5F4634', muted: '#92735B', border: '#DBC5AE' },
  ultraviolet: { background: '#0D0818', surface: '#171128', surfaceElevated: '#31204F', primary: '#8B5CF6', secondary: '#22D3EE', tertiary: '#31204F', text: '#F5F3FF', muted: '#C4B5FD', border: '#2B2147' },
  cherry: { background: '#FBF8FA', surface: '#FFFFFF', surfaceElevated: '#FCE7EF', primary: '#E11D48', secondary: '#FDA4AF', tertiary: '#FCE7EF', text: '#1F2937', muted: '#6B7280', border: '#E7D6DE' },
  bordeaux: { background: '#14090F', surface: '#1C0E15', surfaceElevated: '#3A1423', primary: '#9F1239', secondary: '#FDA4AF', tertiary: '#3A1423', text: '#FBEFF3', muted: '#E7B8C7', border: '#3A1C29' },
  lavender: { background: '#F3EFF8', surface: '#FDFBFF', surfaceElevated: '#E8E0F0', primary: '#71489B', secondary: '#8661AD', tertiary: '#9B76BD', text: '#2D2338', muted: '#675873', border: '#D4C6E1' },
  linen: { background: '#F4EFE7', surface: '#FFFAF3', surfaceElevated: '#EAE1D6', primary: '#974326', secondary: '#A05235', tertiary: '#BC6B4A', text: '#30251F', muted: '#69564A', border: '#D6C8BA' },
  sage: { background: '#EAF1E9', surface: '#F6FAF3', surfaceElevated: '#DBE6D9', primary: '#286447', secondary: '#38775A', tertiary: '#508A68', text: '#203328', muted: '#4F6656', border: '#BED1BE' },
  slate: { background: '#141D2B', surface: '#243247', surfaceElevated: '#344960', primary: '#ABD7F0', secondary: '#83BBDD', tertiary: '#B9DEEF', text: '#F2F7FC', muted: '#B2C5D9', border: '#52657A' },
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
    primary: '#FF70B8',
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
    colorway === 'rose' || colorway === 'linen' || colorway === 'sage' || colorway === 'lavender' || colorway === 'mocha' || colorway === 'cherry';
  const isDark = !isLight;
  const colors = {
    ...palette,
    textPrimary: palette.text,
    textSecondary: palette.muted,
    textMuted: withAlpha(palette.muted, 0.82),
    onPrimary: isLight || colorway === 'bordeaux' || colorway === 'ultraviolet' ? '#FFFFFF' : palette.background,
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
        withAlpha(palette.primary, 0.3),
        withAlpha(palette.primary, 0.65),
        palette.primary,
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
