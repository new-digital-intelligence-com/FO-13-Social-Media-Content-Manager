import "server-only";

/**
 * Zernio — scheduling, automation and measured analytics.
 *
 * A second provider alongside Composio. Composio executes platform API calls;
 * Zernio owns what needs a server-side clock or engagement history: the
 * publishing queue, comment-to-DM automations, cross-posting, best-time and
 * retention analytics.
 *
 * Unlike `composio.ts`, nothing here throws at import. Zernio is optional and
 * remote, so an unset key or an unreachable service must degrade the features
 * that depend on it — never break the app or blank a page that also shows
 * Composio data. Callers get a discriminated result and decide what to show.
 */

const BASE = process.env.ZERNIO_BASE_URL ?? "https://zernio.com/api/v1";
const KEY = process.env.ZERNIO_API_KEY;

/** Profile that owns queue slots. Discovered from an account when unset. */
export const ZERNIO_PROFILE_ID = process.env.ZERNIO_PROFILE_ID;

/**
 * Keys are `sk_` + 64 hex chars. The dashboard shows a key once at creation,
 * so a truncated paste is the likely failure — check the shape rather than
 * letting it surface as an opaque 401 on the first call.
 */
const KEY_SHAPE = /^sk_[0-9a-f]{64}$/;

export const zernioConfigured = Boolean(KEY && KEY_SHAPE.test(KEY));

/** Set but malformed — worth telling the user, unlike simply absent. */
export const zernioKeyMalformed = Boolean(KEY && !KEY_SHAPE.test(KEY));

/** Why a Zernio call could not be completed. Drives what the UI says. */
export type ZernioFailure =
  /** No key, or a malformed one. Not an outage. */
  | { kind: "unconfigured"; message: string }
  /** Could not reach Zernio at all: DNS, connection refused, timeout. */
  | { kind: "unreachable"; message: string }
  /** Reached it; it is unwell. 5xx, or a platform paused upstream. */
  | { kind: "unavailable"; status: number; message: string }
  /** Key rejected. Re-authorize; retrying will not help. */
  | { kind: "auth"; status: number; message: string }
  /** Account disconnected, plan limit, analytics add-on missing. */
  | { kind: "forbidden"; status: number; code?: string; message: string }
  /** Content-hash duplicate within 24h. Carries the original post id. */
  | { kind: "duplicate"; existingPostId?: string; message: string }
  /** Sliding-window rate limit. Free tier is 60/min, 6/s on analytics. */
  | { kind: "rate_limited"; retryAfter?: number; message: string }
  /** Malformed request — our bug, not an outage. */
  | { kind: "invalid"; status: number; message: string };

export type ZernioResult<T> =
  | { ok: true; data: T }
  | { ok: false; failure: ZernioFailure };

/** True when the failure is Zernio being down rather than misconfigured. */
export function isOutage(f: ZernioFailure): boolean {
  return f.kind === "unreachable" || f.kind === "unavailable";
}

/** One-line reason suitable for showing a user. */
export function failureMessage(f: ZernioFailure): string {
  switch (f.kind) {
    case "unconfigured":
      return "Zernio is not configured — set ZERNIO_API_KEY in .env.local.";
    case "unreachable":
      return "Zernio is unreachable. Scheduling and analytics are unavailable.";
    case "unavailable":
      return "Zernio is temporarily unavailable. Check status.zernio.com.";
    case "auth":
      return "Zernio rejected the API key. Re-issue it in the Zernio dashboard.";
    case "forbidden":
      return f.code === "ACCOUNT_DISCONNECTED"
        ? "The Zernio account connection expired. Reconnect it."
        : f.message;
    case "duplicate":
      return "Zernio already has this exact content on this account from the last 24 hours.";
    case "rate_limited":
      return "Zernio rate limit reached. Try again shortly.";
    case "invalid":
      return f.message;
  }
}

type ErrorBody = { error?: string; code?: string; existingPostId?: string };

async function readError(res: Response): Promise<ErrorBody> {
  try {
    return (await res.json()) as ErrorBody;
  } catch {
    return {};
  }
}

/**
 * A single Zernio request. Resolves to a result; it does not throw.
 *
 * `timeoutMs` matters: without it an unreachable Zernio hangs the request that
 * called it, which is exactly the case this module exists to contain.
 */
