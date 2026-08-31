"use client";

import { useEffect, useState } from "react";
import { AccountSwitcher } from "@/components/AccountSwitcher";
import { AppHeader } from "@/components/AppHeader";
import { GrowthPanel } from "@/components/GrowthPanel";
import { BrandIcon } from "@/components/BrandIcon";
import { PlatformChat } from "@/components/PlatformChat";
import { YtStudio } from "@/components/yt/YtStudio";
import {
  YtComments,
  YtOverview,
  YtPlaylists,
  YtSearch,
  YtUpload,
  YtVideos,
} from "@/components/yt/YtPanels";
import { Button, ErrorNote, Tabs } from "@/components/ui";
import { ZernioAnalytics } from "@/components/panels/ZernioAnalytics";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "videos", label: "Videos" },
  { id: "studio", label: "AI Studio" },
  { id: "upload", label: "Upload" },
  { id: "comments", label: "Comments" },
  { id: "playlists", label: "Playlists" },
  { id: "analytics", label: "Analytics" },
  { id: "grow", label: "Grow" },
  { id: "search", label: "Search" },
  { id: "ai", label: "Ask AI" },
] as const;

type Tab = (typeof TABS)[number]["id"];

export default function YouTubePanel() {
  const [tab, setTab] = useState<Tab>("overview");
  const [connected, setConnected] = useState<boolean | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [studioVideo, setStudioVideo] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/yt/connection")
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
    const res = await fetch("/api/yt/connection", { method: "POST" });
    const data = await res.json();
    if (data.redirectUrl) {
      window.open(data.redirectUrl, "_blank", "noopener");
      const poll = setInterval(async () => {
        const s = await fetch("/api/yt/connection").then((r) => r.json());
        if (s.connected) {
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
        title="YouTube"
        icon={
          <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#FF0000] to-[#CC0000] text-white shadow-sm">
            <BrandIcon id="youtube" className="size-4" />
          </span>
        }
        right={
          <div className="flex items-center gap-2">
            <AccountSwitcher
              platform="youtube"
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
                {connecting ? "Waiting for authorization…" : "Connect YouTube"}
              </Button>
            )}
          </div>
        }
      />

      <ErrorNote>{error}</ErrorNote>

      {connected === false ? (
        <div className="rounded-2xl border border-dashed border-black/12 bg-white px-6 py-16 text-center">
          <p className="font-medium">YouTube is not connected</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-black/50">
            Connect a Google account that owns a channel. No developer
            credentials needed — unlike X, YouTube has a managed app.
          </p>
        </div>
      ) : (
        <>
          <Tabs tabs={TABS} active={tab} onChange={setTab} />

          {tab === "overview" && <YtOverview />}
          {tab === "videos" && (
            <YtVideos
              onStudio={(id) => {
                setStudioVideo(id);
                setTab("studio");
              }}
            />
          )}
          {tab === "studio" && <YtStudio key={studioVideo} videoId={studioVideo} />}
          {tab === "upload" && <YtUpload />}
          {tab === "comments" && <YtComments />}
          {tab === "playlists" && <YtPlaylists />}
          {tab === "search" && <YtSearch />}
          {tab === "analytics" && <ZernioAnalytics platform="youtube" />}
          {tab === "grow" && <GrowthPanel platform="youtube" />}
          {tab === "ai" && (
            <PlatformChat
              endpoint="/api/yt/chat"
              placeholder="Ask anything about your channel…"
              intro="The AI can use all 51 YouTube tools, and loads transcripts before answering questions about a video. It asks before uploading, editing, deleting or moderating."
              suggestions={[
                "How many subscribers and videos do I have?",
                "Summarise my most recent video from its transcript",
                "What comments need a reply?",
                "What playlists do I have?",
              ]}
            />
          )}
        </>
      )}
    </div>
  );
}
