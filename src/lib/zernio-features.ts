import "server-only";
import {
  failureMessage,
  isOutage,
  zernio,
  zernioAccountId,
  zernioHealth,
  type ZernioResult,
} from "./zernio";

/**
 * Zernio capabilities beyond the queue: analytics, comment-to-DM automations,
 * queue slots, and cross-posting.
 *
 * One implementation, three consumers — the REST routes under /api/zernio (which
 * the plugin skills also drive), the app's own agent tools, and the UI panels.
 * Keeping it in one place is what stops the two surfaces drifting apart.
 */

export type Outcome<T> =
  | { ok: true; data: T }
  | { ok: false; detail: string; needsSetup: boolean };

function fail<T>(res: Extract<ZernioResult<T>, { ok: false }>): Outcome<T> {
  return {
    ok: false,
    detail: failureMessage(res.failure),
    needsSetup: !isOutage(res.failure),
  };
}

async function get<T>(path: string): Promise<Outcome<T>> {
  const res = await zernio<T>(path, { method: "GET" });
  return res.ok ? { ok: true, data: res.data } : fail(res);
}

/** Resolve an account id, or explain why we cannot. */
async function account(platform: string): Promise<Outcome<string>> {
  const id = await zernioAccountId(platform);
  if (id) return { ok: true, data: id };
  const health = await zernioHealth();
  return {
    ok: false,
    detail:
      health.state === "ready"
        ? `No active ${platform} account is connected on Zernio.`
        : (health.detail ?? "Zernio is unavailable."),
    needsSetup: health.state !== "unavailable",
  };
}

/* ── Analytics ──────────────────────────────────────────────────────────── */

export type BestTimeSlot = {
  /** 0 = Monday. */
  day_of_week: number;
  /** UTC hour, 0-23. Convert before showing a user a local time. */
  hour: number;
  avg_engagement: number;
  /** How many posts back this slot. A low count is noise, not a signal. */
  post_count: number;
};

export async function bestTime(platform: string) {
  const acc = await account(platform);
  if (!acc.ok) return acc;
  return get<{ slots: BestTimeSlot[] }>(
    `/analytics/best-time?platform=${encodeURIComponent(platform)}&accountId=${acc.data}`,
  );
}

export async function contentDecay(platform: string) {
  const acc = await account(platform);
  if (!acc.ok) return acc;
  return get<unknown>(`/analytics/content-decay?accountId=${acc.data}`);
}

export async function postingFrequency(platform: string) {
  const acc = await account(platform);
  if (!acc.ok) return acc;
  return get<unknown>(`/analytics/posting-frequency?accountId=${acc.data}`);
}

export async function instagramDemographics() {
  const acc = await account("instagram");
  if (!acc.ok) return acc;
  return get<unknown>(`/analytics/instagram/demographics?accountId=${acc.data}`);
}

export async function instagramFollowerHistory() {
  const acc = await account("instagram");
  if (!acc.ok) return acc;
  return get<unknown>(`/analytics/instagram/follower-history?accountId=${acc.data}`);
}

export async function youtubeChannelInsights() {
  const acc = await account("youtube");
  if (!acc.ok) return acc;
  return get<unknown>(`/analytics/youtube/channel-insights?accountId=${acc.data}`);
}

export async function youtubeDailyViews() {
  const acc = await account("youtube");
  if (!acc.ok) return acc;
  return get<unknown>(`/analytics/youtube/daily-views?accountId=${acc.data}`);
}

export async function youtubeDemographics() {
  const acc = await account("youtube");
  if (!acc.ok) return acc;
  return get<unknown>(`/analytics/youtube/demographics?accountId=${acc.data}`);
}

/**
 * Audience retention for one video.
 *
 * `audienceWatchRatio` can exceed 1 (rewinds, looping Shorts) and is not
 * comparable across videos; `relativeRetentionPerformance` is the one that is.
 * YouTube finalises analytics with a ~3 day lag, so recent days are provisional.
 */
export async function youtubeRetention(videoId: string) {
  const acc = await account("youtube");
  if (!acc.ok) return acc;
  return get<unknown>(
    `/analytics/youtube/video-retention?videoId=${encodeURIComponent(videoId)}&accountId=${acc.data}`,
  );
}

/* ── Queue slots ────────────────────────────────────────────────────────── */

export type QueueSlot = { dayOfWeek: number; hour: number; minute: number };

/**
 * A profile with no slots cannot queue at all — `queuedFromProfile` has nowhere
 * to put the post. Zernio returns 404 for that, which is a setup gap and must
 * not be reported as an outage.
 */
export async function listQueueSlots() {
  const health = await zernioHealth();
  if (!health.profileId) {
    return {
      ok: false as const,
      detail: "No Zernio profile is configured.",
      needsSetup: true,
    };
  }
  const res = await zernio<{ queues: unknown[]; count: number }>(
    `/queue/slots?profileId=${health.profileId}`,
    { method: "GET" },
  );
  if (res.ok) return { ok: true as const, data: res.data };
  // 404 here means "no schedule yet", which is expected on a fresh profile.
  if (res.failure.kind === "invalid" && res.failure.status === 404) {
    return { ok: true as const, data: { queues: [], count: 0 } };
  }
  return fail(res);
}

