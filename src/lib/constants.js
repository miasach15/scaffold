// Shared swatch palette a user can assign to any category (see CategoryColorsContext +
// SettingsModal) — the same 11 named colors as the accent-color picker's THEME_PRESETS,
// so a category color and an app accent color always mean the same "Ocean"/"Coral"/etc.
// Keys are stable identifiers stored per-user; the actual {bg,border,text} triples live
// here in one place, each derived from that swatch's own THEME_PRESETS primary hue (a
// pale bg, a mid-tone border, a dark readable text — same hue carried through all three).
export const CATEGORY_COLOR_SWATCHES = {
  ocean: { bg: "#DFE4F6", border: "#95A5DB", text: "#364578" },
  sky: { bg: "#DDEDF9", border: "#8EC0E1", text: "#305E7E" },
  emerald: { bg: "#DEF7EC", border: "#93DCBD", text: "#34795C" },
  pink: { bg: "#FBDAE0", border: "#E98799", text: "#85293A" },
  amber: { bg: "#FCEAD9", border: "#EBB584", text: "#8C5421" },
  teal: { bg: "#DDF8F6", border: "#8FE0DA", text: "#317D77" },
  slate: { bg: "#E9EAEC", border: "#B2B6BD", text: "#52555C" },
  coral: { bg: "#FBDEDA", border: "#E99386", text: "#853428" },
  lilac: { bg: "#EEDFF7", border: "#C394DB", text: "#613678" },
  beige: { bg: "#F1EBE4", border: "#CCB9A3", text: "#6A5844" },
  peach: { bg: "#FCD9D9", border: "#EB8484", text: "#892525" },
};

// The starting set before a user renames/adds/removes any — after that, the live list
// lives on the profile (categoryKeys) and flows through CategoryColorsContext instead.
// CATEGORY_KEYS is kept as an alias for any pre-load/fallback rendering. "School" is the
// one permanent category — see profile.educationCategory / CategoryEditor's protectedKey
// — since Education/Grades tasks always need somewhere to land; it can be renamed but
// never removed.
export const DEFAULT_CATEGORY_KEYS = ["School", "Personal", "Health", "People"];
export const CATEGORY_KEYS = DEFAULT_CATEGORY_KEYS;
export const DEFAULT_CATEGORY_COLOR_KEYS = { School: "ocean", Personal: "pink", Health: "emerald", People: "lilac" };
// Colors assigned to a custom category that isn't one of the 4 defaults and hasn't been
// explicitly recolored yet — cycles through so several new categories don't all end up
// the same color. Skips whichever swatches the 4 defaults above already use.
export const FALLBACK_CATEGORY_COLOR_ROTATION = ["sky", "amber", "teal", "coral", "slate", "peach", "beige"];

// Default-theme category colors, used as the CategoryColorsContext fallback and
// anywhere rendered before a user's customization has loaded.
export const CATEGORY_COLORS = {
  School: CATEGORY_COLOR_SWATCHES[DEFAULT_CATEGORY_COLOR_KEYS.School],
  Personal: CATEGORY_COLOR_SWATCHES[DEFAULT_CATEGORY_COLOR_KEYS.Personal],
  Health: CATEGORY_COLOR_SWATCHES[DEFAULT_CATEGORY_COLOR_KEYS.Health],
  People: CATEGORY_COLOR_SWATCHES[DEFAULT_CATEGORY_COLOR_KEYS.People],
};
export const EDU_TYPE_COLORS = {
  Test: { bg: "#FBEDED", border: "#EFC0C0", text: "#9B4646" },
  Assignment: { bg: "#EAF2FB", border: "#C6DEF2", text: "#33607F" },
  Homework: { bg: "#F1F1F0", border: "#DADAD8", text: "#5A5A56" },
};
export const EVENT_COLOR = { bg: "#FCFEFF", border: "#E6F2F8", text: "#3A7796" };
export const TASK_COLOR = { bg: "#FBEAF0", border: "#F0B9CE", text: "#8A3A5C" };
export const HABIT_COLOR = { bg: "#DCF2E3", border: "#8FCBA3", text: "#2E6B44" };
// PRIMARY/PRIMARY_DARK/PRIMARY_TINT resolve to whatever accent theme is currently
// applied (see THEME_PRESETS + ScaffoldApp, which sets these as CSS custom
// properties on the root element). The fallback values are the default "Ocean" theme,
// matched to the connected Figma identity kit's settings-accent-color-picker — its
// main brand color moved from a pale sky blue to this indigo/purple-leaning blue.
// PRIMARY_DARK intentionally equals PRIMARY here — the exact hex sampled from Figma,
// left alone rather than synthetically darkened.
export const PRIMARY = "var(--primary, #3C5FD0)";
export const PRIMARY_DARK = "var(--primary-dark, #3C5FD0)";
export const PRIMARY_TINT = "var(--primary-tint, #DDE1EE)";

