"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";

/**
 * AmbientLayer - the quiet atmosphere of every page EXCEPT the sign-in
 * hero. (The login page has its own living ground: the GrainGradient
 * with its inbuilt film grain and the jade pixel wake.)
 *
 * Two layers, both fixed at NEGATIVE z (above the fluted wall painted
 * on <body>, below all page content) and both pointer-events-none:
 *
 *   1. FILM GRAIN - a whisper of the login hero's film grain, laid
 *      over the wall at VERY low opacity (0.045, overlay blend): a
 *      barely-there camera texture, never a visible noise layer. The
 *      login page's grain is the GrainGradient's inbuilt shader grain;
 *      this is its faint echo on the plain-wall pages.
 *
 *   2. SOFT CURSOR GLOW - a faint jade halo that follows the pointer
 *      (rAF-lerped, so it drifts instead of snapping). Its ONLY job
 *      is to demonstrate translucency: as it passes behind a frosted
 *      card, button or chat bubble, the 10px blur smears it into a
 *      soft streak, so those surfaces read as genuinely see-through.
 *      On the bare wall it is nearly invisible. Fine-pointer devices
 *      only; reduced-motion users get an instant snap-follow.
 */

/* Monochrome fractal noise tile (SVG data URI): the grain texture.
   img-src already allows data: in the CSP. */
const GRAIN_URL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E";

const grainStyle: CSSProperties = {
  backgroundImage: `url("${GRAIN_URL}")`,
  backgroundSize: "160px 160px",
  opacity: 0.045,
  mixBlendMode: "overlay",
};

/* The halo: a wide soft jade radial that sits at the pointer. Written
   as CSS variables so the rAF loop only touches --glow-x/--glow-y. */
const glowStyle: CSSProperties = {
  background:
    "radial-gradient(26rem circle at var(--glow-x, 50vw) var(--glow-y, 40vh), oklch(0.78 0.13 158 / 0.13), transparent 65%)",
  opacity: 0,
  transition: "opacity 0.8s ease",
};

export function AmbientLayer() {
  const pathname = usePathname();
  const glowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (pathname === "/login") return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      return;
    }

    const el = glowRef.current;
    if (!el) return;

    const reduceMotion = window
      .matchMedia("(prefers-reduced-motion: reduce)")
      .matches;

    let targetX = -1;
    let targetY = -1;
    let x = 0;
    let y = 0;
    let raf = 0;

    const write = () => {
      el.style.setProperty("--glow-x", `${x.toFixed(1)}px`);
      el.style.setProperty("--glow-y", `${y.toFixed(1)}px`);
    };

    const tick = () => {
      if (targetX < 0) {
        raf = 0;
        return;
      }
      if (reduceMotion) {
        x = targetX;
        y = targetY;
        write();
        raf = 0;
        return;
      }
      x += (targetX - x) * 0.14;
      y += (targetY - y) * 0.14;
      write();
      /* Keep drifting only while the halo is still catching up. */
      if (Math.abs(targetX - x) + Math.abs(targetY - y) > 0.5) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = 0;
      }
    };

    const onMove = (event: PointerEvent) => {
      targetX = event.clientX;
      targetY = event.clientY;
      if (el.style.opacity !== "1") el.style.opacity = "1";
      if (raf === 0) raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf !== 0) cancelAnimationFrame(raf);
    };
  }, [pathname]);

  if (pathname === "/login") return null;

  return (
    <>
      {/* 1 - the film grain echo, a whisper of the hero's texture. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
        style={grainStyle}
      />

      {/* 2 - the soft cursor glow, drifting under the frosted
          surfaces to reveal their translucency. */}
      <div
        ref={glowRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
        style={glowStyle}
      />
    </>
  );
}

export default AmbientLayer;
