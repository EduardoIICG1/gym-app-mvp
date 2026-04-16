"use client";

import { useState, useEffect } from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "pp_theme";

export function useTheme() {
  // "dark" is the SSR placeholder — overwritten on mount by reading the DOM.
  // The inline script in layout.tsx is the real source of truth for initial state.
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    // Read what the flash-prevention script already applied — don't re-apply.
    const current: Theme = document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";
    setTheme(current);
  }, []);

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    localStorage.setItem(STORAGE_KEY, next);
    setTheme(next);
    const html = document.documentElement;
    if (next === "dark") {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
  };

  return { theme, toggleTheme };
}
