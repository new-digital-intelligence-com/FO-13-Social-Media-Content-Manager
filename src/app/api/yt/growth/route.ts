import { NextResponse } from "next/server";
import { explainModelError } from "@/lib/agent";
import { explainYtError, ytExecute } from "@/lib/yt";

export const runtime = "nodejs";
export const maxDuration = 180;

/**
 * YouTube needs no AI guesswork: its search returns real channels for a topic,
 * so candidates come from the API directly. The approval step is the same --
 * nothing is subscribed without the user ticking it.
 */
/** How many channels may be acted on in one approval. */
const MAX_BATCH = 25;
/** How many may be shown for review. */
const MAX_DISPLAY = 100;

type SearchItem = {
  id?: { channelId?: string };
  snippet?: {
    channelId?: string;
    channelTitle?: string;
    title?: string;
    description?: string;
    thumbnails?: { default?: { url?: string } };
  };
};

type ChannelStats = {
  id?: string;
  snippet?: { title?: string; description?: string; thumbnails?: { default?: { url?: string } } };
  statistics?: { subscriberCount?: string; videoCount?: string; viewCount?: string };
};

/**
 * Search ranks by name relevance, which surfaces tiny channels whose title
 * happens to match the query. Real subscriber counts are fetched separately so
 * results can be ranked and filtered by actual reach.
 */
async function statsFor(channelIds: string[]): Promise<Map<string, ChannelStats>> {
  const map = new Map<string, ChannelStats>();
  // LIST_CHANNELS accepts up to 50 ids per call and costs ~1 unit, versus ~100
  // for a search -- cheap enough to always enrich.
  for (let i = 0; i < channelIds.length; i += 50) {
    try {
      const r = await ytExecute("YOUTUBE_LIST_CHANNELS", {
        part: "snippet,statistics",
        id: channelIds.slice(i, i + 50).join(","),
        maxResults: 50,
      });
      for (const c of asArray<ChannelStats>(r.data)) {
        if (c.id) map.set(c.id, c);
      }
    } catch {
      // Missing stats simply means that channel cannot be ranked.
    }
  }
  return map;
}

type Subscription = {
  id?: string;
  snippet?: { resourceId?: { channelId?: string }; title?: string };
};

function asArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  const inner = (data as { items?: T[] })?.items;
  return Array.isArray(inner) ? inner : [];
}

