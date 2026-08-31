"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Empty, ErrorNote, Loading } from "../ui";
import { ZernioSection } from "../ZernioGate";

type Automation = {
  _id: string;
  name?: string;
  keywords?: string[];
  trigger?: string;
  platformPostId?: string | null;
  isActive?: boolean;
  stats?: { delivered?: number; read?: number; clicks?: number };
};

/**
 * Comment-to-DM automations.
 *
 * The same capability the `instagram-automation` skill drives, so the two
 * surfaces stay equivalent. It is the most consequential thing in the app: an
 * armed automation messages real people, unattended, until switched off — so
 * every destructive or arming action confirms first and states the blast
 * radius.
 */
export function AutomationsList() {
  return (
    <ZernioSection
      feature="Comment-to-DM automations"
      fallback="Nothing else in the app can send these, so there is no fallback. You can still triage comments by hand in the Monitor tab."
    >
      <Inner />
    </ZernioSection>
  );
}

function Inner() {
  const [items, setItems] = useState<Automation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/zernio/automations");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      setItems([]);
      return;
    }
    setError(null);
    setItems(data.automations ?? []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!cancelled) await load();
      } catch {
        if (!cancelled) setError("Could not load automations.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function toggle(a: Automation) {
    const turningOn = !a.isActive;
    if (
      turningOn &&
      !confirm(
        `Turn this automation on?\n\nEveryone who comments ${(a.keywords ?? []).map((k) => `"${k}"`).join(", ")} ` +
          `${a.platformPostId ? "on that post" : "on ANY post on the account"} will be sent a DM automatically, ` +
          `until you turn it off.`,
      )
    )
      return;
    await fetch("/api/zernio/automations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: a._id, isActive: turningOn }),
    });
    load();
  }

  async function remove(a: Automation) {
    if (!confirm(`Delete "${a.name ?? "this automation"}" permanently?`)) return;
    await fetch(`/api/zernio/automations?id=${encodeURIComponent(a._id)}`, {
      method: "DELETE",
    });
    load();
  }

  if (!items) return <Loading label="Loading automations…" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-medium">Comment-to-DM</h3>
          <p className="text-xs text-black/55">
            Someone comments a keyword, they get a DM automatically.
          </p>
        </div>
        <Button variant="ghost" onClick={() => setCreating((v) => !v)}>
          {creating ? "Cancel" : "New automation"}
        </Button>
      </div>

      <ErrorNote>{error}</ErrorNote>

      {creating && (
        <CreateForm
          onDone={() => {
            setCreating(false);
            load();
          }}
        />
      )}

      {items.length === 0 ? (
        <Empty
          title="No automations"
          hint="Create one to auto-DM people who comment a keyword on your posts."
        />
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <Card key={a._id} className="space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{a.name ?? "Untitled"}</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${
                        a.isActive
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          : "bg-black/[0.05] text-black/60 ring-black/10"
                      }`}
                    >
                      {a.isActive ? "Live · sending DMs" : "Off"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-black/70">
                    Keywords: {(a.keywords ?? []).join(", ") || "—"}
                  </p>
                  <p className="text-xs text-black/50">
                    {a.platformPostId
                      ? "Scoped to one post"
                      : "Account-wide — matches comments on every post"}
                    {a.trigger === "story_reply" && " · story replies"}
                  </p>
                  {a.stats && (
                    <p className="mt-1 text-xs text-black/50">
                      {a.stats.delivered ?? 0} delivered · {a.stats.read ?? 0} read ·{" "}
                      {a.stats.clicks ?? 0} link clicks
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 border-t border-black/10 pt-3">
                <Button variant="ghost" onClick={() => toggle(a)}>
                  {a.isActive ? "Turn off" : "Turn on"}
                </Button>
                <Button variant="ghost" onClick={() => remove(a)}>
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [keywords, setKeywords] = useState("");
  const [dmMessage, setMessage] = useState("");
  const [accountWide, setAccountWide] = useState(true);
  const [postId, setPostId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = keywords
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  async function create() {
    if (
      !confirm(
        `Create this automation?\n\nAnyone who comments ${list.map((k) => `"${k}"`).join(", ")} ` +
          `${accountWide ? "on ANY post on your account" : "on that one post"} ` +
          `will be DMed automatically once it is turned on.`,
      )
    )
      return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/zernio/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name || undefined,
        keywords: list,
        dmMessage,
        platformPostId: accountWide ? undefined : postId || undefined,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not create it.");
      return;
    }
    onDone();
  }

  const input =
    "w-full rounded-lg border border-black/15 px-3 py-2 text-sm focus:border-black/30 focus:outline-none";

  return (
    <Card className="space-y-3">
      <input
        className={input}
        placeholder="Name (for your reference)"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <div>
        <input
          className={input}
          placeholder="Keywords, comma separated — e.g. link, price"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
        />
        <p className="mt-1 text-xs text-black/50">
          A broad word will DM people who used it incidentally. Keep them specific.
        </p>
      </div>
      <div>
        <textarea
          className={input}
          rows={3}
          placeholder="The DM they receive"
          value={dmMessage}
          onChange={(e) => setMessage(e.target.value)}
        />
        <p className="mt-1 text-xs text-black/50">
          Instagram captions have no clickable links, which is what makes this
          useful — the DM can carry one.
        </p>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={accountWide}
          onChange={(e) => setAccountWide(e.target.checked)}
        />
        <span>
          Run on every post
          <span className="mt-0.5 block text-xs text-black/55">
            Untick to scope it to a single post by its Instagram media id.
          </span>
        </span>
      </label>
      {!accountWide && (
        <input
          className={input}
          placeholder="Instagram media id"
          value={postId}
          onChange={(e) => setPostId(e.target.value)}
        />
      )}
      <ErrorNote>{error}</ErrorNote>
      <p className="text-xs text-black/55">
        It is created switched <strong>off</strong>. Nothing is sent until you
        turn it on.
      </p>
      <Button onClick={create} disabled={busy || list.length === 0 || !dmMessage.trim()}>
        {busy ? "Creating…" : "Create (off)"}
      </Button>
    </Card>
  );
}