// Matched 1:1 to the Figma kit's accent picker (settings-accent-color-picker's
// color-grid), hex-sampled directly from its color-dot assets. "Violet" was removed
// from the design (re-checked directly in Figma) and "Coral" shifted slightly
// (#FF6F61 -> #F47C6B) — both picked up here. primaryDark deliberately equals primary
// — the sampled color used as-is, not darkened. primaryTint (a pale wash, not in the
// kit) is derived from each swatch's own hue, same relationship as the prior preset
// set. "Ocean" (the default) kept the same hex it already had.
export const THEME_PRESETS = {
  ocean: { label: "Ocean", primary: "#3C5FD0", primaryDark: "#3C5FD0", primaryTint: "#DDE1EE" },
  sky: { label: "Sky", primary: "#68B4E7", primaryDark: "#68B4E7", primaryTint: "#DBE8F0" },
  emerald: { label: "Emerald", primary: "#29B97C", primaryDark: "#29B97C", primaryTint: "#DDEEE7" },
  pink: { label: "Pink", primary: "#F68A9E", primaryDark: "#F68A9E", primaryTint: "#F2D9DE" },
  amber: { label: "Amber", primary: "#FF9C44", primaryDark: "#FF9C44", primaryTint: "#F2E5D9" },
  teal: { label: "Teal", primary: "#21C2B5", primaryDark: "#21C2B5", primaryTint: "#DCEFEE" },
  slate: { label: "Slate", primary: "#6B7280", primaryDark: "#6B7280", primaryTint: "#E4E5E7" },
  coral: { label: "Coral", primary: "#F47C6B", primaryDark: "#F47C6B", primaryTint: "#F2DCD9" },
  lilac: { label: "Lilac", primary: "#CB96E6", primaryDark: "#CB96E6", primaryTint: "#E8DDEE" },
  beige: { label: "Beige", primary: "#DFCFBC", primaryDark: "#DFCFBC", primaryTint: "#EAE6E1" },
  peach: { label: "Peach", primary: "#FCAEAE", primaryDark: "#FCAEAE", primaryTint: "#F2D9D9" },
};
export const DEFAULT_THEME = "ocean";

// Surface + ink/muted/border tones. INK replaces pure black for headline/body text,
// MUTED is secondary text, BORDER is the standard hairline. PAPER_BG is the one
// background color for the whole app — every page, the sidebar, auth/onboarding, all of
// it — a warm off-white rather than the previous cool blue-gray.
export const PAPER_BG = "#F7F6F4";
export const INK = "#1A1A2E";
export const MUTED = "#6B7280";
export const BORDER = "#E5E7EB";
export const TONE = {
  danger: { bg: "#FBEAEA", border: "#EFB4B4", text: "#B03A3A" },
  warn: { bg: "#FBE6D9", border: "#F0B685", text: "#8A5424" },
  soon: { bg: "#F1F3F5", border: "#DCE1E6", text: "#5A6472" },
  neutral: { bg: "transparent", border: "transparent", text: "#93A0AD" },
  // Overdue-but-not-forgotten — deliberately NOT a stoplight color. Something that
  // slipped is still visibly held onto (it rolls onto Today automatically either way),
  // but it's framed as the app carrying it forward for you, not as a red mark against
  // you — hence the brand color instead of an alarm color.
  carried: { bg: "#DDE1EE", border: "#B1BBDD", text: "#3C5FD0" },
};
// Display/headline accent — Instrument Serif (from the Figma identity kit). Every
// screen that already reads this constant (Journal, TodaySection, MonthView,
// CalendarView, WhatNowModal, Misc.jsx empty states, WeeklyReviewModal,
// HabitHistoryModal, SettingsModal, Goals, Habits) picks up the font automatically.
export const serifFont = "'Instrument Serif', Georgia, serif";
export const cardStyle = {
  background: "#fff",
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
  "Drink water", "Stretch", "Journal", "No phone before bed", "Read 10 pages", "Make your bed", "Tidy desk", "Walk outside",
  "Meditate 5 minutes", "Eat a vegetable", "Take your vitamins", "Floss", "Go to bed by 11", "No phone first hour awake",
  "Do 10 pushups", "Write 3 gratitudes", "Plan tomorrow", "Check in with a friend", "Practice an instrument", "Study a language",
  "Take the stairs", "Pack lunch", "Declutter one thing", "Get sunlight", "Stretch before bed", "No sugar today",
  "Move your body", "Save a little money", "Say something kind", "Unplug for an hour", "Clean as you go",
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
