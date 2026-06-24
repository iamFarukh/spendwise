import {type ComponentType} from 'react';
import Svg, {
  Circle,
  Ellipse,
  Path,
  Rect,
  type SvgProps,
} from 'react-native-svg';

import {colors} from '@/constants/theme';

export type IconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

/** Stroke-based glyph (the common case). */
function stroke({size = 24, color = colors.ink600, strokeWidth = 2}: IconProps) {
  return {
    width: size,
    height: size,
    stroke: color,
    strokeWidth,
    fill: 'none' as const,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  } satisfies SvgProps;
}

/** Filled glyph (star, apple, etc.). */
function filled({size = 24, color = colors.ink600}: IconProps) {
  return {width: size, height: size, fill: color, stroke: 'none'} satisfies SvgProps;
}

// ---------- Navigation / chrome ----------
export function IconHome(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...stroke(p)}>
      <Path d="M3 10.5 12 4l9 6.5" />
      <Path d="M5 9.5V20h14V9.5" />
      <Path d="M9.5 20v-5h5v5" />
    </Svg>
  );
}

export function IconList(p: IconProps) {
  const dot = p.color ?? colors.ink600;
  return (
    <Svg viewBox="0 0 24 24" {...stroke(p)}>
      <Path d="M8 6h13M8 12h13M8 18h13" />
      <Circle cx="3.5" cy="6" r="1.3" fill={dot} stroke="none" />
      <Circle cx="3.5" cy="12" r="1.3" fill={dot} stroke="none" />
      <Circle cx="3.5" cy="18" r="1.3" fill={dot} stroke="none" />
    </Svg>
  );
}

export function IconWallet(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...stroke(p)}>
      <Path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18v3" />
      <Rect x="3" y="7.5" width="18" height="12" rx="2.5" />
      <Path d="M16 13.5h2.5" />
    </Svg>
  );
}

export function IconGrid(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...stroke(p)}>
      <Rect x="4" y="4" width="7" height="7" rx="2" />
      <Rect x="13" y="4" width="7" height="7" rx="2" />
      <Rect x="4" y="13" width="7" height="7" rx="2" />
      <Rect x="13" y="13" width="7" height="7" rx="2" />
    </Svg>
  );
}

export function IconChart(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...stroke(p)}>
      <Path d="M4 4v16h16" />
      <Path d="M8 14l3-4 3 2 4-6" />
    </Svg>
  );
}

export function IconClock(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...stroke(p)}>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 7v5l3 2" />
    </Svg>
  );
}

export function IconGear(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...stroke(p)}>
      <Circle cx="12" cy="12" r="3" />
      <Path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 2.6 14H2.5a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4 7.6l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 9.5 4V3.9a2 2 0 1 1 4 0V4a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.6 1.6 0 0 0 21.4 10h.1a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" />
    </Svg>
  );
}

export function IconSearch(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...stroke(p)}>
      <Circle cx="11" cy="11" r="7" />
      <Path d="m20 20-3.5-3.5" />
    </Svg>
  );
}

export function IconLock(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...stroke(p)}>
      <Rect x="5" y="11" width="14" height="9" rx="2" />
      <Path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </Svg>
  );
}

export function IconPlus(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...stroke({strokeWidth: 2.4, ...p})}>
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function IconCheck(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...stroke({strokeWidth: 2.4, ...p})}>
      <Path d="m4 12 5 5L20 6" />
    </Svg>
  );
}

export function IconClose(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...stroke(p)}>
      <Path d="m6 6 12 12M18 6 6 18" />
    </Svg>
  );
}

// ---------- Directional ----------
export function IconDown(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...stroke(p)}>
      <Path d="M12 5v14" />
      <Path d="m6 13 6 6 6-6" />
    </Svg>
  );
}

export function IconUp(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...stroke(p)}>
      <Path d="M12 19V5" />
      <Path d="m6 11 6-6 6 6" />
    </Svg>
  );
}

export function IconSwap(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...stroke(p)}>
      <Path d="M7 4 3 8l4 4" />
      <Path d="M3 8h13" />
      <Path d="m17 20 4-4-4-4" />
      <Path d="M21 16H8" />
    </Svg>
  );
}

export function IconTrend(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...stroke(p)}>
      <Path d="m3 17 6-6 4 4 8-8" />
      <Path d="M16 7h5v5" />
    </Svg>
  );
}

export function IconChevronRight(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...stroke(p)}>
      <Path d="m9 6 6 6-6 6" />
    </Svg>
  );
}

export function IconChevronDown(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...stroke(p)}>
      <Path d="m6 9 6 6 6-6" />
    </Svg>
  );
}

export function IconChevronLeft(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...stroke({strokeWidth: 2.2, ...p})}>
      <Path d="m15 6-6 6 6 6" />
    </Svg>
  );
}

// ---------- Utility ----------
export function IconCalendar(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...stroke(p)}>
      <Rect x="4" y="5" width="16" height="16" rx="2.5" />
      <Path d="M4 9h16M8 3v4M16 3v4" />
    </Svg>
  );
}

