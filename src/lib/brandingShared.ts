// Branding types, defaults, and validation helpers shared between server
// (branding.ts, API routes) and client (BrandingProvider, settings page).
// Kept free of `@/lib/prisma` so client bundles don't pull in `pg`.
import { isValidHex, normalizeHex } from "@/lib/colorUtils";
import type { AppearanceMode } from "@prisma/client";

// Single-row id for the MVP (no Gym/Tenant model yet — see GymSettings in schema.prisma).
export const GYM_SETTINGS_ID = "primary";

export const MAX_GYM_NAME_LENGTH = 60;

export interface BrandingConfig {
  gymName: string;
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  appearanceMode: AppearanceMode;
}

// Reproduces the current Primary Performance look when no row exists yet,
// or when the DB read fails — the app must never be unusable because of this.
export const DEFAULT_BRANDING: BrandingConfig = {
  gymName: "Primary Performance",
  logoUrl: "/brand/logo-primary-performance.png",
  primaryColor: "#4fc3f7",
  accentColor: "#22c55e",
  appearanceMode: "DARK",
};

// ─── Input validation (shared by API routes) ───────────────────────────────

export function sanitizeGymName(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const cleaned = input.replace(/\s+/g, " ").trim();
  if (!cleaned || cleaned.length > MAX_GYM_NAME_LENGTH) return null;
  return cleaned;
}

export function validateHexColor(input: unknown): string | null {
  if (typeof input !== "string" || !isValidHex(input)) return null;
  return normalizeHex(input);
}

const APPEARANCE_MODES: AppearanceMode[] = ["LIGHT", "DARK", "SYSTEM"];

export function validateAppearanceMode(input: unknown): AppearanceMode | null {
  if (typeof input !== "string") return null;
  const upper = input.toUpperCase();
  return (APPEARANCE_MODES as string[]).includes(upper) ? (upper as AppearanceMode) : null;
}
