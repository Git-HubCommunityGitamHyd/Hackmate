"use client";

import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";

import { PixelCanvas } from "./pixel-canvas";

/**
 * AmbientLayer - the quiet atmosphere of every page EXCEPT the sign-in
 * hero. (The login page has its own living ground: the GrainGradient
 * with its inbuilt film grain and the wide jade pixel wake.)
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
 *   2. INK PIXEL TRAIL - the hero's jade pixel wake, scaled down to a
 *      whisper. NO cursor glow anymore: the halo is gone. Instead the
 *      SAME trail effect and the SAME 11px grid as the hero, but the
 *      wake radius is so small that only about 5 to 6 pixels ever
 *      light around the pointer. Its only job is to demonstrate
 *      translucency: as the handful of jade pixels passes behind a
 *      frosted card, button or chat bubble, the 5px blur smears them
 *      into soft streaks, so those surfaces read as genuinely
 *      see-through. On the bare wall it is nearly invisible. The
 *      canvas loop idles at ZERO frames until the pointer moves.
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

/* Same jade ink palette as the hero wake - the trail is the hero's
   effect, just 5 to 6 pixels wide instead of a field. */
const JADE_PIXELS = ["#13261d", "#1e5240", "#43a984", "#b2f7d8"];

export function AmbientLayer() {
  const pathname = usePathname();

  if (pathname === "/login") return null;

  return (
    <>
      {/* 1 - the film grain echo, a whisper of the hero's texture. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
        style={grainStyle}
      />

      {/* 2 - the tiny jade pixel trail: the hero's wake at whisper
          scale. radius 16 with the 11px grid wakes only the cell under
          the pointer plus its 4 orthogonal neighbors - about 5 to 6
          pixels, same 11 gap as the flutes. */}
      <PixelCanvas
        className="pointer-events-none fixed inset-0 -z-10"
        variant="trail"
        gap={11}
        radius={16}
        speed={0.05}
        maxAlpha={0.7}
        // Module-level constant: stable identity so the canvas effect
        // never tears down and re-initializes on re-renders.
        colors={JADE_PIXELS}
      />
    </>
  );
}

export default AmbientLayer;
