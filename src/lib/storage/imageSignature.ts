// Pure file-signature ("magic bytes") detection for the branding logo upload.
// Used to verify the declared MIME type matches the actual file content,
// since `file.type` from a multipart upload is client-supplied and can be spoofed.

export type DetectedImageType = "image/png" | "image/jpeg" | "image/webp";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];

function matchesSignature(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.length < signature.length) return false;
  return signature.every((byte, i) => bytes[i] === byte);
}

function isWebp(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  const riff = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  const webp = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
  return riff === "RIFF" && webp === "WEBP";
}

// Returns the detected image type from the file's magic bytes, or null if
// the content doesn't match any supported signature.
export function detectImageType(bytes: Uint8Array): DetectedImageType | null {
  if (matchesSignature(bytes, PNG_SIGNATURE)) return "image/png";
  if (matchesSignature(bytes, JPEG_SIGNATURE)) return "image/jpeg";
  if (isWebp(bytes)) return "image/webp";
  return null;
}

// Confirms the declared MIME type matches the file's actual content.
export function matchesDeclaredType(bytes: Uint8Array, declaredMimeType: string): boolean {
  return detectImageType(bytes) === declaredMimeType;
}
