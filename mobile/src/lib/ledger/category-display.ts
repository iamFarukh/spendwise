import type {Category} from '@pfos/shared';
import {type ComponentType} from 'react';

import {
  IconBag,
  IconCar,
  IconCash,
  IconCoins,
  IconFilm,
  IconFood,
  IconGrid,
  IconHeart,
  IconHouse,
  IconReceipt,
  IconShield,
  IconTrend,
  type IconProps,
} from '@/components/icons';
import {type BadgeTone} from '@/components/ui/icon-badge';

const ICON_BY_KEY: Record<string, ComponentType<IconProps>> = {
  food: IconFood,
  car: IconCar,
  transport: IconCar,
  bag: IconBag,
  shopping: IconBag,
  bill: IconReceipt,
  bills: IconReceipt,
  health: IconHeart,
  cash: IconCash,
  grid: IconGrid,
  house: IconHouse,
  housing: IconHouse,
  film: IconFilm,
  entertainment: IconFilm,
  invest: IconTrend,
  coins: IconCoins,
  system: IconShield,
};

const TONE_BY_COLOR: Record<string, BadgeTone> = {
  expense: 'expense',
  income: 'income',
  invest: 'invest',
  transfer: 'transfer',
  pending: 'pending',
  mint: 'mint',
};

/** Icon + tone for a category, from its icon/color keys. */
export function getCategoryVisual(category: Category | undefined): {
  icon: ComponentType<IconProps>;
  tone: BadgeTone;
} {
  return {
    icon: (category && ICON_BY_KEY[category.icon]) ?? IconGrid,
    tone: (category && TONE_BY_COLOR[category.color]) ?? 'expense',
  };
}
