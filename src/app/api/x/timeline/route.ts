import { xRoute } from "@/lib/x-route";
import { xExecute } from "@/lib/x";

export const runtime = "nodejs";

const POST_FIELDS = [
  "id",
  "text",
  "created_at",
  "public_metrics",
  "conversation_id",
  "in_reply_to_user_id",
  "referenced_tweets",
];

/**
 * ?view=home    reverse-chronological home timeline
 * ?view=bookmarks
 * ?view=liked   posts this account liked
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const view = params.get("view") ?? "home";
  const userId = params.get("userId");
  const max = Math.min(Number(params.get("max") ?? 25), 100);

  return xRoute(async () => {
    if (view === "bookmarks") {
      const r = await xExecute("TWITTER_BOOKMARKS_BY_USER", {
        max_results: max,
        "tweet__fields": POST_FIELDS,
      });
      return { view, posts: r.data, note: r.note };
    }
    if (view === "liked") {
      if (!userId) throw new Error("userId is required for the liked view.");
      const r = await xExecute(
        "TWITTER_RETURNS_POST_OBJECTS_LIKED_BY_THE_PROVIDED_USER_ID",
        { id: userId, max_results: max, "tweet__fields": POST_FIELDS },
      );
      return { view, posts: r.data, note: r.note };
    }
    if (!userId) throw new Error("userId is required for the home timeline.");
    const r = await xExecute("TWITTER_USER_HOME_TIMELINE_BY_USER_ID", {
      id: userId,
      max_results: max,
      "tweet__fields": POST_FIELDS,
    });
    return { view: "home", posts: r.data, note: r.note };
  });
}
