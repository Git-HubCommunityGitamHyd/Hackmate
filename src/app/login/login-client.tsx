"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import {
  Github,
  Mail,
  Loader2,
  Zap,
  FlaskConical,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/shared/logo";
import { PixelCanvas } from "@/components/ui/pixel-canvas";
import { KineticTextReveal } from "@/components/ui/kinetic-text-reveal";
import { motion } from "framer-motion";
import { TextRepel } from "@/components/ui/text-repel";
import { cn } from "@/lib/utils";
import { FlutedGlass } from "@/components/ui/fluted-glass";

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

        <div className="relative text-muted-foreground mt-4 max-w-xl leading-relaxed min-h-[8rem] rounded-2xl">
          {/* Enlarged glass/blur background only */}
          <div
            className="pointer-events-none absolute -inset-6 z-0 rounded-3xl bg-[#04120a]/70 backdrop-blur-md"
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

export function LoginClient() {
  const router = useRouter();

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
      <PixelCanvas
        className="fixed inset-0 z-0"
        variant="glow"
        gap={11}
        speed={0.03}
        colors={[
          "#052e12",
          "#0d5c2a",
          "#16a34a",
          "#4ade80",
        ]}
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

        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-14 lg:items-start max-w-6xl mx-auto">
          {/* Desktop: project info column */}
          <div className="hidden lg:block">
            <ProjectInfo />
          </div>

          {/* Sign-in */}
          <div className="w-full max-w-md mx-auto lg:mx-0 lg:pt-2">
            <motion.div
              initial={{
                opacity: 0,
                y: 24,
                filter: "blur(6px)",
              }}
              animate={{
                opacity: 1,
                y: 0,
                filter: "blur(0px)",
              }}
              transition={{
                duration: 0.6,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <FlutedGlass
                maxTilt={8}
                background="#04120a"
                borderRadius={16}
                minHeight={0}
                className="w-full"
              >
                <Card className="border-0 bg-transparent shadow-none">
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
                      onClick={() =>
                        signIn("github", {
                          callbackUrl: "/",
                        })
                      }
                    >
                      <Github className="h-4.5 w-4.5 mr-2" />
                      Continue with GitHub
                    </Button>

                    <p className="text-xs text-muted-foreground text-center">
                      Developers: we import your languages, repos and activity to
                      verify skills automatically.
                    </p>

                    <div className="flex items-center gap-3">
                      <Separator className="flex-1" />

                      <span className="text-xs text-muted-foreground uppercase tracking-wider">
                        or
                      </span>

                      <Separator className="flex-1" />
                    </div>

                    <form
                      onSubmit={sendMagicLink}
                      className="space-y-3"
                    >
                      <div className="space-y-1.5">
                        <Label htmlFor="email">
                          Email magic link
                        </Label>

                        <Input
                          id="email"
                          type="email"
                          placeholder="you@college.edu"
                          value={email}
                          onChange={(e) =>
                            setEmail(e.target.value)
                          }
                        />
                      </div>

                      <Button
                        type="submit"
                        className="w-full h-11 font-semibold"
                        disabled={sendingMagic}
                      >
                        {sendingMagic ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Mail className="h-4 w-4 mr-2" />
                        )}

                        Send magic link
                      </Button>

                      <p className="text-xs text-muted-foreground text-center">
                        For designers, PMs and pitching specialists — no GitHub
                        needed.
                      </p>
                    </form>

                    {hasDemo && (
                      <>
                        <div className="flex items-center gap-3">
                          <Separator className="flex-1" />

                          <span className="text-xs text-muted-foreground uppercase tracking-wider">
                            dev
                          </span>

                          <Separator className="flex-1" />
                        </div>

                        <Button
                          variant="ghost"
                          className="w-full border border-dashed"
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
                      </>
                    )}
                  </CardContent>
                </Card>
              </FlutedGlass>
            </motion.div>

            <p className="text-xs text-muted-foreground text-center mt-2 max-w-xs mx-auto text-balance">
              <motion.span
                initial={{
                  opacity: 0,
                  scale: 0.5,
                  rotate: -20,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  rotate: 0,
                }}
                transition={{
                  duration: 0.5,
                  ease: [0.22, 1, 0.36, 1],
                  delay: 0.1,
                }}
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