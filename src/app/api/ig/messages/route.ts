import { NextResponse } from "next/server";
import { execute, ME, type Profile } from "@/lib/ig";

export const runtime = "nodejs";
export const maxDuration = 120;

type StagedFile = { name: string; mimetype: string; s3key: string };

type Party = { id?: string; username?: string };

type Message = {
  id: string;
  message?: string;
  created_time?: string;
  from?: Party;
  to?: { data?: Party[] };
  attachments?: {
    data?: {
      image_data?: { url?: string; preview_url?: string; width?: number; height?: number };
      video_data?: { url?: string; preview_url?: string };
      file_url?: string;
      name?: string;
      mime_type?: string;
    }[];
  };
};

type Me = { id?: string; username?: string };

/**
 * Identify the account itself in a thread.
 *
 * Instagram exposes two different ids for the same account: the Business
 * Account id from INSTAGRAM_GET_USER_INFO, and the Instagram-scoped id (IGSID)
 * that appears on messages. They do not match, so the username is the reliable
 * comparison and the id is only a fallback.
 */
function isMe(party: Party | undefined, me: Me) {
  if (!party) return false;
  if (me.username && party.username) {
    return party.username.toLowerCase() === me.username.toLowerCase();
  }
  return Boolean(me.id && party.id === me.id);
}

/**
 * The conversation object Instagram returns carries only `id` and
 * `updated_time` -- no participants, no unread count. Everything a person
 * needs to recognise a thread (who it is with, what was last said) has to be
 * derived from its messages.
 */
function counterpartOf(messages: Message[], me: Me): Party | undefined {
  for (const m of messages) {
    if (m.from && !isMe(m.from, me)) return m.from;
    const to = m.to?.data?.find((p) => !isMe(p, me));
    if (to) return to;
  }
  return undefined;
}

/** Normalise an attachment into something the UI can render directly. */
function attachmentsOf(message: Message) {
  return (message.attachments?.data ?? [])
    .map((a) => {
      if (a.image_data?.url) {
        return {
          kind: "image" as const,
          url: a.image_data.url,
          width: a.image_data.width,
          height: a.image_data.height,
        };
      }
      if (a.video_data?.url) {
        return {
          kind: "video" as const,
          url: a.video_data.url,
          poster: a.video_data.preview_url,
        };
      }
      if (a.file_url) {
        return { kind: "file" as const, url: a.file_url, name: a.name };
      }
      return null;
    })
    .filter(Boolean);
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const conversationId = params.get("conversationId");

  try {
    const profile = await execute<Profile>("INSTAGRAM_GET_USER_INFO").catch(() => null);
    const me: Me = { id: profile?.data?.id, username: profile?.data?.username };

    if (conversationId) {
      const result = await execute<Message[]>("INSTAGRAM_LIST_ALL_MESSAGES", {
        conversation_id: conversationId,
        limit: 50,
      });
      const raw = Array.isArray(result.data) ? result.data : [];
      // Oldest first reads like a conversation.
      const messages = [...raw].reverse().map((m) => ({
        id: m.id,
        text: m.message ?? "",
        createdAt: m.created_time,
        from: m.from,
        mine: isMe(m.from, me),
        attachments: attachmentsOf(m),
      }));

      return NextResponse.json({
        messages,
        counterpart: counterpartOf(raw, me) ?? null,
        note: result.note,
      });
    }

    const conversations = await execute<{ id: string; updated_time?: string }[]>(
      "INSTAGRAM_LIST_ALL_CONVERSATIONS",
      { platform: "instagram" },
    );
    const list = Array.isArray(conversations.data) ? conversations.data : [];

    // Enrich each thread with who it is with and the last thing said. Capped,
    // because this is one extra call per conversation.
    const enriched = await Promise.all(
      list.slice(0, 20).map(async (c) => {
        try {
          const detail = await execute<{ messages?: { data?: Message[] } }>(
            "INSTAGRAM_GET_CONVERSATION",
            { conversation_id: c.id },
          );
          const messages = detail.data?.messages?.data ?? [];
          const last = messages[0];
          const other = counterpartOf(messages, me);
          return {
            id: c.id,
            updatedAt: c.updated_time,
            username: other?.username ?? null,
            recipientId: other?.id ?? null,
            // GET_CONVERSATION's inline messages omit attachments, so an
            // empty body here means media rather than an empty message.
            preview: last
              ? last.message?.trim() || "Sent an attachment"
              : "",
          };
        } catch {
          return {
            id: c.id,
            updatedAt: c.updated_time,
            username: null,
            recipientId: null,
            preview: "",
          };
        }
      }),
    );

    return NextResponse.json({
      conversations: enriched,
      total: list.length,
      note: conversations.note,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { recipientId, text, imageUrl, imageFile, markSeen } = (await request.json()) as {
      recipientId?: string;
      text?: string;
      imageUrl?: string;
      imageFile?: StagedFile;
      markSeen?: boolean;
    };

    if (!recipientId) {
      return NextResponse.json(
        { error: "No recipient. Open a conversation with at least one message first." },
        { status: 400 },
      );
    }

    if (markSeen) {
      const seen = await execute("INSTAGRAM_MARK_SEEN", { recipient_id: recipientId });
      return NextResponse.json({ ok: true, logId: seen.logId });
    }

    if (imageUrl || imageFile) {
      const sent = await execute("INSTAGRAM_SEND_IMAGE", {
        recipient_id: recipientId,
        ...(imageUrl ? { image_url: imageUrl } : {}),
        ...(imageFile ? { image_file: imageFile } : {}),
      });
      return NextResponse.json({ ok: true, result: sent.data, logId: sent.logId });
    }

    if (!text?.trim()) {
      return NextResponse.json(
        { error: "text, imageUrl or imageFile is required" },
        { status: 400 },
      );
    }

    const sent = await execute("INSTAGRAM_SEND_TEXT_MESSAGE", {
      recipient_id: recipientId,
      text,
    });
    return NextResponse.json({ ok: true, result: sent.data, logId: sent.logId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: /24|window|outside/i.test(message)
          ? `${message} — Instagram only allows free-form replies within 24h of the person's last message.`
          : /permission|scope/i.test(message)
            ? `${message} — DM tools need Meta's instagram_manage_messages permission.`
            : message,
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { iceBreakers } = await request.json();
    const updated = await execute("INSTAGRAM_UPDATE_MESSENGER_PROFILE", {
      ig_user_id: ME,
      ice_breakers: iceBreakers,
    });
    return NextResponse.json({ ok: true, result: updated.data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
