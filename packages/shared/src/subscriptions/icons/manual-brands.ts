/**
 * Hand-authored brand tiles for services whose vector logo is NOT available
 * offline (trademark-removed from Simple Icons / Iconify). Instead of a generic
 * category glyph, each renders a recognizable brand-colored tile with the
 * brand's real color + a tight monogram — distinct per brand, fully local.
 *
 * Keyed by the REGISTRY-RESOLVED slug (the target of `resolveSubscriptionIconSlug`).
 * To find slugs that need an entry, run
 * `node scripts/generate-subscription-icons.mjs` and read its "Missing" list.
 */
export interface SubscriptionManualBrandTile {
  /** Brand background color (hex). */
  hex: string;
  /** 1–3 character monogram drawn over the tile. */
  monogram: string;
  /** Human title (documentation / future use). */
  title: string;
}

export const SUBSCRIPTION_MANUAL_BRAND_TILES: Record<
  string,
  SubscriptionManualBrandTile
> = {
  // Streaming
  disneyplus: { hex: "#113CCF", monogram: "D+", title: "Disney+" },
  hotstar: { hex: "#1F80E0", monogram: "H", title: "Disney+ Hotstar" },
  sonyliv: { hex: "#1A1B4B", monogram: "SL", title: "SonyLIV" },
  zee5: { hex: "#6A1B9A", monogram: "Z5", title: "ZEE5" },
  jiocinema: { hex: "#E5006E", monogram: "JC", title: "JioCinema" },
  peacock: { hex: "#000000", monogram: "Pk", title: "Peacock" },
  discoveryplus: { hex: "#2175D9", monogram: "D+", title: "Discovery+" },
  sling: { hex: "#000000", monogram: "S", title: "Sling TV" },
  espn: { hex: "#D50A0A", monogram: "E", title: "ESPN+" },

  // Music
  jiosaavn: { hex: "#2BC5B4", monogram: "JS", title: "JioSaavn" },
  gaana: { hex: "#E72C30", monogram: "G", title: "Gaana" },
  qobuz: { hex: "#0B0B0B", monogram: "Q", title: "Qobuz" },

  // AI / Creative
  midjourney: { hex: "#000000", monogram: "M", title: "Midjourney" },
  runway: { hex: "#000000", monogram: "R", title: "Runway" },
  leonardo: { hex: "#7C3AED", monogram: "L", title: "Leonardo.ai" },
  jasper: { hex: "#FF7A59", monogram: "J", title: "Jasper" },
  characterai: { hex: "#5D3FD3", monogram: "C", title: "Character.AI" },
  lovable: { hex: "#FF5A5F", monogram: "Lo", title: "Lovable" },
  bolt: { hex: "#FFA500", monogram: "Bo", title: "Bolt" },
  blackbox: { hex: "#000000", monogram: "Bb", title: "Blackbox AI" },
  capcut: { hex: "#000000", monogram: "Cc", title: "CapCut" },
  otter: { hex: "#00B2A9", monogram: "Ot", title: "Otter.ai" },
  pika: { hex: "#111111", monogram: "Pi", title: "Pika" },

  // Cloud
  pcloud: { hex: "#00A4E4", monogram: "pC", title: "pCloud" },
  sync: { hex: "#1A6DF0", monogram: "Sy", title: "Sync.com" },

  // Productivity
  monday: { hex: "#FF3D57", monogram: "Mo", title: "Monday.com" },
  superhuman: { hex: "#000000", monogram: "Sh", title: "Superhuman" },
  fantastical: { hex: "#FF3B30", monogram: "Fa", title: "Fantastical" },
  bear: { hex: "#E0392B", monogram: "Be", title: "Bear" },

  // Developer
  linode: { hex: "#00A95C", monogram: "Ln", title: "Linode" },
  spline: { hex: "#111111", monogram: "Sp", title: "Spline" },

  // Design / Creative
  procreate: { hex: "#5E4B8B", monogram: "Pr", title: "Procreate" },

  // Learning
  masterclass: { hex: "#000000", monogram: "MC", title: "MasterClass" },
  brilliant: { hex: "#FCC419", monogram: "Br", title: "Brilliant" },
  babbel: { hex: "#FF6700", monogram: "Ba", title: "Babbel" },
  rosettastone: { hex: "#0098DB", monogram: "RS", title: "Rosetta Stone" },

  // Fitness
  cultfit: { hex: "#FF3274", monogram: "Cf", title: "cult.fit" },
  healthifyme: { hex: "#1EBEA5", monogram: "Hm", title: "HealthifyMe" },
  myfitnesspal: { hex: "#0066EE", monogram: "Mf", title: "MyFitnessPal" },
  fittr: { hex: "#00B386", monogram: "Ft", title: "Fittr" },
  calm: { hex: "#3F6FED", monogram: "Ca", title: "Calm" },
  whoop: { hex: "#000000", monogram: "W", title: "WHOOP" },
  oura: { hex: "#000000", monogram: "Ou", title: "Oura" },
  flo: { hex: "#FE5196", monogram: "Fl", title: "Flo" },

  // Finance
  moneycontrol: { hex: "#1A6B4C", monogram: "Mc", title: "Moneycontrol" },
  tickertape: { hex: "#5367FF", monogram: "TT", title: "Tickertape" },
  smallcase: { hex: "#1F2937", monogram: "Sc", title: "smallcase" },
  etmoney: { hex: "#00B386", monogram: "ET", title: "ET Money" },
  indmoney: { hex: "#00C853", monogram: "IN", title: "INDmoney" },
  groww: { hex: "#00D09C", monogram: "Gr", title: "Groww" },
  ynab: { hex: "#1E9FD8", monogram: "Y", title: "YNAB" },
  morningstar: { hex: "#D9232E", monogram: "Ms", title: "Morningstar" },
  seekingalpha: { hex: "#FB761E", monogram: "SA", title: "Seeking Alpha" },
  empower: { hex: "#2B6BB2", monogram: "Em", title: "Empower" },

  // Communication / Social
  truecaller: { hex: "#0087FF", monogram: "Tc", title: "Truecaller" },
  bumble: { hex: "#FFC629", monogram: "Bu", title: "Bumble" },
  hinge: { hex: "#000000", monogram: "Hi", title: "Hinge" },

  // News
  bloomberg: { hex: "#000000", monogram: "B", title: "Bloomberg" },
  economist: { hex: "#E3120B", monogram: "E", title: "The Economist" },
  financialtimes: { hex: "#990F3D", monogram: "FT", title: "Financial Times" },
  washingtonpost: { hex: "#000000", monogram: "WP", title: "Washington Post" },
  wsj: { hex: "#000000", monogram: "WSJ", title: "Wall Street Journal" },
  reuters: { hex: "#FF8000", monogram: "R", title: "Reuters" },
  theathletic: { hex: "#000000", monogram: "A", title: "The Athletic" },

  // Shopping
  costco: { hex: "#005DAA", monogram: "Co", title: "Costco" },
  blinkit: { hex: "#F8CB46", monogram: "Bk", title: "Blinkit" },
  myntra: { hex: "#FF3F6C", monogram: "My", title: "Myntra" },

  // Reading
  kindle: { hex: "#FF9900", monogram: "K", title: "Kindle Unlimited" },
  blinkist: { hex: "#00B96B", monogram: "Bl", title: "Blinkist" },
  storytel: { hex: "#FF5A36", monogram: "St", title: "Storytel" },
};

export function getSubscriptionManualBrandTile(
  resolvedSlug: string,
): SubscriptionManualBrandTile | null {
  return SUBSCRIPTION_MANUAL_BRAND_TILES[resolvedSlug] ?? null;
}
