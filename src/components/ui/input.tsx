import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        /* Embossed relief: inputs are raised frosted slabs like every
           other control — the key light catches the top-left edge, the
           bottom-right edge shades, one small penumbra floats the slab.
           Composes with the focus ring via Tailwind's shadow vars. */
        "dark:shadow-[inset_1px_1px_0_0_rgb(255_255_255/0.07),inset_-1px_-1px_0_0_rgb(0_0_0/0.45),2px_3px_8px_-5px_rgb(0_0_0/0.7)] shadow-[inset_1px_1px_0_0_rgb(255_255_255/0.9),inset_-1px_-1px_0_0_rgb(0_0_0/0.05),0_1px_2px_rgb(0_0_0/0.06)]",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
