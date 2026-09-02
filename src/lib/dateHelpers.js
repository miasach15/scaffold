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
// How many consecutive days (ending today) a habit has been checked off. If today
// isn't checked yet, counts back from yesterday instead — so an ongoing streak
// doesn't read as broken just because you haven't gotten to today yet.
export const currentStreak = (doneDates) => {
  const doneSet = new Set(doneDates);
  let cursor = doneSet.has(toISO(new Date())) ? new Date() : addDays(new Date(), -1);
  let streak = 0;
  while (doneSet.has(toISO(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
};
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
// The reverse of timeToDecimal, for pre-filling an <input type="time"> from a stored
// decimal-hours value.
export const decimalToTimeInput = (dec) => {
  if (dec == null) return "";
  const h = Math.floor(dec);
  const m = Math.round((dec - h) * 60);
  return `${pad(h)}:${pad(m)}`;
};
export const daysUntil = (iso) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(iso + "T00:00:00");
  return Math.round((target - today) / 86400000);
};
// leadDays is the "days needed" a task was created with — once today falls within that
// many days of the due date, it's flagged urgent regardless of the generic day-count
// thresholds below (e.g. a task due in 10 days that needs 5 days of work goes urgent at
// day 5, not just in the last 3 days like everything else).
export const urgencyInfo = (iso, done, leadDays) => {
  if (!iso || done) return null;
  const d = daysUntil(iso);
  // "Overdue" reads as a verdict on you; "carried over" reads as the app doing the work
  // of keeping it in front of you. Same fact (it rolls onto Today either way — see
  // rollOverdueToToday), softer frame, and deliberately not the same alarm color as
  // something genuinely due today/soon (below) — that distinction is the whole point.
  if (d < 0) return { label: d === -1 ? "Carried over" : `Carried over: ${-d}d`, tone: "carried" };
  if (leadDays && d <= leadDays - 1) {
    return { label: d === 0 ? "Due today" : `Urgent: ${d} day${d === 1 ? "" : "s"} left`, tone: "danger" };
  }
  if (d === 0) return { label: "Due today", tone: "warn" };
  if (d === 1) return { label: "Due tomorrow", tone: "warn" };
  if (d <= 3) return { label: `In ${d} days`, tone: "soon" };
  return { label: `In ${d} days`, tone: "neutral" };
};
// True once a task with a due date + "days needed" has entered its work window (today is
// within leadDays of the due date) but isn't yet actually due — the "show it every day,
// but not urgent yet" vs. "urgent" split TodaySection needs.
export const inLeadWindow = (iso, leadDays, done) => {
  if (!iso || !leadDays || done) return false;
  const d = daysUntil(iso);
  return d >= 0 && d <= leadDays - 1;
};
// A task that was given a due date but neither "bigger than one sitting" option (no
// explicit "days needed", not broken into grouped steps) still shouldn't just vanish
// until its due date arrives — it defaults to a 2-day window (shows every day, flips
// urgent the day before it's due) same as if you'd typed "2" into Days needed. Grouped
// steps and Education-generated sessions already have their own per-day scheduling, so
// they're left out of this default and keep showing only on their assigned day.
// A recurring task's individual occurrences are excluded too: if you repeat something
// daily, every occurrence sits one day after the last, so the "urgent 2 days out"
// default would fire on almost every occurrence at once, permanently — a recurring task
// is an expected routine, not a surprise creeping up, so it only needs to show up as
// "Due today"/"Overdue" (which don't depend on this), not pre-emptively "Urgent."
export const defaultLeadDays = (t) => {
  if (t.leadDays) return t.leadDays;
  if (t.groupId || t.eduId || t.isRecurring || !t.date) return null;
  return 2;
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
export const dayBefore = (iso) => toISO(addDays(new Date(iso + "T00:00:00"), -1));
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
// Spreads `count` items evenly across the range [startISO, endISO] with never more than
// one item per day, and NEVER past endISO — if it fits, the last item lands exactly on
// endISO. If there are more items than days available (e.g. 8 steps but only 3 days
// before something's due), extra items get packed onto existing days within the window
// instead — still evenly as possible, but endISO is a hard ceiling, never crossed.
export const distributeDates = (startISO, endISO, count) => {
  if (count <= 0) return [];
  const start = new Date(startISO + "T00:00:00");
  const end = new Date(endISO + "T00:00:00");
  const totalDays = Math.max(0, Math.round((end - start) / 86400000));
  const availableSlots = totalDays + 1;

  let offsets;
  if (count <= availableSlots) {
    offsets = [];
    for (let i = 1; i <= count; i++) {
      let offset = Math.round((totalDays * i) / count);
      if (offsets.length && offset <= offsets[offsets.length - 1]) offset = offsets[offsets.length - 1] + 1;
      offsets.push(Math.min(offset, totalDays));
    }
    // Clamping to totalDays can bunch the tail up against the end — walk backward and
    // spread those out too, so every offset stays distinct.
    for (let i = offsets.length - 2; i >= 0; i--) {
      if (offsets[i] >= offsets[i + 1]) offsets[i] = offsets[i + 1] - 1;
    }
  } else {
    // Not enough distinct days — pack multiple items onto the same days, evenly, but
    // capped at totalDays so nothing ever lands after endISO.
    offsets = Array.from({ length: count }, (_, i) => Math.min(totalDays, Math.floor((i * availableSlots) / count)));
  }
  return offsets.map((o) => toISO(addDays(start, o)));
};
// Like distributeDates — starts from the same even spread across the whole window — but
// then nudges any picked day that already has more on it than some unused day in the
// window toward that quieter day. "More on it" counts both tasks AND calendar events —
// a day full of classes/practice/appointments is just as booked as a day full of tasks,
// so both count toward the same load. On an empty calendar this is identical to
// distributeDates (evenly spread, not clumped at the start); the more the calendar
// already has booked, the more it pulls new items away from your busier days.
// allowedDays: optional array of day-of-week ints (0=Sun..6=Sat) — restricts which days in
// the window are eligible ("pick days" mode, e.g. only Mon/Wed/Fri). Omitted, empty, or a
// selection that matches nothing in the window all fall back to every day in the window
// ("every day" mode — also the original, pre-existing behavior when this param is unused).
export const distributeDatesByLoad = (startISO, endISO, count, existingTasks, existingEvents, allowedDays) => {
  if (count <= 0) return [];
  const start = new Date(startISO + "T00:00:00");
  const end = new Date(endISO + "T00:00:00");
  const totalDays = Math.max(0, Math.round((end - start) / 86400000));

  let pool = [];
  for (let o = 0; o <= totalDays; o++) pool.push(o);
  if (allowedDays && allowedDays.length) {
    const restricted = pool.filter((o) => allowedDays.includes(addDays(start, o).getDay()));
    if (restricted.length) pool = restricted;
  }
  const availableSlots = pool.length;

  if (count > availableSlots) {
    // Not enough distinct eligible days — pack multiple items onto the same days, evenly,
    // but never past endISO or off the allowed days (load-balancing doesn't apply here
    // since every eligible day in the window is going to get used regardless).
    return Array.from({ length: count }, (_, i) => toISO(addDays(start, pool[Math.min(pool.length - 1, Math.floor((i * availableSlots) / count))])));
  }

  let idxs = [];
  for (let i = 1; i <= count; i++) {
    let idx = Math.round(((availableSlots - 1) * i) / count);
    if (idxs.length && idx <= idxs[idxs.length - 1]) idx = idxs[idxs.length - 1] + 1;
    idxs.push(Math.min(idx, availableSlots - 1));
  }
  for (let i = idxs.length - 2; i >= 0; i--) {
    if (idxs[i] >= idxs[i + 1]) idxs[i] = idxs[i + 1] - 1;
  }
  let offsets = idxs.map((idx) => pool[idx]);

  const loadByDate = {};
  (existingTasks || []).forEach((t) => {
    if (!t.date) return;
    loadByDate[t.date] = (loadByDate[t.date] || 0) + 1;
  });
  (existingEvents || []).forEach((e) => {
    if (!e.date) return;
    loadByDate[e.date] = (loadByDate[e.date] || 0) + 1;
  });
  const loadOf = (offset) => loadByDate[toISO(addDays(start, offset))] || 0;

  const chosen = new Set(offsets);
  let guard = 0;
  while (guard++ < count * availableSlots) {
    let busiestIdx = -1, busiestLoad = -1;
    offsets.forEach((o, idx) => {
      const l = loadOf(o);
      if (l > busiestLoad) { busiestLoad = l; busiestIdx = idx; }
    });
    if (busiestLoad <= 0) break; // nothing left worth moving off of

    // Among unused eligible days that are a strict improvement, prefer the one nearest to
    // the busy day it's replacing — keeps the spread intact instead of dragging everything
    // toward whichever quiet day happens to be earliest in the window.
    let bestOffset = -1, bestLoad = Infinity, bestDist = Infinity;
    for (const o of pool) {
      if (chosen.has(o)) continue;
      const l = loadOf(o);
      if (l >= busiestLoad) continue;
      const dist = Math.abs(o - offsets[busiestIdx]);
      if (l < bestLoad || (l === bestLoad && dist < bestDist)) { bestLoad = l; bestDist = dist; bestOffset = o; }
    }
    if (bestOffset === -1) break; // no improving day left anywhere
    chosen.delete(offsets[busiestIdx]);
    chosen.add(bestOffset);
    offsets[busiestIdx] = bestOffset;
  }

  return offsets.slice().sort((a, b) => a - b).map((o) => toISO(addDays(start, o)));
};
// Collapses a {title, date}[] list down to at most one entry per date — used after
// distributing a breakdown's steps, so if two ever land on the same day (e.g. more
// steps than available days) they show up as one task covering both instead of two
// separate rows on the same date. Identical titles on the same day collapse to one.
// The task keeps a short, clean title — just the first step — and any additional steps
// that landed on the same day go into `notes` instead of getting crammed into the title.
export const groupItemsByDate = (items) => {
  const map = new Map();
  for (const it of items) {
    if (!map.has(it.date)) map.set(it.date, []);
    const titles = map.get(it.date);
    if (!titles.includes(it.title)) titles.push(it.title);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, titles]) => ({
      date,
      title: titles[0],
      notes: titles.length > 1 ? titles.slice(1).join(", ") : null,
    }));
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
