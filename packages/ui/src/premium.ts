/** Visual-only variants. Entitlements are enforced by the existing appearance/store gates. */
export interface PremiumThemeSpec {
  surfaceVariant: 'glass' | 'satin' | 'ceramic' | 'paper';
  motif: 'energy' | 'thread' | 'coffee' | 'cherry';
  signature: string;
  surfaceGradient: readonly [string, string];
  buttonGradient: readonly [string, string];
  highlight: string;
  shadow: string;
  cardRadius: number;
  buttonRadius: number;
  inputRadius: number;
  heatmapVariant: 'xray' | 'enamel' | 'espresso' | 'ink';
  heat: [string, string, string, string];
  calendarVariant: 'halo' | 'gold' | 'coffee-ring' | 'blossom';
  hydrationVariant: 'reactor' | 'carafe' | 'cup' | 'inkwell';
  hydration: { light: string; water: string; deep: string; reflection: string; glass: string };
  motion: { press: number; selection: number; achievement: number; travel: number };
}

const motion = { press: 150, selection: 240, achievement: 700, travel: 12 };
export const premiumThemes: Record<string, PremiumThemeSpec> = {
  ultraviolet: {
    surfaceVariant: 'glass',
    motif: 'energy',
    signature: 'PRECISION / ENERGY',
    surfaceGradient: ['#1D1934', '#0C0D19'],
    buttonGradient: ['#7C3AED', '#4338CA'],
    highlight: '#C4A5FF',
    shadow: '#7C3AED',
    cardRadius: 20,
    buttonRadius: 18,
    inputRadius: 14,
    heatmapVariant: 'xray',
    heat: ['#211A3D', '#4338CA', '#8B5CF6', '#EEA0FF'],
    calendarVariant: 'halo',
    hydrationVariant: 'reactor',
    hydration: {
      light: '#C4B5FD',
      water: '#8B5CF6',
      deep: '#4338CA',
      reflection: '#F5F3FF',
      glass: '#A78BFA',
    },
    motion,
  },
  bordeaux: {
    surfaceVariant: 'satin',
    motif: 'thread',
    signature: 'NOCTURNE / GARNET / GOLD',
    surfaceGradient: ['#242428', '#111216'],
    buttonGradient: ['#692B40', '#24181E'],
    highlight: '#E8C185',
    shadow: '#000000',
    cardRadius: 18,
    buttonRadius: 24,
    inputRadius: 12,
    heatmapVariant: 'enamel',
    heat: ['#30121D', '#701D38', '#CB4874', '#E8C185'],
    calendarVariant: 'gold',
    hydrationVariant: 'carafe',
    hydration: {
      light: '#D24B67',
      water: '#941E42',
      deep: '#390D24',
      reflection: '#FBEFF3',
      glass: '#E8C185',
    },
    motion: { ...motion, selection: 280, travel: 8 },
  },
  mocha: {
    surfaceVariant: 'ceramic',
    motif: 'coffee',
    signature: 'CERAMIC / ESPRESSO',
    surfaceGradient: ['#FFFBF5', '#F1E2D1'],
    buttonGradient: ['#70462F', '#382319'],
    highlight: '#8A5A3C',
    shadow: '#92735B',
    cardRadius: 26,
    buttonRadius: 26,
    inputRadius: 18,
    heatmapVariant: 'espresso',
    heat: ['#EDDBC5', '#CDA077', '#946241', '#2E1F17'],
    calendarVariant: 'coffee-ring',
    hydrationVariant: 'cup',
    hydration: {
      light: '#E9D8C8',
      water: '#C98B68',
      deep: '#8A5A3C',
      reflection: '#FFF8F1',
      glass: '#B9916F',
    },
    motion: { ...motion, selection: 280, travel: 6 },
  },
  cherry: {
    surfaceVariant: 'paper',
    motif: 'cherry',
    signature: 'INK / CHERRY / PAPER',
    surfaceGradient: ['#FFFFFF', '#FFF0F4'],
    buttonGradient: ['#E11D48', '#9F1239'],
    highlight: '#BE123C',
    shadow: '#E99AAE',
    cardRadius: 22,
    buttonRadius: 26,
    inputRadius: 18,
    heatmapVariant: 'ink',
    heat: ['#FCE7EF', '#FDA4AF', '#E11D48', '#9F1239'],
    calendarVariant: 'blossom',
    hydrationVariant: 'inkwell',
    hydration: {
      light: '#FFE4EC',
      water: '#F9A0B8',
      deep: '#E11D48',
      reflection: '#FFFFFF',
      glass: '#ECA7BA',
    },
    motion: { ...motion, travel: 10 },
  },
};
