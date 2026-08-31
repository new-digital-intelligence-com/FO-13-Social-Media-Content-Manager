import { NextResponse } from "next/server";
import { composio } from "@/lib/composio";
import { cloudinaryConfigured, uploadMedia } from "@/lib/cloudinary";
import { TOOLKIT, ytExecute, ytRoute } from "@/lib/yt";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * YOUTUBE_UPLOAD_VIDEO requires all of tags, title, categoryId, description,
 * privacyStatus and videoFilePath -- the file goes in `videoFilePath`, not a
 * generic `media` field, and categoryId is not optional.
 */
/**
 * Containers YouTube can actually decode. Anything else uploads fine and then
 * fails silently in Studio as "processing abandoned", which is invisible from
 * the app -- so it is rejected up front instead.
 */
const VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-ms-wmv",
  "video/mpeg",
  "video/webm",
  "video/x-matroska",
  "video/3gpp",
];

const MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024;

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  // An upload that YouTube cannot process still creates a video entry on the
  // channel, so these have to be caught before sending, not after.
  if (file.size === 0) {
    return NextResponse.json(
      { error: "That file is empty (0 bytes)." },
      { status: 400 },
    );
  }
  if (!file.type.startsWith("video/")) {
    return NextResponse.json(
      {
        error: `"${file.name}" is ${file.type || "an unknown type"}, not a video. YouTube needs MP4, MOV, AVI, WMV, MPEG, WebM, MKV or 3GP.`,
      },
      { status: 400 },
    );
  }
  if (!VIDEO_TYPES.includes(file.type)) {
    return NextResponse.json(
      {
        error: `YouTube cannot process ${file.type}. Convert to MP4 (H.264) first — it is the most reliable format.`,
      },
      { status: 400 },
    );
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return NextResponse.json(
      { error: `File is ${(file.size / 1024 ** 3).toFixed(1)} GB; the limit here is 2 GB.` },
      { status: 400 },
    );
  }

  return ytRoute(async () => {
    const title = String(form.get("title") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    if (!title || !description) {
      throw new Error("A title and description are required to upload.");
    }

    const tags = String(form.get("tags") ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    // YOUTUBE_UPLOAD_VIDEO accepts the request and creates the video, but the
    // file it hands YouTube is unusable -- every upload ends as "processing
    // abandoned". Verified against a known-good video that the multipart tool
    // published successfully from the identical staged file.
    const staged = await composio.files.upload({
      file,
      toolSlug: "YOUTUBE_MULTIPART_UPLOAD_VIDEO",
      toolkitSlug: TOOLKIT,
    });

    // A descriptor without a storage key means nothing usable was staged, and
    // uploading it would produce another unplayable entry on the channel.
    if (!staged?.s3key) {
      throw new Error("The video did not stage correctly; nothing was uploaded.");
    }

    const r = await ytExecute("YOUTUBE_MULTIPART_UPLOAD_VIDEO", {
      title,
      description,
      // The API rejects an empty tag list, so fall back to something derived.
      tags: tags.length ? tags : [title.split(/\s+/)[0] || "video"],
      // "22" is People & Blogs -- the safe default when the user picks nothing.
      // The API demands a category, youtube.com does not ask for one at
      // upload time. Default to 22 (People & Blogs) rather than making the
      // user pick; it stays editable afterwards from the video's details.
      categoryId: String(form.get("categoryId") ?? "22"),
      privacyStatus: String(form.get("privacyStatus") ?? "private"),
      // Note: this tool takes `videoFile`, not `videoFilePath`.
      videoFile: staged,
    });

    // YouTube accepts the upload before it decodes the file, so a success here
    // is not proof it will play. Report what processing actually says.
    // YouTube's payload arrives nested under response_data, so reading r.data.id
    // silently returned nothing and the processing check never ran.
    // Response shapes differ per tool: the multipart tool nests the video under
    // `video`, the other returns it under `response_data`.
    const raw = (r.data as { response_data?: Record<string, unknown> })?.response_data ?? r.data;
    const payload = ((raw as { video?: Record<string, unknown> })?.video ?? raw) as
      | { id?: string; video_id?: string }
      | undefined;
    const videoId = payload?.id ?? payload?.video_id ?? null;

    let processing: unknown = null;
    if (videoId) {
      const details = await ytExecute("YOUTUBE_GET_VIDEO_DETAILS_BATCH", {
        id: videoId,
        parts: "status,processingDetails",
      }).catch(() => null);
      processing = details?.data ?? null;
    }

    return {
      ok: true,
      kind: "video",
      videoId,
      result: r.data,
      processing,
      name: file.name,
      bytes: file.size,
      note: videoId
        ? "Uploaded. YouTube processes the file afterwards — check Studio if it does not appear."
        : "Uploaded, but YouTube returned no video id.",
    };
  });
}

/**
 * Thumbnails take a public URL, not a file. A multipart request is hosted
 * first so an uploaded image still works; a JSON request passes a URL through.
 */
export async function PATCH(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    const videoId = String(form.get("videoId") ?? "");
    if (!(file instanceof File) || !videoId) {
      return NextResponse.json(
        { error: "A file and videoId are required." },
        { status: 400 },
      );
    }
    if (!cloudinaryConfigured) {
      return NextResponse.json(
        {
          error:
            "YouTube needs a public thumbnail URL. Configure media hosting, or pass thumbnailUrl directly.",
        },
        { status: 503 },
      );
    }
    return ytRoute(async () => {
      const hosted = await uploadMedia(file, "youtube/thumbnails");
      const r = await ytExecute("YOUTUBE_UPDATE_THUMBNAIL", {
        videoId,
        thumbnailUrl: hosted.url,
      });
      return { ok: true, kind: "thumbnail", thumbnailUrl: hosted.url, result: r.data };
    });
  }

  const { videoId, thumbnailUrl } = await request.json();
  return ytRoute(async () => {
    if (!videoId || !thumbnailUrl) {
      throw new Error("videoId and thumbnailUrl are required.");
    }
    const r = await ytExecute("YOUTUBE_UPDATE_THUMBNAIL", { videoId, thumbnailUrl });
    return { ok: true, kind: "thumbnail", result: r.data };
  });
}
