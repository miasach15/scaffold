import { useEffect, useState } from "react";

const KEY = "scaffold-dark-mode";

// A lightweight, whole-page dark mode via a CSS invert filter on <html> rather than a
// per-component color-token rewrite (the app's styling is all one-off inline hex values,
// not theme variables, so a "real" dark palette would mean touching every component).
// invert(1) flips every rendered pixel; hue-rotate(180deg) rotates hues back so blues
// stay blue-ish and reds stay red-ish instead of swapping to their opposites. The app
// has no photos/images to worry about un-inverting.
export function useDarkMode() {
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem(KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.style.filter = darkMode ? "invert(1) hue-rotate(180deg)" : "";
    try {
      localStorage.setItem(KEY, darkMode ? "1" : "0");
    } catch {
      /* private-browsing or storage disabled — dark mode just won't persist across reloads */
    }
  }, [darkMode]);

  return { darkMode, toggleDarkMode: () => setDarkMode((d) => !d) };
}
