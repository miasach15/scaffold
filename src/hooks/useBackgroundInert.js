import { useEffect } from "react";

// Refcounted across every open modal — several can stack (Settings, then Brain Dump
// opened from a background click before this existed), and the page should only regain
// interactivity once the LAST one closes.
let openCount = 0;

// The backdrop already blocks mouse clicks visually, but without this, Tab (or a screen
// reader's virtual cursor) could still reach a focusable element behind the modal —
// e.g. a Sidebar nav button — and activate it while the modal is still open. Targets
// #root, not document.body, so a modal portaled to document.body (see ModalPortal, a
// sibling of #root rather than a descendant) never inerts itself.
export function useBackgroundInert() {
  useEffect(() => {
    const root = document.getElementById("root");
    openCount += 1;
    root?.setAttribute("inert", "");
    return () => {
      openCount = Math.max(0, openCount - 1);
      if (openCount === 0) root?.removeAttribute("inert");
    };
  }, []);
}
