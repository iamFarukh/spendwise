import type { Category } from "@pfos/shared";

export type CategoryPalette = {
  token: string;
  fg: string;
  bg: string;
};

export const CATEGORY_PALETTE: CategoryPalette[] = [
  { token: "expense", fg: "var(--expense)", bg: "var(--expense-bg)" },
  { token: "amber", fg: "#E89A5E", bg: "#FBEFE3" },
  { token: "blue", fg: "#5B86E5", bg: "var(--invest-bg)" },
  { token: "purple", fg: "var(--transfer)", bg: "var(--transfer-bg)" },
  { token: "rose", fg: "#D86B86", bg: "#FCE9EC" },
  { token: "violet", fg: "#7A5BC4", bg: "#EFEAFB" },
  { token: "mint", fg: "var(--mint-700)", bg: "var(--mint-100)" },
  { token: "pending", fg: "var(--pending)", bg: "var(--pending-bg)" },
];

export const CATEGORY_ICON_OPTIONS = [
  { value: "food", label: "Food" },
  { value: "car", label: "Transport" },
  { value: "bag", label: "Shopping" },
  { value: "bill", label: "Bills" },
  { value: "health", label: "Health" },
  { value: "cash", label: "Cash" },
  { value: "home", label: "Home" },
  { value: "grid", label: "Other" },
] as const;

export type CategoryIconValue = (typeof CATEGORY_ICON_OPTIONS)[number]["value"];

const TOKEN_COLOR_MAP: Record<string, CategoryPalette> = {
  expense: CATEGORY_PALETTE[0]!,
  pending: CATEGORY_PALETTE[7]!,
  mint: CATEGORY_PALETTE[6]!,
};

export function getCategoryPalette(category: Category): CategoryPalette {
  const mapped = TOKEN_COLOR_MAP[category.color];
  if (mapped) {
    return mapped;
  }

  const index =
    Math.abs(hashString(category.id)) % CATEGORY_PALETTE.length;
  return CATEGORY_PALETTE[index]!;
}

export function getDefaultCategoryColor(): string {
  return CATEGORY_PALETTE[1]!.token;
}

export function getDefaultCategoryIcon(): CategoryIconValue {
  return "grid";
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
