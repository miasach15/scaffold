export const CATEGORY_COLORS = {
  Education: { bg: "#DCEAFB", border: "#7FB2E8", text: "#2A5C8A" },
  Personal: { bg: "#FBE3EC", border: "#E7A9C4", text: "#95375E" },
  Health: { bg: "#DFEEE5", border: "#87BFA1", text: "#2C6B4C" },
  People: { bg: "#E0DBFA", border: "#A99BEA", text: "#4A3B94" },
};
export const EDU_TYPE_COLORS = {
  Test: { bg: "#FBEDED", border: "#EFC0C0", text: "#9B4646" },
  Assignment: { bg: "#EAF2FB", border: "#C6DEF2", text: "#33607F" },
  Homework: { bg: "#F1F1F0", border: "#DADAD8", text: "#5A5A56" },
};
export const EVENT_COLOR = { bg: "#FCFEFF", border: "#E6F2F8", text: "#3A7796" };
export const TASK_COLOR = { bg: "#FBEAF0", border: "#F0B9CE", text: "#8A3A5C" };
export const HABIT_COLOR = { bg: "#DCF2E3", border: "#8FCBA3", text: "#2E6B44" };
export const PRIMARY = "#7B6EF0";
export const PAPER_BG = "#FAF8F4";
export const PRIORITY_COLORS = {
  Low: { bg: "#F1F3F5", border: "#DCE1E6", text: "#5A6472" },
  Medium: { bg: "#FBE6D9", border: "#F0B685", text: "#8A5424" },
  Urgent: { bg: "#FBEAEA", border: "#EFB4B4", text: "#B03A3A" },
};
export const TONE = {
  danger: { bg: "#FBEAEA", border: "#EFB4B4", text: "#B03A3A" },
  warn: { bg: "#FBE6D9", border: "#F0B685", text: "#8A5424" },
  soon: { bg: "#F1F3F5", border: "#DCE1E6", text: "#5A6472" },
  neutral: { bg: "transparent", border: "transparent", text: "#93A0AD" },
};
export const serifFont = "'Playfair Display', 'Georgia', serif";
export const cardStyle = {
  background: "#fff",
  border: "1px solid #F0ECE5",
  borderRadius: 18,
  boxShadow: "0 6px 24px rgba(90,70,50,0.055)",
  transition: "box-shadow .15s ease, transform .15s ease",
};

export const SUGGESTED_GOALS = {
  Personal: ["Read for 20 minutes daily", "Declutter your desk", "Learn a new skill"],
  Health: ["Sleep 8 hours a night", "Move your body 3x this week", "Drink more water"],
  People: ["Call a friend", "Plan a hangout", "Check in with family"],
};
export const SUGGESTED_HABITS = ["Drink water", "Stretch", "Journal", "No phone before bed", "Read 10 pages", "Make your bed", "Tidy desk", "Walk outside"];
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
