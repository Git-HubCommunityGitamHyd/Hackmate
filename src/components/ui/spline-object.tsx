"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * SplineObject — lazy, error-tolerant Spline 3D embed.
 *
 * Used for the header emblem and any future 3D moment. Design goals:
 *
 *  1. Zero layout shift: the box is sized by props; the canvas fills it.
 *  2. Never blocks the UI: @splinetool/runtime is dynamically imported, so
 *     it never lands in the initial bundle, and the scene loads async.
 *  3. Fails beautiful: if the scene can't load (offline, blocked network,
 *     bad URL) it swaps to the ink-fallback orb instead of throwing.
 *  4. Swappable scene: override with NEXT_PUBLIC_SPLINE_SCENE_URL. The
 *     default is a public example scene from Spline's own gallery.
 *
 * Pointer events are optionally disabled so the object can sit inside a
 * Link without eating clicks (set `interactive={false}`).
 */

export const DEFAULT_SPLINE_SCENE =
  process.env.NEXT_PUBLIC_SPLINE_SCENE_URL ??
  "https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode";

type LoadState = "loading" | "ready" | "error";

export function SplineObject({
  scene = DEFAULT_SPLINE_SCENE,
  className,
  width = 44,
  height = 44,
  interactive = false,
  fallbackClassName,
}: {
  scene?: string;
  className?: string;
  width?: number;
  height?: number;
  /** Allow the canvas to capture the pointer (mouse-orbit the object). */
  interactive?: boolean;
  fallbackClassName?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
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
          canvas so the switch from fallback -> scene has no blank frame. */}
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
      <span
        className={cn(
          "absolute inset-0 rounded-[inherit] transition-opacity",
          state === "loading" ? "opacity-100" : "opacity-0",
          "bg-[conic-gradient(from_0deg,transparent,oklch(0.64_0.19_28/0.5),transparent_30%)]",
        )}
        style={{ animation: "ink-orb-spin 1.2s linear infinite" }}
      />
    </span>
  );
}
