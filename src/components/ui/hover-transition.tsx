"use client";

import { cn } from "@/lib/utils";
import * as React from "react";

export const hoverTransitionEffects = [
  "wipe",
  "ripple",
  "parallax",
  "curtain",
  "diagonal",
  "morph",
  "strips",
  "slide",
] as const;

export const hoverTransitionDirections = [
  "top",
  "right",
  "bottom",
  "left",
  "top-left",
  "top-right",
  "bottom-right",
  "bottom-left",
  "center",
] as const;

export type HoverTransitionEffect = (typeof hoverTransitionEffects)[number];
export type HoverTransitionDirection =
  (typeof hoverTransitionDirections)[number];

export interface HoverTransitionProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "children"
> {
  defaultComponent?: React.ReactNode;
  hoverComponent?: React.ReactNode;
  effect?: HoverTransitionEffect;
  direction?: HoverTransitionDirection;
  duration?: number;
  easing?: string;
  label?: string;
  /**
   * Controlled activation. When provided, the component uses this
   * value instead of its internal hover/focus state - lets a parent
   * (e.g. a card hosting a peek window) drive the transition from
   * events the overlay itself can never receive (pointer-events-none
   * layers). Unspecified = fully self-governing, as originally
   * designed.
   */
  active?: boolean;
}

type Vector = { x: number; y: number };

const directionVectors: Record<HoverTransitionDirection, Vector> = {
  top: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  "top-left": { x: -1, y: -1 },
  "top-right": { x: 1, y: -1 },
  "bottom-right": { x: 1, y: 1 },
  "bottom-left": { x: -1, y: 1 },
  center: { x: 0, y: 0 },
};

const rippleOrigins: Record<HoverTransitionDirection, string> = {
  top: "50% 0%",
  right: "100% 50%",
  bottom: "50% 100%",
  left: "0% 50%",
  "top-left": "0% 0%",
  "top-right": "100% 0%",
  "bottom-right": "100% 100%",
  "bottom-left": "0% 100%",
  center: "50% 50%",
};

function hiddenInset(direction: HoverTransitionDirection) {
  switch (direction) {
    case "top":
      return "inset(0 0 100% 0)";
    case "right":
      return "inset(0 0 0 100%)";
    case "bottom":
      return "inset(100% 0 0 0)";
    case "left":
      return "inset(0 100% 0 0)";
    case "top-left":
      return "inset(0 100% 100% 0)";
    case "top-right":
      return "inset(0 0 100% 100%)";
    case "bottom-right":
      return "inset(100% 0 0 100%)";
    case "bottom-left":
      return "inset(100% 100% 0 0)";
    default:
      return "inset(50%)";
  }
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return reduced;
}

function FallbackCard({ hover = false }: { hover?: boolean }) {
  return (
    <div
      className={cn(
        "relative flex h-full min-h-64 w-full flex-col justify-between overflow-hidden p-5 text-white",
        hover
          ? "bg-[radial-gradient(circle_at_75%_20%,#dfff63_0,transparent_26%),linear-gradient(145deg,#292929,#080808)]"
          : "bg-[radial-gradient(circle_at_20%_15%,#4f5dff_0,transparent_30%),linear-gradient(145deg,#1d2230,#07080b)]",
      )}
    >
      <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-white/70">
        <span className="size-2 bg-[#dfff63]" />
        {hover ? "Hover" : "Default"}
      </div>
      <div>
        <p className="text-3xl font-medium tracking-[-0.04em]">
          {hover ? "New perspective" : "Hover this card"}
        </p>
        <p className="mt-1 text-sm text-white/60">Hover Transition</p>
      </div>
    </div>
  );
}

function Layer({
  children,
  style,
  className,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0", className)}
      style={style}
    >
      {children}
    </div>
  );
}

