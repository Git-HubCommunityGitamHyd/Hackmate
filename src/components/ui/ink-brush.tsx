"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * InkBrush - an animated ink-wash brush stroke (anime.js).
 *
 * A single calligraphy-like path is drawn on mount by animating
 * stroke-dashoffset from full length to 0, the way a loaded brush
 * crosses paper: fast in the middle, feathering at both ends. A faint
 * wider underlay stroke fades in behind it for the wet-ink bleed.
 *
 * Reduced-motion users get the finished stroke immediately.
 */
export function InkBrush({
  className,
  width = 240,
  height = 14,
  stroke = "var(--primary)",
}: {
  className?: string;
  width?: number;
  height?: number;
  stroke?: string;
}) {
  const mainRef = useRef<SVGPathElement>(null);
  const bleedRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const main = mainRef.current;
    const bleed = bleedRef.current;
    if (!main || !bleed) return;

    const length = main.getTotalLength();
    main.style.strokeDasharray = `${length}`;
    main.style.strokeDashoffset = `${length}`;
    bleed.style.opacity = "0";

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      main.style.strokeDashoffset = "0";
      bleed.style.opacity = "0.5";
      return;
    }

    let cancelled = false;

    (async () => {
      const { animate } = await import("animejs");
      if (cancelled || !mainRef.current || !bleedRef.current) return;
      /* The stroke sweeps left-to-right; the wet-ink bleed fades up under
         it slightly later, like water soaking into paper. */
      animate(mainRef.current, {
        strokeDashoffset: [length, 0],
        duration: 1200,
        ease: "inOut(2)",
      });
      animate(bleedRef.current, {
        opacity: [0, 0.5],
        duration: 1400,
        ease: "out(2)",
      });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <svg
      viewBox="0 0 240 14"
      width={width}
      height={height}
      fill="none"
      aria-hidden="true"
      className={cn("block", className)}
    >
      {/* wet-ink bleed underlay */}
      <path
        ref={bleedRef}
        d="M4 8 C 60 2, 120 12, 236 6"
        stroke={stroke}
        strokeOpacity={0.28}
        strokeWidth={5}
        strokeLinecap="round"
        style={{ filter: "blur(2.5px)" }}
      />
      {/* the stroke itself */}
      <path
        ref={mainRef}
        d="M4 8 C 60 2, 120 12, 236 6"
        stroke={stroke}
        strokeOpacity={0.9}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </svg>
  );
}
