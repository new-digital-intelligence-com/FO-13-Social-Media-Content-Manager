import { xRoute } from "@/lib/x-route";
import { xExecute } from "@/lib/x";

export const runtime = "nodejs";

/** ?userId= owned lists · ?id= one list (with members) · ?id=&view=timeline */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const id = params.get("id");
  const userId = params.get("userId");
  const view = params.get("view");

  return xRoute(async () => {
    if (id && view === "timeline") {
      const r = await xExecute("TWITTER_LIST_POSTS_TIMELINE_BY_LIST_ID", { id });
      return { view: "timeline", posts: r.data, note: r.note };
    }
    if (id) {
      const [list, members, followers] = await Promise.all([
        xExecute("TWITTER_GET_LIST", { id }),
        xExecute("TWITTER_GET_LIST_MEMBERS", { id }).catch(() => null),
        xExecute("TWITTER_GET_LIST_FOLLOWERS", { id }).catch(() => null),
      ]);
      return {
        list: list.data,
        members: members?.data ?? null,
        followers: followers?.data ?? null,
      };
    }
    if (!userId) throw new Error("userId or id is required.");
    const [owned, followed, pinned] = await Promise.all([
      xExecute("TWITTER_GET_USER_OWNED_LISTS", { id: userId }),
      xExecute("TWITTER_GET_USER_FOLLOWED_LISTS", { id: userId }).catch(() => null),
      xExecute("TWITTER_GET_USER_PINNED_LISTS", { id: userId }).catch(() => null),
    ]);
    return {
      owned: owned.data,
      followed: followed?.data ?? null,
      pinned: pinned?.data ?? null,
      note: owned.note,
    };
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  return xRoute(async () => {
    const { action, id, listId, userId, name, description, isPrivate } = body;
    const calls: Record<string, () => Promise<unknown>> = {
      create: () =>
        xExecute("TWITTER_CREATE_LIST", {
          name,
          ...(description ? { description } : {}),
          ...(isPrivate !== undefined ? { private: isPrivate } : {}),
        }),
      update: () =>
        xExecute("TWITTER_UPDATE_LIST", {
          id,
          ...(name ? { name } : {}),
          ...(description ? { description } : {}),
          ...(isPrivate !== undefined ? { private: isPrivate } : {}),
        }),
      delete: () => xExecute("TWITTER_DELETE_LIST", { id }),
      addMember: () => xExecute("TWITTER_ADD_LIST_MEMBER", { id, user_id: userId }),
      removeMember: () =>
        xExecute("TWITTER_REMOVE_LIST_MEMBER", { id, user_id: userId }),
      follow: () => xExecute("TWITTER_FOLLOW_LIST", { id, list_id: listId }),
      unfollow: () => xExecute("TWITTER_UNFOLLOW_LIST", { id, list_id: listId }),
      pin: () => xExecute("TWITTER_PIN_LIST", { id, list_id: listId }),
      unpin: () => xExecute("TWITTER_UNPIN_LIST", { list_id: listId }),
    };
    const run = calls[action];
    if (!run) throw new Error(`Unknown list action "${action}".`);
    return { ok: true, result: await run() };
  });
}
