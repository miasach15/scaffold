// A write that fails silently is worse than one that fails loudly — you keep working on
// top of a change that was never actually saved, then lose it the moment you reload or
// switch devices. This is a plain pub/sub (not a React context) specifically so every
// data hook (useTasks, useEvents, useHabits, ...) can report a failed write without each
// one needing a toast-setter threaded in through props — they just import this directly.
const listeners = new Set();

export function reportSaveError(message = "Couldn't save that — check your connection and try again.") {
  listeners.forEach((fn) => fn(message));
}

export function onSaveError(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
