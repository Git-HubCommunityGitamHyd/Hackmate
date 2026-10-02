"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { HoverTransition } from "@/components/ui/hover-transition";

/**
 * CardPeek — the "peep in" hover window, running on the shared
 * HoverTransition engine.
 *
 * Settings (the peek spec): effect "parallax", direction "center",
 * snappy timing (0.38s with the crisp out-expo curve).
 *
 * Drop one inside a Card. When the pointer enters the card, a small
 * frosted window bloomes open near the top corner and shows a
 * miniature of what the card contains (members, roles, skills,
 * dates) — a peek, not a navigation. The reveal itself is the
 * parallax transition: the window un-clips from the card's centre
 * with a defocusing blur, rides a 3D tilt that tracks the pointer,
 * and carries the engine's glare pass.
 *
 * Activation is bound to the closest [data-slot="card"] ancestor (the
 * overlay itself is pointer-events: none, so it drives the
 * HoverTransition in controlled mode). Tilt + glare coordinates are
 * written as CSS variables on the wrapper, which the engine's inner
 * layers inherit.
 *
 * It is purely presentational (aria-hidden): the same information is
 * fully reachable on the card's target page, so nothing is hidden
 * from keyboard or screen-reader users.
 */

/** Snappy: fast attack, crisp settle — the peek never lingers. */
const PEEK_DURATION = 0.38;
const PEEK_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

export function CardPeek({
  label,
  children,
  className,
  align = "right",
}: {
  /** Tiny uppercase caption, e.g. "peek · team". */
  label: string;
  children: ReactNode;
  className?: string;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  /* Bind hover + pointer tracking to the owning card. */
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    /* closest() returns Element; cast to HTMLElement so pointer-event
       listeners carry their proper PointerEvent typing. */
    const card = (wrapper.closest("[data-slot='card']") ?? wrapper.parentElement) as HTMLElement | null;
    if (!card) return;

    const show = () => setOpen(true);
    const hide = () => setOpen(false);

    /* Feed the engine's tilt/glare variables from the card's own
       pointer travel (the overlay never receives pointer events). */
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const rect = card.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
      const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
      const maxTilt = 2.4;
      wrapper.style.setProperty("--hover-tilt-x", `${((0.5 - y) * maxTilt).toFixed(2)}deg`);
      wrapper.style.setProperty("--hover-tilt-y", `${((x - 0.5) * maxTilt).toFixed(2)}deg`);
      wrapper.style.setProperty("--hover-glare-x", `${(x * 100).toFixed(1)}%`);
      wrapper.style.setProperty("--hover-glare-y", `${(y * 100).toFixed(1)}%`);
    };
    const onPointerLeave = () => {
      wrapper.style.setProperty("--hover-tilt-x", "0deg");
      wrapper.style.setProperty("--hover-tilt-y", "0deg");
    };

    card.addEventListener("mouseenter", show);
    card.addEventListener("mouseleave", hide);
    card.addEventListener("pointermove", onPointerMove, { passive: true });
    card.addEventListener("pointerleave", onPointerLeave);
    return () => {
      card.removeEventListener("mouseenter", show);
      card.removeEventListener("mouseleave", hide);
      card.removeEventListener("pointermove", onPointerMove);
      card.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 z-[5]", className)}
    >
      <HoverTransition
        effect="parallax"
        direction="center"
        duration={PEEK_DURATION}
        easing={PEEK_EASING}
        label={`Peek: ${label}`}
        active={open}
        tabIndex={-1}
        className="h-full min-h-0 overflow-visible"
        defaultComponent={<span className="block h-full w-full" />}
        hoverComponent={
          <div
            className={cn(
              "peep-window absolute top-2 w-52 p-2.5",
              align === "right" ? "right-2" : "left-2",
            )}
          >
            <p className="label-harsh mb-1.5 text-[9px] tracking-[0.24em] text-primary/80">
              {label}
            </p>
            <div className="space-y-1.5 text-[11px] leading-snug text-foreground/90">
              {children}
            </div>
          </div>
        }
      />
    </div>
  );
}

/** One row inside a peep window: icon + text, tiny and quiet. */
export function PeekRow({
  icon,
  children,
}: {
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <p className="flex items-center gap-1.5 text-muted-foreground [&_svg]:h-3 [&_svg]:w-3 [&_svg]:shrink-0">
      {icon}
      <span className="min-w-0 truncate">{children}</span>
    </p>
  );
}