export async function createQueueSlots(input: {
  name: string;
  timezone: string;
  slots: QueueSlot[];
}) {
  const health = await zernioHealth();
  if (!health.profileId) {
    return { ok: false as const, detail: "No Zernio profile is configured.", needsSetup: true };
  }
  const res = await zernio<unknown>("/queue/slots", {
    method: "POST",
    body: JSON.stringify({ profileId: health.profileId, ...input }),
  });
  return res.ok ? { ok: true as const, data: res.data } : fail(res);
}

/** Upcoming slot times, for display only — never feed these to `scheduledFor`. */
export async function previewQueue(count = 5) {
  const health = await zernioHealth();
  if (!health.profileId) {
    return { ok: false as const, detail: "No Zernio profile is configured.", needsSetup: true };
  }
  return get<unknown>(`/queue/preview?profileId=${health.profileId}&count=${count}`);
}

/* ── Comment-to-DM automations ──────────────────────────────────────────── */

export type Automation = {
  _id: string;
  name?: string;
  keywords?: string[];
  trigger?: "comment" | "story_reply";
  platformPostId?: string | null;
  isActive?: boolean;
  stats?: { delivered?: number; read?: number; clicks?: number };
};

export async function listAutomations() {
  const health = await zernioHealth();
  if (!health.profileId) {
    return { ok: false as const, detail: "No Zernio profile is configured.", needsSetup: true };
  }
  return get<{ automations: Automation[] }>(
    `/comment-automations?profileId=${health.profileId}`,
  );
}

export async function createAutomation(input: {
  name?: string;
  keywords: string[];
  dmMessage: string;
  /** Omit to run account-wide across every post. */
  platformPostId?: string;
  trigger?: "comment" | "story_reply";
  alsoMatchInDms?: boolean;
}) {
  const [acc, health] = await Promise.all([account("instagram"), zernioHealth()]);
  if (!acc.ok) return acc;
  if (!health.profileId) {
    return { ok: false as const, detail: "No Zernio profile is configured.", needsSetup: true };
  }
  const res = await zernio<unknown>("/comment-automations", {
    method: "POST",
    body: JSON.stringify({
      profileId: health.profileId,
      accountId: acc.data,
      trigger: input.trigger ?? "comment",
      ...input,
    }),
  });
  return res.ok ? { ok: true as const, data: res.data } : fail(res);
}

export async function setAutomationActive(id: string, isActive: boolean) {
  const res = await zernio<unknown>(`/comment-automations/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
  return res.ok ? { ok: true as const, data: res.data } : fail(res);
}

export async function deleteAutomation(id: string) {
  const res = await zernio<unknown>(`/comment-automations/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  return res.ok ? { ok: true as const, data: { ok: true } } : fail(res);
}

export async function automationLogs(id: string) {
  return get<unknown>(`/comment-automations/${encodeURIComponent(id)}/logs`);
}

/* ── Cross-posting ──────────────────────────────────────────────────────── */

export type CrossTarget = {
  platform: string;
  /** Overrides the shared caption for this platform. */
  customContent?: string;
  options?: Record<string, unknown>;
};

/**
 * One payload to several platforms.
 *
 * Partial success is the normal failure here: the response reports per-platform
 * outcomes, and callers must surface them individually rather than as a single
 * "posted". Retrying the whole payload would double-post whatever succeeded.
 */
export async function crossPost(input: {
  content: string;
  mediaUrl?: string;
  mediaType?: "image" | "video";
  targets: CrossTarget[];
  publishAt?: string | null;
  useQueue?: boolean;
  timezone?: string;
}) {
  const resolved: Record<string, unknown>[] = [];
  const missing: string[] = [];
  for (const t of input.targets) {
    const id = await zernioAccountId(t.platform);
    if (!id) {
      missing.push(t.platform);
      continue;
    }
    resolved.push({
      platform: t.platform,
      accountId: id,
      ...(t.customContent ? { customContent: t.customContent } : {}),
      ...(t.options ? { platformSpecificData: t.options } : {}),
    });
  }

  if (resolved.length === 0) {
    const health = await zernioHealth();
    return {
      ok: false as const,
      detail:
        health.state === "ready"
          ? `No active Zernio account for: ${missing.join(", ")}.`
          : (health.detail ?? "Zernio is unavailable."),
      needsSetup: health.state !== "unavailable",
    };
  }

  const body: Record<string, unknown> = { content: input.content, platforms: resolved };
  if (input.mediaUrl) {
    body.mediaItems = [{ type: input.mediaType ?? "image", url: input.mediaUrl }];
  }
  if (input.useQueue) {
    const health = await zernioHealth();
    if (!health.profileId) {
      return { ok: false as const, detail: "No Zernio profile is configured.", needsSetup: true };
    }
    body.queuedFromProfile = health.profileId;
  } else if (input.publishAt) {
    body.scheduledFor = input.publishAt;
    if (input.timezone) body.timezone = input.timezone;
  } else {
    body.publishNow = true;
  }

  const res = await zernio<{ post: unknown; warnings?: string[] }>("/posts", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) return fail(res);
  return {
    ok: true as const,
    // `skipped` is not a failure of the call, but the caller must report it —
    // silently posting to fewer platforms than asked is the bug to avoid.
    data: { ...res.data, skipped: missing },
  };
}
