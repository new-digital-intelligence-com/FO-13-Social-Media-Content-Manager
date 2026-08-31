"use client";

import { useEffect, useState } from "react";
import { AutomationPanel } from "@/components/panels/AutomationPanel";
import { MonitorPanel } from "@/components/panels/MonitorPanel";
import { QueuePanel } from "@/components/panels/QueuePanel";
import { ChatPanel } from "@/components/panels/ChatPanel";
import { ComposePanel } from "@/components/panels/ComposePanel";
import { ContentPanel } from "@/components/panels/ContentPanel";
import { InsightsPanel } from "@/components/panels/InsightsPanel";
import { MessagesPanel } from "@/components/panels/MessagesPanel";
import { OverviewPanel } from "@/components/panels/OverviewPanel";
import { AccountSwitcher } from "@/components/AccountSwitcher";
import { AppHeader } from "@/components/AppHeader";
import { GrowthPanel } from "@/components/GrowthPanel";
import { Button, ErrorNote, Tabs } from "@/components/ui";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "posts", label: "Posts" },
  { id: "reels", label: "Reels" },
  { id: "stories", label: "Stories" },
  { id: "messages", label: "Messages" },
  { id: "insights", label: "Insights" },
  { id: "compose", label: "Compose" },
  { id: "queue", label: "Queue" },
  { id: "monitor", label: "Monitor" },
  { id: "grow", label: "Grow" },
  { id: "automation", label: "Automation" },
  { id: "ai", label: "Ask AI" },
] as const;

type Tab = (typeof TABS)[number]["id"];

export default function InstagramPanel() {
  const [tab, setTab] = useState<Tab>("overview");
  const [connected, setConnected] = useState<boolean | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/connection")
      .then((r) => r.json())
      .then((d) => !cancelled && setConnected(Boolean(d.connected)))
      .catch(() => !cancelled && setConnected(false));
    return () => {
      cancelled = true;
    };
  }, []);

  async function connect() {
    setConnecting(true);
    setError(null);
    const res = await fetch("/api/connection", { method: "POST" });
    const data = await res.json();
    if (data.redirectUrl) {
      window.open(data.redirectUrl, "_blank", "noopener");
      const poll = setInterval(async () => {
        const status = await fetch("/api/connection").then((r) => r.json());
        if (status.connected) {
          setConnected(true);
          setConnecting(false);
          clearInterval(poll);
        }
      }, 3000);
    } else if (data.connected) {
      setConnected(true);
      setConnecting(false);
    } else {
      setError(data.error ?? "Could not start authorization.");
      setConnecting(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <AppHeader
        title="Instagram"
        icon={
          <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-xs font-bold text-white shadow-sm">
            IG
          </span>
        }
        right={
          <div className="flex items-center gap-2">
            <AccountSwitcher
              platform="instagram"
              onSwitch={() => window.location.reload()}
            />
            {connected === null ? (
              <span className="text-sm text-black/45">Checking…</span>
            ) : connected ? (
              <span className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700 ring-1 ring-emerald-200">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Connected
              </span>
            ) : (
              <Button onClick={connect} disabled={connecting}>
                {connecting ? "Waiting for authorization…" : "Connect Instagram"}
              </Button>
            )}
          </div>
        }
      />

      <ErrorNote>{error}</ErrorNote>

      {connected === false ? (
        <div className="rounded-2xl border border-dashed border-black/12 bg-white px-6 py-16 text-center">
          <p className="font-medium">Instagram is not connected</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-black/50">
            Connect a Business or Creator account. Instagram&apos;s API rejects
            personal accounts.
          </p>
        </div>
      ) : (
        <>
          <Tabs tabs={TABS} active={tab} onChange={setTab} />

          {tab === "overview" && <OverviewPanel />}
          {tab === "posts" && <ContentPanel filter="all" />}
          {tab === "reels" && <ContentPanel filter="reels" />}
          {tab === "stories" && <ContentPanel filter="stories" />}
          {tab === "messages" && <MessagesPanel />}
          {tab === "insights" && <InsightsPanel />}
          {tab === "compose" && <ComposePanel />}
          {tab === "queue" && <QueuePanel />}
          {tab === "monitor" && <MonitorPanel />}
          {tab === "automation" && <AutomationPanel />}
          {tab === "grow" && <GrowthPanel platform="instagram" />}
          {tab === "ai" && <ChatPanel />}
        </>
      )}
    </div>
  );
}
