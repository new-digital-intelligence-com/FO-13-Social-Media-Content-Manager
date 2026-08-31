import { NextResponse } from "next/server";
import { composio } from "@/lib/composio";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Instagram's own ceilings; reject early rather than after a slow upload. */
const LIMITS = {
  image: { bytes: 8 * 1024 * 1024, label: "8 MB" },
  video: { bytes: 100 * 1024 * 1024, label: "100 MB" },
};

/**
 * Stages a file with Composio and returns the { name, mimetype, s3key }
 * descriptor that INSTAGRAM_POST_IG_USER_MEDIA accepts as image_file /
 * video_file. Composio hosts it on a temporary public URL for Meta to fetch,
 * which is why an upload works where a localhost URL cannot.
 */
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) {
      return NextResponse.json(
        { error: `Unsupported file type "${file.type || "unknown"}". Use an image or video.` },
        { status: 400 },
      );
    }

    const limit = isVideo ? LIMITS.video : LIMITS.image;
    if (file.size > limit.bytes) {
      return NextResponse.json(
        { error: `File is ${(file.size / 1024 / 1024).toFixed(1)} MB; the limit is ${limit.label}.` },
        { status: 400 },
      );
    }

    // Passing the File preserves name and mimetype; a raw Buffer is rejected.
    const staged = await composio.files.upload({
      file,
      toolSlug: "INSTAGRAM_POST_IG_USER_MEDIA",
      toolkitSlug: "instagram",
    });

    return NextResponse.json({
      file: staged,
      kind: isVideo ? "video" : "image",
      size: file.size,
      name: file.name,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed." },
      { status: 500 },
    );
  }
}
