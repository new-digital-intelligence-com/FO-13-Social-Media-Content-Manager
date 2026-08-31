"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BrandIcon } from "./BrandIcon";

type PlatformStatus = {
  id: string;
  state: "connected" | "setup" | "disconnected" | "error";
  handle?: string;
  stats?: { label: string; value: number | string }[];
  detail?: string;
};

type Status = {
  platforms?: PlatformStatus[];
  queue?: { scheduled: number; drafts: number; available?: boolean };
  /** Reads and writes hitting different accounts on the same platform. */
  accountMismatches?: { platform: string; composio?: string; zernio?: string }[];
  error?: string;
};

const LABELS: Record<string, string> = { instagram: "Instagram", x: "X" };
const HREFS: Record<string, string> = { instagram: "/instagram", x: "/x" };

const STATE = {
  connected: { label: "Connected", tone: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  setup: { label: "Setup needed", tone: "bg-amber-50 text-amber-800 ring-amber-200" },
  disconnected: { label: "Not connected", tone: "bg-black/[0.05] text-black/55 ring-black/10" },
  error: { label: "Unavailable", tone: "bg-red-50 text-red-700 ring-red-200" },
};

/**
 * Live state on the landing page. Loads after paint so a slow provider call
 * never blocks the page, and every platform renders its own state
 * independently.
 */
export function HomeStatus() {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/status")
      .then((r) => r.json())
      .then((d) => !cancelled && setStatus(d))
      .catch(() => !cancelled && setStatus({ error: "unavailable" }));
    return () => {
      cancelled = true;
    };
  }, []);

  const queue = status?.queue;
  const mismatches = status?.accountMismatches ?? [];

  return (
    <div className="mt-10 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {(status?.platforms ?? [{ id: "instagram" }, { id: "x" }]).map((p) => {
          const loading = !status;
          const state = (p as PlatformStatus).state;
          const meta = state ? STATE[state] : null;

          return (
            <Link
              key={p.id}
              href={HREFS[p.id] ?? "/"}
              className="flex items-center gap-4 rounded-xl border border-black/8 bg-white px-4 py-3.5 shadow-sm transition hover:border-black/15"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-black/[0.05] text-black/70">
                <BrandIcon id={p.id} className="size-4" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{LABELS[p.id] ?? p.id}</span>
                  {loading ? (
                    <span className="h-4 w-20 animate-pulse rounded-full bg-black/[0.07]" />
                  ) : meta ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${meta.tone}`}
                    >
                      {meta.label}
                    </span>
                  ) : null}
                </div>

                {loading ? (
                  <div className="mt-1.5 h-3 w-32 animate-pulse rounded bg-black/[0.06]" />
                ) : (p as PlatformStatus).stats?.length ? (
                  <p className="mt-0.5 text-xs text-black/50">
                    {(p as PlatformStatus).handle && (
                      <span className="font-medium">
                        {(p as PlatformStatus).handle}
                      </span>
                    )}
                    {(p as PlatformStatus).handle && " · "}
                    {(p as PlatformStatus).stats!
                      .map((s) => `${s.value} ${s.label.toLowerCase()}`)
                      .join(" · ")}
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-black/45">
                    {state === "setup"
                      ? "Needs your own X developer credentials"
                      : state === "error"
                        ? (p as PlatformStatus).detail?.slice(0, 60)
                        : "Connect to get started"}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* The one state that silently corrupts everything else: reading one
          account and publishing to another. Never let it pass unremarked. */}
      {mismatches.map((m) => (
        <div
          key={m.platform}
          className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-900 ring-1 ring-red-200"
        >
          <span className="font-medium">
            {m.platform} is connected to two different accounts.
          </span>{" "}
          Reading from <strong>{m.composio}</strong>, but scheduling publishes to{" "}
          <strong>{m.zernio}</strong>. Insights, cadence and comment triage
          describe the first; anything you schedule goes to the second.
          Reconnect one of them so both point at the same account.
        </div>
      ))}

      {queue && queue.available === false && (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          <span className="font-medium">The queue could not be read.</span>{" "}
          Scheduling runs on Zernio, which is not responding — this is not the
          same as having nothing scheduled.
        </div>
      )}

      {queue && queue.available !== false && queue.drafts > 0 && (
        <Link
          href="/instagram"
          className="flex items-center gap-3 rounded-xl bg-black/[0.03] px-4 py-3 text-sm ring-1 ring-black/10"
        >
          <span className="font-medium">
            {queue.drafts} draft{queue.drafts === 1 ? "" : "s"}
          </span>
          <span className="text-black/55">
            — no date set, so {queue.drafts === 1 ? "it will" : "they will"} not
            publish →
          </span>
        </Link>
      )}
    </div>
  );
}
