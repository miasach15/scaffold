// Same plain pub/sub shape as saveErrors.js, for the same reason — the one place that
// actually knows "this assignment just went from not-done to done" (App.jsx's
// setEduDoneWithCelebration) shouldn't need a toast-setter threaded through every one of
// its own several call sites just to announce it.
const listeners = new Set();

export function reportCompletion(title) {
  listeners.forEach((fn) => fn(title));
}

export function onCompletion(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
