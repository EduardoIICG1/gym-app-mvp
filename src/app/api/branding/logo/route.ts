import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { GYM_SETTINGS_ID, DEFAULT_BRANDING } from "@/lib/branding";
import {
  uploadGymLogo,
  deleteGymLogo,
  ALLOWED_LOGO_MIME_TYPES,
  MAX_LOGO_SIZE_BYTES,
} from "@/lib/storage/brandingStorage";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return Response.json({ error: "Sin permisos" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "Archivo requerido" }, { status: 400 });
    }

    if (!ALLOWED_LOGO_MIME_TYPES.includes(file.type)) {
      return Response.json({ error: "Tipo de archivo no permitido" }, { status: 400 });
    }
    if (file.size > MAX_LOGO_SIZE_BYTES) {
      return Response.json({ error: "El archivo supera el tamaño máximo permitido" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadGymLogo(buffer, file.type);

    const existing = await prisma.gymSettings.findUnique({ where: { id: GYM_SETTINGS_ID } });
    const previousStoragePath = existing?.logoStoragePath ?? null;

    const updated = await prisma.gymSettings.upsert({
      where: { id: GYM_SETTINGS_ID },
      create: {
        id: GYM_SETTINGS_ID,
        logoUrl: uploaded.publicUrl,
        logoStoragePath: uploaded.storagePath,
        updatedById: session.user.id,
      },
      update: {
        logoUrl: uploaded.publicUrl,
        logoStoragePath: uploaded.storagePath,
        updatedById: session.user.id,
      },
    });

    if (previousStoragePath) {
      await deleteGymLogo(previousStoragePath);
    }

    return Response.json({ logoUrl: updated.logoUrl });
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

// Restores the default Primary Performance logo (does not affect name/colors/mode).
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
    if (existing?.logoStoragePath) {
      await deleteGymLogo(existing.logoStoragePath);
    }

    const updated = await prisma.gymSettings.upsert({
      where: { id: GYM_SETTINGS_ID },
      create: {
        id: GYM_SETTINGS_ID,
        logoUrl: DEFAULT_BRANDING.logoUrl,
        logoStoragePath: null,
        updatedById: session.user.id,
      },
      update: {
        logoUrl: DEFAULT_BRANDING.logoUrl,
        logoStoragePath: null,
        updatedById: session.user.id,
      },
    });

    return Response.json({ logoUrl: updated.logoUrl });
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
