"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Sparkles, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const EXAMPLES = [
  "Need someone who knows Next.js and has ML experience for a 4-person team",
  "looking for a backend dev with AWS for HackVerse",
  "designer who can pitch, weekends only",
];

export function SearchBar({
  value,
  onChange,
  onSearch,
  loading,
  parsed,
}: {
  value: string;
  onChange: (v: string) => void;
  onSearch: (v: string) => void;
  loading: boolean;
  parsed?: { skills: string[]; roles: string[]; teamSize: number | null; intent: string } | null;
}) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="w-full">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSearch(value);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder='Try: "Need someone who knows Next.js and has ML experience for a 4-person team"  (press / to focus)'
          className="h-12 pl-10 pr-24 text-sm rounded-xl bg-card shadow-sm"
          aria-label="Search hackathons, teams and people"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { onChange(""); onSearch(""); }} aria-label="Clear search">
              <X className="h-4 w-4" />
            </Button>
          )}
          <Button size="sm" className="h-8 rounded-lg" onClick={() => onSearch(value)} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
            <span className="hidden sm:inline">Search</span>
          </Button>
        </div>
      </div>

      {focused && !value && (
        <div className="mt-2 flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              className="text-xs text-muted-foreground hover:text-foreground border rounded-full px-3 py-1.5 bg-card transition-colors text-left"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(ex);
                onSearch(ex);
              }}
            >
              <Sparkles className="inline h-3 w-3 mr-1 text-primary" />
              {ex}
            </button>
          ))}
        </div>
      )}

      {parsed && (parsed.skills.length > 0 || parsed.roles.length > 0 || parsed.teamSize) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span>Understood:</span>
          {parsed.skills.map((s) => (
            <Badge key={s} variant="outline" className="text-[11px] py-0 bg-primary/5 border-primary/30 text-primary">
              {s}
            </Badge>
          ))}
          {parsed.roles.map((r) => (
            <Badge key={r} variant="outline" className="text-[11px] py-0 bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400">
              {r.replace(/-/g, " ")}
            </Badge>
          ))}
          {parsed.teamSize && (
            <Badge variant="outline" className="text-[11px] py-0">
              team of {parsed.teamSize}
            </Badge>
          )}
          {parsed.intent !== "any" && (
            <Badge variant="outline" className="text-[11px] py-0">
              intent: {parsed.intent}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
