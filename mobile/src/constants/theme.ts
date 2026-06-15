/** SpendWise design tokens — mirrors DESIGN.md / web globals.css */
export const colors = {
  mint500: '#12B886',
  mint600: '#0C9E74',
  mint700: '#0A7D5C',
  mint100: '#D2F8E7',
  mintBright: '#25E6A6',
  ink900: '#0E2A22',
  ink600: '#4A645B',
  ink500: '#6B847B',
  ink400: '#9AB0A8',
  line: '#E2ECE7',
  paper: '#FFFFFF',
  canvas: '#F2F7F4',
  canvas2: '#E9F1ED',
  tint: '#F6FBF8',
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
} as const;