export function HoverTransition({
  defaultComponent,
  hoverComponent,
  effect = "wipe",
  direction = "right",
  duration = 0.72,
  easing = "cubic-bezier(0.22, 1, 0.36, 1)",
  label = "Interactive hover transition",
  active: controlledActive,
  className,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  onPointerMove,
  onPointerLeave,
  tabIndex,
  ...props
}: HoverTransitionProps) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const [internalActive, setActive] = React.useState(false);
  const reducedMotion = usePrefersReducedMotion();
  /* Controlled mode: the parent owns activation; otherwise the
     component governs itself from hover/focus exactly as designed. */
  const active = controlledActive ?? internalActive;
  const vector = directionVectors[direction];
  const perceivedDurationScale =
    effect === "diagonal" || effect === "ripple" ? 1.25 : 1;
  const seconds = reducedMotion
    ? 0
    : Math.max(0, duration) * perceivedDurationScale;
  const before = defaultComponent ?? <FallbackCard />;
  const after = hoverComponent ?? <FallbackCard hover />;
  const distanceX = vector.x * 100;
  const distanceY = vector.y * 100;

  const transitionFor = (properties: string[], delay = 0, durationScale = 1) =>
    properties
      .map(
        (property) =>
          `${property} ${seconds * durationScale}s ${easing} ${reducedMotion ? 0 : delay}s`,
      )
      .join(", ");

  const layerTransition = transitionFor([
    "clip-path",
    "transform",
    "opacity",
    "filter",
    "border-radius",
  ]);

  const activate = (event: React.MouseEvent<HTMLDivElement>) => {
    setActive(true);
    onMouseEnter?.(event);
  };
  const deactivate = (event: React.MouseEvent<HTMLDivElement>) => {
    setActive(false);
    onMouseLeave?.(event);
  };

  const resetTilt = () => {
    const element = rootRef.current;
    if (!element) return;
    element.style.setProperty("--hover-tilt-x", "0deg");
    element.style.setProperty("--hover-tilt-y", "0deg");
  };

  const trackPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    onPointerMove?.(event);
    if (reducedMotion || event.pointerType !== "mouse") return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.min(
      1,
      Math.max(0, (event.clientX - bounds.left) / bounds.width),
    );
    const y = Math.min(
      1,
      Math.max(0, (event.clientY - bounds.top) / bounds.height),
    );
    const maxTilt = 2.4;

    event.currentTarget.style.setProperty(
      "--hover-tilt-x",
      `${((0.5 - y) * maxTilt).toFixed(2)}deg`,
    );
    event.currentTarget.style.setProperty(
      "--hover-tilt-y",
      `${((x - 0.5) * maxTilt).toFixed(2)}deg`,
    );
    event.currentTarget.style.setProperty(
      "--hover-glare-x",
      `${(x * 100).toFixed(1)}%`,
    );
    event.currentTarget.style.setProperty(
      "--hover-glare-y",
      `${(y * 100).toFixed(1)}%`,
    );
  };

  const hoverLayer = (style: React.CSSProperties) => (
    <Layer style={{ transition: layerTransition, ...style }}>{after}</Layer>
  );

  let animatedLayers: React.ReactNode;

  switch (effect) {
    case "ripple":
      animatedLayers = hoverLayer({
        clipPath: active
          ? `circle(150% at ${rippleOrigins[direction]})`
          : `circle(0% at ${rippleOrigins[direction]})`,
        filter: active ? "blur(0px)" : "blur(2px)",
        transform: active ? "scale(1)" : "scale(1.035)",
        transformOrigin: rippleOrigins[direction],
      });
      break;
    case "parallax":
      animatedLayers = (
        <>
          <Layer
            style={{
              transform: active
                ? `translate3d(${-distanceX * 0.12}%, ${-distanceY * 0.12}%, 0) scale(1.045)`
                : "translate3d(0, 0, 0) scale(1)",
              filter: active ? "brightness(.78) saturate(.75)" : "none",
              transition: transitionFor(["transform", "filter"]),
            }}
          >
            {before}
          </Layer>
          <Layer
            style={{
              clipPath: active ? "inset(0)" : hiddenInset(direction),
              filter: active ? "blur(0px)" : "blur(2px)",
              transition: transitionFor(["clip-path", "filter"]),
            }}
          >
            <div
              className="h-full w-full"
              style={{
                transform: active
                  ? "translate3d(0, 0, 0) scale(1)"
                  : `translate3d(${distanceX * 0.24}%, ${distanceY * 0.24}%, 0) scale(1.07)`,
                transition: transitionFor(["transform"]),
              }}
            >
              {after}
            </div>
          </Layer>
        </>
      );
      break;
    case "curtain": {
      const verticalMotion = vector.y !== 0 || direction === "center";
      animatedLayers = (
        <>
          {hoverLayer({
            opacity: active ? 1 : 0,
            filter: active ? "blur(0px)" : "blur(3px)",
            transform: active ? "scale(1)" : "scale(.96)",
          })}
          <Layer
            style={{
              clipPath: verticalMotion
                ? "inset(0 0 50% 0)"
                : "inset(0 50% 0 0)",
              transform: active
                ? verticalMotion
                  ? "translate3d(0, -100%, 0)"
                  : "translate3d(-100%, 0, 0)"
                : "translate3d(0, 0, 0)",
              filter: active ? "blur(1px)" : "blur(0px)",
              transition: transitionFor(["transform", "filter"]),
            }}
          >
            {before}
          </Layer>
          <Layer
            style={{
              clipPath: verticalMotion
                ? "inset(50% 0 0 0)"
                : "inset(0 0 0 50%)",
              transform: active
                ? verticalMotion
                  ? "translate3d(0, 100%, 0)"
                  : "translate3d(100%, 0, 0)"
                : "translate3d(0, 0, 0)",
              filter: active ? "blur(1px)" : "blur(0px)",
              transition: transitionFor(["transform", "filter"]),
            }}
          >
            {before}
          </Layer>
        </>
      );
      break;
    }
    case "diagonal": {
      const fromLeft = direction.includes("left") || direction === "left";
      const firstClip = fromLeft
        ? "polygon(0 0, 100% 0, 100% 100%)"
        : "polygon(0 0, 100% 0, 0 100%)";
      const secondClip = fromLeft
        ? "polygon(0 0, 100% 100%, 0 100%)"
        : "polygon(100% 0, 100% 100%, 0 100%)";
      animatedLayers = (
        <>
          {hoverLayer({
            opacity: active ? 1 : 0,
            filter: active ? "blur(0px)" : "blur(2px)",
            transform: active ? "scale(1)" : "scale(.97)",
          })}
          <Layer
            style={{
              clipPath: firstClip,
              transform: active
                ? fromLeft
                  ? "translate3d(100%, -100%, 0)"
                  : "translate3d(-100%, -100%, 0)"
                : "translate3d(0, 0, 0)",
              filter: active ? "blur(1px)" : "blur(0px)",
              transition: transitionFor(["transform", "filter"]),
            }}
          >
            {before}
          </Layer>
          <Layer
            style={{
              clipPath: secondClip,
              transform: active
                ? fromLeft
                  ? "translate3d(-100%, 100%, 0)"
                  : "translate3d(100%, 100%, 0)"
                : "translate3d(0, 0, 0)",
              filter: active ? "blur(1px)" : "blur(0px)",
              transition: transitionFor(["transform", "filter"]),
            }}
          >
            {before}
          </Layer>
        </>
      );
      break;
    }
    case "morph":
      animatedLayers = hoverLayer({
        borderRadius: active ? "0%" : "42%",
        clipPath: active ? "inset(0% round 0%)" : "inset(43% round 42%)",
        filter: active ? "blur(0px)" : "blur(3px)",
        opacity: active ? 1 : 0,
        transform: active
          ? "translate3d(0, 0, 0) scale(1) rotate(0deg)"
          : `translate3d(${distanceX * 0.04}%, ${distanceY * 0.04}%, 0) scale(.86) rotate(${vector.x < 0 ? -2 : 2}deg)`,
        transformOrigin: rippleOrigins[direction],
      });
      break;
    case "strips": {
      const vertical = Math.abs(vector.x) >= Math.abs(vector.y);
      const stripCount = 8;
      animatedLayers = Array.from({ length: stripCount }, (_, index) => {
        const start = (index / stripCount) * 100;
        const end = ((index + 1) / stripCount) * 100;
        const clipPath = vertical
          ? `inset(0 ${100 - end}% 0 ${start}%)`
          : `inset(${start}% 0 ${100 - end}% 0)`;
        const offsetX = (vector.x || (vector.y === 0 ? 1 : 0)) * 72;
        const offsetY = vector.y * 72;
        const staggerIndex = active ? index : stripCount - index - 1;
        const staggerWindow = seconds * 0.15;
        const stripDelay =
          stripCount > 1
            ? (staggerIndex / (stripCount - 1)) * staggerWindow
            : 0;
        return (
          <Layer
            key={index}
            style={{
              clipPath,
              filter: active ? "blur(0px)" : "blur(1.5px)",
              opacity: active ? 1 : 0,
              transform: active
                ? "translate3d(0, 0, 0)"
                : `translate3d(${offsetX}%, ${offsetY}%, 0)`,
              transition: transitionFor(
                ["transform", "opacity", "filter"],
                stripDelay,
                0.85,
              ),
            }}
          >
            {after}
          </Layer>
        );
      });
      break;
    }
    case "slide":
      animatedLayers = (
        <>
          <Layer
            style={{
              transform: active
                ? direction === "center"
                  ? "scale(1.035)"
                  : `translate3d(${-distanceX * 0.16}%, ${-distanceY * 0.16}%, 0) scale(1.025)`
                : "translate3d(0, 0, 0)",
              filter: active ? "brightness(.72) blur(2px)" : "none",
              opacity: active ? 0 : 1,
              transition: transitionFor(["transform", "opacity", "filter"]),
            }}
          >
            {before}
          </Layer>
          {hoverLayer({
            opacity: active ? 1 : 0,
            filter: active ? "blur(0px)" : "blur(3px)",
            transform: active
              ? "translate3d(0, 0, 0)"
              : direction === "center"
                ? "scale(.96)"
                : `translate3d(${distanceX * 0.16}%, ${distanceY * 0.16}%, 0) scale(.985)`,
          })}
        </>
      );
      break;
    case "wipe":
    default:
      animatedLayers = hoverLayer({
        clipPath: active ? "inset(0)" : hiddenInset(direction),
        filter: active ? "blur(0px)" : "blur(1.5px)",
        transform: active ? "scale(1)" : "scale(1.025)",
        transformOrigin: rippleOrigins[direction],
      });
      break;
  }

  const duplicatesDefault =
    effect === "parallax" ||
    effect === "curtain" ||
    effect === "diagonal" ||
    effect === "slide";

  return (
    <div
      {...props}
      ref={rootRef}
      role="group"
      aria-label={label}
      tabIndex={tabIndex ?? 0}
      data-active={active ? "true" : "false"}
      data-effect={effect}
      className={cn(
        "relative isolate min-h-64 overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 dark:focus-visible:ring-white",
        className,
      )}
      onMouseEnter={activate}
      onMouseLeave={deactivate}
      onPointerMove={trackPointer}
      onPointerLeave={(event) => {
        resetTilt();
        onPointerLeave?.(event);
      }}
      onFocus={(event) => {
        setActive(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setActive(false);
        onBlur?.(event);
      }}
    >
      <div
        className="relative h-full w-full"
        style={{
          transform: reducedMotion
            ? "none"
            : `perspective(1000px) rotateX(var(--hover-tilt-x, 0deg)) rotateY(var(--hover-tilt-y, 0deg)) scale(${active ? 1.012 : 1})`,
          transformStyle: "preserve-3d",
          transition: reducedMotion
            ? "none"
            : `transform ${active ? 0.22 : 0.55}s ${easing}`,
        }}
      >
        <div
          className={cn("h-full w-full", duplicatesDefault && "invisible")}
          style={{
            filter: active ? "brightness(.86) saturate(.88)" : "none",
            transform: active ? "scale(1.025)" : "scale(1)",
            transition: transitionFor(["transform", "filter"]),
          }}
        >
          {before}
        </div>
        {animatedLayers}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 mix-blend-screen"
          style={{
            background:
              "radial-gradient(circle 180px at var(--hover-glare-x, 50%) var(--hover-glare-y, 50%), rgba(255,255,255,.22), rgba(255,255,255,.05) 48%, transparent 78%)",
            opacity: active && !reducedMotion ? 0.16 : 0,
            transition: reducedMotion ? "none" : `opacity 0.3s ${easing}`,
          }}
        />
      </div>
    </div>
  );
}