export function IconFilter(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...stroke(p)}>
      <Path d="M4 5h16l-6 7v6l-4 2v-8L4 5Z" />
    </Svg>
  );
}

export function IconDownload(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...stroke(p)}>
      <Path d="M12 4v11" />
      <Path d="m7 11 5 5 5-5" />
      <Path d="M5 20h14" />
    </Svg>
  );
}

export function IconRepeat(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...stroke(p)}>
      <Path d="M4 8a6 6 0 0 1 6-6h6" />
      <Path d="m14 2 3 3-3 3" />
      <Path d="M20 16a6 6 0 0 1-6 6H8" />
      <Path d="m10 16-3 3 3 3" />
    </Svg>
  );
}

export function IconEdit(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...stroke(p)}>
      <Path d="M16 4l4 4L8 20H4v-4L16 4Z" />
    </Svg>
  );
}

export function IconTrash(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...stroke(p)}>
      <Path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13h10l1-13" />
    </Svg>
  );
}

export function IconLogout(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...stroke(p)}>
      <Path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
      <Path d="M9 16l-4-4 4-4M5 12h10" />
    </Svg>
  );
}

export function IconUndo(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...stroke(p)}>
      <Path d="M9 7 4 12l5 5" />
      <Path d="M4 12h10a5 5 0 0 1 0 10h-2" />
    </Svg>
  );
}

export function IconBell(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...stroke(p)}>
      <Path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
      <Path d="M10 20a2 2 0 0 0 4 0" />
    </Svg>
  );
}

export function IconShield(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...stroke(p)}>
      <Path d="M12 3 5 6v6c0 4 3 6.5 7 9 4-2.5 7-5 7-9V6l-7-3Z" />
      <Path d="m9 12 2 2 4-4" />
    </Svg>
  );
}

export function IconGlobe(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...stroke(p)}>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M3 12h18M12 3c2.5 2.5 2.5 15.5 0 18M12 3c-2.5 2.5-2.5 15.5 0 18" />
    </Svg>
  );
}

export function IconReceipt(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...stroke(p)}>
      <Path d="M5 3h14v18l-2.7-1.6L13.6 21 11 19.4 8.3 21 5.5 19.4 5 21V3Z" />
      <Path d="M9 8h6M9 12h4" />
    </Svg>
  );
}

export function IconKeyboard(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...stroke(p)}>
      <Rect x="2.5" y="6" width="19" height="12" rx="2.5" />
      <Path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8" />
    </Svg>
  );
}

// ---------- Account / category glyphs ----------
export function IconBank(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...stroke(p)}>
      <Path d="m12 3 9 5H3l9-5Z" />
      <Path d="M5 10v8M10 10v8M14 10v8M19 10v8" />
      <Path d="M3 21h18" />
    </Svg>
  );
}

export function IconCash(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...stroke(p)}>
      <Rect x="3" y="6" width="18" height="12" rx="2.5" />
      <Circle cx="12" cy="12" r="2.5" />
      <Path d="M6 9.5v5M18 9.5v5" />
    </Svg>
  );
}

export function IconCard(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...stroke(p)}>
      <Rect x="3" y="5" width="18" height="14" rx="2.5" />
      <Path d="M3 10h18M7 15h4" />
    </Svg>
  );
}

export function IconPig(p: IconProps) {
  const c = p.color ?? colors.ink600;
  return (
    <Svg viewBox="0 0 24 24" {...stroke(p)}>
      <Path d="M4 13a6 6 0 0 1 6-6h3a6 6 0 0 1 6 6 4 4 0 0 1-2 3.5V20h-3v-2h-3v2H8v-2.5A4 4 0 0 1 4 13Z" />
      <Path d="M14 7l1-3M4 12H2.5" />
      <Circle cx="16" cy="12" r="1" fill={c} stroke="none" />
    </Svg>
  );
}

export function IconFood(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...stroke(p)}>
      <Path d="M5 3v8a2 2 0 0 0 4 0V3M7 11v10" />
      <Path d="M16 3c-1.5 0-3 1.8-3 5s1.5 4 3 4m0-9c1.5 0 3 1.8 3 5s-1.5 4-3 4m0 0v9" />
    </Svg>
  );
}

export function IconBolt(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...stroke(p)}>
      <Path d="M13 3 4 14h6l-1 7 9-11h-6l1-7Z" />
    </Svg>
  );
}

export function IconBag(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...stroke(p)}>
      <Path d="M6 8h12l1 12H5L6 8Z" />
      <Path d="M9 8a3 3 0 0 1 6 0" />
    </Svg>
  );
}

export function IconHouse(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...stroke(p)}>
      <Path d="M4 11 12 5l8 6" />
      <Path d="M6 10v9h12v-9" />
    </Svg>
  );
}

export function IconBriefcase(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...stroke(p)}>
      <Rect x="3" y="7" width="18" height="13" rx="2.5" />
      <Path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" />
    </Svg>
  );
}

