"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * SplineObject — lazy, error-tolerant Spline 3D embed.
 *
 * The stock Spline "robot" scene is GONE from the project. The component
 * now ships with NO default scene: without NEXT_PUBLIC_SPLINE_SCENE_URL
 * it renders the animated breathing ink-orb (pure CSS, zero network,
 * matches the ink-wash theme) and never even imports the Spline runtime.
 *
 * To mount a real 3D object of your own:
 *   1. Author (or pick) a scene in Spline (spline.design), export it.
 *   2. Host the exported .splinecode somewhere reachable (prod.spline.design
 *      works if the scene is published from your account).
 *   3. Set NEXT_PUBLIC_SPLINE_SCENE_URL=https://…/scene.splinecode in .env
 *   4. Drop <SplineObject width={…} height={…} /> wherever you want it.
 *
 * Design goals kept from the original:
 *   1. Zero layout shift: the box is sized by props; the canvas fills it.
 *   2. Never blocks the UI: @splinetool/runtime is dynamically imported
 *      ONLY when a scene URL exists.
 *   3. Fails beautiful: if the scene can't load (offline, blocked network,
 *      bad URL) it falls back to the ink orb instead of throwing.
 *
 * Pointer events are optionally disabled so the object can sit inside a
 * Link without eating clicks (set `interactive={false}`).
 */

export const DEFAULT_SPLINE_SCENE =
  process.env.NEXT_PUBLIC_SPLINE_SCENE_URL ?? null;

type LoadState = "loading" | "ready" | "error";

export function SplineObject({
  scene = DEFAULT_SPLINE_SCENE,
  className,
  width = 44,
  height = 44,
  interactive = false,
  fallbackClassName,
}: {
  scene?: string | null;
  className?: string;
  width?: number;
  height?: number;
  /** Allow the canvas to capture the pointer (mouse-orbit the object). */
  interactive?: boolean;
  fallbackClassName?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<LoadState>(scene ? "loading" : "error");

  useEffect(() => {
    if (!scene) return;
    let disposed = false;
    let app: { dispose: () => void } | null = null;

    (async () => {
      try {
        const { Application } = await import("@splinetool/runtime");
        if (disposed || !canvasRef.current) return;
        app = new Application(canvasRef.current) as unknown as {
          dispose: () => void;
        };
        await (app as unknown as { load: (url: string) => Promise<void> }).load(
          scene,
        );
        if (!disposed) setState("ready");
      } catch {
        /* Offline, blocked, or the scene URL went away — ink fallback. */
        if (!disposed) setState("error");
      }
    })();

    return () => {
      disposed = true;
      try {
        app?.dispose();
      } catch {
        /* already gone */
      }
    };
  }, [scene]);

  return (
    <span
      className={cn(
        "relative inline-flex items-center justify-center overflow-hidden",
        className,
      )}
      style={{ width, height }}
      aria-hidden="true"
    >
      {/* Ink fallback: a breathing sumi orb. Always rendered under the
          canvas so the switch from fallback -> scene has no blank frame.
          With no scene configured this IS the object — an animated,
          on-theme, zero-dependency emblem. */}
      <span
        className={cn(
          "absolute inset-0 m-auto rounded-full",
          "bg-[radial-gradient(circle_at_35%_30%,oklch(0.85_0.02_90),oklch(0.35_0.01_90)_55%,oklch(0.14_0.003_90))]",
          "shadow-[inset_0_1px_1px_oklch(1_0_0/0.25),inset_0_-6px_12px_oklch(0_0_0/0.6),0_6px_18px_-6px_oklch(0_0_0/0.9)]",
          "transition-opacity duration-700",
          state === "ready" ? "opacity-0" : "opacity-100",
          fallbackClassName,
        )}
        style={{
          width: Math.round(Math.min(width, height) * 0.78),
          height: Math.round(Math.min(width, height) * 0.78),
          animation: state === "ready" ? "none" : "ink-orb-breathe 4.5s ease-in-out infinite",
        }}
      />
      {scene && (
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className={cn(
            "absolute inset-0 h-full w-full transition-opacity duration-700",
            state === "ready" ? "opacity-100" : "opacity-0",
            !interactive && "pointer-events-none",
          )}
          style={{ width, height }}
        />
      )}
      {scene && (
        <span
          className={cn(
            "absolute inset-0 rounded-[inherit] transition-opacity",
            state === "loading" ? "opacity-100" : "opacity-0",
            "bg-[conic-gradient(from_0deg,transparent,oklch(0.71_0.15_158/0.5),transparent_30%)]",
          )}
          style={{ animation: "ink-orb-spin 1.2s linear infinite" }}
        />
      )}
    </span>
  );
}
