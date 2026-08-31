import "server-only";
import {
  failureMessage,
  isOutage,
  zernio,
  zernioAccountId,
  zernioHealth,
  type ZernioFailure,
} from "./zernio";

/**
 * The publishing queue.
 *
 * Scheduling lives entirely on Zernio. It holds the post on its own servers,
 * fires it at the slot time, and retries three times with exponential backoff.
 * There is no local queue and no in-process timer: the previous `.data/` store
 * plus `setInterval` only published while `npm run dev` was running, which is
 * not a schedule.
 *
 * The consequence is honest and deliberate: **if Zernio is unreachable, nothing
 * can be scheduled at all.** Callers get `available: false` and a reason, and
 * must say so rather than implying a post is queued.
 */

export type ScheduleStatus = "draft" | "scheduled" | "published" | "failed";

export type Platform = "instagram" | "youtube";

export type ScheduledPost = {
  /** Zernio post id. */
  id: string;
  platform: Platform;
  caption?: string;
  mediaUrl?: string;
  /** ISO timestamp. Null means a draft with no date. */
  publishAt: string | null;
  status: ScheduleStatus;
  createdAt: string;
  publishedAt?: string;
  /** Public URL on the platform, once published. */
  permalink?: string;
  error?: string;
};

/**
 * The queue plus whether it could be read at all.
 *
 * `available: false` is not an empty queue — it means we do not know what is
 * queued. The UI must render those differently; showing "nothing scheduled"
 * during an outage would be a lie.
 */
export type QueueView = {
  available: boolean;
  /** Why it is unavailable, ready to show a user. */
  detail?: string;
  /** True when the fix is configuration, not waiting for an outage to end. */
  needsSetup?: boolean;
  posts: ScheduledPost[];
};

type ZernioPost = {
  _id: string;
  content?: string;
  status?: string;
  isDraft?: boolean;
  scheduledFor?: string | null;
  publishedAt?: string;
  createdAt?: string;
  error?: string;
  mediaItems?: { url?: string }[];
  platforms?: {
    platform?: string;
    status?: string;
    platformPostUrl?: string;
    error?: string;
  }[];
};

function toStatus(p: ZernioPost): ScheduleStatus {
  const raw = (p.platforms?.[0]?.status ?? p.status ?? "").toLowerCase();
  if (raw === "published" || raw === "posted") return "published";
  if (raw === "failed" || raw === "error") return "failed";
  if (p.isDraft || !p.scheduledFor) return "draft";
  return "scheduled";
}

function map(p: ZernioPost, platform: Platform): ScheduledPost {
  const target = p.platforms?.find((t) => t.platform === platform) ?? p.platforms?.[0];
  return {
    id: p._id,
    platform,
    caption: p.content,
    mediaUrl: p.mediaItems?.[0]?.url,
    publishAt: p.scheduledFor ?? null,
    status: toStatus(p),
    createdAt: p.createdAt ?? new Date().toISOString(),
    publishedAt: p.publishedAt,
    permalink: target?.platformPostUrl,
    error: target?.error ?? p.error,
  };
}

function unavailable(failure: ZernioFailure): QueueView {
  return {
    available: false,
    detail: failureMessage(failure),
    needsSetup: !isOutage(failure),
    posts: [],
  };
}

/** The queue for one platform, and whether Zernio could be reached. */
export async function queue(platform: Platform = "instagram"): Promise<QueueView> {
  const accountId = await zernioAccountId(platform);
  if (!accountId) {
    const health = await zernioHealth();
    return {
      available: false,
      detail:
        health.state === "ready"
          ? `No active ${platform} account is connected on Zernio.`
          : (health.detail ?? "Zernio is unavailable."),
      needsSetup: health.state !== "unavailable",
      posts: [],
    };
  }

  const res = await zernio<{ posts: ZernioPost[] }>(
    `/posts?accountId=${encodeURIComponent(accountId)}&limit=50&sortBy=scheduledFor`,
    { method: "GET" },
  );
  if (!res.ok) return unavailable(res.failure);

  const posts = (res.data.posts ?? [])
    .map((p) => map(p, platform))
    .sort((a, b) =>
      (a.publishAt ?? a.createdAt).localeCompare(b.publishAt ?? b.createdAt),
    );
  return { available: true, posts };
}

