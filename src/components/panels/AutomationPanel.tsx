"use client";

import { useEffect, useState } from "react";
import { AiAssist } from "../AiAssist";
import { Button, Card, ErrorNote, Field, Loading, Note, inputClass } from "../ui";
import { AutomationsList } from "./AutomationsList";

type IceBreaker = { question: string; payload?: string };

/**
 * Ice breakers and mention replies -- the remaining write surfaces Instagram
 * exposes. Ice breakers are the only editable part of the profile; the bio,
 * name, website and picture have no API.
 */
export function AutomationPanel() {
  return (
    <div className="space-y-5">
      <BrandVoice />
      <IceBreakers />
      <Mentions />
    </div>
  );
}

type Settings = {
  brandVoice: string;
  avoid: string;
  cadencePerWeek: number;
  topics: string;
  escalateKeywords: string[];
};

/**
 * The voice every AI draft speaks in -- captions, comment replies, DM replies
 * and content suggestions all load this before generating.
 */
function BrandVoice() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => !cancelled && setSettings(d.settings))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    if (!settings) return;
    setBusy(true);
    setStatus("Saving…");
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setStatus(res.ok ? "Saved. All AI drafts now use this voice." : "Could not save.");
    setBusy(false);
  }

  if (!settings) return <Card><Loading /></Card>;

  return (
    <div className="space-y-5">
    <Card className="space-y-4">
      <div>
        <h3 className="font-medium">Brand voice</h3>
        <p className="mt-1 text-sm text-black/55">
          Applied to every AI draft: captions, comment replies, DM replies and
          content suggestions.
        </p>
      </div>

      <div className="rounded-xl border border-black/10 bg-black/[0.02] p-4">
        <span className="block text-sm font-medium">
          Scheduled posts publish automatically
        </span>
        <span className="mt-1 block text-xs text-black/55">
          Scheduling runs on Zernio, which holds each post on its own servers and
          fires it at its time — whether or not this app is running. A failed
          post is retried three times before it is marked failed. There is no
          approval step: <strong>setting a time is the approval</strong>. To
          review something before it goes out, leave it as a draft with no date.
        </span>
      </div>

      <Field label="Voice" hint="How the account should sound.">
        <textarea
          rows={3}
          value={settings.brandVoice}
          onChange={(e) => setSettings({ ...settings, brandVoice: e.target.value })}
          className={inputClass}
        />
      </Field>
      <Field label="Never say" hint="Claims the AI must not make on your behalf.">
        <textarea
          rows={2}
          value={settings.avoid}
          onChange={(e) => setSettings({ ...settings, avoid: e.target.value })}
          className={inputClass}
        />
      </Field>
      <Field label="Topics" hint="Grounds content suggestions.">
        <input
          value={settings.topics}
          onChange={(e) => setSettings({ ...settings, topics: e.target.value })}
          placeholder="specialty coffee, brewing guides, cafe life"
          className={inputClass}
        />
      </Field>
      <Field label="Target posts per week" hint="Used to judge posting cadence.">
        <input
          type="number"
          min={1}
          max={30}
          value={settings.cadencePerWeek}
          onChange={(e) =>
            setSettings({ ...settings, cadencePerWeek: Number(e.target.value) })
          }
          className={inputClass}
        />
      </Field>
      <Field
        label="Escalation keywords"
        hint="Comma separated. A comment containing any of these is always flagged for you."
      >
        <input
          value={settings.escalateKeywords.join(", ")}
          onChange={(e) =>
            setSettings({
              ...settings,
              escalateKeywords: e.target.value
                .split(",")
                .map((k) => k.trim())
                .filter(Boolean),
            })
          }
          className={inputClass}
        />
      </Field>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={busy}>
          Save brand voice
        </Button>
        {status && <span className="text-sm text-black/55">{status}</span>}
      </div>
    </Card>

    <Card className="space-y-4">
      <AutomationsList />
    </Card>
    </div>
  );
}

