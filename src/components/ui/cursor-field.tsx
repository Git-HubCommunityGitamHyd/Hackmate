"use client";

import { PixelCanvas } from "./pixel-canvas";

/**
 * CursorField — the ink cursor effect, global.
 *
 * A pure-black field of grayscale ink pixels that wake and brighten
 * toward paper-white as the pointer sweeps over them, then sink back
 * into the dark. This is the app's one cursor effect: matte ink, no
 * light, no color, no glow. It sits BELOW every page (negative
 * z-index) and above the radiance-cascades canvas, so on every page
 * the pointer leaves the same ink wake — and the frosted panes blur
 * it as it passes beneath them.
 *
 * Inert for touch devices (no hover, no wake) and under
 * prefers-reduced-motion the field simply stays asleep.
 */
const INK_PIXELS = ["#131313", "#2a2a2a", "#595959", "#d9d6d1"];

export function CursorField() {
  return (
    <PixelCanvas
      className="pointer-events-none fixed inset-0 -z-10"
      variant="trail"
      gap={11}
      speed={0.03}
      // Module-level constant: stable identity so the canvas effect
      // never tears down and re-initializes on re-renders.
      colors={INK_PIXELS}
    />
  );
}
