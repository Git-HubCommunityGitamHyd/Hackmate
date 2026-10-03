"use client";

import { useState, useEffect } from "react";
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
 * LoginBackdrop - the sign-in page's FULL-PAGE living ground.
 *
 * NOT confined behind the text: the breathing jade GrainGradient
 * (WebGL, its INBUILT film grain left ON at the default 0.32 - that
 * grain is part of the component's look) fills the entire login page,
 * FLIPPED - mirrored horizontally AND vertically (scale(-1, -1), the
 * 180° turn) so the gradient's breathing sweep and brightest corner
 * run opposite to the component's default - and is BLENDED into the
 * black ribbed wall two ways:
 *
 *   1. the wall's own flutes are re-drawn OVER the gradient, so the
 *      ribs continue through it - one continuous ribbed ground;
 *   2. an ink vignette melts the edges (and the area under the
 *      floating navbar dock) back into the page's near-black, so the
 *      gradient never reads as a pasted rectangle.
 *
 * The colored jade cursor wake (CursorField) sits above this backdrop
 * and below the content. NO 3D objects, NO magnet-lines - the page's
 * motion is the breathing gradient and the cursor wake.
 */
function LoginBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* 1 - the breathing jade gradient: the whole page's ground.
          FLIPPED horizontally + vertically (the 180° turn) via an
          outer CSS transform - the component itself stays VERBATIM.
          The INBUILT film grain stays ON (default 0.32): it is the
          texture of the gradient itself, not a bolted-on noise layer.
          Never disable it. */}
      <GrainGradient
        className="absolute inset-0"
        style={{ transform: "scale(-1, -1)" }}
        colorLight="#8ecdb6"
        colorMid="#2c5a4b"
        colorDark="#0d100e"
        angle={0}
        curve={0.48}
        softness={0.16}
        speed={1}
      />

      {/* 2 - the wall's flutes, re-drawn OVER the gradient (fainter
          than the body wall): the ribbed background continues through
          it (the blend), kept subtle so the gradient breathes. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "repeating-linear-gradient(90deg, oklch(1 0 0 / 0.02) 0px, oklch(1 0 0 / 0.02) 1px, transparent 1px, transparent 11px)",
        }}
      />

      {/* 3 - ink vignette: the gradient melts into the page's black at
          the edges and under the floating dock. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(125% 95% at 50% 40%, transparent 42%, oklch(0.11 0.004 90 / 0.88) 100%), linear-gradient(180deg, oklch(0.11 0.004 90 / 0.92) 0%, transparent 22%)",
        }}
      />
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

        {/* Ink brush stroke - animated with anime.js on mount. The single
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
      {/* The FULL-PAGE living ground - the breathing jade gradient
          (inbuilt grain ON, flipped 180°) blended into the black
          ribbed wall. Covers the entire login page, not just the
          hero. */}
      <LoginBackdrop />

      {/* The jade pixel wake - the sign-in hero page's own cursor
          effect. COLORED (jade, not black-and-white) pixels that wake
          and brighten under the pointer, then sink back. ONLY this
          page carries it; every other page runs on the plain fluted
          wall. It sits above the backdrop (DOM order) and below the
          content, and the frosted sign-in pane blurs it as it passes
          beneath. */}
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
          {/* Desktop: the hero - animated copy on the full-page living
              ground. No 3D object: the breathing gradient and the
              text's own reveal motion carry the page. */}
          <div className="hidden lg:flex flex-col justify-center">
            <ProjectInfo />
          </div>

          {/* Sign-in - a pane of TRANSLUCENT FROSTED GLASS, debossed
              deep into the wall. 10px blur applied DIRECTLY on the pane
              (same pattern as every card in the app), so the gradient's
              glow and the cursor's jade wake smear through it as soft
              streaks (the frost read). The pane's ground is CLEAN frost
              with no lines; the page behind it keeps the fluting. The
              pointer tilt settles on a soft spring, and the whole card
              lands on the page via the shared anime.js damped-spring
              entrance. Radius is the one shared radius. */}
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

                      {/* LinkedIn copy - non-developer track. */}
                      <p className="text-[11px] text-muted-foreground text-center leading-relaxed mt-1">
                        <span className="inline-flex items-center gap-1 text-foreground/90">
                          <Linkedin className="h-3 w-3" /> LinkedIn-ready
                        </span>
                        <br />
                        For designers, PMs and pitching specialists; no
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

                          Quick dev sign-in · admin (local only)
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

          {/* Mobile: the hero below the card - the same animated copy
              on the living ground. */}
          <div className="lg:hidden">
            <ProjectInfo />
          </div>
        </div>
      </div>
    </div>
  );
}
