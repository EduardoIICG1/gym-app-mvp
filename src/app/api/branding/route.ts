import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  GYM_SETTINGS_ID,
  DEFAULT_BRANDING,
  getBranding,
  sanitizeGymName,
  validateHexColor,
  validateAppearanceMode,
} from "@/lib/branding";
import { deleteGymLogo } from "@/lib/storage/brandingStorage";

// Public: the login screen and app shell render branding before/without auth.
export async function GET() {
  const branding = await getBranding();
  return Response.json(branding, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return Response.json({ error: "Sin permisos" }, { status: 403 });
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.gymName !== undefined) {
      const gymName = sanitizeGymName(body.gymName);
      if (!gymName) {
        return Response.json({ error: "gymName inválido" }, { status: 400 });
      }
      data.gymName = gymName;
    }

    if (body.primaryColor !== undefined) {
      const primaryColor = validateHexColor(body.primaryColor);
      if (!primaryColor) {
        return Response.json({ error: "primaryColor inválido" }, { status: 400 });
      }
      data.primaryColor = primaryColor;
    }

    if (body.accentColor !== undefined) {
      const accentColor = validateHexColor(body.accentColor);
      if (!accentColor) {
        return Response.json({ error: "accentColor inválido" }, { status: 400 });
      }
      data.accentColor = accentColor;
    }

    if (body.appearanceMode !== undefined) {
      const appearanceMode = validateAppearanceMode(body.appearanceMode);
      if (!appearanceMode) {
        return Response.json({ error: "appearanceMode inválido" }, { status: 400 });
      }
      data.appearanceMode = appearanceMode;
    }

    if (Object.keys(data).length === 0) {
      return Response.json({ error: "Sin cambios" }, { status: 400 });
    }

    data.updatedById = session.user.id;

    const updated = await prisma.gymSettings.upsert({
      where: { id: GYM_SETTINGS_ID },
      create: { id: GYM_SETTINGS_ID, ...data },
      update: data,
    });

    return Response.json({
      gymName: updated.gymName,
      logoUrl: updated.logoUrl,
      primaryColor: updated.primaryColor,
      accentColor: updated.accentColor,
      appearanceMode: updated.appearanceMode,
    });
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

// Restores all branding fields (name, colors, mode, logo) to the
// Primary Performance defaults.
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return Response.json({ error: "Sin permisos" }, { status: 403 });
    }

    const existing = await prisma.gymSettings.findUnique({ where: { id: GYM_SETTINGS_ID } });
    const previousStoragePath = existing?.logoStoragePath ?? null;

    const restored = await prisma.gymSettings.upsert({
      where: { id: GYM_SETTINGS_ID },
      create: {
        id: GYM_SETTINGS_ID,
        gymName: DEFAULT_BRANDING.gymName,
        logoUrl: DEFAULT_BRANDING.logoUrl,
        logoStoragePath: null,
        primaryColor: DEFAULT_BRANDING.primaryColor,
        accentColor: DEFAULT_BRANDING.accentColor,
        appearanceMode: DEFAULT_BRANDING.appearanceMode,
        updatedById: session.user.id,
      },
      update: {
        gymName: DEFAULT_BRANDING.gymName,
        logoUrl: DEFAULT_BRANDING.logoUrl,
        logoStoragePath: null,
        primaryColor: DEFAULT_BRANDING.primaryColor,
        accentColor: DEFAULT_BRANDING.accentColor,
        appearanceMode: DEFAULT_BRANDING.appearanceMode,
        updatedById: session.user.id,
      },
    });

    // DB now points at the default logo — clean up the uploaded one (best-effort).
    if (previousStoragePath) {
      await deleteGymLogo(previousStoragePath);
    }

    return Response.json({
      gymName: restored.gymName,
      logoUrl: restored.logoUrl,
      primaryColor: restored.primaryColor,
      accentColor: restored.accentColor,
      appearanceMode: restored.appearanceMode,
    });
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
