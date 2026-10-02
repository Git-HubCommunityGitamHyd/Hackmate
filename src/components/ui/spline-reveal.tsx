"use client";

import {
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/* Prefetch the motion engine the moment this module is evaluated (it
   rides in the page chunk, so the download overlaps hydration — the
   spring is ready by the time the first reveal mounts). */
const animePromise = import("animejs");

/**
 * SplineReveal — the app's shared entrance + hover motion.
 * (Name is historical: this has NO Spline/3D dependency — it is pure
 * anime.js spring physics. The app is intentionally 3D-free.)
 *
 * Two coordinated physical systems:
 *
 *  1. ENTRANCE — a damped-spring settle computed by anime.js' real
 *     spring solver (mass / stiffness / damping). The element drops
 *     onto the page with a slight rotation and settles with
 *     natural overshoot — the "soft body lands" feel. No keyframes,
 *     no linear fades.
 *
 *  2. POINTER TILT — a subtle mount: the pane rotates a few degrees
 *     toward the pointer (perspective + rotateX/rotateY written as
 *     CSS variables on pointer move) and settles back on leave via
 *     a springy cubic-bezier overshoot. This is the same mount the
 *     login card uses (FlutedGlass), so the whole app moves as one.
 *
 * prefers-reduced-motion: both systems off — content renders in
 * place, zero motion.
 *
 * Stagger: pass `delay` (seconds); a parent can compute
 * `delay={i * 0.06}` down a list for a cascading settle.
 */

export interface SplineRevealProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Seconds to wait before the spring entrance fires. */
  delay?: number;
  /** Max tilt in degrees (both axes). 0 disables the tilt mount. */
  tilt?: number;
  /** Extra distance the entrance drops from (px). */
  drop?: number;
  as?: "div" | "section" | "li" | "article";
}

export function SplineReveal({
  children,
  className,
  style,
  delay = 0,
  tilt = 3.2,
  drop = 26,
  as = "div",
}: SplineRevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const Tag = as as "div";

  /* 1 — spring entrance (anime.js real spring solver). */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.opacity = "1";
      return;
    }

    let cancelled = false;

    (async () => {
      const { animate, spring } = await animePromise;
      if (cancelled || !ref.current) return;
      animate(ref.current, {
        opacity: [0, 1],
        translateY: [drop, 0],
        rotateX: [7, 0], // slight nose-up landing, flattens as it settles
        ease: spring({ mass: 1, stiffness: 78, damping: 11, velocity: 0 }),
        delay,
        transformOrigin: "50% 100%",
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [delay, drop]);

  /* 2 — pointer tilt mount (CSS variables + springy bezier settle).
     Written imperatively so lists of reveals share one code path. */
  useEffect(() => {
    const el = ref.current;
    if (!el || tilt <= 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
      const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
      el.style.setProperty("--tilt-x", `${((0.5 - y) * tilt).toFixed(2)}deg`);
      el.style.setProperty("--tilt-y", `${((x - 0.5) * tilt).toFixed(2)}deg`);
    };
    const onLeave = () => {
      el.style.setProperty("--tilt-x", "0deg");
      el.style.setProperty("--tilt-y", "0deg");
    };

    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [tilt]);

  return (
    <Tag
      ref={ref}
      className={cn("spline-reveal", className)}
      style={{
        ...style,
        transform:
          "perspective(900px) rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg))",
        transformStyle: "preserve-3d",
      }}
    >
      {children}
    </Tag>
  );
}
