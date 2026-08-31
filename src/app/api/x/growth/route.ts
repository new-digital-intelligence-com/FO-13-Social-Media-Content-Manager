import { NextResponse } from "next/server";
import { completeWithSearch, explainModelError, extractHandles } from "@/lib/agent";
import { getSettings, voicePrompt } from "@/lib/settings";
import { SetupRequiredError, explainXError, xExecute } from "@/lib/x";

export const runtime = "nodejs";
export const maxDuration = 180;

/**
 * Following in bulk is exactly the behaviour X polices, so this is built as
 * suggest -> verify -> human approves -> act:
 *
 *  1. The model proposes handles for a topic. Models confidently invent
 *     handles, so nothing it says is trusted.
 *  2. Every handle is looked up against the real API. Anything that does not
 *     resolve is dropped.
 *  3. Accounts already followed are filtered out.
 *  4. The user ticks who to act on. Nothing happens without that.
 */
/** How many accounts may be acted on in one approval. */
const MAX_BATCH = 25;
/** How many may be shown for review. */
const MAX_DISPLAY = 100;

type XUser = {
  id: string;
  username: string;
  name?: string;
  description?: string;
  verified?: boolean;
  public_metrics?: { followers_count?: number };
};

function asArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  const inner = (data as { data?: T[] })?.data;
  return Array.isArray(inner) ? inner : [];
}

