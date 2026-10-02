"use client";

import { ArrowDownUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface SortOption<V extends string> {
  value: V;
  label: string;
}

/**
 * SortMenu — the shared sort control for Discover and Emergency.
 *
 * A debossed pill (the app's control material) that opens the standard
 * frosted dropdown with a jade check on the active option. Generic over
 * the option value so each page owns its own sort keys and comparators
 * — this component is purely the consistent UI.
 */
export function SortMenu<V extends string>({
  value,
  onChange,
  options,
  ariaLabel = "Sort results",
}: {
  value: V;
  onChange: (value: V) => void;
  options: ReadonlyArray<SortOption<V>>;
  ariaLabel?: string;
}) {
  const active = options.find((o) => o.value === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="debossed"
          size="sm"
          className="gap-1.5 rounded-lg font-semibold"
          aria-label={ariaLabel}
        >
          <ArrowDownUp className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">
            {active ? active.label : "Sort"}
          </span>
          <span className="sm:hidden">Sort</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(v) => onChange(v as V)}
        >
          {options.map((option) => (
            <DropdownMenuRadioItem
              key={option.value}
              value={option.value}
            >
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
