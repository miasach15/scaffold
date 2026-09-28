// Shared swatch palette a user can assign to any category (see CategoryColorsContext +
// SettingsModal) — the same named colors as the accent-color picker's THEME_PRESETS, so
// a category color and an app accent color always mean the same "Sky"/"Coral"/etc.
// Keys are stable identifiers stored per-user; the actual {bg,border,text} triples live
// here in one place, each derived from that swatch's own THEME_PRESETS primary hue (a
// pale bg, a mid-tone border, a dark readable text — same hue carried through all three).
export const CATEGORY_COLOR_SWATCHES = {
  pink: { bg: "#FFE9EF", border: "#FFC8D5", text: "#8C2144" },
  peach: { bg: "#FFEAE6", border: "#FFC8BD", text: "#8B2B22" },
  coral: { bg: "#FFE0DD", border: "#FFB1A8", text: "#8C2C21" },
  amber: { bg: "#FFF2DE", border: "#FFDFAB", text: "#885525" },
  emerald: { bg: "#E7F6E6", border: "#C3E8BD", text: "#5E7B5A" },
  teal: { bg: "#D0EAF0", border: "#85C8D7", text: "#2B8278" },
  sky: { bg: "#DCE0F4", border: "#A5AFE3", text: "#3B4473" },
  lilac: { bg: "#F1EBFF", border: "#DBCCFF", text: "#583D70" },
  slate: { bg: "#E7E9EE", border: "#C0C6D3", text: "#52555C" },
  beige: { bg: "#FCF7EF", border: "#F6E9D7", text: "#655949" },
  mocha: { bg: "#DFD6D1", border: "#AB9488", text: "#4C3B32" },
  charcoal: { bg: "#CCCDD2", border: "#7D808A", text: "#292B33" },
  midnight: { bg: "#CACFDF", border: "#7685AD", text: "#242F4E" },
};

// The starting set before a user renames/adds/removes any — after that, the live list
// lives on the profile (categoryKeys) and flows through CategoryColorsContext instead.
// CATEGORY_KEYS is kept as an alias for any pre-load/fallback rendering. "School" is the
// one permanent category — see profile.educationCategory / CategoryEditor's protectedKey
// — since Education/Grades tasks always need somewhere to land; it can be renamed but
// never removed.
export const DEFAULT_CATEGORY_KEYS = ["School", "Personal", "Health", "Social", "Extracurriculars"];
export const CATEGORY_KEYS = DEFAULT_CATEGORY_KEYS;
export const DEFAULT_CATEGORY_COLOR_KEYS = { School: "sky", Personal: "pink", Health: "emerald", Social: "lilac", Extracurriculars: "coral" };
// Colors assigned to a custom category that isn't one of the 5 defaults and hasn't been
// explicitly recolored yet — cycles through so several new categories don't all end up
// the same color. Skips whichever swatches the 5 defaults above already use.
export const FALLBACK_CATEGORY_COLOR_ROTATION = ["amber", "teal", "slate", "peach", "beige", "mocha", "charcoal", "midnight"];

// Education used to get its own fixed color (EDU_TYPE_COLORS) regardless of type —
// every consumer now instead reads the user's actual School category color live via
// `useCategoryColors()`/`educationCategory` (Education's own rows, Calendar, Tasks'
// "from Education" tag, Grades, Weekly Review), so an item stays in sync if that color
// is ever changed. Nothing reads a fixed Education color anymore.
export const EVENT_COLOR = { bg: "#FCFEFF", border: "#E6F2F8", text: "#3A7796" };
export const TASK_COLOR = { bg: "#FBEAF0", border: "#F0B9CE", text: "#8A3A5C" };
export const HABIT_COLOR = { bg: "#DCF2E3", border: "#8FCBA3", text: "#2E6B44" };
// PRIMARY/PRIMARY_DARK/PRIMARY_TINT resolve to whatever accent theme is currently
// applied (see THEME_PRESETS + ScaffoldApp, which sets these as CSS custom
// properties on the root element). The fallback values are the default "Sky" theme —
// the connected Figma identity kit's own "Core Colors" section (Ink/Sky/Coral/Paper)
// names Sky as the brand's main indigo/blue-purple accent; the picker's old "Ocean"
// preset no longer exists in the kit.
// PRIMARY_DARK intentionally equals PRIMARY here — the exact hex sampled from Figma,
// left alone rather than synthetically darkened.
export const PRIMARY = "var(--primary, #8C99DB)";
export const PRIMARY_DARK = "var(--primary-dark, #8C99DB)";
export const PRIMARY_TINT = "var(--primary-tint, #E8EBF8)";

