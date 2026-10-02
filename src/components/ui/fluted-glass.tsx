"use client";

import {
  CSSProperties,
  ReactNode,
  useRef,
} from "react";
import styles from "./fluted-glass.module.css";

interface FlutedGlassProps {
  children: ReactNode;
  maxTilt?: number;
  background?: string;
  borderRadius?: number;
  minHeight?: number;
  blur?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * FlutedGlass — a pane of TRANSLUCENT FROSTED GLASS, debossed into the
 * page.
 *
 * The 10px backdrop blur is applied DIRECTLY on the pane itself (the
 * exact same pattern as every [data-slot="card"] in the app), so
 * whatever moves behind it — the breathing gradient, the swiveling
 * ribs, the jade cursor wake — smears through as soft streaks. This
 * direct-application pattern is the one that reliably renders in every
 * browser; layering the blur on an inner element mutes the frost.
 *
 * The pane carries a subtle vertical fluting (the ribbing the frost
 * smears) and tilts a few degrees toward the pointer on a soft spring,
 * settling back on leave. NO noise layers, NO SVG refraction filters —
 * the blur and the ribs ARE the frost.
 */
export function FlutedGlass({
  children,
  maxTilt = 8,
  background = "rgba(255, 255, 255, 0.035)",
  borderRadius = 16,
  minHeight = 0,
  blur = 10,
  className = "",
  style,
}: FlutedGlassProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  const reset = () => {
    const element = ref.current;

    if (!element) return;

    element.style.setProperty("--tilt-x", "0deg");
    element.style.setProperty("--tilt-y", "0deg");
  };

  return (
    <div
      ref={ref}
      className={`${styles.root} ${className}`}
      style={{
        background,
        borderRadius,
        minHeight,
        /* THE FROST — 10px backdrop blur written as an INLINE style on
           purpose: the production CSS minifier mangles
           `backdrop-filter: blur(var(--glass-blur, ...))` into an
           invalid declaration, so the blur MUST NOT live in the
           stylesheet. Inline styles bypass the minifier and render in
           every browser (this is the same pattern that reliably
           frosted before). */
        backdropFilter: `blur(${blur}px) saturate(120%)`,
        WebkitBackdropFilter: `blur(${blur}px) saturate(120%)`,
        ...style,
      } as CSSProperties}
      onPointerMove={(event) => {
        if (
          event.pointerType === "touch" ||
          window.matchMedia(
            "(prefers-reduced-motion: reduce)"
          ).matches
        ) {
          return;
        }

        const element = event.currentTarget;
        const rect = element.getBoundingClientRect();

        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;

        element.style.setProperty(
          "--tilt-x",
          `${(0.5 - y) * maxTilt}deg`
        );

        element.style.setProperty(
          "--tilt-y",
          `${(x - 0.5) * maxTilt}deg`
        );
      }}
      onPointerLeave={reset}
    >
      {/* Very subtle flute structure — ribbing the frost smears */}
      <div className={styles.flutes} />

      {/* Content */}
      <div className={styles.content}>
        {children}
      </div>
    </div>
  );
}

export default FlutedGlass;
