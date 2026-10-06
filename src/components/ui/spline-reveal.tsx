"use client";

import {
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/* Prefetch the motion engine the moment this module is evaluated (it
   rides in the page chunk, so the download overlaps hydration - the
   spring is ready by the time the first reveal mounts). */
const animePromise = import("animejs");

/**
 * SplineReveal - the app's shared entrance + hover motion.
 * (Name is historical: this has NO Spline/3D dependency - it is pure
 * anime.js spring physics. The app is intentionally 3D-free.)
 *
 * Two coordinated physical systems:
 *
 *  1. ENTRANCE - a damped-spring settle computed by anime.js' real
 *     spring solver (mass / stiffness / damping). The element drops
 *     onto the page with a slight rotation and settles with
 *     natural overshoot - the "soft body lands" feel. No keyframes,
 *     no linear fades. When the animation completes, anime's inline
 *     transform is CLEARED so the stylesheet tilt transform (with its
 *     live CSS variables) takes over - otherwise the leftover inline
 *     transform permanently shadows the pointer tilt.
 *
 *  2. POINTER TILT - a subtle mount: the pane rotates a few degrees
 *     toward the pointer (rAF-throttled CSS-variable writes) and
 *     settles back on leave via one soft spring transition. While the
 *     pointer is over the element the tilt tracks 1:1 with NO
 *     transition - a transition restarted on every pointermove is
 *     what makes a tilt mount read as "twitching". The same mount the
 *     login card uses (FlutedGlass), so the whole app moves as one.
 *
 * The tilt transform lives in the `.spline-tilt` stylesheet class
 * (NOT an inline style - anime.js writes inline transforms during the
 * entrance, which would clobber it). Elements with `tilt <= 0` never
 * get the class, and therefore never open a 3D rendering context -
 * important because 3D contexts inside backdrop-filter elements
 * cause Chrome rendering artifacts.
 *
 * prefers-reduced-motion: both systems off - content renders in
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

  /* 1 - spring entrance (anime.js real spring solver). */
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
      const anim = animate(ref.current, {
        opacity: [0, 1],
        translateY: [drop, 0],
        rotateX: [7, 0], // slight nose-up landing, flattens as it settles
        ease: spring({ mass: 1, stiffness: 78, damping: 11, velocity: 0 }),
        delay,
        transformOrigin: "50% 100%",
      });
      /* Wait for the landing, then clear anime's inline transform so
         the stylesheet's CSS-variable tilt transform takes over. */
      try {
        await anim;
      } catch {
        /* Animation cancelled mid-flight - the reset below is still
           safe: opacity stays, transform returns to the class rule. */
      }
      if (!cancelled && ref.current) {
        ref.current.style.transform = "";
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [delay, drop]);

  /* 2 - pointer tilt mount (rAF-throttled CSS-variable writes; one
     soft spring transition on leave only). */
  useEffect(() => {
    const el = ref.current;
    if (!el || tilt <= 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf: number | null = null;

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      /* Tracking mode: no transition - 1:1 follow, one write/frame. */
      el.classList.add("tilt-tracking");
      el.classList.remove("tilt-settle");

      const { clientX, clientY } = event;
      if (raf !== null) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        raf = null;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
        const y = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
        el.style.setProperty("--tilt-x", `${((0.5 - y) * tilt).toFixed(2)}deg`);
        el.style.setProperty("--tilt-y", `${((x - 0.5) * tilt).toFixed(2)}deg`);
      });
    };

    const onLeave = () => {
      if (raf !== null) {
        cancelAnimationFrame(raf);
        raf = null;
      }
      /* Settle mode: ONE soft spring transition back to rest. */
      el.classList.remove("tilt-tracking");
      el.classList.add("tilt-settle");
      el.style.setProperty("--tilt-x", "0deg");
      el.style.setProperty("--tilt-y", "0deg");
      const onSettled = () => {
        el.classList.remove("tilt-settle");
        el.removeEventListener("transitionend", onSettled);
      };
      el.addEventListener("transitionend", onSettled);
    };

    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerleave", onLeave);
    return () => {
      if (raf !== null) cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [tilt]);

  return (
    <Tag
      ref={ref}
      /* The tilt transform + its classes live in globals.css
         (.spline-tilt / .tilt-tracking / .tilt-settle) - NEVER as an
         inline style: the anime.js entrance writes inline transforms,
         which would clobber it mid-flight. */
      className={cn("spline-reveal", tilt > 0 && "spline-tilt", className)}
      style={style}
    >
      {children}
    </Tag>
  );
}
