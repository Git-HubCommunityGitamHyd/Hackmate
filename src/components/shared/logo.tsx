import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm",
        className,
      )}
      aria-hidden="true"
    >
      <Zap className="h-[60%] w-[60%] fill-current" />
    </span>
  );
}
