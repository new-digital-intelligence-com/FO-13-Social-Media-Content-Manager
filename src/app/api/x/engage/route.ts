import { xRoute } from "@/lib/x-route";
import { xExecute } from "@/lib/x";

export const runtime = "nodejs";

/** Read the people around a post: likers, retweeters, quotes. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const id = params.get("id");
  const view = params.get("view") ?? "likers";

  return xRoute(async () => {
    if (!id) throw new Error("id is required.");
    const slug =
      view === "retweeters"
        ? "TWITTER_GET_POST_RETWEETERS_ACTION"
        : view === "quotes"
          ? "TWITTER_RETRIEVE_POSTS_THAT_QUOTE_A_POST"
          : "TWITTER_LIST_POST_LIKERS";
    const r = await xExecute(slug, { id });
    return { view, results: r.data, note: r.note };
  });
}

type Action =
  | "like"
  | "unlike"
  | "retweet"
  | "unretweet"
  | "bookmark"
  | "unbookmark"
  | "hideReply"
  | "unhideReply"
  | "follow"
  | "unfollow"
  | "mute"
  | "unmute";

/**
 * Every engagement write in one place. `userId` is the acting account, which
 * X requires on the like/retweet/bookmark endpoints.
 */
export async function POST(request: Request) {
  const { action, tweetId, userId, targetUserId } = (await request.json()) as {
    action: Action;
    tweetId?: string;
    userId?: string;
    targetUserId?: string;
  };

  return xRoute(async () => {
    const calls: Record<Action, () => Promise<unknown>> = {
      like: () => xExecute("TWITTER_USER_LIKE_POST", { id: userId!, tweet_id: tweetId! }),
      unlike: () => xExecute("TWITTER_UNLIKE_POST", { id: userId!, tweet_id: tweetId! }),
      retweet: () => xExecute("TWITTER_RETWEET_POST", { tweet_id: tweetId! }),
      unretweet: () =>
        xExecute("TWITTER_UNRETWEET_POST", { source_tweet_id: tweetId! }),
      bookmark: () =>
        xExecute("TWITTER_ADD_POST_TO_BOOKMARKS", { id: userId!, tweet_id: tweetId! }),
      unbookmark: () =>
        xExecute("TWITTER_REMOVE_POST_FROM_BOOKMARKS", { tweet_id: tweetId! }),
      hideReply: () =>
        xExecute("TWITTER_HIDE_REPLIES", { tweet_id: tweetId!, hidden: true }),
      unhideReply: () =>
        xExecute("TWITTER_HIDE_REPLIES", { tweet_id: tweetId!, hidden: false }),
      follow: () => xExecute("TWITTER_FOLLOW_USER", { target_user_id: targetUserId! }),
      unfollow: () =>
        xExecute("TWITTER_UNFOLLOW_USER", { target_user_id: targetUserId! }),
      mute: () => xExecute("TWITTER_MUTE_USER", { target_user_id: targetUserId! }),
      unmute: () => xExecute("TWITTER_UNMUTE_USER", { target_user_id: targetUserId! }),
    };

    const run = calls[action];
    if (!run) throw new Error(`Unknown action "${action}".`);
    return { ok: true, result: await run() };
  });
}
