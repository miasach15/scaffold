import { useEffect, useState } from "react";

const KEY = "scaffold-dark-mode";

// A real dark theme: toggles a data-theme attribute on <html>, which index.css uses to
// swap the five neutral CSS vars (paper-bg/surface/ink/muted/border — see
// lib/constants.js) for dark values. Replaces the old CSS invert(1) + hue-rotate(180deg)
// filter hack, which flipped every pixel on the page (including the user's own chosen
// accent/category colors) instead of giving them a real, designed dark palette.
export function useDarkMode() {
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem(KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
    try {
      localStorage.setItem(KEY, darkMode ? "1" : "0");
    } catch {
      /* private-browsing or storage disabled — dark mode just won't persist across reloads */
    }
  }, [darkMode]);

  return { darkMode, toggleDarkMode: () => setDarkMode((d) => !d) };
}
