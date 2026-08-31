"use client";

import { useCallback, useEffect, useState } from "react";
import { XSetup } from "@/components/x/XSetup";
import {
  XCompose,
  XDms,
  XLists,
  XOverview,
  XSearch,
  XTimeline,
} from "@/components/x/XPanels";
import { XChat } from "@/components/x/XChat";
import { AccountSwitcher } from "@/components/AccountSwitcher";
import { AppHeader } from "@/components/AppHeader";
import { GrowthPanel } from "@/components/GrowthPanel";
import { ErrorNote, Loading, Tabs } from "@/components/ui";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "compose", label: "Compose" },
  { id: "timeline", label: "Timeline" },
  { id: "search", label: "Search" },
  { id: "lists", label: "Lists" },
  { id: "grow", label: "Grow" },
  { id: "dms", label: "Messages" },
  { id: "ai", label: "Ask AI" },
] as const;

type Tab = (typeof TABS)[number]["id"];
type Setup = {
  step: "credentials" | "connect" | "ready";
  defaultScopes?: string[];
  optionalScopes?: string[];
  connected?: boolean;
  error?: string;
};

export default function XPanel() {
  const [tab, setTab] = useState<Tab>("overview");
  const [setup, setSetup] = useState<Setup | null>(null);
  const [account, setAccount] = useState<{
    me?: Record<string, unknown>;
    usage?: unknown;
    error?: string;
  } | null>(null);

  const loadSetup = useCallback(async () => {
    const res = await fetch("/api/x/setup");
    setSetup(await res.json());
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/x/setup")
      .then((r) => r.json())
      .then((d) => !cancelled && setSetup(d))
      .catch(() => !cancelled && setSetup({ step: "credentials" }));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (setup?.step !== "ready") return;
    let cancelled = false;
    fetch("/api/x/account")
      .then((r) => r.json())
      .then((d) => !cancelled && setAccount(d))
      .catch(() => !cancelled && setAccount({ error: "Network error." }));
    return () => {
      cancelled = true;
    };
  }, [setup?.step]);

  const me = (account?.me ?? null) as never;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <AppHeader
        title="X (Twitter)"
        icon={
          <span className="flex size-8 items-center justify-center rounded-lg bg-black text-xs font-bold text-white shadow-sm">
            X
          </span>
        }
        right={
          <div className="flex items-center gap-2">
            <AccountSwitcher
              platform="x"
              onSwitch={() => window.location.reload()}
            />
            {setup?.step === "ready" ? (
              <span className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700 ring-1 ring-emerald-200">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Connected
              </span>
            ) : null}
          </div>
        }
      />

      {!setup ? (
        <Loading label="Checking setup…" />
      ) : setup.error ? (
        <ErrorNote>{setup.error}</ErrorNote>
      ) : setup.step !== "ready" ? (
        <XSetup
          key={setup.step}
          step={setup.step}
          defaultScopes={setup.defaultScopes}
          optionalScopes={setup.optionalScopes}
          onDone={loadSetup}
        />
      ) : (
        <>
          <Tabs tabs={TABS} active={tab} onChange={setTab} />

          {account?.error && <ErrorNote>{account.error}</ErrorNote>}
          {!account ? (
            <Loading label="Loading account…" />
          ) : (
            <>
              {tab === "overview" && <XOverview me={me} usage={account.usage} />}
              {tab === "compose" && <XCompose me={me} />}
              {tab === "timeline" && <XTimeline me={me} />}
              {tab === "search" && <XSearch me={me} />}
              {tab === "lists" && <XLists me={me} />}
              {tab === "dms" && <XDms />}
              {tab === "grow" && <GrowthPanel platform="x" />}
          {tab === "ai" && <XChat />}
            </>
          )}
        </>
      )}
    </div>
  );
}
