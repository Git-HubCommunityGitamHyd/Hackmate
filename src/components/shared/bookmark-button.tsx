"use client";

import Link from "next/link";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrentUser, useToggleBookmark } from "@/hooks/use-api";
import { cn } from "@/lib/utils";

/** Compact save-for-later toggle used on discovery cards. */
export function BookmarkButton({
  targetType,
  targetId,
  className,
}: {
  targetType: "team" | "person" | "hackathon";
  targetId: string;
  className?: string;
}) {
  const { isAuthenticated } = useCurrentUser();
  const toggle = useToggleBookmark();

  if (!isAuthenticated) {
    return (
      <Button asChild size="icon" variant="ghost" aria-label="Sign in to save for later"
        className={cn("h-8 w-8 text-muted-foreground hover:text-primary", className)}>
        <Link href="/login"><Bookmark className="h-4 w-4" /></Link>
      </Button>
    );
  }

  return (
    <Button
      size="icon"
      variant="ghost"
      aria-label="Save for later"
      title="Save for later"
      disabled={toggle.isPending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle.mutate({ targetType, targetId });
      }}
      className={cn("h-8 w-8 text-muted-foreground hover:text-primary", className)}
    >
      <Bookmark className={cn("h-4 w-4", toggle.isPending && "animate-pulse")} />
    </Button>
  );
}
