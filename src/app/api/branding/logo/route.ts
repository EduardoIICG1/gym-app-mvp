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
    if (file.size === 0) {
      return Response.json({ error: "El archivo está vacío" }, { status: 400 });
    }
    if (file.size > MAX_LOGO_SIZE_BYTES) {
      return Response.json({ error: "El archivo supera el tamaño máximo permitido" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let uploaded;
    try {
      uploaded = await uploadGymLogo(buffer, file.type);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al subir el logo";
      return Response.json({ error: message }, { status: 400 });
    }

    const existing = await prisma.gymSettings.findUnique({ where: { id: GYM_SETTINGS_ID } });
    const previousStoragePath = existing?.logoStoragePath ?? null;

    let updated;
    try {
      updated = await prisma.gymSettings.upsert({
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
    } catch (err) {
      // DB write failed — remove the just-uploaded file so it doesn't become orphaned.
      await deleteGymLogo(uploaded.storagePath);
      throw err;
    }

    // DB now points at the new logo — clean up the old one (best-effort, never
    // surfaced as an error since the new logo was saved successfully).
    if (previousStoragePath && previousStoragePath !== uploaded.storagePath) {
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
    const previousStoragePath = existing?.logoStoragePath ?? null;

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

    // DB now points at the default logo — clean up the uploaded one (best-effort).
    // previousStoragePath is only ever a Supabase storage path, never the
    // bundled /public default, so the default asset is never deleted.
    if (previousStoragePath) {
      await deleteGymLogo(previousStoragePath);
    }

    return Response.json({ logoUrl: updated.logoUrl });
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
