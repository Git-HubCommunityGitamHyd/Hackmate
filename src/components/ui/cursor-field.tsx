"use client";

import { PixelCanvas } from "./pixel-canvas";

/**
 * CursorField — the login page's own cursor effect. LOGIN ONLY.
 *
 * A field of JADE ink pixels (no black-and-white: the wake glows in
 * the app's jade-green palette) that light up and brighten toward
 * mint as the pointer sweeps over them, then sink back into the
 * dark. It sits BELOW the page content (negative z) and ABOVE the
 * login backdrop, so the frosted sign-in pane blurs the colored wake
 * as it passes beneath it.
 *
 * Inert for touch devices (no hover, no wake) and under
 * prefers-reduced-motion the field simply stays asleep.
 */
const JADE_PIXELS = ["#13261d", "#1e5240", "#43a984", "#b2f7d8"];

export function CursorField() {
  return (
    <PixelCanvas
      className="pointer-events-none fixed inset-0 -z-10"
      variant="trail"
      gap={11}
      speed={0.03}
      // Module-level constant: stable identity so the canvas effect
      // never tears down and re-initializes on re-renders.
      colors={JADE_PIXELS}
    />
  );
}