export async function zernio<T>(
  path: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<ZernioResult<T>> {
  if (!zernioConfigured) {
    return {
      ok: false,
      failure: {
        kind: "unconfigured",
        message: zernioKeyMalformed
          ? "ZERNIO_API_KEY is malformed — expected sk_ followed by 64 hex characters."
          : "ZERNIO_API_KEY is not set.",
      },
    };
  }

  const { timeoutMs = 15000, headers, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...rest,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
        // Per-call id, so a retry is recognised as one instead of double-posting.
        "x-request-id": crypto.randomUUID(),
        ...headers,
      },
    });
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return {
      ok: false,
      failure: {
        kind: "unreachable",
        message: aborted
          ? `Zernio did not respond within ${timeoutMs}ms.`
          : error instanceof Error
            ? error.message
            : "Network error reaching Zernio.",
      },
    };
  } finally {
    clearTimeout(timer);
  }

  if (res.ok) return { ok: true, data: (await res.json()) as T };

  const body = await readError(res);
  const message = body.error ?? `Zernio returned ${res.status}.`;

  if (res.status === 401)
    return { ok: false, failure: { kind: "auth", status: 401, message } };
  if (res.status === 403)
    return {
      ok: false,
      failure: { kind: "forbidden", status: 403, code: body.code, message },
    };
  if (res.status === 409)
    return {
      ok: false,
      failure: { kind: "duplicate", existingPostId: body.existingPostId, message },
    };
  if (res.status === 429) {
    const retry = Number(res.headers.get("retry-after"));
    return {
      ok: false,
      failure: {
        kind: "rate_limited",
        retryAfter: Number.isFinite(retry) ? retry : undefined,
        message,
      },
    };
  }
  if (res.status >= 500 || res.status === 503)
    return {
      ok: false,
      failure: { kind: "unavailable", status: res.status, message },
    };

  return { ok: false, failure: { kind: "invalid", status: res.status, message } };
}

export type ZernioAccount = {
  _id: string;
  platform: string;
  username?: string;
  displayName?: string;
  isActive?: boolean;
  needsReconnection?: boolean;
  profileId?: { _id: string; name?: string } | string;
};

/**
 * Health of the Zernio integration, as the UI should present it.
 *
 * `state` is what a panel renders:
 *   "ready"        — usable
 *   "unconfigured" — no key; a setup task, not an outage
 *   "unavailable"  — key fine, service not answering; features are off
 *   "error"        — key or account rejected; needs the user to act
 */
export type ZernioHealth = {
  state: "ready" | "unconfigured" | "unavailable" | "error";
  detail?: string;
  accounts?: { platform: string; handle?: string; accountId: string; active: boolean }[];
  profileId?: string;
};

/**
 * Cached briefly so a page rendering several Zernio-backed panels probes once.
 * An outage is cached for less time than a success — the point of the probe is
 * to notice when Zernio comes back.
 */
let cache: { at: number; value: ZernioHealth } | null = null;
const OK_TTL = 60_000;
const FAIL_TTL = 15_000;

export async function zernioHealth(force = false): Promise<ZernioHealth> {
  const ttl = cache?.value.state === "ready" ? OK_TTL : FAIL_TTL;
  if (!force && cache && Date.now() - cache.at < ttl) return cache.value;

  const res = await zernio<{ accounts: ZernioAccount[] }>("/accounts", {
    method: "GET",
    // Shorter than the default: this probe gates a page render.
    timeoutMs: 8000,
  });

  let value: ZernioHealth;
  if (res.ok) {
    const accounts = (res.data.accounts ?? []).map((a) => ({
      platform: a.platform,
      handle: a.username ? `@${a.username}` : a.displayName,
      accountId: a._id,
      active: Boolean(a.isActive) && !a.needsReconnection,
    }));
    const profile = res.data.accounts?.find((a) => a.profileId);
    value = {
      state: "ready",
      accounts,
      profileId:
        ZERNIO_PROFILE_ID ??
        (typeof profile?.profileId === "object" ? profile.profileId._id : profile?.profileId),
    };
  } else {
    const f = res.failure;
    value = {
      state:
        f.kind === "unconfigured"
          ? "unconfigured"
          : isOutage(f)
            ? "unavailable"
            : "error",
      detail: failureMessage(f),
    };
  }

  cache = { at: Date.now(), value };
  return value;
}

/** The Zernio account id for a platform, or null when unusable. */
export async function zernioAccountId(platform: string): Promise<string | null> {
  const health = await zernioHealth();
  if (health.state !== "ready") return null;
  return health.accounts?.find((a) => a.platform === platform && a.active)?.accountId ?? null;
}
