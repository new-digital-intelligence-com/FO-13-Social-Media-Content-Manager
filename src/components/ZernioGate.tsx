"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Loading } from "./ui";

/**
 * Shared gate for Zernio-backed features.
 *
 * Every one of them has the same three failure shapes — not configured, not
 * reachable, account not connected — and each must read differently to a user:
 * one is a setup task they can act on now, one is an outage they can only wait
 * out. Rendering a blank panel, or worse an empty-looking success, is the thing
 * this exists to prevent.
 */
export type ZernioState = {
  state: "ready" | "unconfigured" | "unavailable" | "error";
  detail?: string;
  accounts?: { platform: string; handle?: string; accountId: string; active: boolean }[];
  profileId?: string;
};

export function useZernio() {
  const [status, setStatus] = useState<ZernioState | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/status");
      const data = await res.json();
      setStatus(data.zernio ?? { state: "unavailable", detail: "No status returned." });
    } catch {
      setStatus({ state: "unavailable", detail: "Could not reach the app." });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  return { status, refresh };
}

export function ZernioUnavailable({
  status,
  feature,
  fallback,
  onRetry,
}: {
  status: ZernioState;
  /** What the user was trying to do, named in their terms. */
  feature: string;
  /** What still works instead. Omit when genuinely nothing does. */
  fallback?: string;
  onRetry?: () => void;
}) {
  const setup = status.state === "unconfigured" || status.state === "error";
  return (
    <Card className="space-y-2 border-amber-200 bg-amber-50/60">
      <h3 className="font-medium text-amber-900">
        {setup ? `${feature} is not set up` : `${feature} is unavailable`}
      </h3>
      <p className="text-sm text-amber-800">
        {status.detail ??
          (setup
            ? "Zernio is not configured."
            : "Zernio is not responding right now.")}
      </p>
      <p className="text-sm text-amber-800">
        {status.state === "unconfigured"
          ? "Add ZERNIO_API_KEY to .env.local and restart, then connect the account on Zernio."
          : setup
            ? "Reconnect the account on Zernio, then reload."
            : `${feature} runs on Zernio, so it is off until Zernio is back. Nothing is lost — anything already scheduled is held on Zernio, not in this app.`}
      </p>
      {fallback && <p className="text-sm text-amber-800">{fallback}</p>}
      {onRetry && (
        <div>
          <Button variant="ghost" onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}
    </Card>
  );
}

/** Wraps a Zernio-backed panel so it never renders a misleading empty state. */
export function ZernioSection({
  feature,
  fallback,
  children,
}: {
  feature: string;
  fallback?: string;
  children: React.ReactNode;
}) {
  const { status, refresh } = useZernio();
  if (!status) return <Loading label="Checking Zernio…" />;
  if (status.state !== "ready")
    return (
      <ZernioUnavailable
        status={status}
        feature={feature}
        fallback={fallback}
        onRetry={refresh}
      />
    );
  return <>{children}</>;
}
