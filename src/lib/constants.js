// Shared swatch palette a user can assign to any of the 4 goal/event categories
// (see CategoryColorsContext + SettingsModal). Keys are stable identifiers stored
// per-user; the actual {bg,border,text} triples live here in one place.
export const CATEGORY_COLOR_SWATCHES = {
  blue: { bg: "#DCEAFB", border: "#7FB2E8", text: "#2A5C8A" },
  pink: { bg: "#FBE3EC", border: "#E7A9C4", text: "#95375E" },
  green: { bg: "#DFEEE5", border: "#87BFA1", text: "#2C6B4C" },
  purple: { bg: "#E0DBFA", border: "#A99BEA", text: "#4A3B94" },
  orange: { bg: "#FCE9E4", border: "#EFAE93", text: "#9B4A2A" },
  teal: { bg: "#DFF3EF", border: "#8ED9C4", text: "#1F7A5C" },
  red: { bg: "#FBEAEA", border: "#EFB4B4", text: "#B03A3A" },
  yellow: { bg: "#FFF7D6", border: "#F0DA85", text: "#8A6F1F" },
  indigo: { bg: "#E4E7FB", border: "#A6ACE8", text: "#3B4394" },
  gray: { bg: "#F1F3F5", border: "#C9D0D8", text: "#4A5568" },
};

export const CATEGORY_KEYS = ["Education", "Personal", "Health", "People"];
export const DEFAULT_CATEGORY_COLOR_KEYS = { Education: "blue", Personal: "pink", Health: "green", People: "purple" };

// Default-theme category colors, used as the CategoryColorsContext fallback and
// anywhere rendered before a user's customization has loaded.
export const CATEGORY_COLORS = {
  Education: CATEGORY_COLOR_SWATCHES[DEFAULT_CATEGORY_COLOR_KEYS.Education],
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
// properties on the root element). The fallback values are the default "Violet" theme.
export const PRIMARY = "var(--primary, #7B6EF0)";
export const PRIMARY_DARK = "var(--primary-dark, #5849C4)";
export const PRIMARY_TINT = "var(--primary-tint, #E7E3FC)";

export const THEME_PRESETS = {
  violet: { label: "Violet", primary: "#7B6EF0", primaryDark: "#5849C4", primaryTint: "#E7E3FC" },
  blue: { label: "Blue", primary: "#3E7BFA", primaryDark: "#2A5FD1", primaryTint: "#DCE7FD" },
  green: { label: "Green", primary: "#34A870", primaryDark: "#247A50", primaryTint: "#DBF3E6" },
  rose: { label: "Rose", primary: "#E8608F", primaryDark: "#C23F6C", primaryTint: "#FBE0EA" },
  orange: { label: "Orange", primary: "#F0923B", primaryDark: "#C96F1F", primaryTint: "#FCE7D2" },
  teal: { label: "Teal", primary: "#2CAFA0", primaryDark: "#1D8478", primaryTint: "#D8F2EE" },
  slate: { label: "Slate", primary: "#5B6472", primaryDark: "#3F4653", primaryTint: "#E4E7EB" },
};
export const DEFAULT_THEME = "violet";

export const PAPER_BG = "#FAFAFA";
export const TONE = {
  danger: { bg: "#FBEAEA", border: "#EFB4B4", text: "#B03A3A" },
  warn: { bg: "#FBE6D9", border: "#F0B685", text: "#8A5424" },
  soon: { bg: "#F1F3F5", border: "#DCE1E6", text: "#5A6472" },
  neutral: { bg: "transparent", border: "transparent", text: "#93A0AD" },
};
export const serifFont = "'Playfair Display', 'Georgia', serif";
export const cardStyle = {
  background: "#fff",
  border: "1px solid #ECECEC",
  borderRadius: 18,
  boxShadow: "0 6px 24px rgba(15,23,42,0.05)",
  transition: "box-shadow .15s ease, transform .15s ease",
};

// Outcome-shaped goals (a finish line, not an ongoing daily habit — recurring things
// like "drink more water" or "read every day" belong on the Habits page instead).
export const SUGGESTED_GOALS = {
  Personal: [
    "Read 12 books this year", "Declutter your whole apartment", "Learn to cook 5 new recipes",
    "Finish an online course", "Get your finances organized", "Learn conversational Spanish",
    "Build a personal website", "Write a short story", "Deep clean and organize your closet",
    "Finish a DIY project you've been putting off", "Learn to play a song on an instrument", "Redecorate a room",
  ],
  Health: [
    "Run a 5k", "Complete a 30-day fitness challenge", "Get a full check-up done",
    "Fix your sleep schedule", "Train for a hike", "Build a workout routine that sticks",
    "Cut back on sugar for a month", "Try a new sport", "Finish a couch-to-5k program",
    "Set up a home workout space", "Hit a specific fitness milestone", "Improve your posture",
  ],
  People: [
    "Plan a trip with friends", "Reconnect with an old friend", "Host a dinner party",
    "Write letters to family", "Plan a surprise for someone", "Volunteer for a cause",
    "Organize a group hangout", "Plan a milestone celebration", "Mend a strained relationship",
    "Meet your partner's/friend's family", "Plan a reunion", "Start a small tradition with someone",
  ],
};

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