// Matched 1:1 to the Figma kit's accent picker (settings-accent-color-picker's
// color-grid), hex-sampled directly from its color-dot assets. Re-synced against the
// live file: "Ocean" is gone, "Mocha"/"Charcoal"/"Midnight" are new darker/neutral
// options, and one node the file mislabeled "Teal" (a green hue, distinct from the
// existing cyan "Teal") is carried in here as "Emerald" instead, since that's the color
// family it actually replaces.
// primaryDark deliberately equals primary — the sampled color used as-is, not darkened.
// primaryTint (a pale wash, not in the kit) is derived from each swatch's own hue, same
// relationship as the prior preset set.
export const THEME_PRESETS = {
  pink: { label: "Pink", primary: "#FFB8CA", primaryDark: "#FFB8CA", primaryTint: "#FFF1F4" },
  peach: { label: "Peach", primary: "#FFB9AB", primaryDark: "#FFB9AB", primaryTint: "#FFF1EE" },
  coral: { label: "Coral", primary: "#FF9B90", primaryDark: "#FF9B90", primaryTint: "#FFEBE9" },
  amber: { label: "Amber", primary: "#FFD693", primaryDark: "#FFD693", primaryTint: "#FFF7E9" },
  emerald: { label: "Emerald", primary: "#B2E2AB", primaryDark: "#B2E2AB", primaryTint: "#F0F9EE" },
  teal: { label: "Teal", primary: "#64B9CC", primaryDark: "#64B9CC", primaryTint: "#E0F1F5" },
  sky: { label: "Sky", primary: "#8C99DB", primaryDark: "#8C99DB", primaryTint: "#E8EBF8" },
  lilac: { label: "Lilac", primary: "#D1BEFF", primaryDark: "#D1BEFF", primaryTint: "#F6F2FF" },
  slate: { label: "Slate", primary: "#AFB6C7", primaryDark: "#AFB6C7", primaryTint: "#EFF0F4" },
  beige: { label: "Beige", primary: "#F4E3CB", primaryDark: "#F4E3CB", primaryTint: "#FDF9F5" },
  mocha: { label: "Mocha", primary: "#947767", primaryDark: "#947767", primaryTint: "#EAE4E1" },
  charcoal: { label: "Charcoal", primary: "#585C6A", primaryDark: "#585C6A", primaryTint: "#DEDEE1" },
  midnight: { label: "Midnight", primary: "#506396", primaryDark: "#506396", primaryTint: "#DCE0EA" },
};
export const DEFAULT_THEME = "sky";

// Mixes a hex color toward white by `amount` (0 = unchanged, 1 = white) — used to derive
// a pale "tint" wash for a user's own custom accent color, the same role each preset's
// hand-picked primaryTint plays above.
function lightenHex(hex, amount) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  const mix = (c) => Math.round(c + (255 - c) * amount);
  const toHex = (c) => c.toString(16).padStart(2, "0");
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}

// A custom accent color (picked via the settings color wheel) is stored as the plain
// string "custom:#rrggbb" right in profile.themeColor — no separate DB column needed,
// since that column already just holds a string and every reader already treats an
// unrecognized value as "fall back to default" rather than crashing. This is the one
// place that has to know about the "custom:" prefix; everywhere else just calls this
// instead of indexing THEME_PRESETS directly.
export function resolveTheme(themeColor) {
  if (typeof themeColor === "string" && themeColor.startsWith("custom:")) {
    const hex = themeColor.slice(7);
    return { label: "Custom", primary: hex, primaryDark: hex, primaryTint: lightenHex(hex, 0.8) };
  }
  return THEME_PRESETS[themeColor] || THEME_PRESETS[DEFAULT_THEME];
}

// Mixes a hex color toward black by `amount` (0 = unchanged, 1 = black) — used to derive
// a readable dark "text" shade for a custom category color, the same role each preset's
// hand-picked text color plays below.
function darkenHex(hex, amount) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  const mix = (c) => Math.round(c * (1 - amount));
  const toHex = (c) => c.toString(16).padStart(2, "0");
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}

