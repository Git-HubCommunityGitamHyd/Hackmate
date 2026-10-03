"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface PixelCanvasProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Size of each pixel cell in pixels */
    gap?: number;
    /** Speed of the trailing decay (higher = faster fade) */
    speed?: number;
    /** Array of colors for pixels - will interpolate through them as trail fades */
    colors?: string[];
    /** Disable mouse tracking */
    noFocus?: boolean;
    /** Variant style */
    variant?: "default" | "trail" | "glow";
    /** Wake radius around the pointer, in pixels. Defaults per variant:
     *  "glow" 120, everything else 80. Pass a small radius (e.g. 16,
     *  just past one 11px cell) to wake only a handful of pixels. */
    radius?: number;
    /** Draw alpha ceiling for a fully lit pixel (0 to 1, default 0.9).
     *  Lower it for a whisper-quiet field. */
    maxAlpha?: number;
}

interface Pixel {
    x: number;
    y: number;
    size: number;
    intensity: number;
    targetIntensity: number;
    colorPhase: number;
    /** Awake flag: the pixel is lit or still decaying, so it is in the
     *  awake list and gets simulated + drawn every frame. */
    awake: boolean;
}

// Helper to interpolate between two hex colors
function lerpColor(color1: string, color2: string, t: number): string {
    const c1 = hexToRgb(color1);
    const c2 = hexToRgb(color2);
    if (!c1 || !c2) return color1;

    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);

    return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
            r: parseInt(result[1]!, 16),
            g: parseInt(result[2]!, 16),
            b: parseInt(result[3]!, 16),
        }
        : null;
}

