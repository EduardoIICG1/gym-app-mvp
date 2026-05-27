"use client";

import { useState, useEffect } from "react";

export type FontSize = "normal" | "large" | "xlarge";

const STORAGE_KEY = "pp_font_size";
const SIZES: FontSize[] = ["normal", "large", "xlarge"];

function applySize(size: FontSize) {
  if (size === "normal") {
    document.documentElement.removeAttribute("data-font-size");
  } else {
    document.documentElement.setAttribute("data-font-size", size);
  }
}

export function useFontSize() {
  const [fontSize, setFontSizeState] = useState<FontSize>("normal");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as FontSize | null;
    const current = stored && SIZES.includes(stored) ? stored : "normal";
    setFontSizeState(current);
  }, []);

  const setFontSize = (size: FontSize) => {
    localStorage.setItem(STORAGE_KEY, size);
    setFontSizeState(size);
    applySize(size);
  };

  return {
    fontSize,
    increase: () => {
      const next = SIZES[Math.min(SIZES.indexOf(fontSize) + 1, SIZES.length - 1)];
      setFontSize(next);
    },
    decrease: () => {
      const next = SIZES[Math.max(SIZES.indexOf(fontSize) - 1, 0)];
      setFontSize(next);
    },
  };
}
