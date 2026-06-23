import { Platform } from 'react-native';

// ─── Colors ────────────────────────────────────────────────────────────────
export const Colors = {
  // Coral / brand family
  coral700: '#D75A5A',
  coral600: '#FD7979',   // primary brand
  coral400: '#FDACAC',   // soft surface / secondary
  coral200: '#FFCDC9',   // home page background

  // Cream / paper surfaces
  cream200: '#FFF9C4',   // puzzle board background
  cream300: '#FEEAC9',   // gallery background

  // Difficulty accents
  green500: '#4CAF50',
  green50:  '#E8F5E9',
  orange500:'#FF9800',
  red500:   '#F44336',
  gold500:  '#FFD700',
  purple500:'#9C27B0',
  blue500:  '#2196F3',
  sky300:   '#87CEEB',
  pink400:  '#FF69B4',

  // Reward chrome
  coin:     '#FFC93C',
  coinDeep: '#E59E00',
  starOn:   '#FFD700',
  starOff:  '#E6DCC8',
  levelRing:'#6E5BFF',

  // Neutrals
  ink:   '#333333',
  ink2:  '#666666',
  ink3:  '#999999',
  line:  '#E0E0E0',
  slate: '#F5F5F5',
  paper: '#FFFFFF',

  // Semantic
  onCoral: '#FFFFFF',
} as const;

// ─── Typography ─────────────────────────────────────────────────────────────
export const Fonts = {
  display:    'Baloo2_800ExtraBold',
  heading:    'Baloo2_700Bold',
  body:       'Fredoka_600SemiBold',
  bodyBold:   'Fredoka_700Bold',
} as const;

export const FontSizes = {
  display: 52,
  h1:      32,
  h2:      28,
  h3:      24,
  label:   20,
  body:    18,
  caption: 16,
  small:   14,
} as const;

// ─── Radii ──────────────────────────────────────────────────────────────────
export const Radii = {
  piece:  5,
  chip:   10,
  input:  12,
  card:   15,
  tile:   20,
  hero:   25,
} as const;

// ─── Spacing ────────────────────────────────────────────────────────────────
export const Spacing = {
  s1:  4,
  s2:  8,
  s3:  10,
  s4:  15,
  s5:  20,
  s6:  25,
  s7:  40,
  s8:  60,
} as const;

// ─── Shadows ────────────────────────────────────────────────────────────────
export const Shadows = {
  s1: Platform.select({
    ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.20, shadowRadius: 3 },
    android: { elevation: 4 },
    default: {},
  })!,
  s2: Platform.select({
    ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 5 },
    android: { elevation: 6 },
    default: {},
  })!,
  s3: Platform.select({
    ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.30, shadowRadius: 5 },
    android: { elevation: 8 },
    default: {},
  })!,
} as const;
