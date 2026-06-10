import type { Category } from "@pfos/shared";

import {
  IconBolt,
  IconBriefcase,
  IconCar,
  IconCard,
  IconCash,
  IconFood,
  IconGrid,
  IconHeart,
  IconHome,
} from "@/components/icons";
import { getCategoryPalette } from "@/lib/categories/display";

export function CategoryIcon({
  icon,
  className,
}: {
  icon: string;
  className?: string;
}) {
  switch (icon) {
    case "food":
      return <IconFood className={className} />;
    case "car":
      return <IconCar className={className} />;
    case "bag":
      return <IconBriefcase className={className} />;
    case "bill":
      return <IconCard className={className} />;
    case "health":
      return <IconHeart className={className} />;
    case "cash":
      return <IconCash className={className} />;
    case "home":
      return <IconHome className={className} />;
    case "system":
      return <IconBolt className={className} />;
    default:
      return <IconGrid className={className} />;
  }
}

export function CategoryIconChip({ category }: { category: Category }) {
  const palette = getCategoryPalette(category);

  return (
    <span
      className="grid h-[52px] w-[52px] place-items-center rounded-[15px]"
      style={{ background: palette.bg, color: palette.fg }}
    >
      <CategoryIcon icon={category.icon} />
    </span>
  );
}
