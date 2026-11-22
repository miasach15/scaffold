// A running focus session is otherwise just in-memory React state — fine while the tab
// stays alive, but mobile Safari (and Chrome under memory pressure) routinely discards a
// backgrounded tab and reloads it from scratch once you switch back, which silently wipes
// the countdown along with everything else on the page. This persists just enough to
// reconstruct it on that kind of reload: which task, what phase/round, and either the
// absolute end timestamp (if it was running — recomputing against the real clock, not a
// saved "seconds left", is what keeps it correct regardless of how long you were away) or
// the frozen remaining time (if it was paused).
const KEY = "scaffold-focus-session";

export function saveFocusSession(taskId, state) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ taskId, ...state }));
  } catch {
    // storage unavailable (private browsing, etc.) — worst case a reload while away just won't resume
  }
}

export function loadFocusSession() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearFocusSession() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
