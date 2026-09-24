"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldAlert, Siren, Zap, Clock, Radar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PersonCard } from "@/components/discover/person-card";
import { api, useCurrentUser } from "@/hooks/use-api";
import { cn } from "@/lib/utils";

const HOURS_OPTIONS = [6, 12, 18, 24, 48, 72];

export default function EmergencyPage() {
  const { isAuthenticated } = useCurrentUser();
  const qc = useQueryClient();
  const [hours, setHours] = useState("24");

  const status = useQuery({
    queryKey: ["emergency-status"],
    queryFn: () => api<{ emergencyAvailable: boolean; until: string | null }>("/api/emergency"),
    enabled: isAuthenticated,
  });

  /* Other students currently in emergency mode — solidarity feed. */
  const others = useQuery({
    queryKey: ["emergency-others"],
    queryFn: () => api<any[]>("/api/users?emergency=true"),
  });

  const toggle = useMutation({
    mutationFn: (enabled: boolean) =>
      api<{ emergencyAvailable: boolean; until: string | null }>("/api/emergency", {
        method: "POST",
        body: JSON.stringify({ enabled, hours: Number(hours) }),
      }),
    onSuccess: (data: { emergencyAvailable: boolean }) => {
      toast[data.emergencyAvailable ? "success" : "info"](
        data.emergencyAvailable ? "Emergency mode ON — you're boosted in searches" : "Emergency mode off",
      );
      qc.invalidateQueries({ queryKey: ["emergency-status"] });
      qc.invalidateQueries({ queryKey: ["people"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!isAuthenticated) {
    return (
      <Card className="mt-16 max-w-lg mx-auto">
        <CardContent className="p-8 text-center">
          <Siren className="h-10 w-10 text-red-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold">Emergency teammate mode</h1>
          <p className="text-sm text-muted-foreground mt-2 mb-5">
            &ldquo;Hackathon starts in 18 hours and our backend dev dropped out.&rdquo; Sign in,
            flip the switch, get boosted.
          </p>
          <Button asChild className="font-semibold">
            <Link href="/login">Sign in to activate</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const active = status.data?.emergencyAvailable ?? false;

  return (
    <div className="pt-8 pb-4 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
          <ShieldAlert className={cn("h-7 w-7", active ? "text-red-500" : "text-muted-foreground")} />
          Emergency teammate mode
        </h1>
        <p className="text-muted-foreground mt-2 text-balance">
          Your team lost someone hours before a deadline? Activate to appear at the top of
          gap-matched team searches — for everyone who needs exactly your skills, right now.
        </p>
      </div>

      <Card className={cn("border-2", active ? "border-red-300 dark:border-red-800 bg-red-50/60 dark:bg-red-950/30" : "")}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-11 w-11 rounded-xl grid place-items-center",
                active ? "bg-red-100 text-red-600 dark:bg-red-900/50" : "bg-muted text-muted-foreground",
              )}>
                <Siren className={cn("h-5 w-5", active && "animate-pulse")} />
              </div>
              <div>
                <Label htmlFor="emergency-switch" className="text-base font-bold cursor-pointer">
                  {active ? "EMERGENCY MODE ACTIVE" : "Emergency mode"}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {active && status.data?.until
                    ? `Boosted until ${new Date(status.data.until).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} — auto-expires via cron`
                    : "Boosted ranking + red pulse on your profile"}
                </p>
              </div>
            </div>
            <Switch
              id="emergency-switch"
              checked={active}
              disabled={toggle.isPending || status.isLoading}
              onCheckedChange={(v) => toggle.mutate(v)}
            />
          </div>

          <div className="mt-5 flex items-center gap-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Active for</span>
            <Select value={hours} onValueChange={setHours} disabled={active}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOURS_OPTIONS.map((h) => (
                  <SelectItem key={h} value={String(h)}>{h} hours</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Radar className="h-4 w-4 text-primary" /> Others in emergency mode right now
          </CardTitle>
          <CardDescription>Solidarity feed — teams with a hole to fill are seeing these people first.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(others.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">All quiet. No emergencies active.</p>
          ) : (
            (others.data ?? []).map((p) => <PersonCard key={p.id} person={p} />)
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground flex items-start gap-1.5">
        <Zap className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
        Auto-expiry runs twice daily via Vercel Cron, and every ranking query also lazy-checks the
        timestamp — so an expired boost never lingers.
      </p>
    </div>
  );
}
