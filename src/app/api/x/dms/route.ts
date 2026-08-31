import { xRoute } from "@/lib/x-route";
import { xExecute } from "@/lib/x";

export const runtime = "nodejs";

/** ?participantId= one conversation, else recent DM events across the inbox. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const participantId = params.get("participantId");
  const conversationId = params.get("conversationId");

  return xRoute(async () => {
    if (conversationId) {
      const r = await xExecute("TWITTER_RETRIEVE_DM_CONVERSATION_EVENTS", {
        id: conversationId,
      });
      return { events: r.data, note: r.note };
    }
    if (participantId) {
      const r = await xExecute("TWITTER_GET_DM_CONVERSATION_EVENTS", {
        participant_id: participantId,
      });
      return { events: r.data, note: r.note };
    }
    const r = await xExecute("TWITTER_GET_RECENT_DM_EVENTS");
    return { events: r.data, note: r.note };
  });
}

export async function POST(request: Request) {
  const { participantId, conversationId, text, participantIds } = await request.json();
  return xRoute(async () => {
    if (!text?.trim()) throw new Error("text is required.");
    if (conversationId) {
      const r = await xExecute("TWITTER_SEND_DM_TO_CONVERSATION", {
        dm_conversation_id: conversationId,
        text,
      });
      return { ok: true, result: r.data };
    }
    if (participantIds?.length > 1) {
      // A group DM has to be created before it can be messaged.
      const r = await xExecute("TWITTER_CREATE_DM_CONVERSATION", {
        conversation_type: "Group",
        participant_ids: participantIds,
        message: { text },
      });
      return { ok: true, result: r.data };
    }
    if (!participantId) throw new Error("participantId is required.");
    const r = await xExecute("TWITTER_SEND_A_NEW_MESSAGE_TO_A_USER", {
      participant_id: participantId,
      text,
    });
    return { ok: true, result: r.data };
  });
}

export async function DELETE(request: Request) {
  const eventId = new URL(request.url).searchParams.get("eventId");
  return xRoute(async () => {
    if (!eventId) throw new Error("eventId is required.");
    const r = await xExecute("TWITTER_DELETE_DM", { event_id: eventId });
    return { ok: true, result: r.data };
  });
}