export function IconCar(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...stroke(p)}>
      <Path d="M5 16V11l2-5h10l2 5v5" />
      <Path d="M3 16h18v3h-3v-3M6 19v-3" />
    </Svg>
  );
}

export function IconHeart(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...stroke(p)}>
      <Path d="M12 20s-7-4.5-9-9a4.5 4.5 0 0 1 9-2 4.5 4.5 0 0 1 9 2c-2 4.5-9 9-9 9Z" />
    </Svg>
  );
}

export function IconFilm(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...stroke(p)}>
      <Rect x="3" y="5" width="18" height="14" rx="2.5" />
      <Path d="M3 10h18M8 5v14M16 5v14" />
    </Svg>
  );
}

export function IconCoins(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...stroke(p)}>
      <Ellipse cx="9" cy="6" rx="6" ry="2.6" />
      <Path d="M3 6v5c0 1.4 2.7 2.6 6 2.6s6-1.2 6-2.6V6" />
      <Path d="M15 11.4c2.6.2 6 1.3 6 2.6 0 1.4-2.7 2.6-6 2.6-1 0-2-.1-2.8-.3" />
      <Path d="M3 11c0 1.4 2.7 2.6 6 2.6M9 13.6V19c0 1.4 2.7 2.6 6 2.6s6-1.2 6-2.6v-5" />
    </Svg>
  );
}

// ---------- Filled glyphs ----------
export function IconStar(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...filled(p)}>
      <Path d="m12 3 2.6 5.6 6.1.7-4.5 4.1 1.2 6L12 16.9 6.6 19.4l1.2-6L3.3 9.3l6.1-.7L12 3Z" />
    </Svg>
  );
}

export function IconApple(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...filled(p)}>
      <Path d="M17.05 12.04c-.03-2.6 2.13-3.85 2.22-3.91-1.21-1.77-3.1-2.01-3.77-2.04-1.6-.16-3.13.94-3.94.94-.81 0-1.72-.92-2.83-.9-1.46.02-2.8.85-3.55 2.16-1.51 2.62-.39 6.5 1.08 8.63.72 1.04 1.58 2.21 2.7 2.17 1.08-.04 1.49-.7 2.8-.7 1.31 0 1.68.7 2.83.68 1.17-.02 1.91-1.06 2.62-2.11.83-1.21 1.17-2.38 1.19-2.44-.03-.01-2.29-.88-2.31-3.49Z" />
      <Path d="M14.62 4.7c.6-.73 1-1.74.89-2.75-.86.03-1.9.57-2.52 1.3-.55.64-1.04 1.67-.91 2.65.96.07 1.94-.49 2.54-1.2Z" />
    </Svg>
  );
}

export function IconGoogle(p: IconProps) {
  const size = p.size ?? 24;
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Path fill="#4285F4" d="M21.6 12.2c0-.6-.1-1.2-.2-1.8H12v3.5h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.2Z" />
      <Path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.7-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z" />
      <Path fill="#FBBC05" d="M6.4 13.9a6 6 0 0 1 0-3.8V7.5H3.1a10 10 0 0 0 0 9l3.3-2.6Z" />
      <Path fill="#EA4335" d="M12 6.5c1.5 0 2.8.5 3.8 1.5l2.8-2.8A10 10 0 0 0 3.1 7.5l3.3 2.6C7.2 8.2 9.4 6.5 12 6.5Z" />
    </Svg>
  );
}

/** Brand logo mark (mint gradient leaf). Use on light surfaces. */
export function LogoMark({size = 48}: {size?: number}) {
  return (
    <Svg viewBox="0 0 48 48" width={size} height={size}>
      <Rect width="48" height="48" rx="13" fill={colors.mint500} />
      <Path d="M24 35c0-7 0-11 5-15 0 8-2 12-5 15Z" fill="#fff" opacity={0.95} />
      <Path d="M24 35c0-6-1-9-6-12 0 7 2 9 6 12Z" fill="#fff" opacity={0.8} />
      <Rect x="22.5" y="30" width="3" height="9" rx="1.5" fill="#fff" />
    </Svg>
  );
}

/** Map an account kind / category icon-key string to a glyph component. */
export const ICON_BY_KEY: Record<string, ComponentType<IconProps>> = {
  bank: IconBank,
  cash: IconCash,
  wallet: IconWallet,
  card: IconCard,
  'credit-card': IconCard,
  pig: IconPig,
  invest: IconTrend,
  trend: IconTrend,
  food: IconFood,
  bolt: IconBolt,
  bag: IconBag,
  shopping: IconBag,
  house: IconHouse,
  home: IconHouse,
  housing: IconHouse,
  briefcase: IconBriefcase,
  salary: IconBriefcase,
  car: IconCar,
  transport: IconCar,
  heart: IconHeart,
  health: IconHeart,
  film: IconFilm,
  entertainment: IconFilm,
  swap: IconSwap,
  transfer: IconSwap,
  coins: IconCoins,
  receipt: IconReceipt,
};
