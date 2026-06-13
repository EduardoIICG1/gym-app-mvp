// Minimal Supabase Storage client for the gym branding logo upload.
// Uses the REST API directly via `fetch` — no @supabase/* SDK dependency.
// Bucket "branding-assets" must exist and be public (logos are served to the
// login screen and app shell for all users, including signed-out visitors).

const BUCKET = "branding-assets";

export const ALLOWED_LOGO_MIME_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
export const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

const MIME_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/svg+xml": "svg",
  "image/webp": "webp",
};

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no están configuradas");
  }
  return { url: url.replace(/\/+$/, ""), serviceRoleKey };
}

// Object paths are unguessable (random suffix) even though the bucket is public,
// so old logos can't be enumerated after being replaced.
function buildObjectPath(mimeType: string): string {
  const ext = MIME_EXTENSIONS[mimeType] ?? "bin";
  const random = crypto.randomUUID();
  return `logos/${random}.${ext}`;
}

export interface UploadedLogo {
  storagePath: string;
  publicUrl: string;
}

export async function uploadGymLogo(file: Buffer, mimeType: string): Promise<UploadedLogo> {
  if (!ALLOWED_LOGO_MIME_TYPES.includes(mimeType)) {
    throw new Error("Tipo de archivo no permitido");
  }
  if (file.byteLength > MAX_LOGO_SIZE_BYTES) {
    throw new Error("El archivo supera el tamaño máximo permitido");
  }

  const { url, serviceRoleKey } = getSupabaseConfig();
  const storagePath = buildObjectPath(mimeType);

  const res = await fetch(`${url}/storage/v1/object/${BUCKET}/${storagePath}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": mimeType,
      "x-upsert": "true",
    },
    body: new Uint8Array(file),
  });

  if (!res.ok) {
    throw new Error(`Error al subir el logo (${res.status})`);
  }

  return {
    storagePath,
    publicUrl: `${url}/storage/v1/object/public/${BUCKET}/${storagePath}`,
  };
}

// Best-effort cleanup of the previous logo — failures are not fatal since the
// new logo has already been saved and the row already points at it.
export async function deleteGymLogo(storagePath: string): Promise<void> {
  const { url, serviceRoleKey } = getSupabaseConfig();

  await fetch(`${url}/storage/v1/object/${BUCKET}/${storagePath}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${serviceRoleKey}` },
  }).catch(() => undefined);
}
