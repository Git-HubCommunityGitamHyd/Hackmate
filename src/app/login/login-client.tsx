"use client";

import { useState, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { motion, useReducedMotion } from "framer-motion";
import {
  Github,
  Linkedin,
  Mail,
  Loader2,
  Zap,
  FlaskConical,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/shared/logo";
import { KineticTextReveal } from "@/components/ui/kinetic-text-reveal";
import { TextRepel } from "@/components/ui/text-repel";
import { FlutedGlass } from "@/components/ui/fluted-glass";
import { SplineReveal } from "@/components/ui/spline-reveal";
import { InkBrush } from "@/components/ui/ink-brush";
import { CursorField } from "@/components/ui/cursor-field";
import { GrainGradient } from "@/components/ui/grain-gradient";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * HeroPanel — the hero section's living ground.
 *
 * A hard-surface recess stamped into the fluted wall, and at its
 * floor the breathing jade GrainGradient (WebGL): soft ink tones
 * rolling through a slow two-wave cycle, fine grain baked into the
 * shader. A scrim keeps the copy's side deep ink so the type stays
 * first; the glow breathes against the sign-in pane. The recess is
 * closed with the same machined deboss lip every surface wears.
 */
function HeroPanel({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative overflow-hidden rounded-[var(--radius)]"
      style={{ border: "1px solid oklch(1 0 0 / 0.08)" }}
    >
      {/* The breathing jade grain gradient — the hero's ground */}
      <GrainGradient
        className="absolute inset-0"
        colorLight="#8ecdb6"
        colorMid="#2c5a4b"
        colorDark="#0b1310"
        angle={0}
        curve={0.48}
        softness={0.13}
        grain={0.3}
        speed={1}
      />
      {/* Ink scrim on the copy side — the type stays first, the glow
          breathes on the right, toward the sign-in pane. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(100deg, oklch(0.09 0.008 120 / 0.78) 0%, oklch(0.09 0.008 120 / 0.45) 42%, transparent 72%)",
        }}
      />
      {/* Hard-surface deboss lip, pressed OVER the gradient so the
          recess reads on top of the living ground. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ boxShadow: "var(--deboss-2)" }}
      />
      <div className="relative flex min-h-[560px] flex-col justify-center p-8 lg:p-10">
        {children}
      </div>
    </div>
  );
}

function ProjectInfo() {
  const [descriptionRevealed, setDescriptionRevealed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDescriptionRevealed(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-muted-foreground mt-4 max-w-xl leading-relaxed">
          <KineticTextReveal
            text="Hackathon team finder"
            splitBy="words"
            distance={8}
            stagger={0.015}
            blur={false}
          />
        </p>

        <h2 className="relative text-4xl sm:text-5xl font-extrabold tracking-tight text-left min-h-[6rem] sm:min-h-[7rem]">
          <TextRepel
            text="Find your people."
            radius={150}
            strength={30}
            animateIn
            staggerDelay={0.025}
          />{" "}
          <TextRepel
            text="Win your hackathon."
            radius={150}
            strength={30}
            letterClassName="text-primary"
            animateIn
            staggerDelay={0.025}
          />
        </h2>

        {/* Ink brush stroke — animated with anime.js on mount. The single
            jade flourish of the ink-wash page. */}
        <InkBrush className="mt-1 mb-1 -rotate-1" width={220} height={12} />

        <div className="relative text-muted-foreground mt-4 max-w-xl leading-relaxed min-h-[8rem]">
          {/* Entrance animation */}
          <span
            className={descriptionRevealed ? "invisible" : "visible"}
          >
            <KineticTextReveal
              text="HackMate is where students find hackathon teammates. Build a profile with your skills, roles, availability and commitment, browse hackathons posted by organizers, and form teams around ideas. Teams get a workspace with realtime chat and a submission checklist, and the whole thing runs on free tiers."
              splitBy="words"
              distance={8}
              stagger={0.015}
              blur={false}
            />
          </span>

          {/* Interactive text */}
          <span
            className={cn(
              "absolute inset-0",
              descriptionRevealed ? "visible" : "invisible"
            )}
          >
            {descriptionRevealed && (
              <TextRepel
                text="HackMate is where students find hackathon teammates. Build a profile with your skills, roles, availability and commitment, browse hackathons posted by organizers, and form teams around ideas. Teams get a workspace with realtime chat and a submission checklist, and the whole thing runs on free tiers."
                radius={100}
                strength={35}
                splitBy="words"
                className="flex w-full flex-wrap leading-relaxed tracking-normal font-normal text-muted-foreground"
              />
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

/* Stagger presets for the sign-in card contents. */
const stagger = (i: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: EASE, delay: 0.25 + i * 0.07 },
});

export function LoginClient() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  const [email, setEmail] = useState("");
  const [sendingMagic, setSendingMagic] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const hasDemo =
    process.env.NEXT_PUBLIC_ALLOW_DEMO_LOGIN === "true";

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();

    if (!email.includes("@")) {
      toast.error("Enter a valid email");
      return;
    }

    setSendingMagic(true);

    const result = await signIn("resend", {
      email,
      redirect: false,
    });

    setSendingMagic(false);

    if (result?.error) {
      toast.error(
        "Couldn't send the magic link. Is RESEND_API_KEY configured?"
      );
    } else {
      router.push("/verify-request");
    }
  }

  async function demoLogin() {
    setDemoLoading(true);

    try {
      const res = await fetch("/api/auth/demo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        throw new Error(
          (await res.json()).error ?? "Dev sign-in failed"
        );
      }

      const data = await res.json();

      toast.success(
        `Signed in as ${data.email ?? "dev account"} (admin)`
      );

      window.location.assign("/");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDemoLoading(false);
    }
  }

  return (
    <div className="relative pt-10 pb-12">
      {/* The pixel wake — the sign-in hero page's own cursor effect.
          Grayscale ink pixels that wake and brighten under the
          pointer, then sink back. ONLY this page carries it; every
          other page runs on the plain fluted wall. It sits below the
          content (negative z) and above the wall, and the frosted
          sign-in pane blurs it as it passes beneath. */}
      <CursorField />

      <div className="relative z-10">
        {/* Mobile: brand + sign-in first */}
        <div className="lg:hidden mb-8 text-center">
          <div className="inline-flex items-center gap-3 mb-3">
            <Logo className="h-11 w-11" />
            <span className="text-2xl font-extrabold tracking-tight">
              HackMate
            </span>
          </div>

          <p className="text-muted-foreground text-sm text-balance">
            One account for developers and designers, pitchers and PMs.
          </p>
        </div>

        {/* The sign-in card column and the hero copy column center
            against each other, so the text sits at the vertical middle of
            the card's side. */}
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-14 lg:items-center max-w-6xl mx-auto">
          {/* Desktop: the hero — copy set into the breathing jade
              grain-gradient recess */}
          <div className="hidden lg:flex flex-col justify-center">
            <HeroPanel>
              <ProjectInfo />
            </HeroPanel>
          </div>

          {/* Sign-in — a pane of ROUGH FROSTED GLASS, debossed into
              the wall. 10px blur: the wall's fluted lines and the
              cursor's ink wake smear through as soft streaks — the
              frost read. The pane carries the fluting, the refraction
              map and the sandblast grain; the pointer tilt settles on
              a soft spring; and the whole card lands on the page via
              the shared anime.js damped-spring entrance. Radius is
              the one shared radius. */}
          <div className="w-full max-w-md mx-auto lg:mx-0">
            <SplineReveal drop={30} tilt={0} className="w-full">
              <FlutedGlass
                maxTilt={7}
                background="rgba(14, 16, 15, 0.45)"
                borderRadius={16}
                minHeight={0}
                blur={10}
                className="w-full"
              >
              <div
                role="group"
                aria-label="Sign in"
                className="relative w-full text-foreground"
              >
                <div className="p-7 space-y-6">
                  <motion.div {...(reduceMotion ? {} : stagger(0))}>
                    <h2 className="text-xl font-bold tracking-tight text-foreground">
                      Sign in
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Free forever. No credit card. No dark patterns.
                    </p>
                  </motion.div>

                  <motion.div
                    className="space-y-5"
                    {...(reduceMotion ? {} : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.5, delay: 0.25 } })}
                  >
                    <motion.div {...(reduceMotion ? {} : stagger(1))}>
                      <Button
                        variant="outline"
                        className="w-full h-11 font-semibold text-foreground transition-all"
                        onClick={() =>
                          signIn("github", {
                            callbackUrl: "/",
                          })
                        }
                      >
                        <Github className="h-4.5 w-4.5 mr-2" />
                        Continue with GitHub
                      </Button>

                      <p className="text-[11px] text-muted-foreground text-center mt-2 leading-relaxed">
                        Developers: we import your languages, repos and
                        activity to verify skills automatically.
                      </p>
                    </motion.div>

                    <motion.div
                      className="flex items-center gap-3"
                      {...(reduceMotion ? {} : stagger(2))}
                    >
                      <Separator className="flex-1 bg-white/10" />
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">
                        or
                      </span>
                      <Separator className="flex-1 bg-white/10" />
                    </motion.div>

                    <motion.form
                      onSubmit={sendMagicLink}
                      className="space-y-3"
                      {...(reduceMotion ? {} : stagger(3))}
                    >
                      <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-foreground/90">
                          Email magic link
                        </Label>

                        <Input
                          id="email"
                          type="email"
                          placeholder="you@college.edu"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="h-11 transition-colors"
                        />
                      </div>

                      <Button
                        type="submit"
                        className="w-full h-11 font-semibold transition-transform active:scale-[0.98]"
                        disabled={sendingMagic}
                      >
                        {sendingMagic ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Mail className="h-4 w-4 mr-2" />
                        )}

                        Send magic link
                      </Button>

                      {/* LinkedIn copy — non-developer track. */}
                      <p className="text-[11px] text-muted-foreground text-center leading-relaxed mt-1">
                        <span className="inline-flex items-center gap-1 text-foreground/90">
                          <Linkedin className="h-3 w-3" /> LinkedIn-ready
                        </span>
                        <br />
                        For designers, PMs and pitching specialists — no
                        GitHub needed. After you sign in, paste your LinkedIn
                        profile URL once and we fill your headline, experience
                        and education for you.
                      </p>
                    </motion.form>

                    {hasDemo && (
                      <motion.div
                        className="space-y-3"
                        {...(reduceMotion ? {} : stagger(4))}
                      >
                        <div className="flex items-center gap-3">
                          <Separator className="flex-1 bg-white/10" />
                          <span className="text-xs text-muted-foreground uppercase tracking-wider">
                            dev
                          </span>
                          <Separator className="flex-1 bg-white/10" />
                        </div>

                        <Button
                          variant="ghost"
                          className="w-full border border-dashed border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
                          onClick={demoLogin}
                          disabled={demoLoading}
                        >
                          {demoLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <FlaskConical className="h-4 w-4 mr-2" />
                          )}

                          Quick dev sign-in — admin (local only)
                        </Button>
                      </motion.div>
                    )}
                  </motion.div>
                </div>
              </div>
              </FlutedGlass>
            </SplineReveal>

            <p className="text-xs text-muted-foreground text-center mt-2 max-w-xs mx-auto text-balance">
              <motion.span
                initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
                className="inline-flex"
              >
                <Zap className="h-3 w-3 text-primary" />
              </motion.span>

              <br />

              <KineticTextReveal
                text="By signing in you agree to be a good teammate.           That&apos;s the whole ToS."
                splitBy="words"
                distance={8}
                stagger={0.015}
                blur={false}
              />
            </p>
          </div>

          {/* Mobile: the hero below the card, same grain-gradient recess */}
          <div className="lg:hidden">
            <HeroPanel>
              <ProjectInfo />
            </HeroPanel>
          </div>
        </div>
      </div>
    </div>
  );
}
