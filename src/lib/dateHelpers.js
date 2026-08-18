export const pad = (n) => String(n).padStart(2, "0");
export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const addDays = (d, n) => {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + n);
  return nd;
};
export const startOfWeek = (d) => {
  const nd = new Date(d);
  const day = (nd.getDay() + 6) % 7; // Monday = 0
  nd.setDate(nd.getDate() - day);
  nd.setHours(0, 0, 0, 0);
  return nd;
};
export const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
export const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
export const dayLabel = (d) => d.toLocaleDateString(undefined, { weekday: "short" });
export const dateLabel = (d) => d.getDate();
export const monthLabel = (d) => d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
export const hourLabel = (h) => {
  const hr = h % 24;
  const ampm = hr < 12 ? "AM" : "PM";
  let disp = hr % 12;
  if (disp === 0) disp = 12;
  return `${disp} ${ampm}`;
};
export const timeToDecimal = (t) => {
  if (!t) return 9;
  const [h, m] = t.split(":").map(Number);
  return h + m / 60;
};
export const decimalToTimeLabel = (dec) => {
  const h = Math.floor(dec);
  const m = Math.round((dec - h) * 60);
  const ampm = h < 12 ? "AM" : "PM";
  let disp = h % 12;
  if (disp === 0) disp = 12;
  return `${disp}:${pad(m)} ${ampm}`;
};
export const daysUntil = (iso) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(iso + "T00:00:00");
  return Math.round((target - today) / 86400000);
};
export const urgencyInfo = (iso, done) => {
  if (!iso || done) return null;
  const d = daysUntil(iso);
  if (d < 0) return { label: d === -1 ? "1 day overdue" : `${-d} days overdue`, tone: "danger" };
  if (d === 0) return { label: "Due today", tone: "warn" };
  if (d === 1) return { label: "Due tomorrow", tone: "warn" };
  if (d <= 3) return { label: `In ${d} days`, tone: "soon" };
  return { label: `In ${d} days`, tone: "neutral" };
};
export const dateRangeISO = (startISO, endISO) => {
  if (!startISO) return [];
  if (endISO < startISO) return [startISO];
  const arr = [];
  let cur = new Date(startISO + "T00:00:00");
  const end = new Date(endISO + "T00:00:00");
  let i = 0;
  while (cur <= end && i < 30) {
    arr.push(toISO(cur));
    cur = addDays(cur, 1);
    i++;
  }
  return arr.length ? arr : [startISO];
};
export const formatShortDate = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
// customDays: array of day-of-week ints (0=Sun..6=Sat), only used when repeat === "Custom"
export const repeatDates = (startISO, repeat, customDays) => {
  if (!repeat || repeat === "None") return [startISO];
  const dates = [];
  let cur = new Date(startISO + "T00:00:00");
  const isWeekly = repeat === "Weekly";
  const isWeekdays = repeat === "Weekdays";
  const isCustom = repeat === "Custom";
  const step = isWeekly ? 7 : 1;
  const iterations = isWeekly ? 12 : 90; // ~3 months weekly, ~3 months day-by-day
  for (let i = 0; i < iterations && dates.length < 60; i++) {
    const dow = cur.getDay();
    const include = isWeekly ? true : isWeekdays ? dow !== 0 && dow !== 6 : isCustom ? (customDays || []).includes(dow) : true; // Daily
    if (include) dates.push(toISO(cur));
    cur = addDays(cur, step);
  }
  return dates.length ? dates : [startISO];
};
// Spreads `count` items evenly across the range (startISO, endISO], with the
// last item always landing exactly on endISO. Used to auto-assign due dates
// to a milestone's small actions once the milestone itself gets a target date.
export const distributeDates = (startISO, endISO, count) => {
  if (count <= 0) return [];
  const start = new Date(startISO + "T00:00:00");
  const end = new Date(endISO + "T00:00:00");
  const totalDays = Math.max(1, Math.round((end - start) / 86400000));
  const dates = [];
  for (let i = 1; i <= count; i++) {
    const offset = Math.round((totalDays * i) / count);
    dates.push(toISO(addDays(start, offset)));
  }
  return dates;
};
export const monthMatrix = (monthDate) => {
  const first = startOfMonth(monthDate);
  const startOffset = (first.getDay() + 6) % 7; // Monday = 0
  const gridStart = addDays(first, -startOffset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = addDays(gridStart, i);
    return { date: d, inMonth: d.getMonth() === monthDate.getMonth() };
  });
};
