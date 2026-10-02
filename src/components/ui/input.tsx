import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        /* Debossed well: inputs are pressed INTO the page (shadow from
           the top, one light hairline catching the bottom lip) — the
           inverse of the raised glass cards. Composes with the focus
           ring via Tailwind's shadow variables. */
        "dark:shadow-[inset_0_2px_5px_-2px_rgb(0_0_0/0.5),inset_0_-1px_0_0_rgb(255_255_255/0.05)] shadow-[inset_0_1px_2px_-1px_rgb(0_0_0/0.08)]",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
