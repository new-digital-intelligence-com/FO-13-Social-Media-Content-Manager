import { NextResponse } from "next/server";
import { completeWithSearch, explainModelError, extractHandles } from "@/lib/agent";
import { igLookupConfigured, lookupHealth, verifyHandles } from "@/lib/ig-verify";
import { getSettings, voicePrompt } from "@/lib/settings";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Discovery only.
 *
 * Instagram's Graph API exposes no follow, unfollow, or follower endpoints at
 * all, and no lookup for accounts the user does not manage. So this suggests
 * accounts for a topic and links out to each profile -- following happens in
 * the Instagram app.
 *
 * Because there is no lookup, these handles are **unverified**: the model may
 * propose an account that has been renamed or never existed. The UI says so,
 * and each card opens the real profile so the user can judge it.
 */
export async function POST(request: Request) {
  try {
    const { topic, topics, count, minFollowers } = (await request.json()) as {
      topic?: string;
      topics?: string[];
      count?: number;
      minFollowers?: number;
    };

    // Topics may arrive as a list or as one comma/newline separated string.
    const topicList = [
      ...new Set(
        (topics ?? String(topic ?? "").split(/[,\n]/))
          .map((t) => String(t).trim())
          .filter(Boolean),
      ),
    ].slice(0, 6);

    if (topicList.length === 0) {
      return NextResponse.json({ error: "At least one topic is required." }, { status: 400 });
    }
    const wanted = Math.min(Math.max(Number(count ?? 10), 1), 100);
    const threshold = Math.max(Number(minFollowers ?? 0), 0);
    const settings = await getSettings();

    const { text: raw, searched } = await completeWithSearch({
      system: [
        "You find major, widely-followed Instagram accounts for one or more topics.",
        "Search the web first. Look up who currently has the largest Instagram following",
        "in each topic rather than relying on memory — accounts get renamed, abandoned",
        "and overtaken, and a handle that was prominent a year ago may be parked today.",
        "Prefer accounts your search confirms are currently active and prominent.",
        "A topic describes what an account PUBLISHES ABOUT, never what it is made of.",
        "Honour every qualifier in the topic. \"Creators who worked in big tech\" means",
        "the person's background must actually match — a general tech reviewer does not",
        "qualify. If a qualifier narrows the field to very few accounts, return those few.",
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
        threshold > 0
          ? `Aim for accounts around ${threshold.toLocaleString()}+ followers, biggest first. Do not drop an account just because the search did not state its follower count — exact numbers are checked separately.`
          : "Prefer accounts with the largest followings.",
        "Order them from largest to smallest.",
        "Give the account that is actually active today. Many organisations left an",
        "old handle parked when they moved: prefer the current one (for example",
        "googledeepmind, not deepmind) and never suggest a handle you believe is dormant.",
        "Return one account per line in exactly this format:",
        "handle | what they post (max 12 words)",
        "No @ prefix, no numbering, no extra commentary, no markdown.",
        "Accuracy matters more than quantity: never invent or guess a handle to reach the count.",
        "Do not include personal accounts of private individuals.",
        voicePrompt(settings),
      ]
        .filter(Boolean)
        .join("\n"),
      // Verification, the follower threshold and the dormant check all cull, so
      // ask for noticeably more than the user wants.
      prompt: `Topics: ${topicList.join(", ")}\n\nSearch for the biggest and most active Instagram accounts in these topics right now, then list up to ${Math.min(
        wanted * 2 + 5,
        60,
      )}, largest first. Spread them across every topic listed.`,
      maxTokens: 4000,
      maxSearches: Math.min(topicList.length + 2, 6),
    });

    const noneLine = raw
      .split("\n")
      .map((l) => l.trim())
      .find((l) => /^NONE\s*:/i.test(l));

    // Research first, formatting second.
    const extracted = await extractHandles(raw, "Instagram", topicList.join(", "));

    const suggestions = extracted
      .slice(0, Math.min(wanted * 2 + 5, 60))
      .map((entry) => ({
        ...entry,
        url: `https://www.instagram.com/${entry.handle}/`,
      }));

    // When a lookup service is configured, drop handles it confirms do not
    // exist. Anything it cannot answer stays in the list marked unverified --
    // a stale signature must never silently delete real accounts.
    if (!igLookupConfigured) {
      // The extra candidates exist to survive filtering. With no lookup there
      // is nothing to filter on, so trim to what was actually asked for.
      const trimmed = suggestions.slice(0, wanted);
      return NextResponse.json({
        topics: topicList,
        suggestions: trimmed,
        reason:
          trimmed.length === 0
            ? (noneLine?.replace(/^NONE\s*:\s*/i, "") ??
              raw.split("\n").map((l) => l.trim()).filter(Boolean).slice(-2).join(" ").slice(0, 300))
            : undefined,
        verified: false,
        searched,
        minFollowers: threshold,
        thresholdEnforced: false,
        lookup: lookupHealth(),
        funnel: { requested: wanted, proposed: suggestions.length, shown: trimmed.length },
        limitation:
          "Instagram's API has no follow, unfollow or account-lookup endpoints, so these suggestions are not verified and cannot be followed from here. Open each profile to check it and follow in the Instagram app.",
      });
    }

    const checks = await verifyHandles(suggestions.map((s) => s.handle));
    const byHandle = new Map(checks.map((c) => [c.handle.toLowerCase(), c]));

    const checked = suggestions
      .map((s) => {
        const check = byHandle.get(s.handle.toLowerCase());
        return {
          ...s,
          exists: check?.exists ?? null,
          isPrivate: check?.isPrivate,
          fullName: check?.fullName,
          followers: check?.followers,
          mediaCount: check?.mediaCount,
          // The lookup runs against the connected session, so it knows the
          // relationship as well as whether the account exists.
          following: check?.following,
          followsYou: check?.followsYou,
        };
      })
      .filter((s) => s.exists !== false)
      // Where the lookup returned a follower count, hold it to the threshold.
      // An unknown count is kept rather than guessed at.
      .filter((s) => typeof s.followers !== "number" || s.followers >= threshold)
      // A handle can exist and still be worthless: parked and legacy accounts
      // (@deepmind, superseded by @googledeepmind) have a real page, almost no
      // followers and nothing posted.
      .filter((s) => s.mediaCount !== 0)
      .sort((a, b) => (b.followers ?? 0) - (a.followers ?? 0))
      .slice(0, wanted);

    return NextResponse.json({
      topics: topicList,
      suggestions: checked,
      reason:
        checked.length === 0
          ? (noneLine?.replace(/^NONE\s*:\s*/i, "") ??
            raw.split("\n").map((l) => l.trim()).filter(Boolean).slice(-2).join(" ").slice(0, 300))
          : undefined,
      verified: true,
      searched,
      confirmed: checked.filter((s) => s.exists === true).length,
      alreadyFollowing: checked.filter((s) => s.following === true).length,
      minFollowers: threshold,
      // Say plainly whether the threshold could actually be applied: without
      // follower counts it is a hint to the model, not a filter.
      thresholdEnforced: checked.some((s) => typeof s.followers === "number"),
      lookup: lookupHealth(),
      abandoned: suggestions.length - checked.length,
      // Where the list shrank, so a short result is explainable rather than
      // mysterious.
      funnel: {
        requested: wanted,
        proposed: suggestions.length,
        shown: checked.length,
      },
      unverifiable: checked.filter((s) => s.exists === null).length,
      dropped: suggestions.length - checked.length,
      limitation:
        "Instagram's API has no follow or unfollow endpoint, so following still happens in the Instagram app. Handles are checked against an external lookup; any it cannot answer are kept and marked unverified.",
    });
  } catch (error) {
    const { message, status } = explainModelError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
