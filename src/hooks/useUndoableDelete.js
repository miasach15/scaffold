import { useCallback, useRef, useState } from "react";

// Wraps a delete so it's reversible for a few seconds instead of instant and permanent.
// The caller is responsible for hiding the item from the UI right away (so it *looks*
// deleted immediately) and un-hiding it if undo() is called; this hook just owns the
// timing and the "commit for real" callback. Only one delete can be pending at a time —
// starting a second one commits the first immediately instead of stacking toasts.
export function useUndoableDelete(seconds = 5) {
  const [pending, setPending] = useState(null); // { label }
  const timerRef = useRef(null);
  const commitRef = useRef(null);

  const requestDelete = useCallback(
    (label, onCommit) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        if (commitRef.current) commitRef.current();
      }
      commitRef.current = onCommit;
      timerRef.current = setTimeout(() => {
        onCommit();
        commitRef.current = null;
        timerRef.current = null;
        setPending(null);
      }, seconds * 1000);
      setPending({ label });
    },
    [seconds]
  );

  // Returns true if there was something to undo, so the caller knows whether to restore
  // the item it hid.
  const undo = useCallback(() => {
    if (!timerRef.current) return false;
    clearTimeout(timerRef.current);
    timerRef.current = null;
    commitRef.current = null;
    setPending(null);
    return true;
  }, []);

  return { pending, requestDelete, undo };
}
