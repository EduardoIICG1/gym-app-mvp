import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { isValidHex } from "@/lib/colorUtils";
import { GYM_SETTINGS_ID, DEFAULT_BRANDING, type BrandingConfig } from "@/lib/brandingShared";

export * from "@/lib/brandingShared";

// Cached per-request (React `cache`) so layout + pages can both call this
// without duplicating the query.
export const getBranding = cache(async (): Promise<BrandingConfig> => {
  try {
    const settings = await prisma.gymSettings.findUnique({ where: { id: GYM_SETTINGS_ID } });
    if (!settings) return DEFAULT_BRANDING;
    return {
      gymName: settings.gymName || DEFAULT_BRANDING.gymName,
      logoUrl: settings.logoUrl ?? DEFAULT_BRANDING.logoUrl,
      primaryColor: isValidHex(settings.primaryColor) ? settings.primaryColor : DEFAULT_BRANDING.primaryColor,
      accentColor: isValidHex(settings.accentColor) ? settings.accentColor : DEFAULT_BRANDING.accentColor,
      appearanceMode: settings.appearanceMode,
    };
  } catch {
    // DB unreachable / table missing — fall back so the app keeps rendering.
    return DEFAULT_BRANDING;
  }
});
