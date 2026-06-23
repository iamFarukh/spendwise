/** SpendWise design tokens — mirrors DESIGN.md / web globals.css / mobile.css */
export const colors = {
  // ---- Mint scale (brand / primary) ----
  mint50: '#ECFDF6',
  mint100: '#D2F8E7',
  mint200: '#A6F0D1',
  mint300: '#6FE5B6',
  mint400: '#36D49C',
  mint500: '#12B886', // primary
  mint600: '#0C9E74',
  mint700: '#0A7D5C',
  mint800: '#0A6149',
  mintBright: '#25E6A6',

  // ---- Ink / neutrals (green-tinted, calm) ----
  ink900: '#0E2A22',
  ink800: '#173B31',
  ink700: '#2F4D44',
  ink600: '#4A645B',
  ink500: '#6B847B',
  ink400: '#9AB0A8',
  ink300: '#C3D4CD',
  line: '#E2ECE7',
  lineSoft: '#EEF4F1',

  // ---- Surfaces ----
  paper: '#FFFFFF',
  canvas: '#F2F7F4',
  canvas2: '#E9F1ED',
  tint: '#F6FBF8',

  // ---- Semantic money colors ----
  income: '#12B886',
  incomeBg: '#E4F8EF',
  expense: '#E26A57',
  expenseBg: '#FCEDE9',
  invest: '#5B86E5',
  investBg: '#EAF0FD',
  transfer: '#8A7FE0',
  transferBg: '#EFEDFB',
  pending: '#D99A2B',
  pendingBg: '#FBF1DD',
  love: '#F4A6C1',

  white: '#FFFFFF',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  xxl: 28,
  pill: 999,
} as const;

export const fontSize = {
  xs: 11.5,
  sm: 13,
  body: 15,
  h3: 18,
  h2: 22,
  h1: 30,
  display: 40,
  numXl: 44,
} as const;

/** Soft, green-tinted elevation presets (RN shadow + Android elevation). */
export const shadow = {
  xs: {
    shadowColor: '#0E2A22',
    shadowOpacity: 0.06,
    shadowOffset: {width: 0, height: 1},
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#0E2A22',
    shadowOpacity: 0.06,
    shadowOffset: {width: 0, height: 2},
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: '#0E2A22',
    shadowOpacity: 0.08,
    shadowOffset: {width: 0, height: 8},
    shadowRadius: 24,
    elevation: 6,
  },
  lg: {
    shadowColor: '#0E2A22',
    shadowOpacity: 0.14,
    shadowOffset: {width: 0, height: 24},
    shadowRadius: 60,
    elevation: 16,
  },
} as const;
