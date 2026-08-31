import { NextResponse } from "next/server";
import { execute, type Profile } from "@/lib/ig";
import { isConnected as igConnected, getSession as igSession } from "@/lib/composio";
import { SetupRequiredError, isXConnected, xExecute } from "@/lib/x";
import { listPosts } from "@/lib/schedule";
import { isYtConnected, ytExecute } from "@/lib/yt";
import { zernioHealth } from "@/lib/zernio";

export const runtime = "nodejs";
export const maxDuration = 60;

type PlatformStatus = {
  id: string;
  state: "connected" | "setup" | "disconnected" | "error";
  handle?: string;
  /** The platform's own user/channel id — the only reliable identity to compare. */
  accountId?: string;
  stats?: { label: string; value: number | string }[];
  detail?: string;
};

/**
 * One call powering the home page. Every branch is guarded: a platform that is
 * unconfigured or failing must not blank the others, so each resolves to its
 * own state rather than throwing.
 */
async function instagram(): Promise<PlatformStatus> {
  try {
    const session = await igSession();
    if (!(await igConnected(session))) {
      return { id: "instagram", state: "disconnected" };
    }
    const profile = await execute<Profile>("INSTAGRAM_GET_USER_INFO");
    const p = profile.data;
    return {
      id: "instagram",
      state: "connected",
      handle: p?.username ? `@${p.username}` : undefined,
      accountId: p?.id ? String(p.id) : undefined,
      stats: [
        { label: "Followers", value: p?.followers_count ?? 0 },
        { label: "Posts", value: p?.media_count ?? 0 },
      ],
    };
  } catch (error) {
    return {
      id: "instagram",
      state: "error",
      detail: error instanceof Error ? error.message : "Unavailable",
    };
  }
}

async function x(): Promise<PlatformStatus> {
  try {
    if (!(await isXConnected())) return { id: "x", state: "disconnected" };
    const me = await xExecute<{
      id?: string;
      username?: string;
      public_metrics?: { followers_count?: number; tweet_count?: number };
    }>("TWITTER_USER_LOOKUP_ME", { "user__fields": ["username", "public_metrics"] });
    return {
      id: "x",
      state: "connected",
      handle: me.data?.username ? `@${me.data.username}` : undefined,
      accountId: me.data?.id ? String(me.data.id) : undefined,
      stats: [
        { label: "Followers", value: me.data?.public_metrics?.followers_count ?? 0 },
        { label: "Posts", value: me.data?.public_metrics?.tweet_count ?? 0 },
      ],
    };
  } catch (error) {
    // X without credentials is a setup state, not a failure.
    if (error instanceof SetupRequiredError) return { id: "x", state: "setup" };
    return {
      id: "x",
      state: "error",
      detail: error instanceof Error ? error.message : "Unavailable",
    };
  }
}

async function youtube(): Promise<PlatformStatus> {
  try {
    if (!(await isYtConnected())) return { id: "youtube", state: "disconnected" };
    const r = await ytExecute<{ items?: { snippet?: { title?: string }; statistics?: Record<string, string> }[] }>(
      "YOUTUBE_LIST_CHANNELS",
      { part: "snippet,statistics", mine: true },
    );
    const item = Array.isArray(r.data) ? r.data[0] : r.data?.items?.[0];
    const stats = item?.statistics ?? {};
    return {
      id: "youtube",
      state: "connected",
      handle: item?.snippet?.title,
      accountId: item?.id ? String(item.id) : undefined,
      stats: [
        { label: "Subscribers", value: Number(stats.subscriberCount ?? 0) },
        { label: "Videos", value: Number(stats.videoCount ?? 0) },
      ],
    };
  } catch (error) {
    return {
      id: "youtube",
      state: "error",
      detail: error instanceof Error ? error.message : "Unavailable",
    };
  }
}

/**
 * Composio and Zernio are authorized separately, so nothing stops them pointing
 * at *different accounts on the same platform*. That is silently catastrophic:
 * the app would read comments, insights and cadence from one account while
 * publishing to another. Detect it and surface it — the handles are the only
 * evidence either side gives us.
 */
function accountMismatches(
  platforms: PlatformStatus[],
  zernio: {
    state: string;
    accounts?: { platform: string; handle?: string; platformUserId?: string }[];
  },
) {
  if (zernio.state !== "ready" || !zernio.accounts) return [];

  return platforms.flatMap((p) => {
    const z = zernio.accounts!.find((a) => a.platform === p.id);
    if (!z || p.state !== "connected") return [];

    // Compare ids, never display names. Composio reports YouTube's *title*
    // ("Samir Sellimix") while Zernio reports its *handle*
    // ("@samirsellimi-f7d") — the same channel, so a name comparison raises a
    // false alarm. Only the platform's own id identifies an account.
    if (!p.accountId || !z.platformUserId) return [];
    if (p.accountId === z.platformUserId) return [];

    return [
      {
        platform: p.id,
        composio: p.handle ?? p.accountId,
        zernio: z.handle ?? z.platformUserId,
      },
    ];
  });
}

export async function GET() {
  const [ig, tw, yt, queue, zernio] = await Promise.all([
    instagram(),
    x(),
    youtube(),
    listPosts().catch(() => []),
    // Never let the probe fail the whole status call: an unreachable Zernio is
    // a state to report, not an error to propagate.
    zernioHealth().catch(() => ({ state: "unavailable" as const, detail: "Probe failed." })),
  ]);

  return NextResponse.json({
    platforms: [ig, tw, yt],
    queue: {
      scheduled: queue.filter((p) => p.status === "scheduled").length,
      drafts: queue.filter((p) => p.status === "draft").length,
      // The queue lives on Zernio, so it cannot be read during an outage.
      // Zero here means nothing scheduled only when `zernio.state` is "ready".
      available: zernio.state === "ready",
    },
    // Features backed by Zernio read this to disable themselves rather than
    // failing mid-action. `ready` is the only state where they are usable.
    zernio,
    // Non-empty means reads and writes are hitting different accounts on the
    // same platform. Always surface this; it invalidates cadence, insights and
    // any automation targeting.
    accountMismatches: accountMismatches([ig, tw, yt], zernio),
  });
}