/** channelId -> subscription id (needed to unsubscribe). */
async function subscriptions(): Promise<Map<string, { subId: string; title?: string }>> {
  const map = new Map<string, { subId: string; title?: string }>();
  try {
    const r = await ytExecute("YOUTUBE_LIST_USER_SUBSCRIPTIONS", {
      part: "snippet",
      mine: true,
      maxResults: 50,
    });
    for (const s of asArray<Subscription>(r.data)) {
      const channelId = s.snippet?.resourceId?.channelId;
      if (channelId && s.id) map.set(channelId, { subId: s.id, title: s.snippet?.title });
    }
  } catch {
    // Degrade rather than fail: the already-subscribed filter is a nicety.
  }
  return map;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action: "suggest" | "subscribe" | "unsubscribe" | "subscriptions";
      topic?: string;
      topics?: string[];
      minFollowers?: number;
      count?: number;
      channelIds?: string[];
      subscriptionIds?: string[];
    };

    if (body.action === "subscriptions") {
      const map = await subscriptions();
      return NextResponse.json({
        subscriptions: [...map.entries()].map(([channelId, v]) => ({
          channelId,
          subscriptionId: v.subId,
          title: v.title,
        })),
      });
    }

    if (body.action === "suggest") {
      const topicList = [
        ...new Set(
          (body.topics ?? String(body.topic ?? "").split(/[,\n]/))
            .map((t) => String(t).trim())
            .filter(Boolean),
        ),
      ].slice(0, 6);
      if (topicList.length === 0) throw new Error("At least one topic is required.");
      const count = Math.min(Math.max(Number(body.count ?? 10), 1), MAX_DISPLAY);
      const minSubscribers = Math.max(Number(body.minFollowers ?? 0), 0);

      const subscribed = await subscriptions();
      const seen = new Set<string>();

      type Candidate = {
        channelId: string;
        title?: string;
        description?: string;
        thumbnail?: string;
        subscribers?: number;
        videos?: number;
        topic: string;
        subscribed: boolean;
        subscriptionId?: string;
      };

      // Results are gathered per topic and interleaved. Concatenating and
      // slicing would let the first topic fill the whole list.
      const perTopic: Candidate[][] = [];
      for (const topic of topicList) {
        const found: Candidate[] = [];
        try {
          // Pull a wide pool: relevance order buries big channels behind
          // small ones with keyword-matching names.
          const search = await ytExecute("YOUTUBE_SEARCH_YOU_TUBE", {
            q: topic,
            part: "snippet",
            type: "channel",
            order: "relevance",
            maxResults: 50,
          });

          const ids = asArray<SearchItem>(search.data)
            .map((item) => item.id?.channelId ?? item.snippet?.channelId)
            .filter((id): id is string => Boolean(id) && !seen.has(id!));

          const stats = await statsFor(ids);

          for (const channelId of ids) {
            const stat = stats.get(channelId);
            const subscribers = Number(stat?.statistics?.subscriberCount ?? 0);
            // Drop channels below the requested reach; without stats we cannot
            // vouch for them either.
            if (!stat || subscribers < minSubscribers) continue;
            seen.add(channelId);
            const existing = subscribed.get(channelId);
            found.push({
              channelId,
              title: stat.snippet?.title,
              description: stat.snippet?.description?.slice(0, 160),
              thumbnail: stat.snippet?.thumbnails?.default?.url,
              subscribers,
              videos: Number(stat.statistics?.videoCount ?? 0),
              topic,
              subscribed: Boolean(existing),
              subscriptionId: existing?.subId,
            });
          }
          // Biggest first within each topic.
          found.sort((a, b) => (b.subscribers ?? 0) - (a.subscribers ?? 0));
        } catch {
          // One topic failing should not lose the others.
        }
        perTopic.push(found);
      }

      const candidates: Candidate[] = [];
      const deepest = Math.max(0, ...perTopic.map((t) => t.length));
      for (let rank = 0; rank < deepest && candidates.length < count; rank++) {
        for (const topicResults of perTopic) {
          if (candidates.length >= count) break;
          if (topicResults[rank]) candidates.push(topicResults[rank]);
        }
      }

      return NextResponse.json({
        topics: topicList,
        candidates,
        alreadyFollowing: candidates.filter((c) => c.subscribed).length,
        minSubscribers,
        quotaNote: `Each topic costs about 100 of a default 10,000 daily quota units (${topicList.length} searched).`,
      });
    }

    if (body.action === "subscribe") {
      const ids = (body.channelIds ?? []).slice(0, MAX_BATCH);
      if (ids.length === 0) throw new Error("No channels selected.");
      const results: { id: string; ok: boolean; error?: string }[] = [];
      for (const channelId of ids) {
        try {
          await ytExecute("YOUTUBE_SUBSCRIBE_CHANNEL", { channelId });
          results.push({ id: channelId, ok: true });
        } catch (error) {
          results.push({
            id: channelId,
            ok: false,
            error: explainYtError(error instanceof Error ? error.message : "Failed"),
          });
        }
      }
      return NextResponse.json({
        action: "subscribe",
        succeeded: results.filter((r) => r.ok).length,
        failed: results.filter((r) => !r.ok),
      });
    }

    if (body.action === "unsubscribe") {
      // Unsubscribing takes the subscription id, not the channel id.
      const ids = (body.subscriptionIds ?? []).slice(0, MAX_BATCH);
      if (ids.length === 0) throw new Error("No subscriptions selected.");
      const results: { id: string; ok: boolean; error?: string }[] = [];
      for (const subscriptionId of ids) {
        try {
          await ytExecute("YOUTUBE_UNSUBSCRIBE_CHANNEL", { subscriptionId });
          results.push({ id: subscriptionId, ok: true });
        } catch (error) {
          results.push({
            id: subscriptionId,
            ok: false,
            error: explainYtError(error instanceof Error ? error.message : "Failed"),
          });
        }
      }
      return NextResponse.json({
        action: "unsubscribe",
        succeeded: results.filter((r) => r.ok).length,
        failed: results.filter((r) => !r.ok),
      });
    }

    throw new Error(`Unknown action "${body.action}".`);
  } catch (error) {
    const { message, status } = explainModelError(error);
    return NextResponse.json({ error: explainYtError(message) }, { status });
  }
}