// A category's own color (picked per-category in Settings) is either one of the 11
// preset keys, or — same "custom:#rrggbb" convention as resolveTheme above — a color
// picked via that category's own color wheel. Derives the same {bg,border,text,accent}
// shape CATEGORY_COLOR_SWATCHES already provides per preset, just computed from the raw
// hex instead of hand-picked.
export function resolveCategoryColor(key) {
  if (typeof key === "string" && key.startsWith("custom:")) {
    const hex = key.slice(7);
    return { bg: lightenHex(hex, 0.85), border: lightenHex(hex, 0.35), text: darkenHex(hex, 0.45), accent: hex };
  }
  const swatch = CATEGORY_COLOR_SWATCHES[key] || CATEGORY_COLOR_SWATCHES.slate;
  const accent = (THEME_PRESETS[key] || THEME_PRESETS[DEFAULT_THEME]).primary;
  return { ...swatch, accent };
}

// Default-theme category colors, used as the CategoryColorsContext fallback and
// anywhere rendered before a user's customization has loaded.
// `accent` (the swatch's own raw, undarkened hex — same as the accent-color picker) is
// added on top of each {bg,border,text} triple here so a short bold label always has a
// recognizable color to reach for, even before a real profile/provider has loaded.
const withAccent = (key) => ({ ...CATEGORY_COLOR_SWATCHES[key], accent: THEME_PRESETS[key].primary });
export const CATEGORY_COLORS = {
  School: withAccent(DEFAULT_CATEGORY_COLOR_KEYS.School),
  Personal: withAccent(DEFAULT_CATEGORY_COLOR_KEYS.Personal),
  Health: withAccent(DEFAULT_CATEGORY_COLOR_KEYS.Health),
  Social: withAccent(DEFAULT_CATEGORY_COLOR_KEYS.Social),
  Extracurriculars: withAccent(DEFAULT_CATEGORY_COLOR_KEYS.Extracurriculars),
};

// Surface + ink/muted/border tones. INK replaces pure black for headline/body text,
// MUTED is secondary text, BORDER is the standard hairline. PAPER_BG is the one
// background color for the whole app — every page, the sidebar, auth/onboarding, all of
// it. SURFACE is the layer that sits just above it — cards, modals, chips — a hair
// warmer/grayer than pure white so it reads as a distinct plane, not a cutout. All four
// hex-sampled from the Figma kit's neutrals palette (Background/Surface/Ink Black/Muted
// Gray/Border Light) — re-checked directly in Figma, only BORDER had actually drifted
// from its real "Border Light" value (a faint brand lavender, not a plain neutral gray).
export const PAPER_BG = "#FDFCFB";
export const SURFACE = "#FAFAF9";
export const INK = "#1A1A2E";
export const MUTED = "#6B7280";
export const BORDER = "#D9D3E6";
export const TONE = {
  danger: { bg: "#FBEAEA", border: "#EFB4B4", text: "#B03A3A" },
  warn: { bg: "#FBE6D9", border: "#F0B685", text: "#8A5424" },
  soon: { bg: "#F1F3F5", border: "#DCE1E6", text: "#5A6472" },
  neutral: { bg: "transparent", border: "transparent", text: "#93A0AD" },
  // Overdue-but-not-forgotten — deliberately NOT a stoplight color. Something that
  // slipped is still visibly held onto (it rolls onto Today automatically either way),
  // but it's framed as the app carrying it forward for you, not as a red mark against
  // you — hence the brand color instead of an alarm color.
  carried: { bg: "#E0E2EB", border: "#A1A9CE", text: "#4A5BA8" },
};
// Display/headline accent — DM Sans, per the brand kit's typography update (was
// Adamina). Every screen that already reads this constant (Journal, TodaySection,
// MonthView, CalendarView, WhatNowModal, Misc.jsx empty states, WeeklyReviewModal,
// HabitHistoryModal, SettingsModal, Goals, Habits) picks up the change automatically.
// Unlike Adamina, DM Sans actually ships the weights it's loaded at (400/500/600/700/800
// + italic 400/700 — see the @import in App.jsx/AuthScreen.jsx/OnboardingQuiz.jsx), so a
// fontWeight set alongside serifFont now has a real face to switch to.
export const serifFont = "'DM Sans', -apple-system, sans-serif";
export const cardStyle = {
  background: SURFACE,
  border: `1px solid ${BORDER}`,
  borderRadius: 18,
  boxShadow: "0 4px 24px rgba(26,26,46,0.05)",
  transition: "box-shadow .15s ease, transform .15s ease",
};

