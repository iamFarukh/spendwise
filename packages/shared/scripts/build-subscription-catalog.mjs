#!/usr/bin/env node
/**
 * Builds `catalog.generated.ts` from structured subscription master data.
 * Run: node scripts/build-subscription-catalog.mjs
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "../src/subscriptions/catalog.generated.ts");

/** @typedef {'weekly'|'monthly'|'quarterly'|'half_yearly'|'yearly'} Cycle */

/**
 * @param {string} id
 * @param {string} name
 * @param {string} category
 * @param {string} iconSlug
 * @param {string[]} searchKeywords
 * @param {{ defaultCycle?: Cycle, isPopular?: boolean, color?: string, mark?: string }} [opts]
 */
function s(id, name, category, iconSlug, searchKeywords, opts = {}) {
  return {
    id,
    name,
    category,
    iconSlug,
    defaultCycle: opts.defaultCycle ?? "monthly",
    isPopular: opts.isPopular ?? false,
    searchKeywords,
    ...(opts.color ? { color: opts.color } : {}),
    ...(opts.mark ? { mark: opts.mark } : {}),
  };
}

const CATALOG = [
  // ── AI ──────────────────────────────────────────────────────────────────
  s("chatgpt-plus", "ChatGPT Plus", "AI", "openai", ["chatgpt", "openai", "gpt", "ai"], { isPopular: true }),
  s("chatgpt-pro", "ChatGPT Pro", "AI", "openai", ["chatgpt", "openai", "gpt", "ai pro"], { isPopular: true }),
  s("claude-pro", "Claude Pro", "AI", "anthropic", ["claude", "anthropic", "ai"], { isPopular: true }),
  s("claude-max", "Claude Max", "AI", "anthropic", ["claude", "anthropic", "max"]),
  s("cursor-pro", "Cursor Pro", "AI", "cursor", ["cursor", "ai editor", "anysphere"], { isPopular: true }),
  s("gemini-advanced", "Gemini Advanced", "AI", "google", ["gemini", "google", "bard", "ai"], { isPopular: true }),
  s("perplexity-pro", "Perplexity Pro", "AI", "perplexity", ["perplexity", "search ai", "ai"], { isPopular: true }),
  s("github-copilot", "GitHub Copilot", "AI", "githubcopilot", ["copilot", "github", "ai code"], { isPopular: true }),
  s("midjourney", "Midjourney", "AI", "midjourney", ["midjourney", "image ai", "art ai"], { isPopular: true }),
  s("runway", "Runway", "AI", "runway", ["runway", "video ai", "runwayml"]),
  s("elevenlabs", "ElevenLabs", "AI", "elevenlabs", ["elevenlabs", "voice ai", "tts"]),
  s("lovable", "Lovable", "AI", "lovable", ["lovable", "ai app", "website builder"]),
  s("windsurf", "Windsurf", "AI", "windsurf", ["windsurf", "codeium", "ai ide"]),
  s("replit", "Replit", "AI", "replit", ["replit", "ide", "ai code"]),
  s("bolt", "Bolt", "AI", "bolt", ["bolt", "stackblitz", "ai app"]),
  s("character-ai", "Character AI", "AI", "characterai", ["character ai", "character.ai", "chatbot"]),
  s("poe", "Poe", "AI", "poe", ["poe", "quora", "ai chat"]),
  s("blackbox-ai", "Blackbox AI", "AI", "blackbox", ["blackbox", "ai code"]),
  s("grammarly", "Grammarly", "AI", "grammarly", ["grammarly", "writing", "grammar"]),
  s("notion-ai", "Notion AI", "AI", "notion", ["notion", "ai notes"]),
  s("jasper", "Jasper", "AI", "jasper", ["jasper", "copywriting", "ai"]),
  s("mistral-le-chat", "Mistral Le Chat", "AI", "mistral", ["mistral", "le chat", "ai"]),
  s("suno", "Suno", "AI", "suno", ["suno", "music ai", "song ai"]),
  s("pika", "Pika", "AI", "pika", ["pika", "video ai"]),
  s("leonardo-ai", "Leonardo.ai", "AI", "leonardo", ["leonardo", "image ai", "art"]),
  s("deepl-pro", "DeepL Pro", "AI", "deepl", ["deepl", "translate", "translation"]),

  // ── Streaming ─────────────────────────────────────────────────────────
  s("netflix", "Netflix", "Streaming", "netflix", ["netflix", "movies", "shows"], { isPopular: true }),
  s("prime-video", "Prime Video", "Streaming", "primevideo", ["prime video", "amazon prime video", "amazon"], { isPopular: true }),
  s("disney-plus", "Disney+", "Streaming", "disneyplus", ["disney", "disney plus", "marvel"], { isPopular: true }),
  s("jiohotstar", "JioHotstar", "Streaming", "jiohotstar", ["jiohotstar", "hotstar", "disney hotstar", "jio"], { isPopular: true }),
  s("sonyliv", "Sony LIV", "Streaming", "sonyliv", ["sony liv", "sonyliv", "sony"], { isPopular: true }),
  s("zee5", "Zee5", "Streaming", "zee5", ["zee5", "zee five", "zee"]),
  s("crunchyroll", "Crunchyroll", "Streaming", "crunchyroll", ["crunchyroll", "anime"], { isPopular: true }),
  s("apple-tv-plus", "Apple TV+", "Streaming", "appletv", ["apple tv", "apple tv plus", "tv+"], { isPopular: true }),
  s("paramount-plus", "Paramount+", "Streaming", "paramountplus", ["paramount", "paramount plus"], { isPopular: true }),
  s("hbo-max", "Max", "Streaming", "max", ["max", "hbo max", "hbo"], { isPopular: true }),
  s("hulu", "Hulu", "Streaming", "hulu", ["hulu", "streaming"], { isPopular: true }),
  s("youtube-premium", "YouTube Premium", "Streaming", "youtube", ["youtube", "youtube premium", "yt"], { isPopular: true }),
  s("peacock", "Peacock", "Streaming", "peacock", ["peacock", "nbc"]),
  s("espn-plus", "ESPN+", "Streaming", "espn", ["espn", "espn plus", "sports"]),
  s("jiocinema", "JioCinema", "Streaming", "jiocinema", ["jiocinema", "jio cinema"]),
  s("discovery-plus", "Discovery+", "Streaming", "discoveryplus", ["discovery", "discovery plus"]),
  s("mubi", "MUBI", "Streaming", "mubi", ["mubi", "films", "cinema"]),
  s("sling-tv", "Sling TV", "Streaming", "sling", ["sling", "sling tv", "live tv"]),
  s("fubo", "Fubo", "Streaming", "fubo", ["fubo", "fubotv", "sports"]),
  s("dazn", "DAZN", "Streaming", "dazn", ["dazn", "sports streaming"]),

  // ── Music ─────────────────────────────────────────────────────────────
  s("spotify-premium", "Spotify Premium", "Music", "spotify", ["spotify", "music", "premium"], { isPopular: true }),
  s("apple-music", "Apple Music", "Music", "applemusic", ["apple music", "itunes", "music"], { isPopular: true }),
  s("youtube-music", "YouTube Music", "Music", "youtubemusic", ["youtube music", "yt music", "music"], { isPopular: true }),
  s("amazon-music", "Amazon Music", "Music", "amazonmusic", ["amazon music", "music unlimited"], { isPopular: true }),
  s("jiosaavn-pro", "JioSaavn Pro", "Music", "jiosaavn", ["jiosaavn", "saavn", "jio music"], { isPopular: true }),
  s("gaana-plus", "Gaana Plus", "Music", "gaana", ["gaana", "music"]),
  s("tidal", "Tidal", "Music", "tidal", ["tidal", "hifi", "music"]),
  s("soundcloud-go", "SoundCloud Go", "Music", "soundcloud", ["soundcloud", "music"]),
  s("deezer", "Deezer", "Music", "deezer", ["deezer", "music"]),
  s("pandora", "Pandora", "Music", "pandora", ["pandora", "radio", "music"]),
  s("qobuz", "Qobuz", "Music", "qobuz", ["qobuz", "hi-res", "music"]),

  // ── Cloud Storage ─────────────────────────────────────────────────────
  s("google-one", "Google One", "Cloud Storage", "googleone", ["google one", "google", "drive", "storage", "google drive", "google photos"], { isPopular: true }),
  s("icloud-plus", "iCloud+", "Cloud Storage", "icloud", ["icloud", "apple icloud", "icloud plus", "storage"], { isPopular: true }),
  s("dropbox", "Dropbox", "Cloud Storage", "dropbox", ["dropbox", "storage", "files"], { isPopular: true }),
  s("onedrive", "OneDrive", "Cloud Storage", "onedrive", ["onedrive", "microsoft onedrive", "storage"], { isPopular: true }),
  s("mega", "MEGA", "Cloud Storage", "mega", ["mega", "storage"]),
  s("box", "Box", "Cloud Storage", "box", ["box", "storage"]),
  s("pcloud", "pCloud", "Cloud Storage", "pcloud", ["pcloud", "storage"]),
  s("backblaze", "Backblaze", "Cloud Storage", "backblaze", ["backblaze", "backup", "storage"]),
  s("proton-drive", "Proton Drive", "Cloud Storage", "protondrive", ["proton drive", "proton", "storage"]),
  s("sync-com", "Sync.com", "Cloud Storage", "sync", ["sync.com", "sync", "storage"]),

  // ── Productivity ──────────────────────────────────────────────────────
  s("notion-plus", "Notion Plus", "Productivity", "notion", ["notion", "notion plus", "notes", "wiki"], { isPopular: true }),
  s("todoist-pro", "Todoist Pro", "Productivity", "todoist", ["todoist", "tasks", "todo"], { isPopular: true }),
  s("evernote", "Evernote", "Productivity", "evernote", ["evernote", "notes"]),
  s("slack-pro", "Slack Pro", "Productivity", "slack", ["slack", "chat", "team"], { isPopular: true }),
  s("zoom-pro", "Zoom Pro", "Productivity", "zoom", ["zoom", "meetings", "video"], { isPopular: true }),
  s("calendly", "Calendly", "Productivity", "calendly", ["calendly", "scheduling"]),
  s("microsoft-365", "Microsoft 365", "Productivity", "microsoft365", ["microsoft", "office", "word", "excel", "outlook", "m365"], { isPopular: true }),
  s("google-workspace", "Google Workspace", "Productivity", "googleworkspace", ["google workspace", "gsuite", "g suite", "gmail"], { isPopular: true }),
  s("trello", "Trello", "Productivity", "trello", ["trello", "kanban", "boards"]),
  s("asana", "Asana", "Productivity", "asana", ["asana", "project"]),
  s("clickup", "ClickUp", "Productivity", "clickup", ["clickup", "tasks"]),
  s("monday", "Monday.com", "Productivity", "monday", ["monday", "work os"]),
  s("airtable", "Airtable", "Productivity", "airtable", ["airtable", "database", "spreadsheet"]),
  s("obsidian", "Obsidian", "Productivity", "obsidian", ["obsidian", "notes", "sync"]),
  s("zapier", "Zapier", "Productivity", "zapier", ["zapier", "automation"]),
  s("superhuman", "Superhuman", "Productivity", "superhuman", ["superhuman", "email"]),
  s("fantastical", "Fantastical", "Productivity", "fantastical", ["fantastical", "calendar"]),
  s("otter-ai", "Otter.ai", "Productivity", "otter", ["otter", "transcription", "notes"]),
  s("roam-research", "Roam Research", "Productivity", "roam", ["roam", "roam research", "notes"]),
  s("bear", "Bear", "Productivity", "bear", ["bear", "notes"]),
  s("things", "Things", "Productivity", "things", ["things", "tasks", "cultured code"]),
  s("setapp", "Setapp", "Productivity", "setapp", ["setapp", "mac apps"]),

  // ── Developer Tools ─────────────────────────────────────────────────────
  s("github-pro", "GitHub Pro", "Developer Tools", "github", ["github", "git", "pro"], { isPopular: true }),
  s("github-copilot-dev", "GitHub Copilot", "Developer Tools", "githubcopilot", ["copilot", "github", "ai code"], { isPopular: true }),
  s("vercel-pro", "Vercel Pro", "Developer Tools", "vercel", ["vercel", "hosting", "nextjs"], { isPopular: true }),
  s("netlify-pro", "Netlify Pro", "Developer Tools", "netlify", ["netlify", "hosting"]),
  s("railway", "Railway", "Developer Tools", "railway", ["railway", "hosting"]),
  s("render", "Render", "Developer Tools", "render", ["render", "hosting", "cloud"]),
  s("supabase-pro", "Supabase Pro", "Developer Tools", "supabase", ["supabase", "database", "backend"], { isPopular: true }),
  s("firebase-blaze", "Firebase Blaze", "Developer Tools", "firebase", ["firebase", "google cloud", "backend"]),
  s("cloudflare-pro", "Cloudflare Pro", "Developer Tools", "cloudflare", ["cloudflare", "cdn", "dns"]),
  s("digitalocean", "DigitalOcean", "Developer Tools", "digitalocean", ["digitalocean", "cloud", "droplet"]),
  s("aws", "AWS", "Developer Tools", "aws", ["aws", "amazon web services", "amazon cloud", "cloud"], { isPopular: true }),
  s("linode", "Linode", "Developer Tools", "linode", ["linode", "akamai", "cloud"]),
  s("gitlab", "GitLab", "Developer Tools", "gitlab", ["gitlab", "git"]),
  s("jetbrains", "JetBrains", "Developer Tools", "jetbrains", ["jetbrains", "intellij", "pycharm", "webstorm"]),
  s("linear", "Linear", "Developer Tools", "linear", ["linear", "issues", "tracker"]),
  s("postman", "Postman", "Developer Tools", "postman", ["postman", "api"]),
  s("heroku", "Heroku", "Developer Tools", "heroku", ["heroku", "hosting"]),
  s("sentry", "Sentry", "Developer Tools", "sentry", ["sentry", "errors", "monitoring"]),
  s("mongodb-atlas", "MongoDB Atlas", "Developer Tools", "mongodb", ["mongodb", "database"]),
  s("docker", "Docker", "Developer Tools", "docker", ["docker", "containers"]),
  s("npm-pro", "npm Pro", "Developer Tools", "npm", ["npm", "packages"]),
  s("raycast", "Raycast", "Developer Tools", "raycast", ["raycast", "launcher", "mac"]),
  s("planetscale", "PlanetScale", "Developer Tools", "planetscale", ["planetscale", "database", "mysql"]),

  // ── Design & Creative ─────────────────────────────────────────────────
  s("adobe-lightroom", "Adobe Lightroom", "Design & Creative", "adobelightroom", ["adobe", "lightroom", "photo"], { isPopular: true }),
  s("adobe-photoshop", "Adobe Photoshop", "Design & Creative", "adobephotoshop", ["adobe", "photoshop", "photo"], { isPopular: true }),
  s("adobe-cc", "Adobe Creative Cloud", "Design & Creative", "adobe", ["adobe", "creative cloud", "cc"], { isPopular: true }),
  s("canva-pro", "Canva Pro", "Design & Creative", "canva", ["canva", "design"], { isPopular: true }),
  s("figma-pro", "Figma Professional", "Design & Creative", "figma", ["figma", "design", "ui"], { isPopular: true }),
  s("framer-pro", "Framer Pro", "Design & Creative", "framer", ["framer", "website", "design"]),
  s("capcut-pro", "CapCut Pro", "Design & Creative", "capcut", ["capcut", "video edit", "tiktok"]),
  s("envato-elements", "Envato Elements", "Design & Creative", "envato", ["envato", "elements", "stock"]),
  s("sketch", "Sketch", "Design & Creative", "sketch", ["sketch", "design", "ui"]),
  s("affinity-designer", "Affinity Designer", "Design & Creative", "affinity", ["affinity", "designer", "serif"]),
  s("procreate", "Procreate", "Design & Creative", "procreate", ["procreate", "drawing", "ipad"]),
  s("dribbble-pro", "Dribbble Pro", "Design & Creative", "dribbble", ["dribbble", "design"]),
  s("webflow", "Webflow", "Design & Creative", "webflow", ["webflow", "website builder"]),
  s("spline", "Spline", "Design & Creative", "spline", ["spline", "3d design"]),

  // ── Security ──────────────────────────────────────────────────────────
  s("1password", "1Password", "Security", "1password", ["1password", "passwords", "password manager"], { isPopular: true }),
  s("bitwarden", "Bitwarden Premium", "Security", "bitwarden", ["bitwarden", "passwords"], { isPopular: true }),
  s("dashlane", "Dashlane", "Security", "dashlane", ["dashlane", "passwords"]),
  s("nordvpn", "NordVPN", "Security", "nordvpn", ["nordvpn", "vpn"], { isPopular: true }),
  s("surfshark", "Surfshark", "Security", "surfshark", ["surfshark", "vpn"]),
  s("expressvpn", "ExpressVPN", "Security", "expressvpn", ["expressvpn", "vpn"]),
  s("proton-vpn", "Proton VPN", "Security", "protonvpn", ["proton", "proton vpn", "vpn"]),
  s("proton-mail", "Proton Mail", "Security", "protonmail", ["proton mail", "proton", "email"]),
  s("lastpass", "LastPass", "Security", "lastpass", ["lastpass", "passwords"]),
  s("norton-360", "Norton 360", "Security", "norton", ["norton", "antivirus"]),
  s("mcafee", "McAfee", "Security", "mcafee", ["mcafee", "antivirus"]),
  s("bitdefender", "Bitdefender", "Security", "bitdefender", ["bitdefender", "antivirus"]),
  s("malwarebytes", "Malwarebytes", "Security", "malwarebytes", ["malwarebytes", "antivirus"]),

  // ── Learning ──────────────────────────────────────────────────────────
  s("udemy", "Udemy", "Learning", "udemy", ["udemy", "courses"], { isPopular: true }),
  s("coursera-plus", "Coursera Plus", "Learning", "coursera", ["coursera", "courses"], { isPopular: true }),
  s("skillshare", "Skillshare", "Learning", "skillshare", ["skillshare", "classes"], { isPopular: true }),
  s("masterclass", "MasterClass", "Learning", "masterclass", ["masterclass", "classes"]),
  s("brilliant", "Brilliant", "Learning", "brilliant", ["brilliant", "math", "science"]),
  s("duolingo-super", "Duolingo Super", "Learning", "duolingo", ["duolingo", "language"], { isPopular: true }),
  s("udacity", "Udacity", "Learning", "udacity", ["udacity", "nanodegree", "courses"]),
  s("datacamp", "DataCamp", "Learning", "datacamp", ["datacamp", "data science"]),
  s("linkedin-learning", "LinkedIn Learning", "Learning", "linkedinlearning", ["linkedin learning", "lynda", "courses"]),
  s("khan-academy", "Khan Academy", "Learning", "khanacademy", ["khan academy", "learning"]),
  s("pluralsight", "Pluralsight", "Learning", "pluralsight", ["pluralsight", "tech courses"]),
  s("codecademy-pro", "Codecademy Pro", "Learning", "codecademy", ["codecademy", "coding"]),
  s("babbel", "Babbel", "Learning", "babbel", ["babbel", "language"]),
  s("rosetta-stone", "Rosetta Stone", "Learning", "rosettastone", ["rosetta stone", "language"]),
  s("quizlet-plus", "Quizlet Plus", "Learning", "quizlet", ["quizlet", "flashcards"]),

  // ── Fitness ───────────────────────────────────────────────────────────
  s("cult-fit", "Cult Fit", "Fitness", "cultfit", ["cult fit", "cultfit", "gym", "workout"], { isPopular: true }),
  s("healthifyme", "HealthifyMe", "Fitness", "healthifyme", ["healthifyme", "diet", "fitness"]),
  s("myfitnesspal", "MyFitnessPal Premium", "Fitness", "myfitnesspal", ["myfitnesspal", "calories", "diet"], { isPopular: true }),
  s("fittr", "Fittr", "Fitness", "fittr", ["fittr", "fitness", "diet"]),
  s("strava-premium", "Strava Premium", "Fitness", "strava", ["strava", "running", "cycling"], { isPopular: true }),
  s("nike-training", "Nike Training Club", "Fitness", "nike", ["nike", "ntc", "workout"]),
  s("peloton", "Peloton", "Fitness", "peloton", ["peloton", "workout", "cycling"]),
  s("calm", "Calm", "Fitness", "calm", ["calm", "meditation", "sleep"]),
  s("headspace", "Headspace", "Fitness", "headspace", ["headspace", "meditation"]),
  s("fitbit-premium", "Fitbit Premium", "Fitness", "fitbit", ["fitbit", "health"]),
  s("whoop", "WHOOP", "Fitness", "whoop", ["whoop", "fitness band"]),
  s("apple-fitness-plus", "Apple Fitness+", "Fitness", "apple", ["apple fitness", "workout"]),
  s("garmin-connect", "Garmin Connect+", "Fitness", "garmin", ["garmin", "fitness"]),
  s("oura", "Oura", "Fitness", "oura", ["oura", "ring", "sleep"]),
  s("flo-premium", "Flo Premium", "Fitness", "flo", ["flo", "period", "health"]),

  // ── Finance ───────────────────────────────────────────────────────────
  s("tradingview", "TradingView", "Finance", "tradingview", ["tradingview", "charts", "stocks"], { isPopular: true }),
  s("moneycontrol-pro", "Moneycontrol Pro", "Finance", "moneycontrol", ["moneycontrol", "stocks", "india"]),
  s("tickertape-pro", "Tickertape Pro", "Finance", "tickertape", ["tickertape", "stocks", "india"]),
  s("smallcase", "Smallcase", "Finance", "smallcase", ["smallcase", "investing", "india"]),
  s("et-money-genius", "ET Money Genius", "Finance", "etmoney", ["et money", "etmoney", "mutual funds"]),
  s("indmoney-premium", "INDmoney Premium", "Finance", "indmoney", ["indmoney", "investing", "india"]),
  s("quickbooks", "QuickBooks", "Finance", "quickbooks", ["quickbooks", "accounting", "intuit"]),
  s("ynab", "YNAB", "Finance", "ynab", ["ynab", "you need a budget", "budget"]),
  s("morningstar", "Morningstar", "Finance", "morningstar", ["morningstar", "investing"]),
  s("robinhood-gold", "Robinhood Gold", "Finance", "robinhood", ["robinhood", "stocks"]),
  s("zerodha-kite", "Zerodha Kite", "Finance", "zerodha", ["zerodha", "trading", "india"]),
  s("groww", "Groww", "Finance", "groww", ["groww", "investing", "mutual funds"]),
  s("coinbase-one", "Coinbase One", "Finance", "coinbase", ["coinbase", "crypto"]),
  s("seeking-alpha", "Seeking Alpha", "Finance", "seekingalpha", ["seeking alpha", "stocks"]),
  s("empower", "Empower", "Finance", "empower", ["empower", "personal capital", "wealth"]),

  // ── Communication ───────────────────────────────────────────────────────
  s("telegram-premium", "Telegram Premium", "Communication", "telegram", ["telegram", "messaging"], { isPopular: true }),
  s("discord-nitro", "Discord Nitro", "Communication", "discord", ["discord", "nitro", "gaming"], { isPopular: true }),
  s("x-premium", "X Premium", "Communication", "x", ["x", "twitter", "twitter blue"], { isPopular: true }),
  s("linkedin-premium", "LinkedIn Premium", "Communication", "linkedin", ["linkedin", "premium", "networking"], { isPopular: true }),
  s("skype", "Skype", "Communication", "skype", ["skype", "calls", "microsoft"]),
  s("truecaller-premium", "Truecaller Premium", "Communication", "truecaller", ["truecaller", "caller id"]),
  s("microsoft-teams", "Microsoft Teams", "Communication", "teams", ["teams", "microsoft teams"]),
  s("snapchat-plus", "Snapchat+", "Communication", "snapchat", ["snapchat", "snapchat plus"]),
  s("reddit-premium", "Reddit Premium", "Communication", "reddit", ["reddit", "premium"]),
  s("tinder-gold", "Tinder Gold", "Communication", "tinder", ["tinder", "dating"]),
  s("bumble-premium", "Bumble Premium", "Communication", "bumble", ["bumble", "dating"]),
  s("hinge-plus", "Hinge+", "Communication", "hinge", ["hinge", "dating"]),

  // ── News ────────────────────────────────────────────────────────────────
  s("nyt", "The New York Times", "News", "nytimes", ["nyt", "new york times", "news"]),
  s("wsj", "The Wall Street Journal", "News", "wsj", ["wsj", "wall street journal"]),
  s("the-economist", "The Economist", "News", "economist", ["economist", "news"]),
  s("washington-post", "The Washington Post", "News", "washingtonpost", ["washington post", "wapo"]),
  s("bloomberg", "Bloomberg", "News", "bloomberg", ["bloomberg", "finance news"]),
  s("financial-times", "Financial Times", "News", "financialtimes", ["financial times", "ft"]),
  s("the-guardian", "The Guardian", "News", "theguardian", ["guardian", "news"]),
  s("medium", "Medium", "News", "medium", ["medium", "blogs", "reading"]),
  s("substack", "Substack", "News", "substack", ["substack", "newsletter"]),
  s("the-athletic", "The Athletic", "News", "athletic", ["the athletic", "sports news"]),
  s("apple-news-plus", "Apple News+", "News", "applenews", ["apple news", "news"]),
  s("reuters", "Reuters", "News", "reuters", ["reuters", "news"]),

  // ── Gaming ────────────────────────────────────────────────────────────
  s("xbox-game-pass", "Xbox Game Pass", "Gaming", "xbox", ["xbox", "game pass"], { isPopular: true }),
  s("playstation-plus", "PlayStation Plus", "Gaming", "playstation", ["playstation", "ps plus", "psn"], { isPopular: true }),
  s("nintendo-switch-online", "Nintendo Switch Online", "Gaming", "nintendo", ["nintendo", "switch"]),
  s("ea-play", "EA Play", "Gaming", "ea", ["ea play", "electronic arts"]),
  s("ubisoft-plus", "Ubisoft+", "Gaming", "ubisoft", ["ubisoft", "ubisoft plus"]),
  s("geforce-now", "GeForce Now", "Gaming", "nvidia", ["geforce now", "nvidia", "cloud gaming"]),
  s("twitch-turbo", "Twitch Turbo", "Gaming", "twitch", ["twitch", "streaming"]),
  s("apple-arcade", "Apple Arcade", "Gaming", "applearcade", ["apple arcade", "games"]),
  s("google-play-pass", "Google Play Pass", "Gaming", "googleplay", ["google play pass", "games"]),
  s("roblox-premium", "Roblox Premium", "Gaming", "roblox", ["roblox", "games"]),
  s("minecraft-realms", "Minecraft Realms", "Gaming", "minecraft", ["minecraft", "realms"]),

  // ── Shopping ──────────────────────────────────────────────────────────
  s("amazon-prime", "Amazon Prime", "Shopping", "amazonprime", ["amazon prime", "amazon", "prime"], { isPopular: true }),
  s("walmart-plus", "Walmart+", "Shopping", "walmart", ["walmart", "walmart plus"]),
  s("costco", "Costco", "Shopping", "costco", ["costco", "membership"]),
  s("instacart-plus", "Instacart+", "Shopping", "instacart", ["instacart", "groceries"]),
  s("doordash-dashpass", "DoorDash DashPass", "Shopping", "doordash", ["doordash", "food delivery"]),
  s("uber-one", "Uber One", "Shopping", "uber", ["uber", "ubereats"]),
  s("lyft-pink", "Lyft Pink", "Shopping", "lyft", ["lyft", "rides"]),
  s("zomato-gold", "Zomato Gold", "Shopping", "zomato", ["zomato", "food"]),
  s("swiggy-one", "Swiggy One", "Shopping", "swiggy", ["swiggy", "food"]),
  s("blinkit", "Blinkit", "Shopping", "blinkit", ["blinkit", "groceries"]),
  s("flipkart-plus", "Flipkart Plus", "Shopping", "flipkart", ["flipkart", "shopping"]),
  s("myntra", "Myntra", "Shopping", "myntra", ["myntra", "fashion"]),
  s("etsy-plus", "Etsy Plus", "Shopping", "etsy", ["etsy", "marketplace"]),

  // ── Reading ─────────────────────────────────────────────────────────────
  s("audible", "Audible", "Reading", "audible", ["audible", "audiobooks", "amazon"]),
  s("kindle-unlimited", "Kindle Unlimited", "Reading", "kindle", ["kindle", "books", "amazon"]),
  s("everand", "Everand", "Reading", "scribd", ["everand", "scribd", "books"]),
  s("blinkist", "Blinkist", "Reading", "blinkist", ["blinkist", "book summaries"]),
  s("storytel", "Storytel", "Reading", "storytel", ["storytel", "audiobooks"]),
  s("patreon", "Patreon", "Reading", "patreon", ["patreon", "creators"]),
  s("onlyfans", "OnlyFans", "Reading", "onlyfans", ["onlyfans", "creators"]),

  // ── Other ───────────────────────────────────────────────────────────────
  s("squarespace", "Squarespace", "Other", "squarespace", ["squarespace", "website"]),
  s("wix", "Wix", "Other", "wix", ["wix", "website"]),
  s("wordpress", "WordPress.com", "Other", "wordpress", ["wordpress", "blog", "website"]),
  s("shopify", "Shopify", "Other", "shopify", ["shopify", "ecommerce", "store"]),
  s("mailchimp", "Mailchimp", "Other", "mailchimp", ["mailchimp", "email marketing"]),
  s("hubspot", "HubSpot", "Other", "hubspot", ["hubspot", "crm", "marketing"]),
  s("salesforce", "Salesforce", "Other", "salesforce", ["salesforce", "crm"]),
  s("docusign", "DocuSign", "Other", "docusign", ["docusign", "e-signature"]),
  s("apple-one", "Apple One", "Other", "appleone", ["apple one", "bundle"]),
];

const ids = new Set();
for (const item of CATALOG) {
  if (ids.has(item.id)) {
    throw new Error(`Duplicate id: ${item.id}`);
  }
  ids.add(item.id);
}

console.log(`Catalog entries: ${CATALOG.length}`);

const header = `/**
 * AUTO-GENERATED — do not edit by hand.
 * Run \`node scripts/build-subscription-catalog.mjs\` to refresh.
 */
import type { SubscriptionAsset } from "./types";

export const SUBSCRIPTION_ASSETS: SubscriptionAsset[] = `;

writeFileSync(OUT, `${header}${JSON.stringify(CATALOG, null, 2)} as SubscriptionAsset[];\n`);
