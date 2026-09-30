"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLE_TAXONOMY } from "@/lib/constants";

export function JoinRequestDialog({
  open,
  onOpenChange,
  teamName,
  openRoles,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  teamName: string;
  openRoles: string[];
  onSubmit: (message: string, roleSlug?: string) => Promise<void>;
}) {
  const [message, setMessage] = useState("");
  const [role, setRole] = useState<string>("");
  const [sending, setSending] = useState(false);

  async function submit() {
    if (message.trim().length < 10) {
      toast.error("Tell the team a bit about yourself (at least 10 characters)");
      return;
    }
    setSending(true);
    try {
      await onSubmit(message.trim(), role || undefined);
      onOpenChange(false);
      setMessage("");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request to join {teamName}</DialogTitle>
          <DialogDescription>
            Team leads get your message + profile. Instead of random DMs, they accept or decline
            from their workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <Label htmlFor="join-message">Your message</Label>
            <Textarea
              id="join-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`e.g. "I'm a backend dev — FastAPI + Postgres + AWS, available all through the event. Your gap analysis literally describes me."`}
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">{message.length}/500</p>
          </div>

          <div className="space-y-2">
            <Label>Which role would you fill?</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pick a role (optional)" />
              </SelectTrigger>
              <SelectContent>
                {(openRoles.length > 0 ? openRoles : ROLE_TAXONOMY.map((r) => r.name)).map((r) => {
                  const slug = ROLE_TAXONOMY.find((rt) => rt.name === r)?.slug ?? r;
                  return (
                    <SelectItem key={slug} value={slug}>
                      {r}
                      {openRoles.includes(r) ? " (open)" : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={sending} className="font-semibold">
            {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Send request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
