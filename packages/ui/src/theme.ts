export const colors = {
  primary: '#90D5FF',
  background: '#0B0B0F',
  surface: '#1A1C23',
  text: '#F4F5F7',
  muted: '#8A8D9F',
  border: '#2A2B31',
  accent: '#FF3366',
  transparent: 'transparent',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 9999,
};

import { TextStyle } from 'react-native';

export const typography: Record<string, TextStyle> = {
  heading: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 24,
    textTransform: 'uppercase',
  },
  body: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  button: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 16,
    textTransform: 'uppercase',
  },
  caption: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  display: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontVariant: ['tabular-nums'],
  },
};

export const theme = {
  colors,
  spacing,
  radius,
  typography,
};

export type Theme = typeof theme;