export function PixelCanvas({
    className,
    gap = 6,
    speed = 0.02,
    colors = ["#e879f9", "#a78bfa", "#38bdf8", "#22d3ee"],
    noFocus = false,
    variant = "default",
    radius,
    maxAlpha = 0.9,
    ...props
}: PixelCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const pixelsRef = useRef<Pixel[][]>([]);
    const mouseRef = useRef({ x: -1000, y: -1000 });
    const animationRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(0);

    const getColorFromIntensity = useCallback((intensity: number, phase: number) => {
        if (colors.length === 0) return "#ffffff";
        if (colors.length === 1) return colors[0]!;

        // Use phase + intensity to create a shifting color effect
        const t = (phase + intensity) % 1;
        const index = Math.floor(t * (colors.length - 1));
        const nextIndex = Math.min(index + 1, colors.length - 1);
        const localT = (t * (colors.length - 1)) % 1;

        const color1 = colors[index];
        const color2 = colors[nextIndex];

        if (!color1) return "#ffffff";
        if (!color2) return color1!;

        return lerpColor(color1, color2, localT);
    }, [colors]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        /* Reduced motion: the field stays asleep - a still, matte ink
           canvas with no wake and zero animation cost. */
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

        const ctx = canvas.getContext("2d", { alpha: true });
        if (!ctx) return;

        let cols = 0;
        let rows = 0;
        const pixelSize = Math.max(gap, 4);
        const wakeRadius = radius ?? (variant === "glow" ? 120 : 80);
        /* Wake box: the band of cells around the pointer that are woken
           each frame (box test, no square roots). One cell of padding
           guarantees every cell whose center sits inside the radius is
           included. */
        const boxPad = wakeRadius + pixelSize;

        /* AWAKE LIST - the performance core. Only cells that are lit or
           still decaying are simulated and drawn; the full grid is never
           scanned. Each frame:
             1. wake the cells near the pointer (cheap box test),
             2. step + draw ONLY the awake ones (the decaying trail keeps
                them awake until they fade out).
           A moving pointer costs a few hundred box tests and a few
           hundred pixel steps; a resting page with the pointer gone
           costs nothing at all (the rAF loop STOPS, see below). */
        const awake: Pixel[] = [];

        let viewW = 0;
        let viewH = 0;
        let rectLeft = 0;
        let rectTop = 0;
        let drewLast = false;
        let running = true;

        const initPixels = () => {
            const rect = container.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;

            viewW = rect.width;
            viewH = rect.height;
            rectLeft = rect.left;
            rectTop = rect.top;

            canvas.width = Math.max(1, Math.round(rect.width * dpr));
            canvas.height = Math.max(1, Math.round(rect.height * dpr));
            canvas.style.width = `${rect.width}px`;
            canvas.style.height = `${rect.height}px`;
            /* Setting canvas.width resets the context transform, so the
               scale below never compounds across re-inits. */
            ctx.scale(dpr, dpr);

            cols = Math.ceil(rect.width / pixelSize);
            rows = Math.ceil(rect.height / pixelSize);

            const newPixels: Pixel[][] = [];
            for (let i = 0; i < cols; i++) {
                const row: Pixel[] = [];
                for (let j = 0; j < rows; j++) {
                    row.push({
                        x: i * pixelSize,
                        y: j * pixelSize,
                        size: pixelSize - 1,
                        intensity: 0,
                        targetIntensity: 0,
                        colorPhase: Math.random(), // Random starting phase for color variety
                        awake: false,
                    });
                }
                newPixels.push(row);
            }
            pixelsRef.current = newPixels;
            /* Stale pixels from the previous grid (wrong positions after
               a resize) are dropped wholesale. */
            awake.length = 0;
            if (drewLast) {
                ctx.clearRect(0, 0, viewW, viewH);
                drewLast = false;
            }
        };

        const draw = (timestamp: number) => {
            if (!running) return;
            const deltaTime = Math.max(0, timestamp - lastTimeRef.current);
            lastTimeRef.current = timestamp;

            const { x: mouseX, y: mouseY } = mouseRef.current;
            const offField = mouseX < -500 && mouseY < -500;

            /* 1 - WAKE the cells near the pointer (mouseRef is already
                  in canvas-local coordinates). */
            if (!offField) {
                const pixels = pixelsRef.current;
                const iMin = Math.max(0, Math.floor((mouseX - boxPad) / pixelSize));
                const iMax = Math.min(cols - 1, Math.ceil((mouseX + boxPad) / pixelSize));
                const jMin = Math.max(0, Math.floor((mouseY - boxPad) / pixelSize));
                const jMax = Math.min(rows - 1, Math.ceil((mouseY + boxPad) / pixelSize));
                for (let i = iMin; i <= iMax; i++) {
                    const col = pixels[i];
                    if (!col) continue;
                    for (let j = jMin; j <= jMax; j++) {
                        const pixel = col[j];
                        if (pixel && !pixel.awake) {
                            pixel.awake = true;
                            awake.push(pixel);
                        }
                    }
                }
            }

            /* 2 - Clear last frame's ink (only when there was any). */
            if (drewLast) {
                ctx.clearRect(0, 0, viewW, viewH);
            }

            /* 3 - Step + draw the awake pixels only. */
            let drew = false;
            const dtPhase = 0.001 * (deltaTime / 16);
            for (let k = awake.length - 1; k >= 0; k--) {
                const pixel = awake[k]!;

                // Recompute target intensity from the CURRENT pointer distance
                const centerX = pixel.x + pixel.size / 2;
                const centerY = pixel.y + pixel.size / 2;
                const dx = mouseX - centerX;
                const dy = mouseY - centerY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < wakeRadius) {
                    // Smooth falloff curve
                    pixel.targetIntensity = Math.pow(1 - distance / wakeRadius, 1.5);
                } else {
                    pixel.targetIntensity = 0;
                }

                // Smooth interpolation towards target
                const lerpSpeed = pixel.targetIntensity > pixel.intensity
                    ? 0.3 // Quick light up
                    : speed; // Slow decay for trailing

                pixel.intensity += (pixel.targetIntensity - pixel.intensity) * lerpSpeed;

                // Retire faded pixels: back to sleep, out of the list.
                if (pixel.intensity <= 0.01 && pixel.targetIntensity === 0) {
                    pixel.intensity = 0;
                    pixel.awake = false;
                    awake.splice(k, 1);
                    continue;
                }

                // Shift color phase slowly for shimmer effect
                pixel.colorPhase = (pixel.colorPhase + dtPhase) % 1;

                // Draw if visible
                if (pixel.intensity > 0.01) {
                    drew = true;
                    const color = getColorFromIntensity(pixel.intensity, pixel.colorPhase);

                    // Glow effect: draw larger, blurred version first
                    if (variant === "glow" && pixel.intensity > 0.2) {
                        for (let g = 2; g > 0; g--) {
                            const glowSize = pixel.size + g * 4;
                            const glowOffset = (glowSize - pixel.size) / 2;
                            ctx.globalAlpha = pixel.intensity * 0.15 / g;
                            ctx.fillStyle = color;
                            ctx.fillRect(
                                pixel.x - glowOffset,
                                pixel.y - glowOffset,
                                glowSize,
                                glowSize
                            );
                        }
                    }

                    // Main pixel
                    ctx.globalAlpha = pixel.intensity * maxAlpha;
                    ctx.fillStyle = color;

                    if (variant === "trail") {
                        // Rounded pixels for trail variant
                        const cornerRadius = pixel.size * 0.3;
                        ctx.beginPath();
                        ctx.roundRect(pixel.x, pixel.y, pixel.size, pixel.size, cornerRadius);
                        ctx.fill();
                    } else {
                        ctx.fillRect(pixel.x, pixel.y, pixel.size, pixel.size);
                    }
                }
            }

            ctx.globalAlpha = 1;
            drewLast = drew;

            /* 4 - IDLE SLEEP: pointer off-field and every pixel faded -
                  STOP the loop outright. The next pointermove restarts
                  it, so a page nobody is moving a mouse over runs ZERO
                  animation frames. */
            if (awake.length === 0 && offField) {
                animationRef.current = 0;
                return;
            }

            animationRef.current = requestAnimationFrame(draw);
        };

        const startLoop = () => {
            if (animationRef.current === 0 && running) {
                lastTimeRef.current = performance.now();
                animationRef.current = requestAnimationFrame(draw);
            }
        };

        const onMouseMove = (e: MouseEvent) => {
            mouseRef.current = {
                x: e.clientX - rectLeft,
                y: e.clientY - rectTop,
            };
            startLoop();
        };

        const onMouseLeave = () => {
            mouseRef.current = { x: -1000, y: -1000 };
        };

        const onTouchMove = (e: TouchEvent) => {
            if (e.touches.length > 0) {
                const touch = e.touches[0];
                if (touch) {
                    mouseRef.current = {
                        x: touch.clientX - rectLeft,
                        y: touch.clientY - rectTop,
                    };
                    startLoop();
                }
            }
        };

        const onTouchEnd = () => {
            mouseRef.current = { x: -1000, y: -1000 };
        };

        // Initialize (does NOT start the loop: nothing is awake yet)
        initPixels();

        // Event listeners
        const resizeObserver = new ResizeObserver(() => initPixels());
        resizeObserver.observe(container);

        if (!noFocus) {
            window.addEventListener("mousemove", onMouseMove);
            window.addEventListener("mouseleave", onMouseLeave);
            window.addEventListener("touchmove", onTouchMove, { passive: true });
            window.addEventListener("touchend", onTouchEnd);
        }

        return () => {
            running = false;
            if (animationRef.current !== 0) {
                cancelAnimationFrame(animationRef.current);
                animationRef.current = 0;
            }
            resizeObserver.disconnect();
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseleave", onMouseLeave);
            window.removeEventListener("touchmove", onTouchMove);
            window.removeEventListener("touchend", onTouchEnd);
        };
    }, [gap, speed, noFocus, variant, radius, maxAlpha, getColorFromIntensity]);

    return (
        <div
            ref={containerRef}
            className={cn("h-full w-full relative overflow-hidden", className)}
            {...props}
        >
            <canvas ref={canvasRef} className="block w-full h-full" />
        </div>
    );
}
