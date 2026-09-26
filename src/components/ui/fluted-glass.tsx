"use client";

import {
  CSSProperties,
  ReactNode,
  useId,
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
  refraction?: number;
  className?: string;
  style?: CSSProperties;
}

export function FlutedGlass({
  children,
  maxTilt = 8,
  background = "rgba(255, 255, 255, 0.035)",
  borderRadius = 16,
  minHeight = 0,
  blur = 14,
  refraction = 12,
  className = "",
  style,
}: FlutedGlassProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const id = useId().replace(/:/g, "");
  const filterId = `glass-refraction-${id}`;

  const reset = () => {
    const element = ref.current;

    if (!element) return;

    element.style.setProperty("--tilt-x", "0deg");
    element.style.setProperty("--tilt-y", "0deg");
  };

  return (
    <>
      {/* SVG distortion map used by the glass */}
      <svg
        className="absolute h-0 w-0 pointer-events-none"
        aria-hidden="true"
      >
        <defs>
          <filter
            id={filterId}
            x="-15%"
            y="-15%"
            width="130%"
            height="130%"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.018 0.09"
              numOctaves="2"
              seed="11"
              result="noise"
            />

            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={refraction}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      <div
        ref={ref}
        className={`${styles.root} ${className}`}
        style={{
          background,
          borderRadius,
          minHeight,
          "--glass-blur": `${blur}px`,
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
        {/* Transparent blurred glass */}
        <div
          className={styles.glass}
          style={{
            backdropFilter: `blur(${blur}px) saturate(120%)`,
            WebkitBackdropFilter: `blur(${blur}px) saturate(120%)`,
          }}
        />

        {/* Refraction layer */}
        <div
          className={styles.refraction}
          style={{
            backdropFilter: `url(#${filterId})`,
            WebkitBackdropFilter: `url(#${filterId})`,
          }}
        />

        {/* Very subtle flute structure */}
        <div className={styles.flutes} />

        {/* Content */}
        <div className={styles.content}>
          {children}
        </div>
      </div>
    </>
  );
}

export default FlutedGlass;