function IceBreakers() {
  const [items, setItems] = useState<IceBreaker[] | null>(null);
  const [note, setNote] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ig/messenger-profile")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.error) setError(d.error);
        const existing = d.profile?.ice_breakers ?? d.profile?.[0]?.ice_breakers ?? [];
        setItems(Array.isArray(existing) && existing.length ? existing : [{ question: "" }]);
        setNote(d.note);
      })
      .catch(() => !cancelled && setError("Network error."));
    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    const cleaned = (items ?? []).filter((i) => i.question.trim());
    if (cleaned.length === 0) return setStatus("Add at least one question.");
    setBusy(true);
    setStatus("Saving…");
    const res = await fetch("/api/ig/messenger-profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ iceBreakers: cleaned }),
    });
    const data = await res.json();
    setStatus(res.ok ? "Saved." : data.error);
    setBusy(false);
  }

  async function clear() {
    setBusy(true);
    setStatus("Removing…");
    const res = await fetch("/api/ig/messenger-profile", { method: "DELETE" });
    const data = await res.json();
    setStatus(res.ok ? "Removed." : data.error);
    if (res.ok) setItems([{ question: "" }]);
    setBusy(false);
  }

  return (
    <Card className="space-y-4">
      <div>
        <h3 className="font-medium">Ice breakers</h3>
        <p className="mt-1 text-sm text-black/55">
          Tappable prompts shown before someone starts a DM. Max 4. Saving
          replaces the whole set.
        </p>
      </div>

      <ErrorNote>{error}</ErrorNote>
      <Note>{note}</Note>

      {items === null ? (
        <Loading />
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={item.question}
                onChange={(e) =>
                  setItems(
                    items.map((it, j) =>
                      i === j ? { ...it, question: e.target.value } : it,
                    ),
                  )
                }
                placeholder="What are your opening hours?"
                className={inputClass}
              />
              {items.length > 1 && (
                <Button
                  variant="ghost"
                  onClick={() => setItems(items.filter((_, j) => j !== i))}
                >
                  ✕
                </Button>
              )}
            </div>
          ))}
          {items.length < 4 && (
            <Button variant="ghost" onClick={() => setItems([...items, { question: "" }])}>
              Add prompt
            </Button>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={save} disabled={busy}>
          Save ice breakers
        </Button>
        <Button variant="ghost" onClick={clear} disabled={busy}>
          Remove all
        </Button>
        {status && <span className="text-sm text-black/55">{status}</span>}
      </div>
    </Card>
  );
}

function Mentions() {
  const [mediaId, setMediaId] = useState("");
  const [commentId, setCommentId] = useState("");
  const [mentionText, setMentionText] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function send() {
    setBusy(true);
    setStatus("Sending…");
    const res = await fetch("/api/ig/mentions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mediaId,
        commentId: commentId || undefined,
        message,
      }),
    });
    const data = await res.json();
    setStatus(res.ok ? "Reply posted." : data.error);
    if (res.ok) setMessage("");
    setBusy(false);
    setConfirming(false);
  }

  return (
    <Card className="space-y-4">
      <div>
        <h3 className="font-medium">Reply to a mention</h3>
        <p className="mt-1 text-sm text-black/55">
          Respond where your account was @mentioned in someone else&apos;s post or
          comment. Instagram has no API to list mentions, so paste the media ID
          from the notification.
        </p>
      </div>

      <Field label="Media ID" hint="The post you were mentioned in.">
        <input
          value={mediaId}
          onChange={(e) => setMediaId(e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="Comment ID (optional)" hint="Set when replying to a comment mention.">
        <input
          value={commentId}
          onChange={(e) => setCommentId(e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field
        label="What does the mention say?"
        hint="Paste it from the notification. Without it the AI has nothing to reply to."
      >
        <textarea
          value={mentionText}
          onChange={(e) => setMentionText(e.target.value)}
          rows={2}
          className={inputClass}
        />
      </Field>

      <Field label="Reply">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className={inputClass}
        />
      </Field>

      <AiAssist
        task="comment-reply"
        context={
          mentionText.trim()
            ? `You were mentioned. The mention says: ${mentionText}\nReply in the same language it is written in.`
            : ""
        }
        placeholder={
          mentionText.trim()
            ? "Any direction for the reply?"
            : "Paste the mention above first, then describe the reply"
        }
        onInsert={setMessage}
      />

      {confirming ? (
        <div className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-medium">Post this public reply?</p>
          <div className="flex gap-2">
            <Button onClick={send} disabled={busy}>
              Yes, post it
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          onClick={() => setConfirming(true)}
          disabled={!mediaId.trim() || !message.trim()}
        >
          Reply to mention
        </Button>
      )}
      {status && <p className="text-sm text-black/55">{status}</p>}
    </Card>
  );
}
