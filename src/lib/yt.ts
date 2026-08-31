import "server-only";
import { NextResponse } from "next/server";
import { activeAccountId } from "./accounts";
import { composio, userId } from "./composio";

export const TOOLKIT = "youtube";

const sessionIds = new Map<string, string>();

/** YouTube has a managed app, so this connects like Instagram: no credentials. */
export async function getYtSession(user = userId()) {
  const existing = sessionIds.get(user);
  if (existing) {
    try {
      return await composio.use(existing);
    } catch {
      sessionIds.delete(user);
    }
  }
  const session = await composio.create(user, {
    toolkits: [TOOLKIT],
    sandbox: { enable: false },
    multiAccount: { enable: true, maxAccountsPerToolkit: 5 },
  });
  sessionIds.set(user, session.sessionId);
  return session;
}

export async function isYtConnected() {
  const session = await getYtSession();
  const details = await session.toolkits({ toolkits: [TOOLKIT] });
  const item = details.items?.find(
    (i: { slug?: string }) => i.slug?.toLowerCase() === TOOLKIT,
  );
  return Boolean(item?.connection?.isActive);
}

export type YtResult<T> = { data: T; note?: string; logId?: string };

export async function ytExecute<T = unknown>(
  slug: string,
  args: Record<string, unknown> = {},
): Promise<YtResult<T>> {
  const [session, account] = await Promise.all([getYtSession(), activeAccountId("youtube")]);
  const raw = (await session.execute(
    slug,
    args,
    account ? { account } : undefined,
  )) as {
    data?: unknown;
    error?: unknown;
    log_id?: string;
  };
  if (raw.error) {
    throw new Error(
      typeof raw.error === "string" ? raw.error : JSON.stringify(raw.error),
    );
  }
  const payload = (raw.data ?? {}) as Record<string, unknown>;
  const note =
    typeof payload.composio_execution_message === "string"
      ? payload.composio_execution_message
      : undefined;
  const inner = "data" in payload ? payload.data : payload;
  return { data: inner as T, note, logId: raw.log_id };
}

/**
 * YouTube's failures are mostly quota, not code. The managed OAuth app shares
 * provider quota across users, so a busy day can exhaust it well before any
 * per-account limit.
 */
export function explainYtError(message: string) {
  if (/quota|quotaExceeded|dailyLimit/i.test(message)) {
    return `${message} — YouTube API quota is exhausted. The shared managed app's quota resets daily; a dedicated Google Cloud OAuth app gives you your own.`;
  }
  if (/403|forbidden|insufficient/i.test(message)) {
    return `${message} — the connected account may not own this resource, or the granted scopes do not cover it.`;
  }
  if (/404|not found/i.test(message)) {
    return `${message} — check the id; YouTube ids are case-sensitive.`;
  }
  return message;
}

/**
 * A caller mistake, as opposed to an upstream failure.
 *
 * The routes validate input by throwing (`throw new Error("videoId is
 * required.")`), so without this every bad request came back as a 500 —
 * indistinguishable from YouTube being down, and contradicting the 400-vs-503
 * contract the Zernio routes use.
 */
function isClientError(message: string) {
  return (
    /\bis required\b/i.test(message) ||
    /^unknown action\b/i.test(message) ||
    /\bmust be\b/i.test(message)
  );
}

/** Shared error handling for every YouTube route. */
export async function ytRoute<T>(run: () => Promise<T>) {
  try {
    return NextResponse.json(await run());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: explainYtError(message) },
      { status: isClientError(message) ? 400 : 500 },
    );
  }
}

export const VIDEO_PARTS = "snippet,contentDetails,statistics,status";

let cachedChannelId: string | null = null;

/** The authenticated channel's id, cached: several tools require it verbatim. */
export async function myChannelId(): Promise<string> {
  if (cachedChannelId) return cachedChannelId;
  const r = await ytExecute<{ items?: { id?: string }[] }>("YOUTUBE_LIST_CHANNELS", {
    part: "id",
    mine: true,
  });
  const items = Array.isArray(r.data)
    ? (r.data as { id?: string }[])
    : (r.data?.items ?? []);
  const id = items[0]?.id;
  if (!id) {
    throw new Error(
      "No channel found on the connected Google account. YouTube tools need an account that owns a channel.",
    );
  }
  cachedChannelId = id;
  return id;
}
