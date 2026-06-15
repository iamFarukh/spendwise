import Svg, {Circle, Path} from 'react-native-svg';

import {colors} from '@/constants/theme';

type IconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

function base({size = 24, color = colors.ink600, strokeWidth = 2}: IconProps) {
  return {
    width: size,
    height: size,
    stroke: color,
    strokeWidth,
    fill: 'none' as const,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
}

export function IconHome(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...base(p)}>
      <Path d="M3 10.5 12 3l9 7.5" />
      <Path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
    </Svg>
  );
}

export function IconList(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...base(p)}>
      <Path d="M8 6h13M8 12h13M8 18h13" />
      <Circle cx="3.5" cy="6" r="1" fill={p.color ?? colors.ink600} stroke="none" />
      <Circle cx="3.5" cy="12" r="1" fill={p.color ?? colors.ink600} stroke="none" />
      <Circle cx="3.5" cy="18" r="1" fill={p.color ?? colors.ink600} stroke="none" />
    </Svg>
  );
}

export function IconClock(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...base(p)}>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 7v5l3.5 2" />
    </Svg>
  );
}

export function IconGrid(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...base(p)}>
      <Path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
    </Svg>
  );
}

export function IconPlus(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...base(p)}>
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function IconCheck(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...base(p)}>
      <Path d="m5 12.5 4.5 4.5L19 7" />
    </Svg>
  );
}

export function IconTrash(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...base(p)}>
      <Path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
    </Svg>
  );
}

export function IconChevronRight(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...base(p)}>
      <Path d="m9 6 6 6-6 6" />
    </Svg>
  );
}

export function IconClose(p: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...base(p)}>
      <Path d="m6 6 12 12M18 6 6 18" />
    </Svg>
  );
}