/**
 * Kept for the callers that only need the list (cadence, home status).
 * An unreachable Zernio yields an empty list there, which is acceptable
 * because those surfaces report Zernio's state separately.
 */
export async function listPosts(platform: Platform = "instagram") {
  return (await queue(platform)).posts;
}

export type NewPost = {
  platform: Platform;
  caption?: string;
  mediaUrl?: string;
  mediaType?: "image" | "video";
  /** ISO timestamp; null saves a draft. */
  publishAt?: string | null;
  /** Queue on the profile's next free slot instead of a fixed time. */
  useQueue?: boolean;
  /** IANA timezone for `publishAt`. */
  timezone?: string;
  /** Platform-specific options, e.g. YouTube title and visibility. */
  options?: Record<string, unknown>;
};

export type CreateResult =
  | { ok: true; post: ScheduledPost }
  | { ok: false; detail: string; needsSetup?: boolean; existingPostId?: string };

/** Schedule, queue, or save a draft on Zernio. */
export async function addPost(input: NewPost): Promise<CreateResult> {
  const accountId = await zernioAccountId(input.platform);
  if (!accountId) {
    const health = await zernioHealth();
    return {
      ok: false,
      detail:
        health.state === "ready"
          ? `No active ${input.platform} account is connected on Zernio.`
          : (health.detail ?? "Zernio is unavailable, so nothing can be scheduled."),
      needsSetup: health.state !== "unavailable",
    };
  }

  const body: Record<string, unknown> = {
    content: input.caption,
    platforms: [
      {
        platform: input.platform,
        accountId,
        ...(input.options ? { platformSpecificData: input.options } : {}),
      },
    ],
  };
  if (input.mediaUrl) {
    body.mediaItems = [
      { type: input.mediaType ?? "image", url: input.mediaUrl },
    ];
  }

  if (input.useQueue) {
    const health = await zernioHealth();
    if (!health.profileId) {
      return {
        ok: false,
        detail: "No Zernio profile is configured, so the queue cannot assign a slot.",
        needsSetup: true,
      };
    }
    // Always let Zernio assign the slot. Reading next-slot and sending it as
    // scheduledFor bypasses queue locking, so two posts can take one slot.
    body.queuedFromProfile = health.profileId;
  } else if (input.publishAt) {
    body.scheduledFor = input.publishAt;
    if (input.timezone) body.timezone = input.timezone;
  } else {
    body.isDraft = true;
  }

  const res = await zernio<{ post: ZernioPost }>("/posts", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const f = res.failure;
    return {
      ok: false,
      detail: failureMessage(f),
      needsSetup: !isOutage(f),
      existingPostId: f.kind === "duplicate" ? f.existingPostId : undefined,
    };
  }
  return { ok: true, post: map(res.data.post, input.platform) };
}

/** Reschedule or edit a queued post. */
export async function updatePost(
  id: string,
  patch: { publishAt?: string | null; caption?: string; timezone?: string },
  platform: Platform = "instagram",
): Promise<CreateResult> {
  const body: Record<string, unknown> = {};
  if (patch.caption !== undefined) body.content = patch.caption;
  if (patch.publishAt !== undefined) {
    if (patch.publishAt) {
      body.scheduledFor = patch.publishAt;
      body.isDraft = false;
      if (patch.timezone) body.timezone = patch.timezone;
    } else {
      // Clearing the date returns it to a draft rather than leaving it armed.
      body.isDraft = true;
      body.scheduledFor = null;
    }
  }

  const res = await zernio<{ post: ZernioPost }>(`/posts/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    return {
      ok: false,
      detail: failureMessage(res.failure),
      needsSetup: !isOutage(res.failure),
    };
  }
  return { ok: true, post: map(res.data.post, platform) };
}

export async function removePost(id: string): Promise<{ ok: boolean; detail?: string }> {
  const res = await zernio(`/posts/${encodeURIComponent(id)}`, { method: "DELETE" });
  return res.ok ? { ok: true } : { ok: false, detail: failureMessage(res.failure) };
}
