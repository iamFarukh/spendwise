import type { Category } from "../types/category";

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "food", name: "Food & dining", icon: "food", color: "expense" },
  { id: "transport", name: "Transport", icon: "car", color: "expense" },
  { id: "shopping", name: "Shopping", icon: "bag", color: "expense" },
  { id: "bills", name: "Bills & subscriptions", icon: "bill", color: "expense" },
  { id: "health", name: "Health", icon: "health", color: "expense" },
  { id: "cash", name: "Cash", icon: "cash", color: "expense" },
  { id: "other", name: "Other", icon: "grid", color: "expense" },
  {
    id: "unaccounted",
    name: "Unaccounted",
    icon: "system",
    color: "pending",
    system: true,
  },
  {
    id: "opening",
    name: "Opening balance",
    icon: "system",
    color: "mint",
    system: true,
  },
];
