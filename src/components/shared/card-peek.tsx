"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * CardPeek — the "peep in" hover window.
 *
 * Drop one inside a Card. When the pointer enters the card, a small
 * glass window scales open near the top corner and shows a miniature
 * of what the card contains (members, roles, skills, dates) — a peek,
 * not a navigation. The pop animation runs on anime.js with a soft
 * easing; leave is a fast CSS collapse.
 *
 * Hover detection binds to the closest [data-slot="card"] ancestor, so
 * the component works no matter where in the card's tree it sits. It is
 * purely presentational (aria-hidden): the same information is fully
 * reachable on the card's target page, so nothing is hidden from
 * keyboard or screen-reader users.
 */
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
  const windowRef = useRef<HTMLDivElement>(null);

  /* Bind hover to the owning card. */
  useEffect(() => {
    const el = windowRef.current;
    if (!el) return;
    const card = el.closest("[data-slot='card']") ?? el.parentElement;
    if (!card) return;
    const show = () => setOpen(true);
    const hide = () => setOpen(false);
    card.addEventListener("mouseenter", show);
    card.addEventListener("mouseleave", hide);
    return () => {
      card.removeEventListener("mouseenter", show);
      card.removeEventListener("mouseleave", hide);
    };
  }, []);

  /* Enter: anime.js pop (scale + slight y drift). */
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (!windowRef.current) return;
      const { animate } = await import("animejs");
      if (cancelled || !windowRef.current) return;
      animate(windowRef.current, {
        scale: [0.94, 1],
        translateY: [-6, 0],
        duration: 320,
        ease: "out(3)",
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  return (
    <div
      ref={windowRef}
      aria-hidden="true"
      className={cn(
        "peep-window pointer-events-none absolute top-2 z-[5] w-52 rounded-lg p-2.5",
        "transition-[opacity,transform] duration-200 ease-out",
        align === "right" ? "right-2 origin-top-right" : "left-2 origin-top-left",
        open
          ? "scale-100 opacity-100"
          : "scale-95 opacity-0 -translate-y-1",
        className,
      )}
    >
      <p className="label-harsh mb-1.5 text-[9px] tracking-[0.24em] text-primary/80">
        {label}
      </p>
      <div className="space-y-1.5 text-[11px] leading-snug text-foreground/90">
        {children}
      </div>
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
