"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * RayLight — noiseless 2D ray-traced cursor lighting.
 *
 * A matte-black field lit by one invisible studio light that tracks the
 * pointer. The light is painted entirely with smooth radial gradients
 * (see `.ray-light` in globals.css): a tight specular term where the
 * "bulb" is, a wide ambient bounce around it, and a whisper of jade
 * edge-light echoing the ink-edge rims the cards carry. No canvas, no
 * pixels, no grain — the noiseless half of the brief.
 *
 * The source lerps toward the pointer every frame, so it glides after
 * the cursor like a lamp on a moveable arm instead of snapping to it.
 *
 * This replaces the old pixel-trail canvas on the login page: same role
 * (a living black ground behind the frosted card), zero noise.
 *
 * prefers-reduced-motion: the light parks at a fixed editorial position
 * and never chases the pointer.
 */
export function RayLight({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    /* Static studio light for reduced motion — upper right, the same
       place the page's ambient bloom lives. */
    el.style.setProperty("--ray-x", "62vw");
    el.style.setProperty("--ray-y", "30vh");
    if (reduced) return;

    let targetX = window.innerWidth * 0.62;
    let targetY = window.innerHeight * 0.3;
    let x = targetX;
    let y = targetY;
    let raf = 0;
    let running = true;

    const onMove = (event: PointerEvent) => {
      /* Touch input never moves the light — on phones the field simply
         stays in its resting editorial position. */
      if (event.pointerType === "touch") return;
      targetX = event.clientX;
      targetY = event.clientY;
    };

    const tick = () => {
      if (!running || !ref.current) return;
      /* Critically-damped-ish glide: fast when far away, feathering
         to a stop as it catches up. 0.085/frame at 60fps ≈ 200ms of
         visible lag — enough to read as physical, not sluggish. */
      x += (targetX - x) * 0.085;
      y += (targetY - y) * 0.085;
      el.style.setProperty("--ray-x", `${x.toFixed(1)}px`);
      el.style.setProperty("--ray-y", `${y.toFixed(1)}px`);
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn("ray-light pointer-events-none", className)}
    />
  );
}
