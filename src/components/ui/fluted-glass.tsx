"use client";

import {
  CSSProperties,
  ReactNode,
  useEffect,
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
 * FlutedGlass - a pane of TRANSLUCENT FROSTED GLASS, debossed DEEP
 * into the page.
 *
 * The 5px backdrop blur is applied DIRECTLY on the pane itself (the
 * exact same pattern as every [data-slot="card"] in the app), so
 * whatever moves behind it (the breathing gradient, the jade cursor
 * wake) smears through as soft streaks. This direct-application
 * pattern is the one that reliably renders in every browser; layering
 * the blur on an inner element mutes the frost.
 *
 * The pane's own ground is CLEAN frost: no ribbing, no lines inside
 * the card. Only the page behind it carries the fluted lines.
 *
 * POINTER TILT - twitch-free by construction:
 *   - while the pointer is over the pane, the tilt tracks it 1:1
 *     (rAF-throttled writes, transition DISABLED, no rubber-banding,
 *     no overshoot jitter on every mousemove);
 *   - on pointer leave, the `.settle` class re-enables one soft spring
 *     transition back to rest.
 * The subtree is FLAT (no preserve-3d / translateZ), because 3D
 * contexts inside a backdrop-filter element cause Chrome rendering
 * artifacts. NO noise layers, NO SVG refraction filters: the blur IS
 * the frost.
 */
export function FlutedGlass({
  children,
  maxTilt = 8,
  background = "rgba(255, 255, 255, 0.035)",
  borderRadius = 16,
  minHeight = 0,
  blur = 5,
  className = "",
  style,
}: FlutedGlassProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  /* Clean up any pending rAF write on unmount. */
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const setTilt = (x: number, y: number) => {
    const element = ref.current;
    if (!element) return;
    element.style.setProperty("--tilt-x", `${x.toFixed(2)}deg`);
    element.style.setProperty("--tilt-y", `${y.toFixed(2)}deg`);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (
      event.pointerType === "touch" ||
      maxTilt <= 0 ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const element = event.currentTarget;
    /* Tracking mode: no transition - the pane follows the pointer
       exactly, one write per frame. (Also clears any leftover settle
       from a previous leave.) */
    element.classList.remove(styles.settle);
    element.classList.add(styles.tracking);

    const { clientX, clientY } = event;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const x = (clientX - rect.left) / rect.width;
      const y = (clientY - rect.top) / rect.height;
      setTilt((0.5 - y) * maxTilt, (x - 0.5) * maxTilt);
    });
  };

  const handlePointerLeave = () => {
    const element = ref.current;
    if (!element) return;

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    /* Settle mode: drop tracking (re-enables the soft spring
       transition), then reset - ONE smooth ease back to rest. The
       settle class is removed once the transition lands so tracking
       mode is always clean on the next hover. */
    element.classList.remove(styles.tracking);
    element.classList.add(styles.settle);
    const onSettled = (e: TransitionEvent) => {
      if (e.propertyName === "transform") {
        element.classList.remove(styles.settle);
        element.removeEventListener("transitionend", onSettled);
      }
    };
    element.addEventListener("transitionend", onSettled);
    setTilt(0, 0);
  };

  return (
    <div
      ref={ref}
      className={`${styles.root} ${className}`}
      style={{
        background,
        borderRadius,
        minHeight,
        /* THE FROST - 5px backdrop blur written as an INLINE style on
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
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {/* Content - sits directly on the clean frost. */}
      <div className={styles.content}>
        {children}
      </div>
    </div>
  );
}

export default FlutedGlass;
