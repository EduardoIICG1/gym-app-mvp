"use client";

import { createContext, useContext } from "react";
import type { BrandingConfig } from "@/lib/brandingShared";
import { DEFAULT_BRANDING } from "@/lib/brandingShared";

const BrandingContext = createContext<BrandingConfig>(DEFAULT_BRANDING);

export function BrandingProvider({
  branding,
  children,
}: {
  branding: BrandingConfig;
  children: React.ReactNode;
}) {
  return <BrandingContext.Provider value={branding}>{children}</BrandingContext.Provider>;
}

export function useBranding(): BrandingConfig {
  return useContext(BrandingContext);
}
