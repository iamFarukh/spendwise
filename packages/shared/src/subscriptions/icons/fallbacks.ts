/**
 * Category fallback glyphs when a brand icon cannot be resolved offline.
 * Stroke-style 24×24 paths — rendered in white over the category tint.
 */
export type SubscriptionCategoryFallback =
  | "ai"
  | "play"
  | "music"
  | "cloud"
  | "code"
  | "palette"
  | "shield"
  | "book"
  | "activity"
  | "chart"
  | "message"
  | "productivity"
  | "news"
  | "gaming"
  | "shopping"
  | "reading"
  | "other";

/** Maps catalogue category labels → fallback glyph id. */
export const SUBSCRIPTION_CATEGORY_FALLBACK: Record<
  string,
  SubscriptionCategoryFallback
> = {
  AI: "ai",
  Streaming: "play",
  Music: "music",
  "Cloud Storage": "cloud",
  Productivity: "productivity",
  Developer: "code",
  "Developer Tools": "code",
  Design: "palette",
  "Design & Creative": "palette",
  Security: "shield",
  Education: "book",
  Learning: "book",
  Fitness: "activity",
  Finance: "chart",
  Communication: "message",
  News: "news",
  Gaming: "gaming",
  Shopping: "shopping",
  Reading: "reading",
  Other: "other",
};

/** Category tint used behind fallback glyphs. */
export const SUBSCRIPTION_CATEGORY_FALLBACK_HEX: Record<
  SubscriptionCategoryFallback,
  string
> = {
  ai: "#6366F1",
  play: "#E11D48",
  music: "#1DB954",
  cloud: "#0EA5E9",
  code: "#24292F",
  palette: "#F24E1E",
  productivity: "#0F766E",
  shield: "#2563EB",
  book: "#D97706",
  activity: "#EA580C",
  chart: "#059669",
  message: "#7C3AED",
  news: "#1E293B",
  gaming: "#7C3AED",
  shopping: "#F59E0B",
  reading: "#BE185D",
  other: "#64748B",
};

export interface SubscriptionFallbackIcon {
  viewBox: string;
  paths: string[];
  stroke?: boolean;
}

export const SUBSCRIPTION_FALLBACK_ICONS: Record<
  SubscriptionCategoryFallback,
  SubscriptionFallbackIcon
> = {
  ai: {
    viewBox: "0 0 24 24",
    stroke: true,
    paths: [
      "M12 3v4",
      "M12 17v4",
      "M3 12h4",
      "M17 12h4",
      "M5.6 5.6l2.8 2.8",
      "M15.6 15.6l2.8 2.8",
      "M18.4 5.6l-2.8 2.8",
      "M8.4 15.6l-2.8 2.8",
      "M12 9.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z",
    ],
  },
  play: {
    viewBox: "0 0 24 24",
    paths: ["M8 5.5v13l11-6.5-11-6.5Z"],
  },
  music: {
    viewBox: "0 0 24 24",
    stroke: true,
    paths: [
      "M9 18V6l10-2v12",
      "M9 18a3 3 0 1 1-3-3",
      "M19 16a3 3 0 1 1-3-3",
    ],
  },
  cloud: {
    viewBox: "0 0 24 24",
    stroke: true,
    paths: ["M7 18h11a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.6-1.8A4 4 0 0 0 7 18Z"],
  },
  code: {
    viewBox: "0 0 24 24",
    stroke: true,
    paths: ["M16 18l6-6-6-6", "M8 6l-6 6 6 6"],
  },
  palette: {
    viewBox: "0 0 24 24",
    stroke: true,
    paths: [
      "M12 3a9 9 0 1 0 8.5 11.8 3 3 0 0 1-3.2-3.2A9 9 0 0 0 12 3Z",
      "M8 10h.01",
      "M12 8h.01",
      "M16 10h.01",
      "M9 14h.01",
    ],
  },
  productivity: {
    viewBox: "0 0 24 24",
    stroke: true,
    paths: [
      "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2",
      "M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2",
      "M9 12h6",
      "M9 16h4",
    ],
  },
  shield: {
    viewBox: "0 0 24 24",
    stroke: true,
    paths: ["M12 3 5 6v6c0 4 3 6.5 7 9 4-2.5 7-5 7-9V6l-7-3Z"],
  },
  book: {
    viewBox: "0 0 24 24",
    stroke: true,
    paths: [
      "M4 19.5A2.5 2.5 0 0 1 6.5 17H20",
      "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z",
    ],
  },
  activity: {
    viewBox: "0 0 24 24",
    stroke: true,
    paths: ["M22 12h-4l-3 9L9 3l-3 9H2"],
  },
  chart: {
    viewBox: "0 0 24 24",
    stroke: true,
    paths: ["M3 3v18h18", "M7 16l4-4 4 4 5-6"],
  },
  message: {
    viewBox: "0 0 24 24",
    stroke: true,
    paths: ["M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"],
  },
  news: {
    viewBox: "0 0 24 24",
    stroke: true,
    paths: [
      "M4 19.5A2.5 2.5 0 0 1 6.5 17H20",
      "M4 4h16v9H4z",
      "M8 8h8",
      "M8 12h5",
    ],
  },
  gaming: {
    viewBox: "0 0 24 24",
    stroke: true,
    paths: [
      "M6 12h4",
      "M8 10v4",
      "M15 11h.01",
      "M18 13h.01",
      "M17.5 7.5a8 8 0 1 0 0 9",
    ],
  },
  shopping: {
    viewBox: "0 0 24 24",
    stroke: true,
    paths: [
      "M6 6h15l-1.5 9H8L6 6Z",
      "M6 6 5 3H2",
      "M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z",
      "M18 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z",
    ],
  },
  reading: {
    viewBox: "0 0 24 24",
    stroke: true,
    paths: [
      "M12 6.5c-2-1.8-5-2-7-1v11c2-1 5-1 7 1",
      "M12 6.5c2-1.8 5-2 7-1v11c-2-1-5-1-7 1",
    ],
  },
  other: {
    viewBox: "0 0 24 24",
    stroke: true,
    paths: [
      "M12 8h.01",
      "M12 12v4",
      "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z",
    ],
  },
};
