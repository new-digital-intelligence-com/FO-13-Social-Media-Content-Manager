import { NextResponse } from "next/server";
import { execute, type Profile } from "@/lib/ig";
import { isConnected as igConnected, getSession as igSession } from "@/lib/composio";
import { SetupRequiredError, isXConnected, xExecute } from "@/lib/x";
import { listPosts } from "@/lib/schedule";
import { isYtConnected, ytExecute } from "@/lib/yt";

export const runtime = "nodejs";
export const maxDuration = 60;

type PlatformStatus = {
  id: string;
  state: "connected" | "setup" | "disconnected" | "error";
  handle?: string;
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
      username?: string;
      public_metrics?: { followers_count?: number; tweet_count?: number };
    }>("TWITTER_USER_LOOKUP_ME", { "user__fields": ["username", "public_metrics"] });
    return {
      id: "x",
      state: "connected",
      handle: me.data?.username ? `@${me.data.username}` : undefined,
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

export async function GET() {
  const [ig, tw, yt, queue] = await Promise.all([
    instagram(),
    x(),
    youtube(),
    listPosts().catch(() => []),
  ]);

  const pending = queue.filter((p) => p.status === "scheduled");
  return NextResponse.json({
    platforms: [ig, tw, yt],
    queue: {
      scheduled: pending.length,
      awaitingApproval: pending.filter((p) => !p.approved).length,
      drafts: queue.filter((p) => p.status === "draft").length,
    },
  });
}
