"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AiAssist } from "../AiAssist";
import { Card, Empty, ErrorNote, Loading, Note, Stat } from "../ui";

type Data = {
  profile: {
    username?: string;
    name?: string;
    account_type?: string;
    biography?: string | null;
    followers_count?: number;
    follows_count?: number;
    media_count?: number;
    profile_picture_url?: string | null;
    id?: string;
  };
  quota: { used: number; total: number | null; windowHours: number };
  note?: string;
  error?: string;
};

export function OverviewPanel() {
  const [data, setData] = useState<Data | null>(null);
  const [bioDraft, setBioDraft] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ig/profile")
      .then((r) => r.json())
      .then((d) => !cancelled && setData(d))
      .catch(() => !cancelled && setData({ error: "Network error" } as Data));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) return <Loading label="Loading profile…" />;
  if (data.error) return <ErrorNote>{data.error}</ErrorNote>;

  const p = data.profile;

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-wrap items-center gap-5">
          {p.profile_picture_url ? (
            <Image
              src={p.profile_picture_url}
              alt={p.username ?? "Profile"}
              width={72}
              height={72}
              unoptimized
              className="rounded-full object-cover"
            />
          ) : (
            <div className="size-18 rounded-full bg-black/10" />
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">@{p.username ?? "unknown"}</h2>
              {p.account_type && (
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                  {p.account_type}
                </span>
              )}
            </div>
            <p className="text-sm text-black/55">{p.name}</p>
            <p className="mt-1 font-mono text-xs text-black/35">ID {p.id}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4 border-t border-black/10 pt-5">
          <Stat label="Followers" value={p.followers_count ?? "—"} />
          <Stat label="Following" value={p.follows_count ?? "—"} />
          <Stat label="Posts" value={p.media_count ?? "—"} />
        </div>
      </Card>

      <Card>
        <h3 className="font-medium">Publishing quota</h3>
        <p className="mt-1 text-sm text-black/55">
          {data.quota.used} of {data.quota.total ?? "—"} posts used in the last{" "}
          {data.quota.windowHours}h.
        </p>
        {data.quota.total ? (
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/10">
            <div
              className="h-full rounded-full bg-brand"
              style={{
                width: `${Math.min(100, (data.quota.used / data.quota.total) * 100)}%`,
              }}
            />
          </div>
        ) : null}
      </Card>

      <Card>
        <h3 className="font-medium">Bio</h3>
        <p className="mt-2 text-sm">
          {p.biography || <span className="text-black/45">No bio set.</span>}
        </p>

        <div className="mt-4 rounded-xl bg-black/[0.04] p-4 text-sm">
          <p className="font-medium">Instagram does not allow apps to change your bio.</p>
          <p className="mt-1 text-black/55">
            Meta&apos;s Graph API exposes no endpoint for editing your bio, name,
            website or profile picture — for any tool, not just this one. You can
            draft a new bio here and paste it into the Instagram app.
          </p>
        </div>

        <div className="mt-4 space-y-3">
          <AiAssist
            task="bio"
            context={`Account @${p.username ?? ""}, ${p.name ?? ""}. Current bio: ${
              p.biography || "(none)"
            }`}
            placeholder="What should the bio convey?"
            onInsert={setBioDraft}
          />
          {bioDraft && (
            <pre className="whitespace-pre-wrap rounded-xl bg-black/[0.04] p-3 text-sm">
              {bioDraft}
            </pre>
          )}
        </div>
      </Card>

      <Note>{data.note}</Note>
      {p.media_count === 0 && (
        <Empty
          title="This account has no posts yet"
          hint="Publish something from the Compose tab and the other panels will fill in."
        />
      )}
    </div>
  );
}
