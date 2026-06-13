"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { BrandingConfig } from "@/lib/brandingShared";
import { DEFAULT_BRANDING } from "@/lib/brandingShared";

interface BrandingContextValue {
  branding: BrandingConfig;
  updateBranding: (patch: Partial<BrandingConfig>) => void;
}

const BrandingContext = createContext<BrandingContextValue>({
  branding: DEFAULT_BRANDING,
  updateBranding: () => {},
});

export function BrandingProvider({
  branding,
  children,
}: {
  branding: BrandingConfig;
  children: React.ReactNode;
}) {
  const [current, setCurrent] = useState(branding);

  const updateBranding = useCallback((patch: Partial<BrandingConfig>) => {
    setCurrent((prev) => ({ ...prev, ...patch }));
  }, []);

  // Keep the CSS brand variables and light/dark class in sync with the
  // current branding state — covers in-session updates from the admin
  // appearance settings page without requiring a full page reload.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--brand-primary", current.primaryColor);
    root.style.setProperty("--brand-accent", current.accentColor);

    const stored = localStorage.getItem("pp_theme");
    if (stored !== "light" && stored !== "dark") {
      const dark =
        current.appearanceMode === "SYSTEM"
          ? window.matchMedia("(prefers-color-scheme: dark)").matches
          : current.appearanceMode !== "LIGHT";
      root.classList.toggle("dark", dark);
    }
  }, [current.primaryColor, current.accentColor, current.appearanceMode]);

  return (
    <BrandingContext.Provider value={{ branding: current, updateBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding(): BrandingConfig {
  return useContext(BrandingContext).branding;
}

// For the admin appearance settings page: applies a successful save's
// response immediately across the app shell (Navbar, Sidebar, theming)
// without waiting for a reload.
export function useUpdateBranding(): (patch: Partial<BrandingConfig>) => void {
  return useContext(BrandingContext).updateBranding;
}
