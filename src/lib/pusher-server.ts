import Pusher from "pusher";

let pusher: Pusher | null = null;

/**
 * Pusher server client (free tier: 100 concurrent connections,
 * 200k messages/day). Team chat only — we trigger on new messages;
 * clients subscribe when the chat is open and disconnect on close.
 */
export function getPusher(): Pusher | null {
  if (pusher) return pusher;
  const { PUSHER_APP_ID, PUSHER_APP_KEY, PUSHER_APP_SECRET, PUSHER_CLUSTER } =
    process.env;
  if (!PUSHER_APP_ID || !PUSHER_APP_KEY || !PUSHER_APP_SECRET || !PUSHER_CLUSTER) {
    return null;
  }
  pusher = new Pusher({
    appId: PUSHER_APP_ID,
    key: PUSHER_APP_KEY,
    secret: PUSHER_APP_SECRET,
    cluster: PUSHER_CLUSTER,
    useTLS: true,
  });
  return pusher;
}

export async function triggerTeamMessage(
  teamId: string,
  payload: unknown,
): Promise<boolean> {
  const client = getPusher();
  if (!client) return false;
  try {
    await client.trigger(`private-team-${teamId}`, "message", payload);
    return true;
  } catch (err) {
    console.error("[pusher:error]", err);
    return false;
  }
}