/** Who the account already follows — used to avoid re-following. */
async function following(userId: string): Promise<Map<string, XUser>> {
  const map = new Map<string, XUser>();
  try {
    const r = await xExecute("TWITTER_FOLLOWING_BY_USER_ID", {
      id: userId,
      max_results: 1000,
      "user__fields": ["username", "name", "public_metrics"],
    });
    for (const u of asArray<XUser>(r.data)) {
      if (u.username) map.set(u.username.toLowerCase(), u);
    }
  } catch {
    // A missing follows.read scope should not block the whole flow; the
    // already-following filter simply degrades.
  }
  return map;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action: "suggest" | "follow" | "unfollow" | "following";
      topic?: string;
      topics?: string[];
      count?: number;
      minFollowers?: number;
      usernames?: string[];
      userIds?: string[];
    };

    const me = await xExecute<{ id?: string; username?: string }>(
      "TWITTER_USER_LOOKUP_ME",
      { "user__fields": ["username"] },
    );
    const myId = me.data?.id;
    if (!myId) throw new Error("Could not resolve the connected X account.");

    /* ---------- who am I already following ---------- */
    if (body.action === "following") {
      const map = await following(myId);
      return NextResponse.json({
        following: [...map.values()].map((u) => ({
          id: u.id,
          username: u.username,
          name: u.name,
          followers: u.public_metrics?.followers_count ?? null,
        })),
      });
    }

    /* ---------- suggest accounts for a topic ---------- */
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
      const minFollowers = Math.max(Number(body.minFollowers ?? 0), 0);

      const settings = await getSettings();
      const { text: raw, searched } = await completeWithSearch({
        system: [
          "You find major, widely-followed X (Twitter) accounts for one or more topics.",
          "Search the web first. Look up who currently has the largest X following in each",
          "topic rather than relying on memory — handles change and accounts go dormant.",
          "Prefer accounts your search confirms are currently active and prominent.",
          "A topic describes what an account PUBLISHES ABOUT, never what it is made of.",
          "List accounts that create content on the topic: educators, journalists, analysts,",
          "practitioners and companies that post about it. Do not list accounts that merely",
          "exemplify the topic. For \"AI creators\" that means people who explain and teach AI,",
          "not AI-generated virtual influencers; for \"car content\" it means reviewers and",
          "channels, not car manufacturers' brand accounts unless they genuinely publish content.",
        "If the first search returns mostly accounts that do not fit, search again with",
        "different wording (for example \"AI educator Instagram\" or \"machine learning",
        "explainer account\") before giving up. Returning nothing is a last resort.",
        "Use your own knowledge of the field alongside the search results — the search",
        "is there to catch what changed, not to be the only thing you may rely on.",
        "Only reply with a single line starting NONE: if the topic itself makes no sense",
        "for this network. Never return an empty list merely because follower counts",
        "were not stated in the search results.",
          minFollowers > 0
            ? `Aim for accounts around ${minFollowers.toLocaleString()}+ followers, biggest first. Do not drop an account just because the search did not state its follower count — exact numbers are checked separately.`
            : "Prefer accounts with the largest followings.",
          "Order them from largest to smallest.",
          "Return ONLY handles, one per line, no @ prefix, no numbering, no commentary.",
          "Accuracy matters more than quantity: never invent or guess a handle to reach the count.",
          "Do not include personal accounts of private individuals.",
          voicePrompt(settings),
        ]
          .filter(Boolean)
          .join("\n"),
        // Ask for extra: verification and the already-following filter both cull.
        prompt: `Topics: ${topicList.join(", ")}\n\nSearch for the biggest and most active X accounts in these topics right now, then list up to ${Math.min(
          count * 2,
          150,
        )} handles, largest first.`,
        maxTokens: 4000,
        maxSearches: Math.min(topicList.length + 2, 6),
      });

      const proposed = (await extractHandles(raw, "X", topicList.join(", ")))
        .map((entry) => entry.handle)
        .filter((h) => /^[A-Za-z0-9_]{1,15}$/.test(h))
        .slice(0, 150);

      if (proposed.length === 0) {
        return NextResponse.json({
          topics: topicList,
          candidates: [],
          verified: 0,
          proposed: 0,
        });
      }

      // Verify against the real API; unknown handles disappear here. The
      // lookup accepts at most 100 usernames per call, so chunk it.
      const real: XUser[] = [];
      for (let i = 0; i < proposed.length; i += 100) {
        try {
          const lookup = await xExecute("TWITTER_USER_LOOKUP_BY_USERNAMES", {
            usernames: proposed.slice(i, i + 100),
            "user__fields": ["description", "public_metrics", "verified", "name"],
          });
          real.push(...asArray<XUser>(lookup.data));
        } catch {
          // A chunk that fails should not discard the ones that resolved.
        }
      }
      const alreadyFollowing = await following(myId);

      const candidates = real
        .filter((u) => u.username && u.id !== myId)
        // The model's sense of "well-known" is unreliable, so reach is judged
        // on the follower counts the API actually returned.
        .filter((u) => (u.public_metrics?.followers_count ?? 0) >= minFollowers)
        .sort(
          (a, b) =>
            (b.public_metrics?.followers_count ?? 0) -
            (a.public_metrics?.followers_count ?? 0),
        )
        .slice(0, count)
        .map((u) => ({
          id: u.id,
          username: u.username,
          name: u.name,
          description: u.description?.slice(0, 160),
          verified: u.verified ?? false,
          followers: u.public_metrics?.followers_count ?? null,
          // Shown rather than hidden, so the list reflects the whole topic.
          following: alreadyFollowing.has(u.username.toLowerCase()),
        }));

      return NextResponse.json({
        topics: topicList,
        candidates,
        proposed: proposed.length,
        verified: real.length,
        belowThreshold: real.length - candidates.length,
        searched,
        minFollowers,
        alreadyFollowing: candidates.filter((c) => c.following).length,
      });
    }

    /* ---------- act on an approved list ---------- */
    if (body.action === "follow" || body.action === "unfollow") {
      const ids = (body.userIds ?? []).slice(0, MAX_BATCH);
      if (ids.length === 0) throw new Error("No accounts selected.");

      const results: { id: string; ok: boolean; error?: string }[] = [];
      for (const id of ids) {
        try {
          await xExecute(
            body.action === "follow" ? "TWITTER_FOLLOW_USER" : "TWITTER_UNFOLLOW_USER",
            { target_user_id: id },
          );
          results.push({ id, ok: true });
        } catch (error) {
          // One failure must not abort the batch; report per account.
          results.push({
            id,
            ok: false,
            error: explainXError(error instanceof Error ? error.message : "Failed"),
          });
        }
      }

      return NextResponse.json({
        action: body.action,
        succeeded: results.filter((r) => r.ok).length,
        failed: results.filter((r) => !r.ok),
        results,
      });
    }

    throw new Error(`Unknown action "${body.action}".`);
  } catch (error) {
    if (error instanceof SetupRequiredError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
    }
    const { message, status } = explainModelError(error);
    return NextResponse.json({ error: explainXError(message) }, { status });
  }
}
