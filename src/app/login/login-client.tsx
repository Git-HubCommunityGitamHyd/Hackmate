"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Github, Mail, Loader2, Zap, FlaskConical, Radar, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/shared/logo";

const MATCH_WEIGHTS = [
  { label: "Skill overlap", weight: "40%", hint: "What you know vs what they need" },
  { label: "Availability", weight: "20%", hint: "Hours and time windows line up" },
  { label: "Commitment", weight: "15%", hint: "Casual to win-at-all-costs" },
  { label: "Experience delta", weight: "15%", hint: "Neither carrying nor carried" },
  { label: "Role fit", weight: "10%", hint: "Fills an open role, not a duplicate" },
];

function ProjectInfo() {
  return (
    <div className="space-y-6">
      <div>
        <p className="label-harsh mb-3">Hackathon team finder</p>
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-balance">
          Find your people.{" "}
          <span className="text-primary">Win your hackathon.</span>
        </h2>
        <p className="text-muted-foreground mt-4 max-w-xl leading-relaxed">
          HackMate is where students find hackathon teammates. Build a profile with your
          skills, roles, availability and commitment, browse hackathons posted by
          organizers, and form teams around ideas. Teams get a workspace with realtime
          chat and a submission checklist, and the whole thing runs on free tiers.
        </p>
      </div>

      <div className="fluted-panel">
        <div className="p-4 flex items-start gap-3 relative z-10">
          <Radar className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="label-harsh text-primary/90">Team Composition Intelligence</p>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              &ldquo;Your team has strong ML and frontend coverage. You have no member with
              backend/cloud experience. Arjun knows FastAPI, PostgreSQL and AWS and is
              available for the entire hackathon.&rdquo; A composition analysis instead of
              a match percentage: what your team covers, what is missing, and who fills
              the gap.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="label-harsh mb-4 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> How HackMate matches you
        </h3>
        <div className="grid sm:grid-cols-2 gap-2.5">
          {MATCH_WEIGHTS.map((w) => (
            <div key={w.label} className="flex items-center gap-3 p-3 rounded-sm border bg-muted/30">
              <span className="text-xl font-extrabold text-primary w-12 shrink-0">{w.weight}</span>
              <div className="min-w-0">
                <div className="text-sm font-semibold">{w.label}</div>
                <div className="text-xs text-muted-foreground">{w.hint}</div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4 max-w-xl leading-relaxed">
          Deterministic scoring: a SQL prefilter plus TypeScript weighted ranking over
          about 50 candidates. No black box, every match card shows the exact reasons.
          Emergency-available students are boosted with a red pulse. Sign in with GitHub
          and your languages, repos and activity are imported to verify skills
          automatically; designers, PMs and pitchers can use an email magic link instead.
        </p>
      </div>
    </div>
  );
}

export function LoginClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sendingMagic, setSendingMagic] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  /* Demo login button is enabled only when ALLOW_DEMO_LOGIN=true on the server
     AND exposed to the client via NEXT_PUBLIC_ALLOW_DEMO_LOGIN (dev preview). */
  const hasDemo = process.env.NEXT_PUBLIC_ALLOW_DEMO_LOGIN === "true";

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      toast.error("Enter a valid email");
      return;
    }
    setSendingMagic(true);
    const result = await signIn("resend", { email, redirect: false });
    setSendingMagic(false);
    if (result?.error) {
      toast.error("Couldn't send the magic link. Is RESEND_API_KEY configured?");
    } else {
      router.push("/verify-request");
    }
  }

  async function demoLogin() {
    setDemoLoading(true);
    try {
      /* No email sent — the route picks ADMIN_EMAILS[0] (or dev@hackmate.local). */
      const res = await fetch("/api/auth/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Dev sign-in failed");
      const data = await res.json();
      toast.success(`Signed in as ${data.email ?? "dev account"} (admin)`);
      /* Hard navigation (not router.push): the full reload remounts the
         SessionProvider so the navbar immediately reflects the new session,
         and it sidesteps any client-router race with the freshly set cookie. */
      window.location.assign("/");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDemoLoading(false);
    }
  }

  return (
    <div className="pt-10 pb-12">
      {/* Mobile: brand + sign-in first */}
      <div className="lg:hidden mb-8 text-center">
        <div className="inline-flex items-center gap-3 mb-3">
          <Logo className="h-11 w-11" />
          <span className="text-2xl font-extrabold tracking-tight">HackMate</span>
        </div>
        <p className="text-muted-foreground text-sm text-balance">
          One account for developers and designers, pitchers and PMs.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-14 lg:items-start max-w-6xl mx-auto">
        {/* Desktop: project info column */}
        <div className="hidden lg:block">
          <ProjectInfo />
        </div>

        {/* Sign-in */}
        <div className="w-full max-w-md mx-auto lg:mx-0 lg:pt-2">
          <Card>
            <CardHeader>
              <CardTitle>Sign in</CardTitle>
              <CardDescription>
                Free forever. No credit card. No dark patterns.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <Button
                variant="outline"
                className="w-full h-11 font-semibold"
                onClick={() => signIn("github", { callbackUrl: "/" })}
              >
                <Github className="h-4.5 w-4.5 mr-2" /> Continue with GitHub
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Developers: we import your languages, repos and activity to verify skills automatically.
              </p>

              <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">or</span>
                <Separator className="flex-1" />
              </div>

              <form onSubmit={sendMagicLink} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email magic link</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@college.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full h-11 font-semibold" disabled={sendingMagic}>
                  {sendingMagic ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                  Send magic link
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  For designers, PMs and pitching specialists — no GitHub needed.
                </p>
              </form>

              {hasDemo && (
                <>
                  <div className="flex items-center gap-3">
                    <Separator className="flex-1" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">dev</span>
                    <Separator className="flex-1" />
                  </div>
                  <Button variant="ghost" className="w-full border border-dashed" onClick={demoLogin} disabled={demoLoading}>
                    {demoLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <FlaskConical className="h-4 w-4 mr-2" />
                    )}
                    Quick dev sign-in — admin (local only)
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground text-center mt-6 max-w-xs mx-auto text-balance">
            <Zap className="inline h-3 w-3 text-primary" /> By signing in you agree to be a good teammate.
            That&apos;s the whole ToS.
          </p>
        </div>

        {/* Mobile: project info below the card */}
        <div className="lg:hidden border-t pt-8">
          <ProjectInfo />
        </div>
      </div>
    </div>
  );
}
