"use client";

import { useEffect, type ReactNode } from "react";

/**
 * InkEdgeProvider — one global pointer listener that feeds the ink-edge
 * CSS rings (`--ink-mx` / `--ink-my`, see globals.css).
 *
 * Instead of every card adding its own listener, a single delegated
 * pointermove writes the cursor position (as a % string) on the nearest
 * ink surface under the pointer. rAF-throttled, passive, and inert on
 * touch devices (no hover = no ring, the CSS already gates on :hover).
 *
 * Surfaces opted in: [data-slot="card"], .fluted-panel, .liquid-glass,
 * .ink-edge. Adding a new surface is a CSS class, not new JS.
 */
const SURFACE_SELECTOR = [
  "[data-slot='card']",
  ".fluted-panel",
  ".liquid-glass",
  ".ink-edge",
].join(", ");

export function InkEdgeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    /* No (hover: none) gate here: headless browsers and touch+mouse hybrids
       report hover:none while a real mouse still fires pointermove. Touch
       input is already filtered by the pointerType check below, and the CSS
       only reveals the ring on :hover, which pure touch never sustains. */
    let ticking = false;
    const onPointerMove = (event: PointerEvent) => {
      if (ticking || event.pointerType === "touch") return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const target = (event.target as Element | null)?.closest?.(
          SURFACE_SELECTOR,
        ) as HTMLElement | null;
        if (!target) return;
        const rect = target.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        target.style.setProperty(
          "--ink-mx",
          `${(((event.clientX - rect.left) / rect.width) * 100).toFixed(1)}%`,
        );
        target.style.setProperty(
          "--ink-my",
          `${(((event.clientY - rect.top) / rect.height) * 100).toFixed(1)}%`,
        );
      });
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, []);

  return <>{children}</>;
}
