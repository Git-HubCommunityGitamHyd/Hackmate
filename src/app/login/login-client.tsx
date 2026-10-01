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
import { PixelCanvas } from "@/components/ui/pixel-canvas";
import { KineticTextReveal } from "@/components/ui/kinetic-text-reveal";
import { TextRepel } from "@/components/ui/text-repel";
import { FlutedGlass } from "@/components/ui/fluted-glass";
import { InkBrush } from "@/components/ui/ink-brush";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

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
            vermilion flourish of the ink-wash page. */}
        <InkBrush className="mt-1 mb-1 -rotate-1" width={220} height={12} />

        <div className="relative text-muted-foreground mt-4 max-w-xl leading-relaxed min-h-[8rem] rounded-2xl">
          {/* Neutral frosted slab behind the copy (pure black ink, no tint —
              the old dark-green slab read as a color error on this page). */}
          <div
            className="pointer-events-none absolute -inset-6 z-0 rounded-3xl bg-black/60 backdrop-blur-md"
            style={{
              maskImage:
                "linear-gradient(to right, transparent, black 10%, black 90%, transparent), linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)",
              maskComposite: "intersect",
              WebkitMaskImage:
                "linear-gradient(to right, transparent, black 10%, black 90%, transparent), linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)",
              WebkitMaskComposite: "source-in",
            }}
          />

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
    <div className="relative pt-10 pb-12 overflow-hidden">
      {/* Ink-wash cursor canvas: pure black ground, grayscale ink pixels
          that brighten toward paper-white under the cursor. The vermilion
          is reserved for edges and accents, never the field. */}
      <PixelCanvas
        className="fixed inset-0 z-0"
        variant="trail"
        gap={11}
        speed={0.03}
        colors={["#131313", "#2a2a2a", "#595959", "#d9d6d1"]}
      />

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
          {/* Desktop: project info column */}
          <div className="hidden lg:flex flex-col justify-center">
            <ProjectInfo />
          </div>

          {/* Sign-in — OPAQUE BLACK card, fluted-glass effect intact.
              Solid #000 surface (no translucency) so the animated pixel
              background frames the card instead of bleeding through it,
              while the FlutedGlass wrapper preserves the 3D pointer tilt,
              vertical fluting and refraction edge the card always had.
              The ink-edge class adds the mouse-reactive vermilion hairline
              on top of the deep shadow. */}
          <div className="w-full max-w-md mx-auto lg:mx-0">
            <motion.div
              initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.6, ease: EASE }}
            >
              <FlutedGlass
                maxTilt={8}
                background="#000000"
                borderRadius={16}
                minHeight={0}
                className="ink-edge w-full"
                style={{
                  boxShadow:
                    "0 24px 70px -24px rgba(0,0,0,0.9), inset 0 1px 0 0 rgba(255,255,255,0.06)",
                }}
              >
              <div
                role="group"
                aria-label="Sign in"
                className="relative w-full text-foreground"
              >
                {/* Paper-white top hairline — quiet light catching the top
                    edge of the opaque black pane. */}
                <div
                  aria-hidden="true"
                  className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
                />

                <div className="p-7 space-y-6">
                  <motion.div {...(reduceMotion ? {} : stagger(0))}>
                    <h2 className="text-xl font-bold tracking-tight text-white">
                      Sign in
                    </h2>
                    <p className="text-sm text-neutral-400 mt-1">
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
                        className="w-full h-11 font-semibold bg-neutral-900 border-white/30 hover:border-white/50 hover:bg-neutral-800 text-white transition-all"
                        onClick={() =>
                          signIn("github", {
                            callbackUrl: "/",
                          })
                        }
                      >
                        <Github className="h-4.5 w-4.5 mr-2" />
                        Continue with GitHub
                      </Button>

                      <p className="text-[11px] text-neutral-500 text-center mt-2 leading-relaxed">
                        Developers: we import your languages, repos and
                        activity to verify skills automatically.
                      </p>
                    </motion.div>

                    <motion.div
                      className="flex items-center gap-3"
                      {...(reduceMotion ? {} : stagger(2))}
                    >
                      <Separator className="flex-1 bg-white/10" />
                      <span className="text-xs text-neutral-400 uppercase tracking-wider">
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
                        <Label htmlFor="email" className="text-neutral-300">
                          Email magic link
                        </Label>

                        <Input
                          id="email"
                          type="email"
                          placeholder="you@college.edu"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="h-11 bg-neutral-950 border-white/15 text-white placeholder:text-neutral-600 focus-visible:ring-primary/50 focus-visible:border-primary/60 transition-colors"
                        />
                      </div>

                      <Button
                        type="submit"
                        className="w-full h-11 font-semibold btn-harsh transition-transform active:scale-[0.98]"
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
                      <p className="text-[11px] text-neutral-500 text-center leading-relaxed mt-1">
                        <span className="inline-flex items-center gap-1 text-neutral-400">
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
                          <span className="text-xs text-neutral-400 uppercase tracking-wider">
                            dev
                          </span>
                          <Separator className="flex-1 bg-white/10" />
                        </div>

                        <Button
                          variant="ghost"
                          className="w-full border border-dashed border-white/15 hover:border-white/25 hover:bg-neutral-950 text-neutral-300"
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
            </motion.div>

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

          {/* Mobile: project info below the card */}
          <div className="lg:hidden border-t pt-8">
            <ProjectInfo />
          </div>
        </div>
      </div>
    </div>
  );
}
