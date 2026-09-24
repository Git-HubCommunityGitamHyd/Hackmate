"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Loader2, Wifi, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useTeamChat, useSendMessage, useCurrentUser, type ChatMessage } from "@/hooks/use-api";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

/**
 * Temporary team chat — enough to align before moving to WhatsApp/Discord.
 * - Realtime via Pusher when NEXT_PUBLIC_PUSHER_KEY is set (subscribes on
 *   open, disconnects on unmount — per free-tier connection budget).
 * - Polling fallback (4s) otherwise, so dev + preview still work.
 */
export function TeamChat({ teamId, teamName }: { teamId: string; teamName: string }) {
  const { user } = useCurrentUser();
  const { data: messages, isLoading } = useTeamChat(teamId);
  const sendMessage = useSendMessage(teamId);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  /* Pusher realtime subscription (only when configured). */
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    if (!key || !cluster) return;

    let channel: any = null;
    let pusherClient: any = null;
    let cancelled = false;

    (async () => {
      const Pusher = (await import("pusher-js")).default;
      if (cancelled) return;
      pusherClient = new Pusher(key, { cluster, forceTLS: true });
      channel = pusherClient.subscribe(`private-team-${teamId}`);
      channel.bind("pusher:subscription_succeeded", () => {
        // Auth via our membership-checked endpoint.
        pusherClient.config.authEndpoint = `/api/teams/${teamId}/chat`;
      });
      channel.bind("message", (msg: ChatMessage) => {
        qc.setQueryData<ChatMessage[]>(["chat", teamId], (old) =>
          old && !old.some((m) => m.id === msg.id) ? [...old, msg] : old,
        );
      });
    })();

    /* Disconnect on close — free tier: 100 concurrent connections. */
    return () => {
      cancelled = true;
      if (channel) channel.unbind_all();
      if (pusherClient) pusherClient.unsubscribe(`private-team-${teamId}`);
    };
  }, [teamId, qc]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  const realtime = !!process.env.NEXT_PUBLIC_PUSHER_KEY;

  function submit() {
    const content = draft.trim();
    if (!content) return;
    setDraft("");
    sendMessage.mutate(content);
  }

  return (
    <div className="flex flex-col h-[420px]">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <MessageSquare className="h-3.5 w-3.5" /> Team chat
        </span>
        <Badge variant="outline" className="text-[10px] gap-1">
          <Wifi className="h-2.5 w-2.5" /> {realtime ? "realtime" : "polling"}
        </Badge>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-slim space-y-3 pr-1" aria-label={`Chat for ${teamName}`}>
        {isLoading ? (
          <div className="h-full grid place-items-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !messages || messages.length === 0 ? (
          <div className="h-full grid place-items-center text-center">
            <p className="text-sm text-muted-foreground">
              No messages yet. Break the ice — say what you&apos;re building this week.
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.userId === user?.id;
            return (
              <div key={m.id} className={cn("flex gap-2.5", mine && "flex-row-reverse")}>
                <UserAvatar name={m.userName} image={m.userImage} className="h-8 w-8" />
                <div className={cn("max-w-[75%]", mine && "text-right")}>
                  <div className={cn("flex items-baseline gap-2 mb-0.5", mine && "flex-row-reverse")}>
                    <span className="text-xs font-semibold">{mine ? "You" : m.userName}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(m.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "inline-block rounded-xl px-3 py-2 text-sm text-left",
                      mine ? "bg-primary text-primary-foreground" : "bg-muted",
                    )}
                  >
                    {m.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 mt-3">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && submit()}
          placeholder="Message your team…"
          maxLength={1000}
          aria-label="Chat message"
        />
        <Button size="icon" onClick={submit} disabled={!draft.trim() || sendMessage.isPending} aria-label="Send message">
          {sendMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