// Outcome-shaped goals (a finish line, not an ongoing daily habit — recurring things
// like "drink more water" or "read every day" belong on the Habits page instead).
// Goals is for the big things — a real project, not a stray errand (that's what Tasks
// is for). One flat list rather than keyed by category, since categories are now fully
// user-defined (see useCategoryKeys) and can't be reliably matched to fixed keys anymore.
export const SUGGESTED_GOALS = [
  "Launch a small business", "Build and ship an app", "Start a nonprofit or community org",
  "Start a club at school", "Publish original research", "Win a hackathon or case competition",
  "Build a portfolio for college apps", "Launch a podcast or YouTube channel",
  "Organize a fundraiser for a cause", "Get a research position with a professor",
  "Start a tutoring or small side business", "Write and publish a book or zine",
  "Build an online presence/brand", "Lead a major school event", "Land an internship",
  "Earn a certification or credential", "Start a passion project you'd put on a resume",
];

// pre-filled starter checklist for a new packing list, organized loosely by category
export const PACKING_LIST_TEMPLATE = [
  "Passport / ID",
  "Wallet, cards, cash",
  "Phone + charger",
  "Laptop + charger",
  "Headphones",
  "Travel adapter",
  "Portable battery pack",
  "Toothbrush + toothpaste",
  "Deodorant",
  "Shampoo / body wash",
  "Skincare / sunscreen",
  "Medications",
  "Underwear",
  "Socks",
  "Pajamas",
  "Comfortable shoes",
  "Jacket / layer for weather",
  "Swimsuit",
  "Sunglasses",
  "Reusable water bottle",
  "Snacks for the trip",
  "Book or entertainment",
  "Travel pillow",
  "Umbrella",
];

export const SUGGESTED_BUCKET_LIST = [
  "See the northern lights",
  "Learn a new language",
  "Go skydiving",
  "Visit every continent",
  "Run a marathon",
  "Learn to play an instrument",
  "Watch a meteor shower",
  "Go on a solo trip",
  "Write a book",
  "Learn to cook a signature dish",
  "Go camping under the stars",
  "Take a road trip with no plan",
  "Learn to surf",
  "See the pyramids",
  "Swim in the ocean at night",
];
export const SUGGESTED_HABITS = [
  "Drink 8 glasses of water", "Stretch", "Journal", "No phone before bed", "Read 10 pages", "Make your bed", "Tidy desk", "Walk outside",
  "Meditate 5 minutes", "Eat a vegetable", "Take your vitamins", "Floss", "Go to bed by 11", "No phone first hour awake",
  "Do 10 pushups", "Write 3 gratitudes", "Plan tomorrow", "Check in with a friend", "Practice an instrument", "Study a language",
  "Pack lunch", "Declutter one thing", "Get sunlight", "Stretch before bed", "No sugar today",
  "Move your body", "Save a little money", "Say something kind", "Unplug for an hour",
];
export const JOURNAL_PROMPTS = {
  Confidence: [
    "What's something you did today that you're proud of?",
    "What's a compliment you'd give yourself right now?",
    "When did you last do something that scared you a little?",
    "What would you tell your past self about what you're capable of?",
    "What's something people misjudge about you, and why are they wrong?",
    "If your inner critic had to write you a permission slip today, what would it say?",
    "Describe yourself as if you were a legendary creature. What's your power?",
    "If today were a chapter title in your autobiography, what would it be?",
    "What's a compliment you got once that you still think about?",
    "What's a hard thing you made look easy?",
    "What's an opinion you hold that you'd defend in front of anyone?",
  ],
  Gratitude: [
    "What's one small thing that made today better?",
    "Who is someone you're grateful for right now, and why?",
    "What's something about today you'd want to remember?",
    "What's something in your daily routine you'd miss if it were gone?",
    "What's a place that makes you feel calm?",
    "What's a tiny miracle of modern life you take for granted?",
    "What's something your younger self would be amazed you have now?",
    "What part of today would a time traveler from 100 years ago be most amazed by?",
  ],
  Fun: [
    "What's something you're looking forward to?",
    "If you could teleport anywhere right now, where would you go?",
    "What's a weird combination of foods you secretly love?",
    "What fictional world would you want to live in for a day?",
    "You wake up with a random superpower tomorrow, what is it and what do you do first?",
    "If your life had a laugh track, what moment today would trigger it?",
    "Describe your ideal \"do nothing\" day in exhausting detail.",
  ],
};

export const ROW_H = 44; // px per hour
