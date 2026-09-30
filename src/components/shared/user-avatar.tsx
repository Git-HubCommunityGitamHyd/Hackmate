"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/* Initials avatar with deterministic hue — no external requests,
   which also keeps the demo free of broken images. */
export function UserAvatar({
  name,
  image,
  className,
  emergency,
}: {
  name: string;
  image?: string | null;
  className?: string;
  emergency?: boolean;
}) {
  const initials = (name ?? "?")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const hues = [160, 45, 280, 340, 200, 25, 120, 310];
  let hash = 0;
  for (const ch of name ?? "") hash = (hash * 31 + ch.charCodeAt(0)) % 997;
  const hue = hues[hash % hues.length];

  return (
    <div className={cn("relative shrink-0", className)}>
      <Avatar className={cn("h-10 w-10 border", className)}>
        {image ? (
          <AvatarImage src={image} alt={name} />
        ) : null}
        <AvatarFallback
          style={{ backgroundColor: `hsl(${hue} 60% 88%)`, color: `hsl(${hue} 55% 30%)` }}
          className="font-semibold"
        >
          {initials}
        </AvatarFallback>
      </Avatar>
      {emergency && (
        <span
          className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-red-500 border-2 border-background animate-pulse"
          title="Emergency available"
        />
      )}
    </div>
  );
}
