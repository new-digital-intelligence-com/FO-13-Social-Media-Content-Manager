import "server-only";

/**
 * Optional Instagram handle verification via a third-party lookup service.
 *
 * Instagram's own API cannot do this on an Instagram-Login connection:
 * `business_discovery` requires the Facebook-Login flow with a linked Page, and
 * there is no other endpoint for accounts you do not manage.
 *
 * This is deliberately opt-in and isolated:
 *  - configured entirely by environment, nothing hardcoded
 *  - every failure degrades to "unverified", never to "does not exist", so a
 *    stale signature or a changed API can never silently delete real accounts
 *    from a suggestion list
 *
 * The signature is issued for that service's own front end and is very likely
 * time-bound; expect to refresh it, and expect this to stop working without
 * notice. Treat it as a nice-to-have layer, not infrastructure.
 */
const ENDPOINT =
  process.env.IG_LOOKUP_ENDPOINT ??
  "https://api-wh.anonyig.com/api/v1/instagram/userInfo";
const SIGNATURE = process.env.IG_LOOKUP_SIGNATURE;
const SIGNATURE_VERSION = Number(process.env.IG_LOOKUP_SV ?? 2);
/**
 * The signature is bound to the request timestamp it was issued with: sending
 * the same `_s` with a fresh `ts` is rejected with 401. So both timestamps are
 * pinned from configuration and replayed verbatim, not generated per call.
 */
const REQUEST_TS = process.env.IG_LOOKUP_REQUEST_TS;
const SIGNATURE_TS = process.env.IG_LOOKUP_TS;

export const igLookupConfigured = Boolean(SIGNATURE && REQUEST_TS);

/**
 * Health of the last lookup attempt.
 *
 * "configured" is not the same as "working": the signature is a captured
 * credential and expires, after which every call fails. Reporting only
 * configured-or-not produced a message telling people to set variables they had
 * already set, so the two states are tracked separately.
 */
export type LookupHealth = "not-configured" | "ok" | "rejected" | "unreachable";

let lastHealth: LookupHealth = "not-configured";
let lastStatus: number | null = null;

export function lookupHealth(): { health: LookupHealth; status: number | null } {
  return { health: igLookupConfigured ? lastHealth : "not-configured", status: lastStatus };
}

export type HandleCheck = {
  handle: string;
  /** true = exists, false = confirmed missing, null = could not tell. */
  exists: boolean | null;
  isPrivate?: boolean;
  fullName?: string;
  pk?: string;
  followers?: number;
  /** Post count — 0 is the signature of a parked or abandoned account. */
  mediaCount?: number;
  /** Whether the connected account already follows this one, when known. */
  following?: boolean;
  followsYou?: boolean;
};

type LookupUser = {
  pk?: string;
  username?: string;
  full_name?: string;
  is_private?: boolean;
  follower_count?: number;
  media_count?: number;
  edge_followed_by?: { count?: number };
  /** Present because the lookup runs against the connected session. */
  friendship_status?: { following?: boolean; followed_by?: boolean };
};

export async function verifyHandle(handle: string): Promise<HandleCheck> {
  if (!igLookupConfigured) return { handle, exists: null };

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        ts: Number(REQUEST_TS),
        username: handle,
        _s: SIGNATURE,
        _sv: SIGNATURE_VERSION,
        _ts: Number(SIGNATURE_TS ?? REQUEST_TS),
        _tsc: 0,
      }),
      signal: AbortSignal.timeout(12_000),
    });

    // 401/403/422 mean the signature has expired or was never valid for this
    // ts. Report unknown, never "missing" -- a stale credential must not look
    // like a non-existent account.
    if (!response.ok) {
      lastStatus = response.status;
      lastHealth = [401, 403, 422, 429].includes(response.status)
        ? "rejected"
        : "unreachable";
      return { handle, exists: null };
    }
    lastHealth = "ok";
    lastStatus = response.status;

    const body = (await response.json()) as { result?: { user?: LookupUser }[] };
    const user = body?.result?.[0]?.user;

    // A well-formed response with no user is the one case we can call missing.
    if (!user) return { handle, exists: false };

    return {
      handle,
      exists: true,
      isPrivate: user.is_private,
      fullName: user.full_name,
      pk: user.pk,
      followers: user.follower_count ?? user.edge_followed_by?.count,
      mediaCount: user.media_count,
      following: user.friendship_status?.following,
      followsYou: user.friendship_status?.followed_by,
    };
  } catch {
    // Network error, timeout, changed shape -- all unknown.
    lastHealth = "unreachable";
    return { handle, exists: null };
  }
}

/** Verify a batch with limited concurrency, in the order given. */
export async function verifyHandles(
  handles: string[],
  concurrency = 4,
): Promise<HandleCheck[]> {
  const results: HandleCheck[] = [];
  for (let i = 0; i < handles.length; i += concurrency) {
    results.push(
      ...(await Promise.all(handles.slice(i, i + concurrency).map(verifyHandle))),
    );
  }
  return results;
}
