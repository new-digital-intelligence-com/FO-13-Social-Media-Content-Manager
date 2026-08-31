import "server-only";
import { v2 as cloudinary } from "cloudinary";

/**
 * Media hosting.
 *
 * Every platform here fetches media server-side from a public URL, so a local
 * file needs somewhere to live first. Cloudinary gives a durable one, which
 * matters in two places the staged-file route cannot reach at all:
 *
 *   - an Instagram Reel cover (`cover_url` is URL-only, no file equivalent)
 *   - a YouTube thumbnail (`thumbnailUrl` is URL-only)
 *
 * It is also more durable than temporary staging, which expires within a day.
 */

// Accept both the short names and the conventional CLOUDINARY_* names.
const CLOUD_NAME = process.env.CLOUD_NAME ?? process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUD_API_KEY ?? process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUD_API_SECRET ?? process.env.CLOUDINARY_API_SECRET;

export const cloudinaryConfigured = Boolean(CLOUD_NAME && API_KEY && API_SECRET);

if (cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: CLOUD_NAME,
    api_key: API_KEY,
    api_secret: API_SECRET,
    secure: true,
  });
}

export type HostedMedia = {
  url: string;
  publicId: string;
  resourceType: "image" | "video" | "raw";
  bytes: number;
  format?: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
};

export class CloudinaryNotConfiguredError extends Error {
  readonly code = "CLOUDINARY_NOT_CONFIGURED";
  constructor() {
    super(
      "Media hosting is not configured. Add CLOUD_NAME, CLOUD_API_KEY and CLOUD_API_SECRET to .env.local.",
    );
  }
}

export async function uploadMedia(
  file: File,
  folder = "content-studio",
): Promise<HostedMedia> {
  if (!cloudinaryConfigured) throw new CloudinaryNotConfiguredError();

  const isVideo = file.type.startsWith("video/");
  const buffer = Buffer.from(await file.arrayBuffer());

  const result = await new Promise<Record<string, unknown>>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: isVideo ? "video" : "image",
        // Keeps the original bytes: platforms re-encode themselves, and a
        // silent transform would change what the user reviewed.
        use_filename: true,
        unique_filename: true,
        overwrite: false,
      },
      (error, uploaded) => {
        if (error) reject(new Error(error.message));
        else if (!uploaded) reject(new Error("Upload returned no result."));
        else resolve(uploaded as unknown as Record<string, unknown>);
      },
    );
    stream.end(buffer);
  });

  return {
    url: String(result.secure_url),
    publicId: String(result.public_id),
    resourceType: (result.resource_type as HostedMedia["resourceType"]) ?? "image",
    bytes: Number(result.bytes ?? file.size),
    format: result.format ? String(result.format) : undefined,
    width: result.width ? Number(result.width) : undefined,
    height: result.height ? Number(result.height) : undefined,
    durationSeconds: result.duration ? Number(result.duration) : undefined,
  };
}

/** Derive a still frame from an uploaded video — a ready-made cover image. */
export function videoFrameUrl(publicId: string, atSeconds = 0): string | null {
  if (!cloudinaryConfigured) return null;
  return cloudinary.url(publicId, {
    resource_type: "video",
    format: "jpg",
    secure: true,
    start_offset: String(atSeconds),
  });
}

export async function deleteMedia(publicId: string, resourceType = "image") {
  if (!cloudinaryConfigured) throw new CloudinaryNotConfiguredError();
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}
