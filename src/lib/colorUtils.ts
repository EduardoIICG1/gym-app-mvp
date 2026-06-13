// Color validation and contrast helpers for the branding module.
// Kept intentionally small — only what's needed to validate admin-entered
// brand colors and warn about poor legibility, not a full design-token system.

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function isValidHex(value: string): boolean {
  return HEX_RE.test(value.trim());
}

export function normalizeHex(value: string): string {
  return value.trim().toLowerCase();
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return [r, g, b];
}

// Relative luminance per WCAG 2.x
function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const channel = c / 255;
    return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// WCAG contrast ratio between two colors, 1 (no contrast) to 21 (max contrast)
export function contrastRatio(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexA);
  const lumB = relativeLuminance(hexB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

// Returns "#ffffff" or "#000000" — whichever is more readable on top of `hex`.
export function readableTextColor(hex: string): "#ffffff" | "#000000" {
  if (!isValidHex(hex)) return "#ffffff";
  const whiteContrast = contrastRatio(hex, "#ffffff");
  const blackContrast = contrastRatio(hex, "#000000");
  return whiteContrast >= blackContrast ? "#ffffff" : "#000000";
}

// Below this ratio, text on the color (or the color on white/black surfaces)
// is considered hard to read. WCAG AA for normal text is 4.5:1; we use a
// slightly relaxed floor since brand colors are mostly used as accents.
export const MIN_READABLE_CONTRAST = 3;

export function hasLowContrast(hex: string): boolean {
  if (!isValidHex(hex)) return false;
  const onWhite = contrastRatio(hex, "#ffffff");
  const onBlack = contrastRatio(hex, "#000000");
  return Math.max(onWhite, onBlack) < MIN_READABLE_CONTRAST;
}
