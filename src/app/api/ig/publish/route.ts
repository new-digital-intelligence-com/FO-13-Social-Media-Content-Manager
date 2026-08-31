import { NextResponse } from "next/server";
import { execute, ME } from "@/lib/ig";

export const runtime = "nodejs";
export const maxDuration = 120;

/** A file staged by /api/ig/upload. */
type StagedFile = { name: string; mimetype: string; s3key: string };

type Body = {
  kind: "IMAGE" | "REELS" | "STORIES" | "CAROUSEL";
  caption?: string;
  imageUrl?: string;
  videoUrl?: string;
  coverUrl?: string;
  shareToFeed?: boolean;
  altText?: string;
  /** Uploaded alternatives to imageUrl / videoUrl. */
  imageFile?: StagedFile;
  videoFile?: StagedFile;
  /** Carousel slides: each needs a URL or an uploaded file. */
  children?: {
    imageUrl?: string;
    videoUrl?: string;
    imageFile?: StagedFile;
    videoFile?: StagedFile;
  }[];
  /**
   * Reel cover. Instagram exposes `cover_url` only -- there is no `cover_file`,
   * so an uploaded image cannot be used here. Use `thumbOffset` to pick a frame
   * from the video instead.
   */
  coverFile?: StagedFile;
  /** Tag public accounts. Images need x/y (0.0-1.0); Reels accept username only. */
  userTags?: { username: string; x?: number; y?: number }[];
  /** Facebook Page ID of a location; the Page must have lat/long data. */
  locationId?: string;
  /** Reels: millisecond offset for the thumbnail frame. */
  thumbOffset?: number;
  /** Reels: custom audio track name. */
  audioName?: string;
  /** Create the container but stop short of publishing. */
  draftOnly?: boolean;
};

/** Media args accept either a public URL or a staged upload descriptor. */
function mediaArgs(source: {
  imageUrl?: string;
  videoUrl?: string;
  imageFile?: StagedFile;
  videoFile?: StagedFile;
}) {
  return {
    ...(source.imageUrl ? { image_url: source.imageUrl } : {}),
    ...(source.videoUrl ? { video_url: source.videoUrl } : {}),
    ...(source.imageFile ? { image_file: source.imageFile } : {}),
    ...(source.videoFile ? { video_file: source.videoFile } : {}),
  };
}

/**
 * Publishing is always container -> publish. Nothing is public until the
 * publish step, so `draftOnly` gives the UI a safe preview stage.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const {
      kind,
      caption,
      coverUrl,
      shareToFeed,
      altText,
      userTags,
      locationId,
      thumbOffset,
      audioName,
    } = body;

    if (body.coverFile) {
      return NextResponse.json(
        {
          error:
            "Instagram accepts a Reel cover only as a public URL (cover_url); there is no upload equivalent. Paste a public image URL, or set a cover frame offset to use a moment from the video.",
        },
        { status: 400 },
      );
    }

    // Instagram rejects x/y coordinates on Reels tags, and requires them on images.
    const tags =
      userTags?.length
        ? kind === "REELS"
          ? userTags.map((t) => ({ username: t.username }))
          : userTags.filter((t) => t.x !== undefined && t.y !== undefined)
        : undefined;

    let creationId: string | undefined;

    if (kind === "CAROUSEL") {
      const slides = (body.children ?? []).filter(
        (s) => Object.keys(mediaArgs(s)).length > 0,
      );
      if (slides.length < 2 || slides.length > 10) {
        return NextResponse.json(
          { error: "A carousel needs between 2 and 10 slides." },
          { status: 400 },
        );
      }
      // Each child container must exist before the parent references it.
      const childIds: string[] = [];
      for (const slide of slides) {
        const child = await execute<{ id?: string }>("INSTAGRAM_POST_IG_USER_MEDIA", {
          ig_user_id: ME,
          is_carousel_item: true,
          ...mediaArgs(slide),
        });
        const id = child.data?.id;
        if (!id) throw new Error("A carousel slide container was not created.");
        childIds.push(id);
      }
      const parent = await execute<{ id?: string }>(
        "INSTAGRAM_CREATE_CAROUSEL_CONTAINER",
        {
          ig_user_id: ME,
          children: childIds,
          ...(caption ? { caption } : {}),
          ...(locationId ? { location_id: locationId } : {}),
        },
      );
      creationId = parent.data?.id;
    } else {
      const media = mediaArgs(body);
      if (Object.keys(media).length === 0) {
        return NextResponse.json(
          { error: "Upload a file, or give a public URL — Meta fetches the media server-side." },
          { status: 400 },
        );
      }
      const container = await execute<{ id?: string }>("INSTAGRAM_POST_IG_USER_MEDIA", {
        ig_user_id: ME,
        ...(caption ? { caption } : {}),
        ...media,
        ...(coverUrl ? { cover_url: coverUrl } : {}),
        ...(altText ? { alt_text: altText } : {}),
        ...(tags?.length ? { user_tags: tags } : {}),
        ...(locationId ? { location_id: locationId } : {}),
        ...(kind === "REELS"
          ? {
              media_type: "REELS",
              share_to_feed: shareToFeed ?? true,
              ...(thumbOffset !== undefined ? { thumb_offset: thumbOffset } : {}),
              ...(audioName ? { audio_name: audioName } : {}),
            }
          : {}),
        ...(kind === "STORIES" ? { media_type: "STORIES" } : {}),
      });
      creationId = container.data?.id;
    }

    if (!creationId) {
      throw new Error("Instagram did not return a container id.");
    }
    if (body.draftOnly) {
      return NextResponse.json({ ok: true, published: false, creationId });
    }

    const published = await execute("INSTAGRAM_POST_IG_USER_MEDIA_PUBLISH", {
      ig_user_id: ME,
      creation_id: creationId,
    });

    return NextResponse.json({
      ok: true,
      published: true,
      creationId,
      result: published.data,
      logId: published.logId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: /url|fetch|media/i.test(message)
          ? `${message} — the media URL must be public HTTP/HTTPS that Meta can fetch (localhost will not work).`
          : message,
      },
      { status: 500 },
    );
  }
}
